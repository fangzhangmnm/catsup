// WeebPaintBackend —— backend 装配根（C7；契约 = ./weebpaint-backend-interface.ts，提案 §3）。
// 与 app.ts 组合根的关系：app.ts 目前仍自装配同一套件（history+wp2+view+layers）跑浏览器壳；
// 本类是 headless/MCP/embedding 面的**第二个组合根**（装配的是同一批组件，非复刻逻辑）。
// 壳迁移到「app.ts 消费 WeebPaintBackend」= C7 后棒（app-context 39 键瘦版的落点）。
//
// born-loaded：工厂返回时 doc 已在（blank 脚手架或 open 解码灌入）；无空态、无 load 方法。
// 换画 = 弃旧建新（dispose 旧 + 工厂新）。
//
// 注入清单（node 拿不到的才注入；node 里近乎无参）：
//   appVersion   —— .ora wrote-with 戳（壳传 WEEBPAINT_VERSION；缺省 ""）
//   jpgEncoder   —— exportImage("jpg") 的编码器（壳 = canvas toBlob 域；headless 缺席响亮失败）
//   imageDecoder —— open() png 之外的位图解码（jpg/webp…；headless 缺席响亮失败）
// 合成面（mergedimage/exportImage/mergeDown）走 doc-render 全局接缝（setDocCompositorBytes）——
// per-tenant 合成注入 + GPU tile arena 归 Port 记账排 C7 后棒（handoff §1 C7 行）。

import { History } from "./workpiece/history.ts";
import { HostedSteps, type StepHost } from "./workpiece/hosted-steps.ts";
import type { WriteToken } from "./workpiece/workpiece.ts";
import { getFilterKernel } from "./filters/index.ts";
import type { FilterKernel, FilterParams } from "./filters/kernel.ts";
import { PaintingWorkpiece, type PaintingData, type PaintingDataNode } from "./workpiece/painting-workpiece.ts";
import { PaintingView, findViewNodeById, type ViewLeaf } from "./workpiece/painting-view.ts";
import type { PerspHost } from "./workpiece/persp-component.ts";
import { LayersFace } from "./layers-face.ts";
import { StrokeSession, type StampCollect, type StrokeSessionDeps } from "./stroke-session.ts";
import { BrushEngine } from "./brush.ts";
import { DEFAULT_CONFIG } from "../common/current-brush-config.ts";
import type { ResolvedBrush } from "../common/resolved-brush.ts";
import { SMOOTH_DEFAULTS } from "../common/smooth-defaults.ts";
import { SoftGl2Port } from "./soft-gl2-port.ts";
import { GlRoom, poolCapacityForBudget } from "./gl/gl-room.ts";
import { RasterService } from "./gl/raster-service.ts";
import { RegionStroke } from "./gl/region-stroke.ts";
import type { LayerPixels } from "./tiles/tile-layer.ts";
import type { Gl2Port } from "../common/gl2-port.ts";
import { renderNodesToBytes, type DocCompositorBytesFn } from "./doc-render.ts";
import { encodeDocToOra, decodeOraToPainting, paintingDataToEncodeDoc, type DecodedPainting } from "./ora.ts";
import { FORMAT, judge, FormatTooNewError } from "./format/migrate.ts";   // 格式版本纪律：ora 的 major 比本版新 → open 拒开
import { encodePngFromBytes, decodePngToBytes, type RgbaPlane } from "./png-codec.ts";
import { isGroupNode, type TreeNode } from "./workpiece/layer-tree.ts";
import type {
  WeebPaintBackendInterface, BackendLayerNode, BackendDocInfo, BackendChangeEvent,
  BackendOpResult, BackendAddResult, ResolvedBrushSnapshot, StrokeId, FilterSessionId,
} from "./weebpaint-backend-interface.ts";

const UNDO_QUOTA_BYTES = 128 * 1024 * 1024;   // app.ts 同款配额

/** 壳侧编排钩子（进程内壳专用；headless 缺省 no-op。MCP/embedding 面走 onChange 事件——
 *  序列化墙那侧不存在这组细粒度钩子，它们是浏览器壳「同步刷新面板/画面」的过渡协作面）。 */
export interface BackendShellHooks {
  /** 栈形状变化（push/undo/redo/clear/evict）。壳接 wp:histchange 派发。 */
  onHistChange?: (canUndo: boolean, canRedo: boolean) => void;
  /** 某步被应用（undo/redo，按 step entries 逐组件报）。壳接面板/画面刷新。 */
  onApplied?: (info: { kind: string; dir: "undo" | "redo" }) => void;
  /** 不可恢复失败（栈已被弃）。壳接 error banner + 全量重绘；headless 经 onChange 广播。 */
  onUnrecoverable?: (e: unknown) => void;
  /** LayersFace statuses hint（undo/redo 状态栏文案；非权威附注）。 */
  status?: (msg: string) => void;
  /** 写门的否决口（2026-11-08）：返回原因 = 此刻不许改这幅画（锁着）。壳接 edit-lock；headless / MCP 不传 = 不拦。 */
  writeGate?: (label?: string) => string | null;
}

export interface BackendInject {
  appVersion?: string;
  jpgEncoder?: (plane: RgbaPlane) => Promise<Uint8Array>;
  imageDecoder?: (bytes: Uint8Array) => Promise<RgbaPlane>;
  /** 栅格域 Port（C8 档口）：stroke 档的 bake/merge 走它。缺省懒建 SoftGl2Port（提案 §3 注入清单
   *  ——headless/MCP 无参即跑）；壳/embedding 可注入 BrowserGl2Port 共享真 GPU。 */
  gl?: Gl2Port;
  /** desk persp 配置读写口（壳接 workbench-state；缺省内存 host——headless/测试）。 */
  persp?: PerspHost;
  /** per-tenant 合成注入（C7）：本 backend 的 merged 合成面（encodeOra/exportImage/mergeDown）。
   *  缺省回落 doc-render 全局接缝（壳单租户期语义不变）；多 backend 并存各持己面不串。 */
  compositorBytes?: DocCompositorBytesFn;
  hooks?: BackendShellHooks;
  /** 给了 = 封好的步交给宿主的撤销栈去存（贴图主线 0-2：三维把画画和建模接成一条撤销线）——宿主走到哪一步调 `history.flip(step)`；
   *  这时 undo / redo / canUndo 抛（归宿主管），onHistChange 不发。不给 = 和以前一模一样（内核自带的栈）。 */
  stepHost?: StepHost;
}

export interface BackendOpenResult {
  backend: WeebPaintBackend;
  /** open 解出的壳 sidecar（backend 不解释，原样交壳）。整份递回 encodeOra 的同名字段 = 无损往返（MCP 存盘就这么做）。 */
  sidecar: {
    editorState?: unknown; legacyState?: unknown; referenceFiles: { path: string; bytes: Uint8Array }[]; wroteWith: string | null;
    /** desk / 录像 / `.weebpaint/` 下不认识的 entry 的原字节（格式版本纪律：读不懂的也原样带回）。 */
    editorStateBytes?: Uint8Array; timelapse?: { json: string; mp4: Uint8Array } | null; extraEntries?: { path: string; bytes: Uint8Array }[];
  };
}

// ---- 魔数嗅探（open 路由归 backend）----
function sniffFormat(u8: Uint8Array): "ora-zip" | "psd" | "png" | "image" {
  if (u8.length >= 2 && u8[0] === 0x50 && u8[1] === 0x4b) return "ora-zip";                  // "PK"
  if (u8.length >= 4 && u8[0] === 0x38 && u8[1] === 0x42 && u8[2] === 0x50 && u8[3] === 0x53) return "psd";   // "8BPS"
  if (u8.length >= 4 && u8[0] === 0x89 && u8[1] === 0x50 && u8[2] === 0x4e && u8[3] === 0x47) return "png";
  return "image";   // jpg/webp/… → 注入解码器
}

function blankData(meta: { width: number; height: number }): PaintingData {
  return {
    width: meta.width, height: meta.height,
    activeId: 1, referenceLayerId: null,
    nodes: [{ id: 1, name: "Layer 1", visible: true, opacity: 1, mode: "source-over", clippingMask: false, lockAlpha: false, pixels: null }],
  };
}

function singleImageData(plane: RgbaPlane): PaintingData {
  return {
    width: plane.w, height: plane.h,
    activeId: 1, referenceLayerId: null,
    nodes: [{
      id: 1, name: "Layer 1", visible: true, opacity: 1, mode: "source-over", clippingMask: false, lockAlpha: false,
      pixels: { rect: { x: 0, y: 0, w: plane.w, h: plane.h }, bytes: plane.data },
    }],
  };
}

export class WeebPaintBackend implements WeebPaintBackendInterface {
  private _history: History;
  private _wp2: PaintingWorkpiece;
  private _view: PaintingView;
  private _layers: LayersFace;
  private _inject: BackendInject;
  private _compositor: DocCompositorBytesFn;
  private _disposed = false;
  private _listeners = new Set<(ev: BackendChangeEvent) => void>();
  // ---- 栅格域（C8 档口）：懒建——纯结构/codec 用途的 backend 不付 GL/软 arena 钱 ----
  private _room: GlRoom | null = null;
  private _raster: RasterService | null = null;
  // ---- stroke 档口状态（单令牌墙：同时最多一个 open stroke）----
  private _stroke: {
    id: StrokeId; session: StrokeSession; engine: BrushEngine;
    settings: ResolvedBrush; mode: string;
    smooth: { tau?: number; deadzone?: number; tailBow?: number };
    begun: boolean;   // 引擎 beginStroke 迟到首点（strokeBegin 无坐标，首个 append 点才 begin）
  } | null = null;
  private _strokeSeq = 0;
  // ---- filter 档口状态（参数重算事务；与 stroke 同一面单令牌墙——同时最多一个 open transaction）----
  private _filter: {
    id: FilterSessionId; kernel: FilterKernel; leaf: ViewLeaf; token: WriteToken;
    bx: number; by: number; bw: number; bh: number;
    src: Uint8ClampedArray;          // begin 冻结源（bake 永远从它算——重算不累积）
    out: Uint8ClampedArray;          // 当前预览字节（commit 落层的最终结果）
    mask: Uint8Array | null;         // begin 时物化的选区 gray8（<128 = passthrough）
    params: FilterParams;
  } | null = null;
  private _filterSeq = 0;
  private _histRev = 0;   // History onChange 计数（strokeEnd/filterCommit 判「真落了一步」用；no-op 不 push 不动它）

  /** 进程内协作面（壳迁移期/测试直取引擎；embedding/MCP 只走接口方法——序列化墙那侧不存在这些）。 */
  get wp2(): PaintingWorkpiece { return this._wp2; }
  get view(): PaintingView { return this._view; }
  get layersFace(): LayersFace { return this._layers; }
  get history(): History { return this._history; }

  private constructor(data: PaintingData, inject: BackendInject) {
    this._inject = inject;
    this._compositor = inject.compositorBytes ?? renderNodesToBytes;
    const hooks = inject.hooks;
    this._history = new History({
      maxQuotaBytes: UNDO_QUOTA_BYTES,
      // 不可恢复协议：壳钩子接 error banner + 全量重绘；栈已重置这一事实同时经 onChange 广播。
      onUnrecoverable: (e) => { hooks?.onUnrecoverable?.(e); this._emit(); },
      onChange: () => { this._histRev++; hooks?.onHistChange?.(this._history.canUndo(), this._history.canRedo()); this._emit(); },
      onApplied: (info) => { hooks?.onApplied?.(info); },   // 屏显刷新是壳的事（headless 无耗）
      // 步归宿主管（0-2）：「真落了一步」照样从步的变化数（strokeEnd / filterCommit 要）；能不能撤销归宿主，不发 onHistChange
      ...(inject.stepHost ? { hosted: new HostedSteps(inject.stepHost, { onChange: () => { this._histRev++; this._emit(); } }) } : {}),
    });
    // born 出生形：1×1 脚手架树——仅存在于本构造函数内（load 立即换根），外界不可观测。
    this._wp2 = new PaintingWorkpiece({
      undo: this._history.steps,
      tree: { width: 1, height: 1, maxLeaves: (): number => this._view.maxLayers },
      persp: inject.persp,
    });
    if (hooks?.writeGate) this._wp2.writeGate = (label) => hooks.writeGate!(label);   // 2026-11-08：锁着的画不开写令牌（壳注入）
    this._view = new PaintingView(this._wp2);
    this._history.attach(this._wp2);
    this._layers = new LayersFace({ history: this._history, tree: this._wp2.layerTree!, tiles: this._wp2.layerTiles, port: this._view, status: hooks?.status, compositorBytes: inject.compositorBytes });
    this._wp2.load(data);   // 令牌灌入 + 清栈 + markSaved（born-loaded 达成）
    this._wp2.onChange(() => this._emit());
  }

  // ── 静态工厂（路由归 backend）──

  static blank(meta: { width: number; height: number }, inject: BackendInject = {}): WeebPaintBackend {
    return new WeebPaintBackend(blankData(meta), inject);
  }

  /** 魔数嗅探：zip→ora、8BPS→psd（后棒）、png→UPNG 单图成层、其余→注入解码器单图成层。 */
  static async open(bytes: Uint8Array, inject: BackendInject = {}): Promise<BackendOpenResult> {
    const fmt = sniffFormat(bytes);
    if (fmt === "ora-zip") {
      const dec: DecodedPainting = await decodeOraToPainting(new Blob([bytes as unknown as BlobPart]));
      // 格式版本纪律：ora 的 major 比本版新 = 图层结构可能读错 → 拒开（无头没有「只读」这种态；壳层是整张只读，见 session-state）。
      if (judge("ora", dec._formatStamp) === "too-new") throw new FormatTooNewError("ora", dec._formatStamp, FORMAT.ora);
      const backend = new WeebPaintBackend(dec.data, inject);
      return {
        backend,
        sidecar: {
          editorState: dec._editorState, legacyState: dec._weebpaintState,
          referenceFiles: [...dec._referenceFiles].map(([path, bytes]) => ({ path, bytes })),
          wroteWith: dec._wroteWith,
          editorStateBytes: dec._editorStateBytes,
          timelapse: dec._timelapseJson != null ? { json: dec._timelapseJson, mp4: dec._timelapseMp4 ?? new Uint8Array(0) } : null,
          extraEntries: [...dec._extraEntries].map(([path, bytes]) => ({ path, bytes })),
        },
      };
    }
    if (fmt === "psd") {
      // C7 后棒实勘：全仓不存在 psd 解码器——psd 是**只写格式**（导出 = backend/psd.ts encodeDocToPsd，
      // exporters 懒加载）。open 对 8BPS 响亮失败是终态，不是待接的路由（要导入 psd = 新功能，另立项）。
      throw new Error("WeebPaintBackend.open: no psd decoder (psd is write-only) — re-save as .ora/.png and import that");
    }
    const plane = fmt === "png"
      ? await decodePngToBytes(bytes)
      : await (inject.imageDecoder ?? (() => { throw new Error("WeebPaintBackend.open: non-png bitmaps need an injected imageDecoder"); }))(bytes);
    const backend = new WeebPaintBackend(singleImageData(plane), inject);
    return { backend, sidecar: { referenceFiles: [], wroteWith: null } };
  }

  // ── 生命周期 ──

  get disposed(): boolean { return this._disposed; }

  dispose(): void {
    if (this._disposed) return;
    this._disposed = true;
    // interrupt=cancel 家规：open stroke/filter → 先取消（令牌收口、无痕）再释放。
    if (this._stroke) { const st = this._stroke; this._stroke = null; st.session.cancel(); }
    if (this._filter) { const fs = this._filter; this._filter = null; fs.token.cancel(); }
    // 栅格域退租（C8 ⑥）：room.dispose 释放 arena/IndexTexture/pseudo 纹理——注入共享 Port 时
    // Port.arenaStats 同步减（真 GPU 显式 free；SoftGl2 弃引用交 GC）。懒建未发生 = 本就零持有。
    if (this._room) { this._room.dispose(); this._room = null; this._raster = null; }
    // 换 1×1 空根释放当前 doc 全部 tileset → 清栈释放 undo 持有 → 观察者退租。
    this._wp2.load(blankData({ width: 1, height: 1 }));
    this._history.clear();
    this._wp2.layerTiles.dispose();
    this._listeners.clear();
  }

  private _guard(): void {
    if (this._disposed) throw new Error("WeebPaintBackend: disposed (switching artwork = discard and rebuild)");
  }

  // ── 字节面 ──

  async encodeOra(opts: { editorSidecar?: object | Uint8Array; referenceFiles?: { path: string; bytes: Uint8Array }[];
                          timelapse?: { json: string; mp4: Uint8Array } | null; extraEntries?: { path: string; bytes: Uint8Array }[] } = {}): Promise<Uint8Array> {
    this._guard();
    // merged 合成（mergedimage/缩略图）：合成面可用则渲（per-tenant 注入，缺省全局接缝），GL 缺席 →
    // null → 透明占位（层数据完整，mergedimage 只是预览件——与 autosave GL-lost 兜底同语义）。
    const merged = this._compositor(this._view.layers, this._view.width, this._view.height);
    const frozen = paintingDataToEncodeDoc(this._wp2.exportData());
    const blob = await encodeDocToOra(frozen, {
      wroteWith: this._inject.appVersion ?? "",
      mergedBytes: merged,
      desk: opts.editorSidecar,
      referenceFiles: opts.referenceFiles ? new Map(opts.referenceFiles.map((f) => [f.path, f.bytes])) : undefined,
      timelapse: opts.timelapse,
      extraEntries: opts.extraEntries ? new Map(opts.extraEntries.map((f) => [f.path, f.bytes])) : undefined,
    }) as Blob;
    return new Uint8Array(await blob.arrayBuffer());
  }

  async exportImage(fmt: "png" | "jpg"): Promise<Uint8Array> {
    this._guard();
    const merged = this._compositor(this._view.layers, this._view.width, this._view.height);
    if (!merged) throw new Error("exportImage: no compositor available (no GL/soft inject) — failing loudly, no placeholder output");
    if (fmt === "png") return encodePngFromBytes(merged.data, merged.w, merged.h);
    const enc = this._inject.jpgEncoder;
    if (!enc) throw new Error("exportImage: jpg needs an injected jpgEncoder (shell canvas domain)");
    return enc(merged);
  }

  // ── 读面 ──

  docInfo(): BackendDocInfo {
    this._guard();
    let leaves = 0;
    this._wp2.layerTree!.eachLeaf(() => leaves++);
    return {
      width: this._view.width, height: this._view.height,
      activeId: this._view.activeId, referenceLayerId: this._view.referenceLayerId,
      layerCount: leaves,
    };
  }

  layerTree(): BackendLayerNode[] {
    this._guard();
    const walk = (ns: readonly TreeNode[]): BackendLayerNode[] => ns.map((n) => isGroupNode(n)
      ? { id: n.id, name: n.name, visible: n.visible, opacity: n.opacity, mode: n.mode, clippingMask: n.clippingMask, children: walk(n.children) }
      : { id: n.id, name: n.name, visible: n.visible, opacity: n.opacity, mode: n.mode, clippingMask: n.clippingMask, lockAlpha: n.lockAlpha });
    return walk(this._wp2.layerTree!.view().nodes);
  }

  isDirty(): boolean { this._guard(); return this._wp2.isDirty(); }
  markSaved(): void { this._guard(); this._wp2.markSaved(); }

  // ── 层结构 verbs（LayersFace 穿接口衣：ViewLeaf → id 投影，其余原样）──

  layerAdd(name?: string): BackendAddResult {
    this._guard();
    const r = this._layers.addLayer(name);
    return r.ok ? { ok: true, id: r.layer.id } : { ok: false, msg: r.msg };
  }
  layerDuplicate(id: number): BackendAddResult {
    this._guard();
    const r = this._layers.duplicateNode(id);   // 叶或组皆可（组=递归深拷）
    return r.ok ? { ok: true, id: r.layer.id } : { ok: false, msg: r.msg };
  }
  layerRemove(id: number): BackendOpResult { this._guard(); return this._layers.removeLayer(id, ""); }
  layerMove(id: number, delta: number): BackendOpResult { this._guard(); return this._layers.moveLayer(id, delta); }
  layerMergeDown(id: number): BackendOpResult { this._guard(); return this._layers.mergeDown(id); }
  layerSetProp(id: number, prop: "name" | "visible" | "opacity" | "mode" | "clippingMask" | "lockAlpha", value: string | number | boolean): BackendOpResult {
    this._guard();
    return this._layers.setLayerProp(id, prop, value);
  }
  layerSetActive(id: number): boolean { this._guard(); return this._layers.setActive(id); }
  layerClear(id: number): BackendOpResult { this._guard(); return this._layers.clearLayer(id); }
  setReferenceLayer(id: number | null): BackendOpResult { this._guard(); return this._layers.setReferenceLayer(id); }

  // ── doc 几何 verbs（C8：MCP 验收点名 crop；doc-ops runDocTransform 的 headless 同构——
  //    同一批 substrate verbs（resizeAllLeaves exchange/树 setTreeProp/选区 pre-applied/persp remap），
  //    UI 随行（viewport shift/fitToScreen/尺寸标签）是壳的 step.hint，headless 不存在）──

  crop(x: number, y: number, w: number, h: number): BackendOpResult {
    this._guard();
    this._txGuard("crop");
    const cx = Math.round(x), cy = Math.round(y), cw = Math.round(w), ch = Math.round(h);
    if (!Number.isFinite(cx) || !Number.isFinite(cy) || cw < 1 || ch < 1 || cw > 8192 || ch > 8192) {
      return { ok: false, msg: `crop: invalid rect (w/h must be within 1..8192, got ${w}x${h})` };
    }
    const res = this._history.withPoint("docTransform", {}, () => {
      this._wp2.layerTiles.resizeAllLeaves((_id, lp) => lp.cropped(cx, cy, cw, ch));
      const tree = this._wp2.layerTree!;
      if (cw !== this._view.width) tree.setTreeProp("width", cw);
      if (ch !== this._view.height) tree.setTreeProp("height", ch);
      const oldSel = this._view.selection;
      if (oldSel) {
        const mapped = oldSel.croppedTo(cx, cy, cw, ch);
        if (mapped !== oldSel) {
          this._view.selection = mapped;                // pre-applied：before 所有权交组件 record
          this._wp2.selection.commitPreApplied(oldSel);
        }
      }
      this._wp2.persp.remapForDocTransform((p) => ({ x: p.x - cx, y: p.y - cy }));   // ADR-0006：VP 随裁剪平移
    });
    return res.ok ? { ok: true } : { ok: false, msg: res.msg };
  }

  // ── undo（open transaction 期间响亮拒绝——不能放行到 History：workpiece beforeApply 的 throw
  //    会被 History 当 swap 中途失败走不可恢复协议弃整栈，所以令牌墙必须在本门口挡）──

  private _txGuard(op: string): void {
    if (this._stroke) throw new Error(`${op}: open stroke in progress (single-token wall — strokeEnd/strokeCancel first)`);
    if (this._filter) throw new Error(`${op}: open filter in progress (single-token wall — filterCommit/filterCancel first)`);
  }

  undo(): boolean { this._guard(); this._txGuard("undo"); return this._history.undo(); }
  redo(): boolean { this._guard(); this._txGuard("redo"); return this._history.redo(); }
  canUndo(): boolean { this._guard(); return this._history.canUndo(); }
  canRedo(): boolean { this._guard(); return this._history.canRedo(); }

  // ── 多步事务档口 · stroke 档（C8 接通：StrokeSession 进程内升格，栅格域 = inject.gl 缺省 SoftGl2Port）──

  // 栅格域懒建：预算与浏览器壳同款 256MB（软 arena 初始 64 slice 按需长，闲置 backend 零付费）。
  private _ensureRaster(): RasterService {
    if (!this._raster) {
      const port = this._inject.gl ?? new SoftGl2Port();
      this._room = new GlRoom(port, poolCapacityForBudget(256 * 1024 * 1024));
      this._raster = new RasterService(this._room);
    }
    return this._raster;
  }

  // StrokeSession 的注入面（input.ts _strokeDeps 的 headless 化身）：屏显三口（commitStamps 走本
  // backend 的栅格域、invalidate/setShadows 无屏 no-op——brush/eraser 档口只用 overlay/livesync 宿）。
  private _strokeSessionDeps(): StrokeSessionDeps {
    return {
      begin: (label) => this._wp2.begin(label),
      tokenChanged: (layerId) => this._wp2.layerTiles.tokenChanged(layerId),
      tokenBeforeImage: (layerId) => this._wp2.layerTiles.tokenBeforeImage(layerId),
      getSelection: () => this._view.selection,
      commitStamps: (cs) => this._commitStamps(cs),
      invalidate: () => {},
      setShadows: () => {},
      // 2026-09-18 区域程序（手指 / 模糊 / 锐化）：headless 也真做——栅格域同一个 GlRoom（缺省 SoftGl2Port 的 CPU 孪生跑）。
      openRegion: (leaf, opts) => this._openRegion(leaf, opts),
      setRegions: () => {},   // 无屏：不挂 overlay
      commitRegion: (region) => this._commitRegion(region),
    };
  }

  private _regionLayers = new Map<RegionStroke, { id: number; pixels: LayerPixels; applyRegionDiff: (x: number, y: number, w: number, h: number, px: Uint8ClampedArray) => { tx: number; ty: number }[] }>();
  private _openRegion(leaf: { id: number; pixels: LayerPixels; lockAlpha?: boolean; applyRegionDiff: (x: number, y: number, w: number, h: number, px: Uint8ClampedArray) => { tx: number; ty: number }[] }, opts: { snapshot: boolean }): RegionStroke {
    this._ensureRaster();
    const sel = this._view.selection;
    const m = sel ? sel.bboxMask() : null;
    const region = new RegionStroke(this._room!, leaf.id, leaf.pixels, this._view.width, this._view.height,
      m ? { data: m.data, ox: m.x, oy: m.y, ow: m.w, oh: m.h } : null, { lockAlpha: !!leaf.lockAlpha, snapshot: !!opts.snapshot });
    this._regionLayers.set(region, leaf);
    return region;
  }
  // board.commitRegionStroke 的 headless 同构：W 当 overlay（replace）走 bakeStamps 写回链；没写过 = no-op（true）。
  private _commitRegion(region: RegionStroke): boolean {
    const leaf = this._regionLayers.get(region);
    this._regionLayers.delete(region);
    if (!leaf) return false;
    const ov = region.overlay();
    if (ov.bw <= 0 || ov.bh <= 0) return true;
    return this._ensureRaster().bakeStamps(leaf.id, leaf.pixels, ov, this._view.width, this._view.height,
      (px, x, y, w, h) => leaf.applyRegionDiff(x, y, w, h, px));
  }

  // board._overlayInputFrom + commitBrushStroke 的 headless 同构（SSoT 语义一字不动：
  // selection/lockAlpha/erase/blendMode/Π-outer opacity 全在 shader，bake = live 同一管线）。
  private _commitStamps(cs: StampCollect): boolean {
    const layer = cs.layer;
    const sel = this._view.selection;
    const m = sel ? sel.bboxMask() : null;
    return this._ensureRaster().bakeStamps(layer.id, layer.pixels, {
      stamps: cs.stamps, shape: cs.shape, bx: cs.bx, by: cs.by, bw: cs.bw, bh: cs.bh,
      layerId: layer.id, opacity: cs.opacity, erase: cs.mode === "erase", blendMode: cs.blendMode,
      lockAlpha: !!layer.lockAlpha,
      selMask: m ? { data: m.data, ox: m.x, oy: m.y, ow: m.w, oh: m.h } : null,
    }, this._view.width, this._view.height,
    (px, x, y, w, h) => layer.applyRegionDiff(x, y, w, h, px));
  }

  private _requireStroke(id: StrokeId) {
    const st = this._stroke;
    if (!st || st.id !== id) throw new Error(`stroke gate: no such open stroke (id=${id})`);
    return st;
  }

  strokeBegin(leafId: number, brush: ResolvedBrushSnapshot): StrokeId {
    this._guard();
    if (this._stroke) throw new Error("strokeBegin: a stroke is already open — End/Cancel first (single-token wall, loud reject, no queueing)");
    if (this._filter) throw new Error("strokeBegin: open filter in progress — filterCommit/filterCancel first (single-token wall)");
    const node = findViewNodeById(this._view.layers, leafId);
    if (!node || node.isGroup) throw new Error(`strokeBegin: leaf missing or is a group (id=${leafId})`);
    const layer = node as ViewLeaf;
    // 快照钉细（接口文件 §snapshot）：扁平 ResolvedBrush 字段 + 可选 mode；缺字段 DEFAULT_CONFIG 兜底
    //（user mental model：console 设一下工具也能画——MCP 只传 {size,color} 也出完整可画的笔）。
    const settings = Object.freeze({ ...DEFAULT_CONFIG, ...brush }) as ResolvedBrush;
    const mode = (brush as { mode?: unknown }).mode === "erase" ? "erase" : "brush";
    const clamp01 = (v: unknown) => Math.max(0, Math.min(1, typeof v === "number" ? v : 0));
    // 平滑推导 = input._resolveSmooth 的 backend 版：常数吃 SMOOTH_DEFAULTS（headless 无 prefs，
    // 决定论要求常数固定）；deadzone 单位 = doc px（无 viewport，scale≡1）。pixelMode 无平滑（同壳）。
    const smooth = settings.pixelMode ? {} : {
      tau: clamp01(settings.streamline) * SMOOTH_DEFAULTS.tauMaxMs,
      deadzone: clamp01(settings.stabilization) * SMOOTH_DEFAULTS.stabMaxPx,
      tailBow: SMOOTH_DEFAULTS.tailBow,
    };
    const engine = new BrushEngine();
    // 预览宿（census §3.4）：buffered=overlay（headless 下即「无」——描边活在 smoother，零 substrate 写）；
    // pixelMode=livesync（stroke 档合法的令牌内真层写）。session 构造即 wp2.begin 开令牌（fail-loud）。
    const session = new StrokeSession(this._strokeSessionDeps(), engine, [layer],
      { historyType: "stroke", finalize: true }, settings.pixelMode ? "livesync" : "overlay");
    const id = ++this._strokeSeq;
    this._stroke = { id, session, engine, settings, mode, smooth, begun: false };
    return id;
  }

  strokeAppend(id: StrokeId, points: Float32Array): void {
    this._guard();
    const st = this._requireStroke(id);
    if (points.length % 4 !== 0) throw new Error("strokeAppend: points must be a stride-4 (x,y,p,t) sequence");
    for (let i = 0; i < points.length; i += 4) {
      const x = points[i], y = points[i + 1], p = points[i + 2], t = points[i + 3];
      const tt = Number.isFinite(t) ? t : null;
      if (!st.begun) {
        // 引擎 begin 迟到首点（strokeBegin 无坐标）；t = 事件钟起点锚（压感 LPF/平滑同一口钟，ADR-0009）。
        st.engine.beginStroke(st.session.targets[0], st.settings, x, y, p, st.mode, st.smooth, tt);
        st.begun = true;
      } else {
        st.session.extend(x, y, p, tt);
      }
    }
  }

  strokeEnd(id: StrokeId): boolean {
    this._guard();
    const st = this._requireStroke(id);
    this._stroke = null;
    const before = this._histRev;
    st.session.end();   // GPU/软 bake + 选区 finalize + 令牌 commit（S8 语义，StrokeSession SSoT）
    return this._histRev > before;   // no-op 笔画（collector 空）不 push → false
  }

  strokeCancel(id: StrokeId): void {
    this._guard();
    const st = this._requireStroke(id);
    this._stroke = null;
    st.session.cancel();   // 引擎丢状态 + 令牌 cancel（livesync 时 collector 倒序回滚），无痕
  }
  // ── 多步事务档口 · filter 档（C8 接通：filters-adjust surrogate 的 headless 升格——
  //    begin 冻结源 + 开令牌；setParams 纯函数从冻结源重 bake（不累积）；commit 落层一步；
  //    cancel 无痕（真层零写，预览全在 out buffer）。kernel 清单 = backend/filters/index.ts）──

  private _requireFilter(id: FilterSessionId) {
    const fs = this._filter;
    if (!fs || fs.id !== id) throw new Error(`filter gate: no such open filter session (id=${id})`);
    return fs;
  }

  filterBegin(leafId: number, filterId: string): FilterSessionId {
    this._guard();
    if (this._stroke) throw new Error("filterBegin: open stroke in progress — strokeEnd/strokeCancel first (single-token wall)");
    if (this._filter) throw new Error("filterBegin: a filter session is already open — Commit/Cancel first (single-token wall, loud reject, no queueing)");
    const kernel = getFilterKernel(filterId);   // 未注册 id → 响亮 throw
    const node = findViewNodeById(this._view.layers, leafId);
    if (!node || node.isGroup) throw new Error(`filterBegin: leaf missing or is a group (id=${leafId})`);
    const leaf = node as ViewLeaf;
    const bx = leaf.bboxX, by = leaf.bboxY, bw = leaf.bboxW, bh = leaf.bboxH;
    if (bw <= 0 || bh <= 0) throw new Error(`filterBegin: layer has no pixels (id=${leafId}) — region filter is meaningless on an empty layer`);
    // begin 即开令牌（adjust surrogate 同语义：预览期真层零写，collector 空 → cancel 无痕）。
    const token = this._wp2.begin("adjust");
    const src = leaf.pixels.getRegion(bx, by, bw, bh);
    const sel = this._view.selection;
    const mask = sel ? sel.materializeMaskRegion(bx, by, bw, bh) : null;
    const id = ++this._filterSeq;
    this._filter = { id, kernel, leaf, token, bx, by, bw, bh, src, out: src.slice(), mask, params: kernel.defaults() };
    return id;
  }

  filterSetParams(id: FilterSessionId, params: Record<string, unknown>): void {
    this._guard();
    const fs = this._requireFilter(id);
    // 部分参数合并到 defaults 底座（MCP 只传 {brightness:50} 也是完整参数集）；重算永远从冻结源起。
    fs.params = { ...fs.params, ...params };
    fs.kernel.bake(fs.src, fs.out, fs.params, fs.mask, fs.bw, fs.bh);
  }

  filterCommit(id: FilterSessionId): boolean {
    this._guard();
    const fs = this._requireFilter(id);
    this._filter = null;
    const before = this._histRev;
    // 逐 tile memcmp 只封真变 tile（adjust C6 顺手账同款）——identity bake → 零扣押 → 不占步。
    fs.leaf.applyRegionDiff(fs.bx, fs.by, fs.bw, fs.bh, fs.out);
    fs.token.commit();
    return this._histRev > before;
  }

  filterCancel(id: FilterSessionId): void {
    this._guard();
    const fs = this._requireFilter(id);
    this._filter = null;
    fs.token.cancel();   // 真层从未被写（预览全在 out）→ collector 空，无痕收口
  }

  // ── 事件 ──

  onChange(cb: (ev: BackendChangeEvent) => void): () => void {
    this._listeners.add(cb);
    return () => { this._listeners.delete(cb); };
  }

  private _emit(): void {
    if (this._disposed || this._listeners.size === 0) return;
    const ev: BackendChangeEvent = { canUndo: this._history.canUndo(), canRedo: this._history.canRedo(), isDirty: this._wp2.isDirty() };
    for (const cb of this._listeners) cb(ev);
  }
}

export type { PaintingData, PaintingDataNode };
