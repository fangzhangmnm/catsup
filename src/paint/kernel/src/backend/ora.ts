// OpenRaster (.ora) encode / decode。
//
// 标准：https://www.openraster.org/baseline/file-layout-spec.html
//
// .ora 是一个 zip，内部布局：
//   mimetype                 ASCII "image/openraster"（STORE，首个 entry）
//   stack.xml                XML 描述 <image><stack><layer .../></stack></image>
//   data/layerN.png          每层的 PNG bitmap（任意尺寸，由 stack.xml 的 x/y 决定位置）
//   mergedimage.png          整图合成预览（OneDrive 缩略图 / 其他 reader 兜底用）
//   .weebpaint/timelapse.mp4 可选：timelapse 录像（直接可播；spec=ai-docs/20260819-timelapse-spec.md）
//   .weebpaint/timelapse.json 可选：录制状态（开关 sticky/取景框 pin/n/motionSamples）
//   .weebpaint/references/    参考窗（format 3 起独立目录：manifest.json + r<i>.<ext>；契约归 @internal/reference-window）
//   .weebpaint/editor-state.json  desk
//   Thumbnails/thumbnail.png 小缩略图（最长边 ≤ 256，规范要求）——**必须最后 entry**（云端 byte-range 尾窗契约）
// 读端只认这一种布局：历史布局由 format/layout.ts 归一化（那张表是过去散在这里的全部兼容分支）。
//
// 我们的层 bbox 直接对应 spec 的 x / y / 自带尺寸 PNG —— 零转换。
//
// composite-op 映射：
//   "source-over"     → svg:src-over
//   "multiply"        → svg:multiply
//   ...（先只支持 source-over，phase 1 没图层 mode）
//
// **注意**：blob 全是 Uint8Array 传给 zip.js。Canvas.toBlob 拿到 Blob，需要
// arrayBuffer() 转 Uint8Array。

// C7：backend 不 import error-badge（DOM funnel 是壳知识）——良性告警走注入槽，
// 壳 boot 接 error-badge funnel（app.ts；同 tiles/ setTilePoolLeakReporter 模式）。headless 默认静默。
let _oraLog: (msg: string) => void = () => {};
export function setOraLogReporter(fn: (msg: string) => void): void { _oraLog = fn; }
const reportError = (err: unknown, _level?: string) => _oraLog(String(err instanceof Error ? err.message : err));
import { zipPack, zipUnpack } from "./zip.ts";
import { normalizeLayout, REFERENCES_DIR } from "./format/layout.ts";
import type { Stamp } from "./format/migrate.ts";
import { areaResampleBytes } from "./algorithms/resample-bytes.ts";
import { encodePngFromBytes, decodePngToBytes } from "./png-codec.ts";
// 纯树↔stack.xml 序列化（嵌套组 + id + active）抽到独立深模块（无 canvas 依赖，可纯 node 测）。
import { buildStackXml, parseStackXml } from "./ora-stack-xml.ts";
import type { ParsedNode } from "./ora-stack-xml.ts";
import type { PaintingData, PaintingDataNode, PaintingDataLeaf } from "./workpiece/painting-workpiece.ts";

// encode 消费面（T3b-2 起纯结构 duck-type）：叶必须带 getImageData（v0.6.44 真机教训——unsafe cast
// 曾把缺方法漏过 tsc）。activeId/referenceLayerId 必填（v0.7.8 FrozenDoc 漏抄 referenceLayerId 教训）。
// 三种来源同形直入：PaintingView 活 view 节点（导出路径）/ exportData 冻结快照经
// paintingDataToEncodeDoc（保存路径）/ 测试手搭。
export interface EncodeLeaf {
  isGroup: false; id: number; name: string; visible: boolean; opacity: number; mode: string;
  clippingMask: boolean; lockAlpha: boolean;
  bboxX: number; bboxY: number; bboxW: number; bboxH: number;
  getImageData(x: number, y: number, w: number, h: number): ImageData;
}
export interface EncodeGroup {
  isGroup: true; id: number; name: string; visible: boolean; opacity: number; mode: string;
  clippingMask: boolean; children: EncodeNode[];
}
export type EncodeNode = EncodeLeaf | EncodeGroup;
type EncodeDoc = {
  width: number; height: number; layers: readonly EncodeNode[];
  activeId: number | null; referenceLayerId: number | null;
};

function flattenEncodeLeaves(nodes: readonly EncodeNode[]): EncodeLeaf[] {
  const out: EncodeLeaf[] = [];
  const walk = (ns: readonly EncodeNode[]) => { for (const n of ns) { if (n.isGroup) walk(n.children); else out.push(n); } };
  walk(nodes);
  return out;
}

/** exportData 冻结快照 → encode 消费面（保存路径的 freezeDocForEncode 后继；bytes 已当场拷出，
 *  getImageData = 纯切片，无 canvas、无追写风险）。 */
export function paintingDataToEncodeDoc(data: PaintingData): EncodeDoc {
  const leafView = (n: PaintingDataLeaf): EncodeLeaf => {
    const px = n.pixels;
    return {
      isGroup: false, id: n.id!, name: n.name, visible: n.visible, opacity: n.opacity, mode: n.mode,
      clippingMask: n.clippingMask, lockAlpha: n.lockAlpha,
      bboxX: px?.rect.x ?? 0, bboxY: px?.rect.y ?? 0, bboxW: px?.rect.w ?? 0, bboxH: px?.rect.h ?? 0,
      getImageData(x: number, y: number, w: number, h: number): ImageData {
        const out = new Uint8ClampedArray(w * h * 4);
        if (px) {
          const { rect, bytes } = px;
          for (let row = 0; row < h; row++) {
            const sy = y + row - rect.y;
            if (sy < 0 || sy >= rect.h) continue;
            const cx0 = Math.max(x, rect.x), cx1 = Math.min(x + w, rect.x + rect.w);
            if (cx1 <= cx0) continue;
            const srcOff = (sy * rect.w + (cx0 - rect.x)) * 4;
            out.set(bytes.subarray(srcOff, srcOff + (cx1 - cx0) * 4), (row * w + (cx0 - x)) * 4);
          }
        }
        return new ImageData(out, w, h);
      },
    };
  };
  const walk = (ns: readonly PaintingDataNode[]): EncodeNode[] => ns.map((n): EncodeNode =>
    "children" in n
      ? { isGroup: true, id: n.id!, name: n.name, visible: n.visible, opacity: n.opacity, mode: n.mode, clippingMask: n.clippingMask, children: walk(n.children) }
      : leafView(n));
  return {
    width: data.width, height: data.height, layers: walk(data.nodes),
    activeId: data.activeId ?? null, referenceLayerId: data.referenceLayerId ?? null,
  };
}
// ---- 参考窗（format 3）：本 codec 对参考目录**零知识**——整个 `.weebpaint/references/` 原样进出，
//   命名 / 清单 / 版本 / 迁移全在 @internal/reference-window 库里（壳层 side-windows 调它）。
/** 参考目录的文件表：路径 → 字节（路径全在 REFERENCES_DIR 下）。 */
export type ReferenceFiles = Map<string, Uint8Array>;

// ---- 未知 entry 直通（家族格式版本纪律 §3，F-69）：`.weebpaint/` 是 WeebPaint 的私有命名空间——更新的 minor 往里加的新 entry
//   本版不认识，读进来原样收着、保存时原样写回（排在缩略图之前）。认识的三个 entry 归各自的写入器，参考目录归参考窗库。
//   命名空间之外的 entry（别的 ORA 工具留的、旧轨 webpaint/state.json）照旧不带——那不是「更新的 WeebPaint 写的」。
export const WEEBPAINT_DIR = ".weebpaint/";
export const KNOWN_WEEBPAINT_ENTRIES: readonly string[] = [".weebpaint/timelapse.mp4", ".weebpaint/timelapse.json", ".weebpaint/editor-state.json"];
export type ExtraEntries = Map<string, Uint8Array>;
const isExtraEntryPath = (p: string): boolean =>
  p.startsWith(WEEBPAINT_DIR) && !p.endsWith("/") && !KNOWN_WEEBPAINT_ENTRIES.includes(p) && !p.startsWith(REFERENCES_DIR + "/");

// encode opts：wroteWith 必填（C7：版本戳是壳知识，backend 不 import version.ts）+ 可选 WeebPaint 私有扩展。
interface EncodeOpts {
  wroteWith: string;   // stack.xml weebpaint:wrote-with 版本戳（壳传 WEEBPAINT_VERSION；backend 装配传注入的 appVersion）
  mergedBytes?: { data: Uint8ClampedArray; w: number; h: number } | null;   // S9/C3：调用方渲好的合成字节（GL renderNodesToBytes）；缺省=透明占位
  /** 参考目录（format 3）：路径 → 字节，原样写入；路径必须在 .weebpaint/references/ 下（不透明，codec 不解释）。 */
  referenceFiles?: Map<string, Uint8Array | Blob>;
  /** desk.Serialize() → .weebpaint/editor-state.json（desk per-doc；不向后兼容旧轨 webpaint/state.json）。
   *  字节 = 原样带回（desk 的 major 比本版新：读不了也不许改，session-state 把文件里的原字节递回来）。 */
  desk?: object | Uint8Array;
  /** `.weebpaint/` 下本版不认识的 entry（decode 的 _extraEntries），原样写回。路径必须在 `.weebpaint/` 下且不是认识的那几个。 */
  extraEntries?: ExtraEntries;
  // timelapse 录像（spec=ai-docs/20260819-timelapse-spec.md，ora entry consent 2026-08-19）：
  //   mp4 = 直接可播的完整录像（TimelapseDocState.serializeForSave 产物；空 Uint8Array=还没帧，只落 json）
  timelapse?: { json: string; mp4: Uint8Array } | null;
}
// decode 产物（T3b-2）：plain data（wp2.load 灌入）+ WeebPaint 私有 sidecar 随行。
// 字段名沿旧 DecodedDoc 下划线惯例——session-state 消费面零改名。
export interface DecodedPainting {
  data: PaintingData;
  /** 参考目录原样（布局归一化之后的路径）；没有参考 → 空表。壳层交给 @internal/reference-window 解。 */
  _referenceFiles: ReferenceFiles;
  /** 读端做了哪些布局搬动（人话；空 = 文件本来就是当前布局）。壳层记日志用。 */
  _layoutMigrated: string[];
  _weebpaintState?: unknown;
  _editorState?: unknown;   // .weebpaint/editor-state.json → desk.Unserialize()
  _editorStateBytes?: Uint8Array;   // 同一 entry 的原字节（desk major 比本版新时原样带回用）
  /** `.weebpaint/` 下本版不认识的 entry（更新的 minor 加的），保存时原样写回。没有 → 空表。 */
  _extraEntries: ExtraEntries;
  _timelapseJson?: string;      // .weebpaint/timelapse.json 原文（TimelapseDocState.restore 消费，含自愈）
  _timelapseMp4?: Uint8Array;   // timelapse.mp4 原字节（新家 .weebpaint/ 优先，根目录兜底）
  _wroteWith: string | null;
  _formatVersion: number;   // stack.xml weebpaint:format = ora 的 major（无戳存量 = 0）
  _formatStamp: Stamp;      // ora 的完整拍子（format / format-minor / format-patch；backend/format/migrate.ts 判）
}
// 加密对本 codec **不可见**（v235 起）：encode 永远出明文 ora、decode 永远收明文 ora。
// 包壳/解壳全在 store 深模块（flow.save/load/push/pull 自动处理；密码经 crypt seam）。
// 拿到加密容器字节请先走 store.unseal / flow.load，别直接喂这里（会报「缺 stack.xml」）。

// ---- 工具 ----

// （canvasToPngBytes 已收进 src/png-codec.ts 止血 facade——PNG 编解码唯一接缝，库外禁越狱 canvas。）

function bytesToString(bytes: Uint8Array): string {
  return new TextDecoder("utf-8").decode(bytes);
}

// ---- encode：PaintDoc → .ora Blob ----

/** 缩略图自适应：先按 256 编码，超 70KB 降 192，再超降 128，最后档不论大小都收。
 *  cloud-thumbs.js suffix budget = 80KB；留 ~10KB 给 zip 尾巴（CD + EOCD + 扫描余量）→ thumb ≤ 70KB
 *  返 png: Uint8Array。
 *  C3：全字节管线——缩小走 areaResampleBytes（面积平均 = 抗锯齿正解，α 加权；旧 canvas
 *  step-halving 是它的近似，细线稿狗牙教训同样成立）。
 */
async function renderThumbnailAdaptive(merged: { data: Uint8ClampedArray; w: number; h: number }, maxBytes = 71680) {
  const sizes = [256, 192, 128];
  let lastPng: Uint8Array | null = null;
  for (let i = 0; i < sizes.length; i++) {
    const scale = Math.min(1, sizes[i] / Math.max(merged.w, merged.h));
    const tw = Math.max(1, Math.round(merged.w * scale));
    const th = Math.max(1, Math.round(merged.h * scale));
    const px = scale < 1 ? areaResampleBytes(merged.data, merged.w, merged.h, tw, th) : merged.data;
    const png = await encodePngFromBytes(px, tw, th);
    lastPng = png;
    if (png.byteLength <= maxBytes) return png;
  }
  // 都超：用最小尺寸的结果
  return lastPng!;
}

/** doc → Blob (.ora)
 *
 * ══ zip 布局契约（format 3，2026-09-29 持久化立宪；format 2 = 2026-08-30 user 拍板；动布局必须上报+附目录表 = CLAUDE.md 纪律）══
 * 终态目录表（写端唯一形状）：
 *   mimetype                              ← ORA spec 强制第一
 *   stack.xml                             ← 结构 + wrote-with / weebpaint:format
 *   mergedimage.png                       ← spec
 *   data/layer<id>.png × N                ← spec
 *   .weebpaint/timelapse.mp4 / .json      ← 录像（format 2 起 mp4 与 json 团圆）
 *   .weebpaint/references/manifest.json   ← 参考窗清单（format 3；契约归 @internal/reference-window）
 *   .weebpaint/references/r<i>.<ext>      ← 参考窗的每张卡（同上，本 codec 不解释）
 *   .weebpaint/editor-state.json          ← desk（format 3 起不再含 refPanels）
 *   Thumbnails/thumbnail.png              ← spec 强制，恒最后（byte-range 尾窗契约）
 * 心智模型：根目录 = ORA spec 领土；`.weebpaint/` = 全部 WP 私货（与云端 store `.weebpaint/` 同义）。
 * **非点 `weebpaint/` 已停写**（format 2）；读端兜底链见 decode 尾部路由表——只读不写、保存即自愈。
 * （旧轨 webpaint/state.json v0.8.21 停写——ADR-0008 §9；decode 读兼容保留存量。）
 */
export async function encodeDocToOra(doc: EncodeDoc, opts: EncodeOpts) {
  // S9：merged 由调用方渲入（opts.mergedBytes，GL 合成字节、与 display 同源；v134 约定保 alpha 不涂底）。
  //   缺省（node 测试 / GL lost 的 autosave 兜底）= 透明占位——层数据完整，mergedimage 只是预览件。
  const merged = opts.mergedBytes
    ?? { data: new Uint8ClampedArray(doc.width * doc.height * 4), w: doc.width, h: doc.height };
  const mergedPng = await encodePngFromBytes(merged.data, merged.w, merged.h);
  // thumb：自适应尺寸 256→192→128，目标 ≤ 80KB（让云端 48KB suffix 大概率命中）
  const thumbPng = await renderThumbnailAdaptive(merged);

  // entry 顺序很重要：
  //   1. spec 强制 mimetype 第一
  //   2. Thumbnails/thumbnail.png 故意放最后 → 云端 byte-range thumbnail（v137）
  //      只拉 last 128KB 就能一次性拿到 EOCD + CD + thumbnail data，省 2 次请求
  //   3. mergedimage / layer 是大块，放中间
  const entries: { path: string; data: string | Uint8Array }[] = [
    { path: "mimetype", data: "image/openraster" },
    { path: "stack.xml", data: buildStackXml(doc, opts.wroteWith) },
    { path: "mergedimage.png", data: mergedPng },
  ];

  // 只有叶有像素；组无 PNG，结构全在 stack.xml。
  for (const L of flattenEncodeLeaves(doc.layers)) {
    let png;
    if (L.bboxW > 0 && L.bboxH > 0) {
      // v0.6.42：tiles 字节直读进 codec facade（不再经 L.canvas 物化）
      png = await encodePngFromBytes(L.getImageData(L.bboxX, L.bboxY, L.bboxW, L.bboxH).data, L.bboxW, L.bboxH);
    } else {
      // 空层 → 1×1 透明 png（C3：直接字节编码；旧 makeBitmap+getContext 的 Chromium 空 canvas 坑随之蒸发）。
      png = await encodePngFromBytes(new Uint8ClampedArray(4), 1, 1);
    }
    entries.push({ path: `data/layer${L.id}.png`, data: png });
  }

  // timelapse 录像：mp4 是大块 → 中部（layer 之后）；format 2 起与 json 同住 .weebpaint/。
  // 两者都必须排在 Thumbnails/thumbnail.png 之前（byte-range 尾窗契约，见下）。zip STORE 不再压（mp4 已是压缩流）。
  if (opts.timelapse) {
    if (opts.timelapse.mp4.length > 0) entries.push({ path: ".weebpaint/timelapse.mp4", data: opts.timelapse.mp4 });
    entries.push({ path: ".weebpaint/timelapse.json", data: opts.timelapse.json });
  }

  // 参考目录（format 3）：库编好的一组文件原样写入，顺序照库给的（manifest.json 在前）。
  // Thumbnails/thumbnail.png 放**最后一个 entry**：缩略图 byte-range 提取先拉尾片 80KB，thumbnail 在尾
  //   → 一发命中、零额外请求。故 references / editor-state.json 都排在它之前。
  //   历史：v398 前 reference.png 曾排在 thumbnail 之后，那时库靠「尾部硬扫最后一个 PNG」找缩略图 →
  //   缩略图错显成参考图。v399 起库**按文件名**解 CD 取 entry，位置不再决定对错，但 thumbnail 垫尾仍是
  //   最省 byte-range 的约定。
  if (opts.referenceFiles) {
    for (const [path, data] of opts.referenceFiles) {
      if (!path.startsWith(REFERENCES_DIR + "/")) throw new Error(`[ora] reference file outside ${REFERENCES_DIR}/: ${path}`);
      entries.push({ path, data: data instanceof Blob ? new Uint8Array(await data.arrayBuffer()) : data });
    }
  }
  // desk struct（desk per-doc）→ .weebpaint/editor-state.json（旧轨 webpaint/state.json v0.8.21 停写）。
  if (opts.desk instanceof Uint8Array) {
    entries.push({ path: ".weebpaint/editor-state.json", data: opts.desk });   // 原字节带回（major 比本版新）
  } else if (opts.desk && typeof opts.desk === "object") {
    entries.push({ path: ".weebpaint/editor-state.json", data: JSON.stringify(opts.desk) });
  }
  // 直通：更新的 minor 加的 `.weebpaint/` entry，原样写回（缩略图之前）。
  if (opts.extraEntries) {
    for (const [path, data] of opts.extraEntries) {
      if (!isExtraEntryPath(path)) throw new Error(`[ora] extra entry must be an unknown path under ${WEEBPAINT_DIR}: ${path}`);
      entries.push({ path, data });
    }
  }

  // thumbnail 末尾（云端 byte-range 优化）——必须是最后一个 entry，见上方 reference.png 注释。
  entries.push({ path: "Thumbnails/thumbnail.png", data: thumbPng as Uint8Array });

  // C7 决定论 encode：entry 时间戳钉死 zip epoch（1980-01-01）——同内容 → 同字节
  // （backend round-trip 锚；云 diff 友好）。zip entry 日期无消费者（同步/peek 全按文件级元数据）。
  return await zipPack(entries, { lastModDate: new Date(Date.UTC(1980, 0, 1, 0, 0, 0)) });
}

// ---- decode：.ora Blob → PaintingData（T3b-2：plain data，wp2.load 灌入）----

/** Blob (.ora 明文) → DecodedPainting（json 形 + 内联 tile 字节 + sidecar）。 */
export async function decodeOraToPainting(blob: Blob): Promise<DecodedPainting> {
  // 布局归一化：任何历史布局 → 当前布局（format/layout.ts 那张表）。之后本函数只认一种形状。
  const { files, migrated } = normalizeLayout(await zipUnpack(blob));
  if (!files["stack.xml"]) throw new Error(".ora missing stack.xml");
  // mimetype 检验（友好，不强制）
  if (files["mimetype"]) {
    const m = bytesToString(files["mimetype"]).trim();
    if (m !== "image/openraster") {
      reportError(`[ora] mimetype is not image/openraster: ${m}`, "log");
    }
  }
  const xml = bytesToString(files["stack.xml"]);
  const meta = parseStackXml(xml);

  // id 分配：持久化 id 直接沿用；旧 .ora 无 id → 本地自增补号（避开已用号；
  //   active/reference 标记要能指到节点，所以补号在 decode 侧做、不留给 load 的 auto）。
  const usedIds = new Set<number>();
  const collectIds = (specs: ParsedNode[]) => {
    for (const sp of specs) { if (sp.id != null) usedIds.add(sp.id); if (sp.isGroup) collectIds(sp.children); }
  };
  collectIds(meta.nodes);
  let auto = 1;
  const nextAuto = () => { while (usedIds.has(auto)) auto++; usedIds.add(auto); return auto; };

  let activeId: number | null = null;
  let referenceLayerId: number | null = null;

  // spec 树 → plain data（递归）。叶按 src 载 PNG 字节；组递归建 children。
  const buildNode = async (spec: ParsedNode): Promise<PaintingDataNode> => {
    const id = spec.id ?? nextAuto();
    if (spec.isGroup) {
      const children: PaintingDataNode[] = [];
      for (const c of spec.children) children.push(await buildNode(c));
      if (spec.isActive) activeId = id;
      return {
        id, name: spec.name, visible: spec.visible, opacity: spec.opacity, mode: spec.mode,
        clippingMask: !!spec.clippingMask, children,
      };
    }
    const png = files[spec.src];
    if (!png) throw new Error(`.ora missing layer PNG: ${spec.src}`);
    const px = await decodePngToBytes(png);   // v0.6.42：走 codec facade（换 UPNG/自研只改 png-codec.ts）
    if (spec.isActive) activeId = id;
    if (spec.isReference) referenceLayerId = id;
    // 1×1 全透明占位（空层的编码形）→ pixels:null（空叶）；其余整块内联。
    const isBlank = px.w * px.h === 1 && px.data[3] === 0;
    return {
      id, name: spec.name, visible: spec.visible, opacity: spec.opacity, mode: spec.mode,
      clippingMask: !!spec.clippingMask, lockAlpha: !!spec.lockAlpha,
      pixels: isBlank ? null : { rect: { x: spec.x, y: spec.y, w: px.w, h: px.h }, bytes: px.data },
    };
  };

  const nodes: PaintingDataNode[] = [];
  for (const spec of meta.nodes) nodes.push(await buildNode(spec));
  if (nodes.length === 0) {
    // 防御：完全空 .ora → 给个默认层
    nodes.push({ id: nextAuto(), name: "Layer 1", visible: true, opacity: 1, mode: "source-over", clippingMask: false, lockAlpha: false, pixels: null });
  }
  // active 还原：优先 weebpaint:active 标记节点；无标记（旧 .ora）→ 末叶（栈顶）= load 的 firstLeaf
  //   兜底不同——这里显式取末叶，语义沿旧 decodeOraToDoc。
  if (activeId == null) {
    const leaves: number[] = [];
    const walkLeaves = (ns: PaintingDataNode[]) => { for (const n of ns) { if ("children" in n) walkLeaves(n.children); else leaves.push(n.id!); } };
    walkLeaves(nodes);
    activeId = leaves.length ? leaves[leaves.length - 1] : null;
  }

  const referenceFiles: ReferenceFiles = new Map();
  const extraEntries: ExtraEntries = new Map();
  for (const p of Object.keys(files)) {
    if (p.startsWith(REFERENCES_DIR + "/")) referenceFiles.set(p, files[p]);
    else if (isExtraEntryPath(p)) extraEntries.set(p, files[p]);
  }
  const out: DecodedPainting = {
    data: { width: meta.w, height: meta.h, activeId, referenceLayerId, nodes },
    _referenceFiles: referenceFiles,
    _extraEntries: extraEntries,
    _layoutMigrated: migrated,
    _wroteWith: meta.wroteWith || null,
    _formatVersion: meta.formatVersion,
    _formatStamp: meta.formatStamp,
  };
  // WeebPaint 私货（可有可无）。历史布局已在上面归一化，这里只认当前路径。
  // 旧轨 state.json（v0.8.21 停写，只读，原样留在文件里）。
  if (files["webpaint/state.json"]) {
    try {
      out._weebpaintState = JSON.parse(bytesToString(files["webpaint/state.json"]));
    } catch (e) {
      reportError(new Error("[ora] webpaint/state.json parse failed: " + String(e)), "log");
    }
  }
  // timelapse：原文/原字节随行（解析与自愈在 TimelapseDocState.restore，codec 不掺语义）。
  const tlJson = files[".weebpaint/timelapse.json"];
  if (tlJson) out._timelapseJson = bytesToString(tlJson);
  const tlMp4 = files[".weebpaint/timelapse.mp4"];
  if (tlMp4) out._timelapseMp4 = tlMp4;
  // desk struct（desk per-doc）；缺失（老画作/不向后兼容）→ 留 undefined，adopt 时 reset 到默认。
  const deskJson = files[".weebpaint/editor-state.json"];
  if (deskJson) {
    out._editorStateBytes = deskJson;
    try {
      out._editorState = JSON.parse(bytesToString(deskJson));
    } catch (e) {
      reportError(new Error("[ora] .weebpaint/editor-state.json parse failed: " + String(e)), "log");
    }
  }
  return out;
}

// 把版本号字符串解析成可比较的整数，横跨新旧两种命名制（0.4 纪元换制）：
//   新制 "v0.4.0-2026-07-22" / "v0.4.0" → (major*100+minor)*1e6+patch
//   旧制 "v438-2026-07-18" / "v438"     → 统一归入 0.3 纪元（= v0.3.438），与新制全序可比
// （旧制 patch 是单调单序列，所以 v438 < v0.4.0 < v0.4.10 < v0.5.0 成立。）
// 失败 → null（caller 跳过比较；零信息时不警告）。
// 用途 = session-state「较新 app 写的画 → 说一次 + 覆盖前确认」那一层（2026-10-21 曾随格式拍子一起删，同日审计恢复：拍子兜不住 stack.xml 内部）。
export function parseAppVersion(s: string | null | undefined): number | null {
  if (!s) return null;
  const str = String(s);
  const dotted = str.match(/^v(\d+)\.(\d+)\.(\d+)/);
  if (dotted) {
    return (parseInt(dotted[1], 10) * 100 + parseInt(dotted[2], 10)) * 1_000_000 + parseInt(dotted[3], 10);
  }
  const legacy = str.match(/^v(\d+)/);
  return legacy ? 3 * 1_000_000 + parseInt(legacy[1], 10) : null;
}
