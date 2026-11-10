// layer-tiles —— workpiece v2 的像素组件（tile 扁平仓 + collector，ADR-0008 §3；T2）。
// 取代 PixelTx 的「整层句柄快照」模型：**写时扣押**——令牌开着时，任何 LayerPixels 的 tile 换手
// 经 tile-layer.ts 的全局观察者上报到这里；每 (实例, key) 只收**第一次**换手的旧句柄
// （= 令牌前原件；同 token 内后续换手换下的是本 token 的中间产物，照常 release——Krita memento 语义）。
// 好处：undo 包只含真变过的 tile（旧模型整层 acquire），且**结构上收不漏**（engine 直写 layer.pixels
// 也会被观察者逮到并自动把本组件登记进 touched——写路径不必逐个改造）。
//
// record 形态（纯数据，ADR-0008 §2）：
//   { t:"tiles", layers:[{tilesetId, across, tiles:[key, 句柄|null][]}] }   null = 令牌前该格为空
//   computed 白名单（省内存可逆变换，双捕获断言）：{t:"flip"} / {t:"rot",dir} / {t:"offset",dx,dy}
// swap 自反：tiles = 逐格 _swapTileHandle 换手（所有权移交）；computed = 再变换一次（rot/offset 取逆参数）。
//
// **账按 tileset id 记，不按树上的层号**（2026-10-13 Claude Fable 5.1，ADR-0008 §6 可交换性契约）：
//   一步 = 各部件各一条「令牌前 ↔ 令牌后」差量，回放只按部件首触顺序倒放——这只在**各部件记录两两可交换**时成立。
//   旧账按层号记、swap 时经树找实例 = 像素账依赖树账的现状 → 出生层（像素账排在树账前）/ 死亡层（排在后）撤销必炸其一，
//   顺序怎么排都补不全（2026-10-10 真机「layer gone at undo swap」整栈清空案）。现在：
//   - 身份 = 注册表（_tilesets）里的 tileset id；在不在树上无关。swap 直接从注册表拿实例。
//   - record 持该 tileset 一个引用（seal 时 acquire、disposeRecord 时 release）→「账在、实例已死」结构上不可能。
//   - seal 时注册表里查不到的实例（从未入册的临时件 / 替身；或同一步里出生又死亡、所有持有者都已放手）作废、句柄释放。
//     这是唯一一条「丢了也没事」的判断，机械、不看树、不猜顺序。
// 配额规则沿旧栈：tile 压缩前记 0（走共享 raw 池配额）、压缩后记 compressedBytes/refCount。

import { LayerPixels, addTileSwapObserver } from "../tiles/tile-layer.ts";
import type { TileHandle } from "../tiles/cpu-tile-pool.ts";
import { tilesAcross, tileKey } from "../../common/tile-geometry.ts";
import type { RecordData } from "./undo-stack.ts";
import type { Workpiece, CollectorComponent } from "./workpiece.ts";

/** 层号 → 实例（verb / 读口 / computed 变换用）。T2 由 app 以 doc 树实现；T3 起归 LayerTree json。
 *  注意：undo 账**不**经这里解析身份（按 tileset id 直取注册表，见文件头）。 */
export interface TilesHost {
  getPixels(layerId: number): LayerPixels | null;
  eachLayer(cb: (layerId: number, lp: LayerPixels) => void): void;
  /** 换整个 tileset 实例（旧实例由 host 负责 dispose）。computed 变换 apply 用。 */
  replacePixels(layerId: number, np: LayerPixels): void;
}

interface TilesetDiff { tilesetId: number; across: number; tiles: [number, TileHandle | null][] }   // record 对 tilesetId 持一个 acquire
type TilesRecord =
  | { t: "tiles"; layers: TilesetDiff[] }
  | { t: "flip" }
  | { t: "rot"; dir: 1 | -1 }               // 1 = CCW（LayerPixels.rotated90CCW 的方向）
  | { t: "offset"; dx: number; dy: number }
  | { t: "exchange"; leaves: { tilesetId: number; lp: LayerPixels }[] };   // lp = 另一侧实例（所有权归 record）；按 tileset id 记 + 持引用，同 tiles 账

/** applyMaskPostStroke 的 preSnap 形状（原 pixel-tx PreSnapImage；selection.ts LayerSnapLike 同构）。 */
export interface PreSnapImage { bboxX: number; bboxY: number; bboxW: number; bboxH: number; imageData: ImageData | null }

export interface Rect { x: number; y: number; w: number; h: number }
export interface TileEntry { tx: number; ty: number; contentId: number; bytes(): Uint8ClampedArray }

export class LayerTiles implements CollectorComponent {
  readonly kind = "layerTiles";
  private _wp: Workpiece;
  private _host: TilesHost;
  private _collected = new Map<LayerPixels, Map<number, TileHandle | null>>();
  private _computed: TilesRecord | null = null;
  private _exchange: TilesRecord | null = null;
  private _suspend = 0;

  private _observerDispose: () => void;

  constructor(wp: Workpiece, host: TilesHost) {
    this._wp = wp;
    this._host = host;
    // 观察者（tile-layer.ts）：C7 起多播注册（旧单槽下第二个实例静默偷钩，双 backend = 坏账）。
    // 收集与否在 _onTileSwap gate：令牌开着且未 suspend + 所有权戳（有主且不是我的 → 跳过）。
    this._observerDispose = addTileSwapObserver((lp, key, old) => this._onTileSwap(lp, key, old));
  }

  /** 退租（WeebPaintBackend.dispose）：解除观察者注册。之后本实例不再收集（也不该再被写）。 */
  dispose(): void { this._observerDispose(); }

  /** 内部/装载协作面：自带记账的窗口挂起收集（exchange/computed verb 体内、load 灌入——收了=双记账）。 */
  _suspendCollect(on: boolean): void { this._suspend += on ? 1 : -1; }

  // ── tileset 注册表（T3，ADR-0008 §3）：id → 引用计数 tileset ──
  // 持有者 = LayerTree 的每个活根（substrate/collector/record 各按 json 里的 pixelsRef 出现 +1）。
  // 归零 → lp.dispose() 还池（TreeStructureOp 注释在案的 bounded 泄漏在 v2 下由这套算术消灭：
  // 删层的 tileset 被 undo record 的旧根持有，record 驱逐才真正释放）。
  private _tilesets = new Map<number, { lp: LayerPixels; refs: number }>();
  private _idOf = new Map<LayerPixels, number>();   // 反查：实例 → tileset id（seal 给扣押件定身份；换血 / 交换 / 释放同步维护）
  private _nextTilesetId = 1;

  // C7 所有权戳（多 tab 租户）：入册实例打上「归我管」标记——多播观察者按戳过滤，别的 backend
  // 的换手不进我的 collector。无戳实例（StrokeShadow 替身等临时件）保持旧语义：谁令牌开着谁扣押，
  // seal 解析不到 layerId 自动作废（layer-tiles 头注在案的机制）。
  private _stampOwner(lp: LayerPixels): void {
    (lp as LayerPixels & { _collectorOwner?: LayerTiles })._collectorOwner = this;
  }
  /** 有主实例离世（refs 归零/换血/record 驱逐）：先摘戳再 dispose——dispose 的逐格 notify
   *  发生在令牌外（record 驱逐/换文档清栈），摘了戳走「无主放行」路，不触发无令牌写硬化。 */
  private _disposeOwned(lp: LayerPixels): void {
    (lp as LayerPixels & { _collectorOwner?: LayerTiles })._collectorOwner = undefined;
    lp.dispose();
  }

  /** 新 tileset 入册，refs=1 归调用方（json 收养 +1 后调用方 release——净移交）。
   *  入册前在本令牌里被写过（explodeLeaf / collapseGroupToLeaf 都是先写新实例再入册）照常记账——账按 tileset id 记，
   *  seal 时经 _idOf 定身份，undo 时树账先后无关（文件头）。
   *  调用方只许传新建实例：带本 collector 所有权戳的实例（已入册 / 换血 / 交换过）拒收——同一实例两个 id = 注册表坏账。
   *  2026-10-13 Claude Fable 5.1。 */
  createTileset(lp: LayerPixels): number {
    if ((lp as LayerPixels & { _collectorOwner?: LayerTiles })._collectorOwner === this) {
      throw new Error("LayerTiles: createTileset on an instance already owned by this collector (pass a fresh LayerPixels)");
    }
    const id = this._nextTilesetId++;
    this._tilesets.set(id, { lp, refs: 1 });
    this._idOf.set(lp, id);
    this._stampOwner(lp);
    return id;
  }
  /** 零拷贝复制（句柄共享快照）：duplicateLayer 用。refs=1 归调用方。 */
  duplicateTileset(id: number): number | null {
    const e = this._tilesets.get(id);
    if (!e) return null;
    const np = new LayerPixels(e.lp.docW, e.lp.docH);
    this._suspendCollect(true);
    try {
      const snap = e.lp.snapshot();
      np.restore(snap);
      for (const [, h] of snap.tiles) h.release();   // snapshot 的持有已由 restore 的 acquire 接棒
    } finally {
      this._suspendCollect(false);
    }
    return this.createTileset(np);
  }
  acquireTileset(id: number): void {
    const e = this._tilesets.get(id);
    if (!e) throw new Error(`LayerTiles: acquire of nonexistent tileset (${id})`);
    e.refs++;
  }
  releaseTileset(id: number): void {
    const e = this._tilesets.get(id);
    if (!e) throw new Error(`LayerTiles: release of nonexistent tileset (${id} — double release?)`);
    if (--e.refs <= 0) {
      this._tilesets.delete(id);
      this._idOf.delete(e.lp);
      this._disposeOwned(e.lp);
    }
  }
  tilesetPixels(id: number): LayerPixels | null { return this._tilesets.get(id)?.lp ?? null; }
  /** computed 变换换实例（tileset id 稳定，内容换血；旧实例还池）。 */
  swapTilesetPixels(id: number, np: LayerPixels): void {
    const e = this._tilesets.get(id);
    if (!e) throw new Error(`LayerTiles: swap of nonexistent tileset (${id})`);
    this._idOf.delete(e.lp);
    this._disposeOwned(e.lp);
    e.lp = np;
    this._idOf.set(np, id);
    this._stampOwner(np);
  }
  /** 实例交换**不 dispose**（swapTilesetPixels 的非销毁变体）：旧实例所有权交还调用方——
   *  DocResizeOp（crop/resample 的 undo 包持前一侧实例）用。T3b-2 补。 */
  exchangeTilesetPixels(id: number, np: LayerPixels): LayerPixels {
    const e = this._tilesets.get(id);
    if (!e) throw new Error(`LayerTiles: exchange of nonexistent tileset (${id})`);
    const old = e.lp;
    this._idOf.delete(old);
    e.lp = np;
    this._idOf.set(np, id);
    this._stampOwner(np);
    return old;   // 旧实例所有权交调用方（戳留着无害：undo 包持有期不再进注册表，换手仍按戳归我）
  }
  /** 注册表观测（测试/泄漏审计）。 */
  tilesetCount(): number { return this._tilesets.size; }
  tilesetRefs(id: number): number { return this._tilesets.get(id)?.refs ?? 0; }

  // ── 读 · 档1 render 端口（零拷贝身份制）──
  version(layerId: number): number { return this._host.getPixels(layerId)?.contentVersion ?? -1; }
  *tiles(layerId: number): IterableIterator<TileEntry> {
    const lp = this._host.getPixels(layerId);
    if (!lp) return;
    const out: TileEntry[] = [];
    lp.forEachTileHandle((tx, ty, h) => out.push({ tx, ty, contentId: h.id, bytes: () => h.clampedView() }));
    yield* out;
  }
  contentBounds(layerId: number, tight = false): Rect | null {
    return this._host.getPixels(layerId)?.contentBounds(tight) ?? null;
  }

  // ── 读 · 档2 便捷（引擎/导出/吸管）──
  getRegion(layerId: number, x: number, y: number, w: number, h: number): Uint8ClampedArray {
    const lp = this._host.getPixels(layerId);
    if (!lp) return new Uint8ClampedArray(w * h * 4);
    return lp.getRegion(x, y, w, h);
  }

  // ── 写（token 开着才合法；collector 经观察者自动扣押）──
  putRegion(layerId: number, x: number, y: number, w: number, h: number, bytes: Uint8ClampedArray): void {
    this._write(layerId).putRegion(x, y, w, h, bytes);
  }
  editRegion(layerId: number, rect: Rect, fn: (buf: Uint8ClampedArray, ox: number, oy: number) => void): void {
    const lp = this._write(layerId);
    if (rect.w <= 0 || rect.h <= 0) return;
    const buf = lp.getRegion(rect.x, rect.y, rect.w, rect.h);
    fn(buf, rect.x, rect.y);
    lp.putRegion(rect.x, rect.y, rect.w, rect.h, buf);
  }
  /** 整层替换（merge-down/滤镜 commit）：清空 + rect 整块写入（= 旧 replaceFromBytes 语义）。 */
  replaceLayer(layerId: number, bytes: Uint8ClampedArray, rect: Rect): void {
    const lp = this._write(layerId);
    lp.clear();
    if (rect.w > 0 && rect.h > 0) lp.putRegion(rect.x, rect.y, rect.w, rect.h, bytes);
  }
  clearLayer(layerId: number): void { this._write(layerId).clear(); }

  // ── computed record 白名单（双捕获断言：verb 内 collector 必须零收集，否则 throw）──
  flipHorizontalAll(): void { this._computedVerb({ t: "flip" }); }
  rotate90All(dir: 1 | -1): void { this._computedVerb({ t: "rot", dir }); }
  offsetWrapAll(dx: number, dy: number): void { this._computedVerb({ t: "offset", dx, dy }); }

  /** 整 doc 几何 resize 的实例交换记账（crop/cropResample/resample；T5 收编 DocResizeOp）。
   *  逐叶 map 产新实例并交换装上；record = 旧实例集（undo 包 = 另一侧实例，swap 零拷贝互换）。
   *  map 期间收集挂起在**组件内**——新实例的 putRegion 若被写时扣押，seal 时已装上树会解析到
   *  layerId → 双记账 + across drift 炸 undo（T3b-2 施工时踩过的真雷，纪律收进 verb 不再靠调用方）。
   *  json 尺寸（width/height）由调用方另走 setTreeProp 进树 record，同 step 两账同向翻。 */
  resizeAllLeaves(map: (layerId: number, lp: LayerPixels) => LayerPixels): void {
    this._wp._componentWrite(this);
    if (this._exchange) throw new Error("LayerTiles: only one exchange record per token");
    if (this._computed) throw new Error("LayerTiles: exchange and computed record coexist on one token (multiple-parallel-path violation)");
    if (this._collectedCount() > 0) throw new Error("LayerTiles: token already collected tiles before exchange verb (double-capture assertion)");
    const leaves: { tilesetId: number; lp: LayerPixels }[] = [];
    this._suspendCollect(true);
    try {
      // 枚举仍按树（「改整幅」= 树上每一叶）；记账按 tileset id（swap 时不再经树找层——同 tiles 账的可交换性契约）。
      const jobs: [number, LayerPixels][] = [];
      this._host.eachLayer((id, lp) => {
        const tid = this._idOf.get(lp);
        if (tid === undefined) throw new Error(`LayerTiles: resize of an unregistered instance (layerId=${id})`);
        jobs.push([tid, map(id, lp)]);
      });
      for (const [tid, np] of jobs) {
        const old = this.exchangeTilesetPixels(tid, np);
        this.acquireTileset(tid);   // record 持引用（disposeRecord 归还）
        leaves.push({ tilesetId: tid, lp: old });
      }
    } finally {
      this._suspendCollect(false);
    }
    this._exchange = { t: "exchange", leaves };
  }

  // ── token 内读口（input 选区 finalize / no-op 判定）──
  /** 本 token 是否真的动过该层（collector 有它的扣押）。 */
  tokenChanged(layerId: number): boolean {
    const lp = this._host.getPixels(layerId);
    return !!lp && (this._collected.get(lp)?.size ?? 0) > 0;
  }
  /** 令牌前该层内容的紧 bbox 物化（applyMaskPostStroke 的 preSnap）。
   *  = 现内容 + collector 扣押件盖回（未变 tile 现值即前值）。仅带选区 finalize 才付这份钱。 */
  tokenBeforeImage(layerId: number): PreSnapImage {
    const lp = this._host.getPixels(layerId);
    const empty: PreSnapImage = { bboxX: 0, bboxY: 0, bboxW: 0, bboxH: 0, imageData: null };
    if (!lp) return empty;
    const diff = this._collected.get(lp);
    this._suspendCollect(true);
    const tmp = new LayerPixels(lp.docW, lp.docH);
    try {
      const across = tilesAcross(lp.docW);
      const synth: [number, TileHandle][] = [];
      const overridden = new Set<number>();
      if (diff) for (const [key, h] of diff) { overridden.add(key); if (h) synth.push([key, h]); }
      lp.forEachTileHandle((tx, ty, h) => {
        const key = tileKey(tx, ty, across);
        if (!overridden.has(key)) synth.push([key, h]);
      });
      tmp.restore({ across, tiles: synth });   // restore 自己 acquire，synth 不持有
      const b = tmp.contentBounds(true);
      if (!b) return empty;
      return { bboxX: b.x, bboxY: b.y, bboxW: b.w, bboxH: b.h, imageData: new ImageData(tmp.getRegion(b.x, b.y, b.w, b.h), b.w, b.h) };
    } finally {
      tmp.dispose();
      this._suspendCollect(false);
    }
  }

  // ── CollectorComponent ──

  sealRecord(): RecordData | null {
    if (this._exchange) {
      if (this._collectedCount() > 0 || this._computed) {
        this._disposeCollected();
        this._computed = null;
        this._exchange = null;
        throw new Error("LayerTiles: exchange record coexists with tile collection/computed on one token (double-capture assertion)");
      }
      const r = this._exchange;
      this._exchange = null;
      return r;
    }
    if (this._computed) {
      if (this._collectedCount() > 0) {
        this._disposeCollected();
        this._computed = null;
        throw new Error("LayerTiles: computed-record double-capture assertion — computed verb and tile collection coexist on one token (multiple-parallel-path violation)");
      }
      const r = this._computed;
      this._computed = null;
      return r;
    }
    if (this._collected.size === 0) return null;
    const layers: TilesetDiff[] = [];
    for (const [lp, tiles] of this._collected) {
      const tilesetId = this._idOf.get(lp);
      if (tilesetId === undefined) {
        // 注册表里没有它：从未入册的临时件 / 替身，或本令牌里出生又死亡（持有者全放手）——非权威数据，扣押作废
        for (const [, h] of tiles) if (h && !h.released) h.release();
        continue;
      }
      this.acquireTileset(tilesetId);   // record 持引用：实例寿命 ≥ 账的寿命（disposeRecord 归还）
      layers.push({ tilesetId, across: tilesAcross(lp.docW), tiles: [...tiles.entries()] });
    }
    this._collected = new Map();
    return layers.length ? { t: "tiles", layers } : null;
  }

  swapRecord(data: RecordData): RecordData {
    const r = data as TilesRecord;
    if (r.t === "tiles") {
      for (const entry of r.layers) {
        const lp = this.tilesetPixels(entry.tilesetId);
        if (!lp) throw new Error(`LayerTiles: tileset gone at undo swap (tilesetId=${entry.tilesetId} — record holds a ref, so this is a refcount bug)`);
        if (tilesAcross(lp.docW) !== entry.across) throw new Error("LayerTiles: layer grid width mismatch at undo swap (across drift)");
        entry.tiles = entry.tiles.map(([key, h]) => [key, lp._swapTileHandle(key, h)]);
      }
      return r;
    }
    if (r.t === "exchange") {
      // 自反：逐 tileset 实例互换（所有权互换，零拷贝）。按 id 直取注册表，record 持引用 → 不存在 = 引用计数被绕过（exchangeTilesetPixels 自会 throw）。
      this._suspendCollect(true);
      try {
        return {
          t: "exchange",
          leaves: r.leaves.map((e) => ({ tilesetId: e.tilesetId, lp: this.exchangeTilesetPixels(e.tilesetId, e.lp) })),
        } satisfies TilesRecord;
      } finally {
        this._suspendCollect(false);
      }
    }
    // computed：record 恒存「应用它 = 回到另一侧」的变换（seal 时已取逆）——swap = 原样应用 + 返回其逆。
    this._suspendCollect(true);
    try {
      this._applyComputed(r);
      return this._invertComputed(r);
    } finally {
      this._suspendCollect(false);
    }
  }

  recordBytes(data: RecordData): number {
    const r = data as TilesRecord;
    if (r.t === "exchange") {
      // 实例配额规则同 tiles：压缩前记 0（走共享 raw 池配额）、压缩后 compressedBytes/refCount。
      let sum = 64;
      for (const e of r.leaves) {
        for (const h of e.lp.handles()) {
          if (h.released) continue;
          if (h.isCompressed()) sum += Math.ceil(h.compressedByteLength() / Math.max(1, h.refCount()));
        }
      }
      return sum;
    }
    if (r.t !== "tiles") return 64;
    let sum = 0;
    for (const entry of r.layers) {
      sum += 64;
      for (const [, h] of entry.tiles) {
        if (!h || h.released) continue;
        if (h.isCompressed()) sum += Math.ceil(h.compressedByteLength() / Math.max(1, h.refCount()));
      }
    }
    return sum;
  }

  disposeRecord(data: RecordData): void {
    const r = data as TilesRecord;
    if (r.t === "exchange") {
      for (const e of r.leaves) {
        this._disposeOwned(e.lp);   // record 持有侧（另一侧实例）可能仍带戳（exchange 交还路）
        this.releaseTileset(e.tilesetId);   // 归还 verb 时持的引用
      }
      r.leaves = [];
      return;
    }
    if (r.t !== "tiles") return;
    for (const entry of r.layers) {
      for (const [, h] of entry.tiles) if (h && !h.released) h.release();
      this.releaseTileset(entry.tilesetId);   // 归还 seal 时持的引用（最后一个持有者 → 实例还池）
    }
    r.layers = [];
  }

  // ── 内部 ──

  private _onTileSwap(lp: LayerPixels, key: number, old: TileHandle | null): void {
    if (this._suspend > 0) return;   // 显式白名单窗：load 灌入 / computed·exchange verb 体 / undo swap / 内部物化
    // C7 所有权过滤（多播观察者）：有主且不是我的实例 → 不收（别的 backend 的换手）。
    // 无主（临时替身）沿旧语义收下，seal 解析不到自动作废。
    const owner = (lp as LayerPixels & { _collectorOwner?: LayerTiles })._collectorOwner;
    if (owner !== undefined && owner !== this) return;
    if (!this._wp.tokenOpen) {
      // C7 硬化（census §3.6）：曾是「留给 load 灌入」的静默口，但 load 走 token+suspend，
      // 真击中这里的 substrate 写只能是坏账——响亮失败（两层防线的 fail-loud 层，ADR-0008）。
      // 无主临时件（StrokeShadow 替身/scratch/内核直测）在令牌外的换手不归本 collector 管，放行。
      if (owner === this) throw new Error(`LayerTiles: tokenless pixel write (substrate tile handed over outside the token wall, key=${key}) — doc mutation must hold a WriteToken (ADR-0008)`);
      return;
    }
    this._wp._componentWrite(this);   // 写即登记 touched（无令牌不可能到这——tokenOpen 已 gate）
    let tiles = this._collected.get(lp);
    if (!tiles) { tiles = new Map(); this._collected.set(lp, tiles); }
    if (!tiles.has(key)) tiles.set(key, old ? old.acquire() : null);   // 首捕获赢：只留令牌前原件
  }

  private _write(layerId: number): LayerPixels {
    this._wp._componentWrite(this);
    const lp = this._host.getPixels(layerId);
    if (!lp) throw new Error(`LayerTiles: layer does not exist (layerId=${layerId})`);
    return lp;
  }

  private _computedVerb(r: TilesRecord): void {
    this._wp._componentWrite(this);
    if (this._computed) throw new Error("LayerTiles: only one computed record per token");
    if (this._collectedCount() > 0) throw new Error("LayerTiles: token already collected tiles before computed verb (double-capture assertion)");
    this._suspendCollect(true);
    try {
      this._applyComputed(r);
    } finally {
      this._suspendCollect(false);
    }
    if (this._collectedCount() > 0) throw new Error("LayerTiles: tile collection happened during computed verb (double-capture assertion)");
    this._computed = this._invertComputed(r);   // 入栈的是 undo 包：应用它 = 撤销刚做的变换
  }

  private _applyComputed(r: TilesRecord): void {
    if (r.t === "flip") this._applyAll((lp) => lp.flippedHorizontal());
    else if (r.t === "rot") this._applyRot(r.dir);
    else if (r.t === "offset") this._applyAll((lp) => lp.offsetWrapped(((r.dx % lp.docW) + lp.docW) % lp.docW, ((r.dy % lp.docH) + lp.docH) % lp.docH));
  }
  private _invertComputed(r: TilesRecord): TilesRecord {
    if (r.t === "rot") return { t: "rot", dir: r.dir === 1 ? -1 : 1 };
    if (r.t === "offset") return { t: "offset", dx: -r.dx, dy: -r.dy };
    return r;   // flip 自逆；tiles 不走这
  }

  private _applyAll(f: (lp: LayerPixels) => LayerPixels): void {
    const jobs: [number, LayerPixels][] = [];
    this._host.eachLayer((id, lp) => jobs.push([id, f(lp)]));
    for (const [id, np] of jobs) this._host.replacePixels(id, np);
  }
  private _applyRot(dir: 1 | -1): void {
    // dir=1 CCW 一次；dir=-1 CW = CCW×3（rotated90CCW 是唯一原语；rot 低频，绕三圈可承受）
    this._applyAll((lp) => {
      let cur = lp.rotated90CCW();
      if (dir === -1) {
        for (let i = 0; i < 2; i++) { const nx = cur.rotated90CCW(); cur.dispose(); cur = nx; }
      }
      return cur;
    });
  }

  private _collectedCount(): number {
    let n = 0;
    for (const [, tiles] of this._collected) n += tiles.size;
    return n;
  }
  private _disposeCollected(): void {
    for (const [, tiles] of this._collected) for (const [, h] of tiles) if (h && !h.released) h.release();
    this._collected = new Map();
  }
}
