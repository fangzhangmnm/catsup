// 笔画事务 StrokeSession（C5，提案 §6.1「累积真改 → stroke 档」的唯一档口）。
//
// 一次手势 = 一个 session = 一个 wp2 令牌 = 一步 undo；no-op 笔画（collector 空）不占步。
// **全部笔类共用这一个档口**（brush/eraser/形状笔/液化/filterBrush——census §3.8：差异全在
// ResolvedBrush 快照与 engineKey 内部，不需要 per-tool 档口）。session 对象 = 令牌句柄
// （backend interface `strokeBegin(...): StrokeId` 的进程内化身；C7 api 化时逐字升格）。
//
// 分工（§6.2 两层防线）：input（frontend）只做手势路由 + 投喂 (x,y,p,t) + EditMode fail-safe；
// 令牌开合 / GPU commit / 选区 finalize / 记账编排全在这（令牌墙 fail-loud 兜底）。
// begin 即开令牌（单令牌墙：第二个 begin 会被 workpiece throw——响亮拒绝，不排队不静默）；
// 引擎 beginStroke 由调用方随后自调（各引擎 begin 签名不同：brush 8 参 / filterBrush 吃
// Filter+params+selection）；**引擎的写靶 = session.target**（shadow 模式下是替身叶，真叶只在
// 收口一刻被令牌写）；begin 失败调用方必须 cancel() 收口令牌，否则后续 begin 全被挡死。
//
// 预览宿三态（C6，census §3.4「预览有三种宿」）：
//   overlay  —— buffered 笔（brush/形状笔）：描边活在 smoother/stamps，GPU overlay 显示，零 substrate 写。
//   livesync —— draw/erase pixelMode：stroke 档合法的令牌内真层就地写（§6.1），live-sync 每帧增量重传。
//   shadow   —— 形状笔 pixelMode 等（液化 09-19 起改 region）：引擎写**替身叶**（StrokeShadow，零拷贝快照起步，
//               「预览是引擎自持物」成立）；显示走 surrogate 影子变体（per-tile 增量上传，句柄共享免费）；
//               End 按 tile 句柄 diff 落账真层（undo 只含真变 tile）；Cancel 丢替身零回滚。
//
// 多叶（2026-08-28，液化对图层组）：session 收 layers[]（其余笔类恒 1 叶），shadow 模式一叶一个
// 替身、收口逐叶 commitTo；引擎拿 targets[]。「一次手势 = 一个令牌 = 一步 undo」不变——组液化
// N 叶的像素改动全在同一个令牌里，ctrl-z 整组一起退。
//
// deps 全函数面：原 input._endStroke/_abortStroke 摸过的六个点 + shadow 显示注入（setShadows）。
// commitStamps/invalidate/setShadow 是屏显侧（board）的注入——终态归 backend 自持（Gl2Port），C7/C8 收编。

import type { BrushEngine } from "./brush.ts";
import type { ViewLeaf, ViewLeafSnap } from "./workpiece/painting-view.ts";
import type { WriteToken } from "./workpiece/workpiece.ts";
import type { Selection } from "./selection.ts";
import { LayerPixels, disposePixelsSnapshot } from "./tiles/tile-layer.ts";
import { TILE_SIZE } from "../common/tile-geometry.ts";
import type { RegionStroke } from "./gl/region-stroke.ts";   // preview="region" 的 GPU 驻留写靶（2026-09-18）

export type StampCollect = NonNullable<ReturnType<BrushEngine["collectStamps"]>>;

// 引擎的事务面（结构类型；C7 搬 backend 后不再点名具体引擎类——液化=filterBrush 的
// LiquifyFilter payload（v132 起无直连双轨）、形状笔、BrushEngine 都满足此面）。
// extendStroke 四参：filterBrush 三参版可赋（少参函数可赋多参位）；endStroke 只有
// buffered 笔返 StampCollect（filterBrush/形状笔 pixelMode 返 void/null → session 视 null）。
export interface StrokeEngine {
  extendStroke(x: number, y: number, pressure: number, t?: number | null): void;
  endStroke(): StampCollect | null | void;
  cancelStroke(): void;
  flushDirty(): [number, number, number, number] | null;
  collectStamps?(): StampCollect | null;
}

/** 预览宿（census §3.4；见文件头）。 */
export type StrokePreview = "overlay" | "livesync" | "shadow" | "region";   // region（2026-09-18）：GPU 驻留 RegionStroke（手指 / 模糊 / 锐化）

export interface StrokeSessionDeps {
  /** wp2.begin —— 单令牌墙的开口（第二个 begin → throw） */
  begin(historyType: string): WriteToken;
  /** LayerTiles.tokenChanged —— 本令牌内该层是否真动过（finalize 谓词，防白付物化钱） */
  tokenChanged(layerId: number): boolean;
  /** LayerTiles.tokenBeforeImage —— 笔前像素现算（finalize 的 pre 图；只在真动过时才调） */
  tokenBeforeImage(layerId: number): Parameters<Selection["applyMaskPostStroke"]>[1];
  /** doc.selection 读面（finalize 兜底用；无选区 → null） */
  getSelection(): Selection | null;
  /** board.commitBrushStroke —— GPU merge（live 同一 shader）。true = 选区已在 shader 裁 */
  commitStamps(cs: StampCollect): boolean;
  /** board.invalidateAll —— 落层/回滚后的重渲通知 */
  invalidate(): void;
  /** board.setStrokeShadows —— shadow 预览宿的显示注入（surrogate 影子变体；空数组 = 关）。
   *  组液化一次挂 N 个替身（一叶一个），board 侧按 layerId 换源。 */
  setShadows(entries: readonly { layerId: number; pixels: LayerPixels }[]): void;
  /** 2026-09-18 区域程序（GPU 驻留写靶）：board.openRegionStroke —— 造一笔的 RegionStroke（caps 守卫 / 显存不够 / 无 GL → throw） */
  openRegion(leaf: ViewLeaf, opts: { snapshot: boolean }): RegionStroke;
  /** board.setStrokeRegions —— 描边期每帧各 W 当 overlay（replace；组液化 N 叶 N 张）；[] = 关 */
  setRegions(regions: readonly RegionStroke[]): void;
  /** board.commitRegionStroke —— = bakeStamps 写回链（GPU merge→readPixels→applyRegionDiff→收养），在令牌内；false = 没落层 */
  commitRegion(region: RegionStroke): boolean;
}

// begin 期策略（engine-registry PIXEL_STROKE_SPECS 的子集：session 只关心事务面）
export interface StrokeSessionSpec {
  /** 令牌事务标签（wp2.begin(label)） */
  historyType: string;
  /** 抬笔是否按选区 applyMaskPostStroke（filterBrush 在 begin 已吃 selection → false） */
  finalize: boolean;
  /** preview="region" 时要不要起笔快照 W₀（wash 类 filter 声明 strokeSnapshot） */
  regionSnapshot?: boolean;
}

// ---- StrokeShadow：stroke 档的替身叶（C6，census §6.1 施工单）----
// 引擎写靶的替身：像素 = 真叶的零拷贝快照克隆（tile 句柄共享），呈现 ViewLeaf 的引擎读写面
// （bbox/getImageData/putImageData/editRegionBytes/snapshot 系——引擎无感）。真叶在描边期零写。
// 观察者纪律：token 开着时替身的 tile 换手也会被 collector 扣押，但 seal 时按「解析不到 layerId
// 的实例扣押作废」（layer-tiles 既有机制，正是为临时实例留的）——不入 undo、不占步。
// 显示：board 走 surrogate 影子变体 syncLeafSafe(pixels)——未变 tile 与真叶共享句柄，GPU 桥按
// 句柄 id 去重 → per-tile 增量上传免费（对比 adjust 平面替身的全 bbox 重传）。
export class StrokeShadow {
  readonly pixels: LayerPixels;
  readonly id: number;
  readonly isGroup = false as const;
  readonly lockAlpha: boolean;
  readonly docW: number;
  readonly docH: number;
  private _bounds: { b: { x: number; y: number; w: number; h: number } | null; forRev: number } | null = null;

  constructor(layer: ViewLeaf) {
    this.id = layer.id;
    this.lockAlpha = layer.lockAlpha;
    const lp = layer.pixels;
    this.docW = lp.docW;
    this.docH = lp.docH;
    this.pixels = new LayerPixels(lp.docW, lp.docH);
    const snap = lp.snapshot();
    this.pixels.restore(snap);
    disposePixelsSnapshot(snap);
  }

  // ---- ViewLeaf 引擎面（painting-view.ts 同款语义）----
  private _contentBounds(): { x: number; y: number; w: number; h: number } | null {
    const rev = this.pixels.contentVersion;
    if (this._bounds && this._bounds.forRev === rev) return this._bounds.b;
    this._bounds = { b: this.pixels.contentBounds(true), forRev: rev };
    return this._bounds.b;
  }
  get bboxX(): number { return this._contentBounds()?.x ?? 0; }
  get bboxY(): number { return this._contentBounds()?.y ?? 0; }
  get bboxW(): number { return this._contentBounds()?.w ?? 0; }
  get bboxH(): number { return this._contentBounds()?.h ?? 0; }

  editRegionBytes(x0: number, y0: number, w: number, h: number, fn: (buf: Uint8ClampedArray, ox: number, oy: number) => void): void {
    if (w <= 0 || h <= 0) return;
    const buf = this.pixels.getRegion(x0, y0, w, h);
    fn(buf, x0, y0);
    this.pixels.putRegion(x0, y0, w, h, buf);
  }
  getImageData(docX: number, docY: number, w: number, h: number): ImageData {
    return new ImageData(this.pixels.getRegion(docX, docY, w, h), w, h);
  }
  putImageData(docX: number, docY: number, img: ImageData): void {
    this.pixels.putRegion(docX, docY, img.width, img.height, img.data);
  }
  sampleAt(docX: number, docY: number): [number, number, number, number] {
    return this.pixels.sampleAt(Math.floor(docX), Math.floor(docY)) as [number, number, number, number];
  }
  snapshot(): ViewLeafSnap { return { pixels: this.pixels.snapshot() }; }
  restoreFromSnapshot(snap: ViewLeafSnap): void { this.pixels.restore(snap.pixels); }
  snapshotImageData(): { bboxX: number; bboxY: number; bboxW: number; bboxH: number; imageData: ImageData | null } {
    const b = this.pixels.contentBounds(true);
    if (!b) return { bboxX: 0, bboxY: 0, bboxW: 0, bboxH: 0, imageData: null };
    return { bboxX: b.x, bboxY: b.y, bboxW: b.w, bboxH: b.h, imageData: new ImageData(this.pixels.getRegion(b.x, b.y, b.w, b.h), b.w, b.h) };
  }

  // ---- 收口：句柄 diff 落账真层（token 内；putTile 走观察者 → undo 只含真变 tile）----
  // 未变 tile 与真叶同句柄（快照克隆 + CoW：任何真写换新句柄）→ diff = 引擎真触过的 tile 集，
  // 与今日 in-place 路径的 collector 扣押集逐 tile 相同（undo 包不涨）。删格（被擦空回收）写
  // 全透明 → _setTileBuf 回收真层同格。
  commitTo(layer: ViewLeaf): void {
    const real = layer.pixels;
    const puts: { tx: number; ty: number; bytes: Uint8ClampedArray }[] = [];
    this.pixels.forEachTileHandle((tx, ty, h) => {
      const cur = real.getTileHandle(tx, ty);
      if (!cur || cur.id !== h.id) puts.push({ tx, ty, bytes: h.clampedView() });
    });
    const dels: { tx: number; ty: number }[] = [];
    real.forEachTileHandle((tx, ty) => {
      if (!this.pixels.getTileHandle(tx, ty)) dels.push({ tx, ty });
    });
    for (const p of puts) real.putTile(p.tx, p.ty, p.bytes);
    if (dels.length) {
      const zeros = new Uint8ClampedArray(TILE_SIZE * TILE_SIZE * 4);
      for (const d of dels) real.putTile(d.tx, d.ty, zeros);
    }
  }

  dispose(): void { this.pixels.dispose(); }
}

export class StrokeSession {
  readonly engine: StrokeEngine;
  /** 本笔触写的真叶（恒 ≥1；组液化 = 组内全部叶，其余笔类恒 1 叶） */
  readonly layers: readonly ViewLeaf[];
  /** 描边中原地写真层（draw/erase pixelMode）——board live-sync 判据 */
  readonly inPlace: boolean;
  /** 引擎写靶（与 layers 同序同长）：shadow 模式 = 替身叶（真叶描边期零写），否则真叶。
   *  引擎 beginStroke 必须喂它。 */
  readonly targets: readonly ViewLeaf[];
  private readonly finalize: boolean;
  private readonly token: WriteToken;
  private readonly deps: StrokeSessionDeps;
  private _shadows: StrokeShadow[] = [];
  private _regions: RegionStroke[] = [];   // preview="region"：GPU 驻留写靶（单叶 1 个；组液化 N 个，2026-09-19）
  private _open = true;

  constructor(deps: StrokeSessionDeps, engine: StrokeEngine, layers: readonly ViewLeaf[], spec: StrokeSessionSpec, preview: StrokePreview) {
    if (!layers.length) throw new Error("StrokeSession: needs at least one target leaf");
    this.deps = deps;
    this.engine = engine;
    this.layers = layers;
    this.finalize = spec.finalize;
    this.inPlace = preview === "livesync";
    this.token = deps.begin(spec.historyType);
    if (preview === "region") {
      // GPU 驻留写靶（2026-09-18 区域程序；2026-09-19 多叶）：每叶一个 RegionStroke，各自的 W 就是预览 overlay（replace）；
      //   收口逐叶走 bakeStamps 写回链（同一令牌 = 一步 undo）；cancel = 全部 dispose 零回滚。
      try { for (const l of layers) this._regions.push(deps.openRegion(l, { snapshot: !!spec.regionSnapshot })); }
      catch (e) {   // caps 守卫 / 显存不够 / GL 丢失：已开的先 dispose，令牌收口再冒错（input 报状态栏 + 黑匣子）
        for (const r of this._regions) r.dispose();
        this._regions = [];
        this.token.cancel();
        throw e;
      }
      deps.setRegions(this._regions);
      this.targets = this._regions as unknown as ViewLeaf[];   // 引擎面 = StrokeTarget（RegionStroke 实现）
    } else if (preview === "shadow") {
      this._shadows = layers.map((l) => new StrokeShadow(l));
      deps.setShadows(this._shadows.map((s) => ({ layerId: s.id, pixels: s.pixels })));
      this.targets = this._shadows as unknown as ViewLeaf[];   // 引擎面同形（ViewLeaf 的引擎读写子集）
    } else {
      this.targets = layers;
    }
  }

  get open() { return this._open; }

  /** 投喂一个输入事件（x,y 为 doc 坐标；t = 事件 timeStamp，手感数学的唯一时钟） */
  extend(x: number, y: number, pressure: number, t: number | null = null) {
    this.engine.extendStroke(x, y, pressure, t);
  }
  /** ADR-0013 像素链尺：整数像素按序落点（引擎 stampPixels，每像素恰好一次，绕过 spacing 走步 / 弦）。引擎没有 stampPixels → no-op。 */
  stampPixels(pts: Array<{ x: number; y: number }>, pressure: number) {
    const eng = this.engine as { stampPixels?: (pts: Array<{ x: number; y: number }>, pressure: number) => void };
    eng.stampPixels?.(pts, pressure);
  }

  /** 引擎累积的 dirty bbox（board.markDocDirty 用）；无 → null */
  flushDirty() { return this.engine.flushDirty(); }

  /** GPU stamp overlay 拉取（brush/形状笔有；liquify/filterBrush 无 → null，走 shadow/live-sync） */
  collectStamps(): StampCollect | null {
    const eng = this.engine as { collectStamps?: () => StampCollect | null };
    return eng.collectStamps?.() ?? null;
  }

  // 抬笔收口（原 input._endStroke，S8 语义逐字迁入）：
  //   buffered（brush/形状笔）→ engine.endStroke 返 StampCollect → GPU commit（选区/锁α/blend/
  //   opacity 全在 shader，live 即 commit 所见）；livesync（draw/erase pixelMode）描边中已 in-place
  //   落层 → 只清状态；shadow（液化/filterBrush/形状笔 pixelMode）→ 替身句柄 diff 落账真层
  //   （唯一的真层写，在令牌内）。finalize（applyMaskPostStroke CPU 兜选区）只兜没走 GPU commit
  //   的路径，在 shadow 落账**之后**跑（pre 图从 collector 现算——只有真动过层且带选区才付物化钱；
  //   兜出来的回写仍在令牌内，undo 包不变）。
  end() {
    if (!this._open) return;
    this._open = false;
    const cs = (this.engine.endStroke() ?? null) as StampCollect | null;
    let gpuCommitted = false;
    if (cs && cs.stamps.length) gpuCommitted = this.deps.commitStamps(cs);
    if (this._regions.length) {
      const regions = this._regions;
      this._regions = [];
      let failed = 0;
      try { for (const r of regions) if (!this.deps.commitRegion(r)) failed++; }
      finally { this.deps.setRegions([]); for (const r of regions) r.dispose(); }
      if (failed) {
        // bakeStamps 返 false = 该叶什么都没写（GL 丢失 / 驻留不齐）：整笔令牌取消、响亮——不静默丢一笔 / 不落半组（家规：错误路径不许吞）
        this.token.cancel();
        this.deps.invalidate();
        throw new Error(`REGION_COMMIT_FAILED (${failed}/${regions.length} leaves did not land; stroke dropped, token cancelled)`);
      }
      gpuCommitted = true;
    }
    if (this._shadows.length) {
      this._shadows.forEach((sh, i) => sh.commitTo(this.layers[i]));
      this.deps.setShadows([]);
    }
    if (this.finalize && !gpuCommitted) {
      for (const layer of this.layers) {
        if (!this.deps.tokenChanged(layer.id)) continue;
        const sel = this.deps.getSelection();
        if (!sel) break;
        sel.applyMaskPostStroke(
          layer as unknown as Parameters<Selection["applyMaskPostStroke"]>[0],
          this.deps.tokenBeforeImage(layer.id));
      }
    }
    this.token.commit();
    this._disposeShadows();   // 令牌已关，释放不再进观察者
    this.deps.invalidate();
  }

  private _disposeShadows() {
    for (const sh of this._shadows) sh.dispose();
    this._shadows = [];
  }

  // 取消（原 input._abortStroke）：引擎丢状态；shadow 模式真层从未被写 → 丢替身即无痕（零回滚）；
  // livesync 模式 collector 倒序回滚（interrupt=cancel 家规）。
  cancel() {
    if (!this._open) return;
    this._open = false;
    this.engine.cancelStroke();   // shape pixelMode 会 preSnap-restore 到替身——无害（替身随即丢弃）
    if (this._regions.length) { const rs = this._regions; this._regions = []; this.deps.setRegions([]); for (const r of rs) r.dispose(); }   // 真层从未被写 → 零回滚
    if (this._shadows.length) this.deps.setShadows([]);
    this.token.cancel();
    this._disposeShadows();
    this.deps.invalidate();
  }
}
