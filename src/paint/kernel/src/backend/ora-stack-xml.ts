// OpenRaster stack.xml 序列化 —— **纯** 图层树 ↔ XML（无 canvas / 无 zip / 无 PNG）。
// C7：版本戳（wrote-with）改参数传入——backend 不 import src/version.ts（壳知识；bump.sh sed 目标不动）。
//
// 从 ora.js 抽出（batch 2）：buildStackXml / parseStackXml 只处理结构（嵌套组 + id + 属性），
// 不碰像素。好处：① 可纯 node 测（无 OffscreenCanvas 依赖，不毒 OSC-stub 测试生态）；
// ② 把「树→XML」这件单一职责的事打包成深模块，与 PNG/zip 的 codec（ora.js）解耦。
//
// 节点形状（与 doc.js 的 Layer / LayerGroup 对齐，但本模块不 import doc.js —— 只读字段）：
//   叶 Layer：{ isGroup:false, id, name, visible, opacity, mode, clippingMask, lockAlpha, bboxX, bboxY }
//   组 LayerGroup：{ isGroup:true, id, name, visible, opacity, mode, clippingMask, children:[] }
// 写入端额外读 doc.activeId / doc.referenceLayerId 决定 active / reference 标记。

import { FORMAT, readOraStamp, type Stamp } from "./format/migrate.ts";   // 格式版本纪律：ora 的拍子 SSoT

// 写入端读到的节点 / doc 的最小结构（doc.js 本体仍未类型化）。
export interface OraNode {
  id: number;
  name: string;
  visible: boolean;
  opacity?: number;
  mode?: string;
  clippingMask?: boolean;
  isGroup: boolean;
  children?: OraNode[];
  bboxX?: number;
  bboxY?: number;
  lockAlpha?: boolean;
}
export interface OraDoc {
  layers: readonly OraNode[];
  width: number;
  height: number;
  activeId?: number | null;
  referenceLayerId?: number | null;
}

// 读取端产出的 spec 节点（id 可能为 null：旧 .ora 无 weebpaint:id，decode 时再发新 id）。
interface ParsedCommon {
  id: number | null;
  name: string;
  opacity: number;
  visible: boolean;
  mode: string;
  clippingMask: boolean;
  isActive: boolean;
}
export type ParsedNode =
  | (ParsedCommon & { isGroup: true; children: ParsedNode[] })
  | (ParsedCommon & { isGroup: false; src: string; x: number; y: number; lockAlpha: boolean; isReference: boolean });

const XML_ENT: Record<string, string> = {
  "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;",
};
function escapeXml(s: string): string {
  return String(s).replace(/[<>&"']/g, (c) => XML_ENT[c]);
}

// ---- canvas composite mode ↔ ORA composite-op ----

const MODE_TO_ORA: Record<string, string> = {
  "source-over": "svg:src-over",
  "multiply":    "svg:multiply",
  "screen":      "svg:screen",
  "overlay":     "svg:overlay",
  "darken":      "svg:darken",
  "lighten":     "svg:lighten",
  "color-dodge": "svg:color-dodge",
  "color-burn":  "svg:color-burn",
  "hard-light":  "svg:hard-light",
  "soft-light":  "svg:soft-light",
  "difference":  "svg:difference",
  "exclusion":   "svg:exclusion",
};
export function oraCompositeOp(canvasMode: string): string {
  return MODE_TO_ORA[canvasMode] || "svg:src-over";
}
const ORA_TO_MODE: Record<string, string> = Object.fromEntries(
  Object.entries(MODE_TO_ORA).map(([k, v]) => [v, k]),
);
export function canvasModeFromOra(op: string): string {
  return ORA_TO_MODE[op] || "source-over";
}

// 私有扩展 schema 版本（0.10.0 起写入 weebpaint:format；与 app 版本解耦，只在**格式**变更时 bump）：
//   1 = 首个显式版本（= 改名前隐式格式：id/clipping/active/lock-alpha/reference/wrote-with + sidecar 三件）。
//   2 = reference 整改批（2026-08-30 spec，user 拍板）：多参考 `.weebpaint/references/` + refPanels
//       manifest；timelapse.mp4 迁 `.weebpaint/`；非点 `weebpaint/` 停写。读端零迁移（兜底链见 ora.ts）。
//   3 = 持久化立宪（2026-09-29，user「weebpaint升级同意」）：参考清单从 editor-state.json 的 refPanels 独立成
//       `.weebpaint/references/manifest.json`（契约归 @internal/reference-window）；desk 带 version 戳；
//       读端布局归一化（backend/format/layout.ts）取代散落的兜底链。
//   旧文件无此属性 → 读端按 0 处理（完全可读）。
// 2026-10-21 起三级拍子（家族格式版本纪律，F-69）：weebpaint:format 照旧是 major（老读者只认它），另加 weebpaint:format-minor /
//   weebpaint:format-patch（缺 = 0）。SSoT = backend/format/migrate.ts FORMAT.ora；判决（major 新 → 整张只读、minor 新 → 提示一次）在 session-state。
//   嵌在 stack.xml 已知元素里的未知属性 / 子元素**不直通**（读一次写一次就没了；test/format-stack-xml-unknown.test.mjs 钉住）——
//   同 major 内不准往这里加新东西，新东西请放 `.weebpaint/` 下的新 entry（那里直通）；兜底 = session-state「较新 app 写的画 → 覆盖前确认」。
export const ORA_FORMAT_VERSION = FORMAT.ora.major;

// ---- 写：doc 树 → stack.xml 字符串 ----

// 单节点 → XML（递归）。indent = 缩进层级（root stack 的直接子 = 2）。
//   Layer → 自闭合 <layer ... />；LayerGroup → <stack ...>children</stack>。
//   组与叶共享 name/opacity/visibility/composite-op/weebpaint:id/clipping/active；
//   叶独有 src/x/y/lock-alpha/reference。
/** 能写进 weebpaint:id、能拿来起像素文件名的 id：安全范围里的非负整数（读的时候也只认这种：parseNode）。 */
export const usableLayerId = (id: unknown): id is number => typeof id === "number" && Number.isSafeInteger(id) && id >= 0;
/**
 * 写的时候每个节点的 id 能不能用、每片叶的像素文件路径（stack.xml 的 src 和 zip 里的条目必须是同一个；buildStackXml 和 encodeDocToOra 都问它，2026-11-12 CatsUp 统筹批）。
 * 「可用」= 安全范围的非负整数，**而且这份文档里按同一种走法（doc.layers 深度优先、组先于它的子节点、子节点按先后）前面没出现过**——组的 id 也算「出现过」。
 * 不可用的（没有 / NaN / 负数 / 小数 / 和前面的重复）：不写 weebpaint:id、不按 id 认选中和参考、经 warn 报一句；是叶的话像素路径 = data/layer-<第几个>.png
 * （第几个 = 同一种走法里第几片不可用的叶；「-」开头的永远不和 layer<数字> 撞）。可用的照旧 data/layer<id>.png——正常文档（id 都不重复）写出来和以前逐字节一样。
 * 以前没有 id 的叶写成 data/layerundefined.png、两片同 id 的叶写成同一个 data/layer<id>.png：一层盖掉另一层。
 */
export function layerIdPlan(doc: { readonly layers: readonly OraNode[] }): { readonly usable: ReadonlySet<OraNode>; readonly paths: ReadonlyMap<OraNode, string>; readonly why: ReadonlyMap<OraNode, string> } {
  const usable = new Set<OraNode>(), paths = new Map<OraNode, string>(), why = new Map<OraNode, string>(), seen = new Set<number>();
  let k = 0;
  const walk = (ns: readonly OraNode[]): void => {
    for (const n of ns) {
      const ok = usableLayerId(n.id) && !seen.has(n.id);
      if (ok) { usable.add(n); seen.add(n.id as number); }
      else why.set(n, usableLayerId(n.id) ? `duplicate id ${n.id} (an earlier layer already has it)` : `no usable id (${String(n.id)})`);
      if (n.isGroup) walk(n.children || []);
      else paths.set(n, ok ? `data/layer${n.id}.png` : `data/layer-${k++}.png`);
    }
  };
  walk(doc.layers);
  return { usable, paths, why };
}
/** 叶的像素文件路径；路径表里查不到（两边的走法对不上了）= 抛、说是哪一层（不然写出 src="undefined"、这一层读不回）。 */
function leafPathOrThrow(ctx: XmlCtx, node: OraNode): string {
  const p = ctx.plan.paths.get(node);
  if (p === undefined) throw new Error(`buildStackXml: layer "${node.name}" (id ${String(node.id)}) has no pixel path in the layer plan; refusing to write a layer whose pixels could not be read back`);
  return p;
}
/** 写 stack.xml 时的上下文：哪些节点的 id 可用、每个叶的像素文件路径 + 报一句的口。 */
interface XmlCtx { readonly plan: ReturnType<typeof layerIdPlan>; readonly warn?: (msg: string) => void }
function nodeToXml(node: OraNode, doc: OraDoc, indent: number, ctx: XmlCtx): string {
  const pad = "  ".repeat(indent);
  // 没有可用的 id（调用的人没给 / 给了 NaN）：不写 weebpaint:id（绝不写出 "undefined" / "NaN"：读回来是 NaN、画板的当前图层跟着坏，CatsUp v0.19.60 及以前就这样写出过）、
  //   读的时候自动编号；经 warn 报一句是哪一层。不抛：这是存盘的路，抛 = 这次存不上；不写这个属性 = 一份合法的 ora，读回来自己好（统筹 11-12）。
  //   「选中」「参考」两个标记只认可用的 id（以前 activeId === node.id 两边都是 undefined 也算选中）。重复的 id 也算不可用（layerIdPlan）。
  const idOk = ctx.plan.usable.has(node);
  if (!idOk) ctx.warn?.(`ora: layer "${node.name}" has ${ctx.plan.why.get(node) ?? "no usable id"}; written without weebpaint:id (it gets a fresh id when read)`);
  const common = [
    `name="${escapeXml(node.name)}"`,
    `opacity="${(node.opacity ?? 1).toFixed(4)}"`,
    `visibility="${node.visible ? "visible" : "hidden"}"`,
    `composite-op="${oraCompositeOp(node.mode || "source-over")}"`,
    ...(idOk ? [`weebpaint:id="${node.id}"`] : []),
    ...(node.clippingMask ? [`weebpaint:clipping="true"`] : []),
    ...(idOk && doc.activeId === node.id ? [`weebpaint:active="true"`] : []),
  ];
  if (node.isGroup) {
    // ORA baseline 组隔离模型（与我们 layer-composite.groupNeedsIsolation 一致，故用**标准** isolation 属性，
    //   不用私有扩展 → 全合规 + 和 Krita/GIMP/MyPaint 互通）：
    //   隔离 ⟺ isolation="isolate" ‖ opacity<1 ‖ composite-op≠svg:src-over；非隔离时 composite-op 被忽略。
    //   映射：穿透 → src-over + isolation="auto"；正常(隔离) → src-over + isolation="isolate"；其它混合模式 → svg:<mode>。
    const groupAttrs = [
      ...common,
      `isolation="${node.mode === "pass-through" ? "auto" : "isolate"}"`,
    ];
    // children top-first（与 spec 一致）：同级倒序输出。
    const ch = node.children || [];
    const kids: string[] = [];
    for (let i = ch.length - 1; i >= 0; i--) {
      kids.push(nodeToXml(ch[i], doc, indent + 1, ctx));
    }
    const inner = kids.length ? `\n${kids.join("\n")}\n${pad}` : "";
    return `${pad}<stack ${groupAttrs.join(" ")}>${inner}</stack>`;
  }
  const attrs = [
    common[0],                                  // name
    `src="${leafPathOrThrow(ctx, node)}"`,
    `x="${node.bboxX}"`,
    `y="${node.bboxY}"`,
    ...common.slice(1),                          // opacity/visibility/composite-op/id/clipping/active
    ...(node.lockAlpha ? [`weebpaint:lock-alpha="true"`] : []),
    ...(idOk && doc.referenceLayerId === node.id ? [`weebpaint:reference="true"`] : []),
  ];
  return `${pad}<layer ${attrs.join(" ")} />`;
}

export function buildStackXml(doc: OraDoc, wroteWithVersion = "", warn?: (msg: string) => void): string {
  const ctx: XmlCtx = { plan: layerIdPlan(doc), ...(warn ? { warn } : {}) };
  // OpenRaster spec：layer 顺序 = top first（top of stack 在 XML 前）。
  // doc.layers[0] 是 bottom，所以同级倒序输出（递归在 nodeToXml 内）。
  const nodes: string[] = [];
  for (let i = doc.layers.length - 1; i >= 0; i--) {
    nodes.push(nodeToXml(doc.layers[i], doc, 2, ctx));
  }
  // wrote-with：记录写入这份 .ora 时的 WeebPaint 版本号（调用方传入；encodeDocToOra 必填透传）。
  // 用途：读取端若发现比自己版本高 → 警告（避免旧版客户端静默吃掉新版图层属性）
  // 论证见 conversation v71→v72。
  const wroteWith = wroteWithVersion;
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<image version="0.0.3" w="${doc.width}" h="${doc.height}" xres="72" yres="72" xmlns:weebpaint="https://github.com/fangzhangmnm/weebpaint/ns" weebpaint:format="${FORMAT.ora.major}" weebpaint:format-minor="${FORMAT.ora.minor}" weebpaint:format-patch="${FORMAT.ora.patch}" weebpaint:wrote-with="${escapeXml(wroteWith)}">
  <stack name="root">
${nodes.join("\n")}
  </stack>
</image>
`;
  return xml;
}

// ---- 读：stack.xml 字符串 → spec 树（bottom-first）----

// 元素标签（去命名空间前缀、小写）。
function elemTag(el: Element): string {
  return (el.tagName || el.nodeName || "").toLowerCase().replace(/^.*:/, "");
}
// 私有属性双读（2026-08-20 WebPaint→WeebPaint 改名，user 拍板「新写旧读」）：
//   写端只写 weebpaint:*；读端 weebpaint:* 优先、旧 webpaint:* 兜底——存量 .ora 的
//   id/clipping/active/lock-alpha/reference/wrote-with 全部保读，打开保存即自动升级。
function wpAttr(el: Element, name: string): string | null {
  return el.getAttribute(`weebpaint:${name}`) ?? el.getAttribute(`webpaint:${name}`);
}
// 单 DOM 元素 → spec（递归）。<layer> → 叶 spec；<stack> → 组 spec（含 children）。
//   id 解析自 weebpaint:id（旧 .ora 无此属性 → null，decode 时发新 id）。
function parseNode(el: Element): ParsedNode {
  const idAttr = wpAttr(el, "id");
  const common: ParsedCommon = {
    // 只认安全范围里的非负整数（纯数字）；别的（"undefined"、"NaN"、"-1"、"1.5"、"12abc"、空）= 当没有，decode 时自动编号（2026-11-12 CatsUp 统筹批：
    //   CatsUp v0.19.60 及以前写出过 weebpaint:id="undefined"，以前 parseInt 读成 NaN，NaN ?? 自动编号接不住，画板的当前图层跟着是 NaN、一笔都画不上）
    id: idAttr != null && /^\d+$/.test(idAttr) && Number.isSafeInteger(Number(idAttr)) ? Number(idAttr) : null,
    name: el.getAttribute("name") || "Layer",   // 无名层的兜底名（写回文件的数据）
    opacity: parseFloat(el.getAttribute("opacity") || "1"),
    visible: (el.getAttribute("visibility") || "visible") === "visible",
    mode: canvasModeFromOra(el.getAttribute("composite-op") || "svg:src-over"),
    clippingMask: wpAttr(el, "clipping") === "true",
    isActive: wpAttr(el, "active") === "true",
  };
  if (elemTag(el) === "stack") {
    // 组 mode 按 ORA baseline 隔离规则反推（standard isolation 属性）：
    //   composite-op≠src-over → 该混合模式（本就隔离）；src-over 时 isolation=isolate→正常(隔离)、auto/缺→穿透。
    const compositeOp = el.getAttribute("composite-op") || "svg:src-over";
    const isolation = el.getAttribute("isolation") || "auto";
    const mode = compositeOp !== "svg:src-over"
      ? canvasModeFromOra(compositeOp)
      : (isolation === "isolate" ? "source-over" : "pass-through");
    return { ...common, mode, isGroup: true, children: parseChildren(el) };
  }
  return {
    ...common,
    isGroup: false,
    src: el.getAttribute("src") || "",
    x: parseInt(el.getAttribute("x") || "0", 10),
    y: parseInt(el.getAttribute("y") || "0", 10),
    lockAlpha: wpAttr(el, "lock-alpha") === "true",
    isReference: wpAttr(el, "reference") === "true",
  };
}
// 一个 stack 的直接子节点 → bottom-first spec 数组。
//   XML 是 top-first（spec 顺序），doc 内部 [0]=bottom，所以 reverse。
function parseChildren(stackEl: Element): ParsedNode[] {
  const kids = [...stackEl.children].filter((c) => {
    const t = elemTag(c);
    return t === "layer" || t === "stack";
  });
  kids.reverse();
  return kids.map(parseNode);
}

export function parseStackXml(xmlText: string): { w: number; h: number; nodes: ParsedNode[]; wroteWith: string | null; formatVersion: number; formatStamp: Stamp } {
  const dom = new DOMParser().parseFromString(xmlText, "application/xml");
  const err = dom.querySelector("parsererror");
  if (err) throw new Error("stack.xml parse failed: " + err.textContent);
  const image = dom.querySelector("image");
  if (!image) throw new Error("stack.xml missing <image>");
  const w = parseInt(image.getAttribute("w") || "0", 10);
  const h = parseInt(image.getAttribute("h") || "0", 10);
  if (!w || !h) throw new Error("stack.xml <image> w/h invalid");
  // root <stack>（image 的直接子 stack）。递归建树。
  const rootStack = [...image.children].find((c) => elemTag(c) === "stack");
  const nodes = rootStack ? parseChildren(rootStack) : [];
  const wroteWith = wpAttr(image, "wrote-with") || null;
  const formatStamp = readOraStamp({ format: wpAttr(image, "format"), minor: wpAttr(image, "format-minor"), patch: wpAttr(image, "format-patch") });   // 无戳（改名前存量）= 0.0.0
  return { w, h, nodes, wroteWith, formatVersion: formatStamp.major, formatStamp };
}
