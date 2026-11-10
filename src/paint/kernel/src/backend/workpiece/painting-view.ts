// painting-view —— 树模式的 app 读写端口（T3b-2 cutover 的枢纽；ADR-0008）。
//
// 角色：PaintingWorkpiece（LayerTree json + LayerTiles tileset 注册表）→ 旧 DocView 同形的
// **view 节点树**。让 23 个 doc.ts 消费文件在割接时几乎零改动：board/GL 管线本就 duck-typed
// （{id,visible,opacity,mode,clippingMask,pixels,children}），引擎（brush/liquify/lasso）拿到的
// ViewLeaf 具备旧 Layer 的读写面（pixels/bbox/editRegionBytes/snapshot…——写走
// 活 LayerPixels，token 开着时由 tile-layer 全局观察者写时扣押，纪律与 T2 一致。
// C3 债 b：canvas/ctx 物化视图拆除，bbox = contentBounds 缓存，字节口是唯一读写面）。
//
// 过渡态（T4/T5 收编，自裁范围）：
//   - selection substrate 已迁 SelectionComponent（T4a）；本端口只留镜像口
//     （getter/setter = view/_rawWrite 直通）。写纪律沿旧约：引擎/预览直写，记账走 SelectionFace。
//   - ViewLeaf 的写方法 = 旧 Layer「预览违规户」们（液化就地写等，见 handoff §3）的继续容身处；
//     买账的路径（stroke commit/fill/滤镜）早已走 token+LayerTiles。
//   - contentRev 全局单调（flat-coloring-oracle 等 (id,rev) 缓存键的不复用保证——tileset 实例换血后
//     LayerPixels.contentVersion 从头数，这里用 WeakMap+全局计数器重映射）。
//
// 同步策略：LayerTree 每次写换新根（不可变值契约）→ 端口以**根引用身份**做缓存键；
// ViewLeaf 按 id 复用（物化缓存/引擎持引用跨 commit 有效），属性镜像每次 resync 回灌。

import { LayerPixels, editRegionBytes as editPixelsBytes, disposePixelsSnapshot, type PixelsSnapshot } from "../tiles/tile-layer.ts";
import type { PaintingWorkpiece } from "./painting-workpiece.ts";
import type { LayerTiles } from "./layer-tiles.ts";
import { isGroupNode, type TreeNode, type TreeLeaf } from "./layer-tree.ts";
import type { Selection } from "../selection.ts";

// ---- 层数上限策略（C3：随 doc.ts 拆除迁入；board/_configureDocMemory 同款消费）----
export const LAYER_HARD_CEIL = 64;

// C7：设备内存读数改壳注入（backend 零 navigator）；app.ts boot 传 navigator.deviceMemory，
// headless 缺省 4GB 档（与旧 `deviceMemory ?? 4` 兜底同值，行为不变）。
let _deviceMemoryGB = 4;
export function setDeviceMemoryGB(gb: number): void { _deviceMemoryGB = gb; }
export function layerByteBudget(): number {
  const budgetMB = Math.max(256, Math.min(768, _deviceMemoryGB * 1024 * 0.15));
  return budgetMB * 1e6;
}

// currentLeafCount = 当前叶层数；residentBytes = 所有叶 residentBytes() 之和；budgetBytes = 预算。
export function computeMaxLayers(currentLeafCount: number, residentBytes: number, budgetBytes = layerByteBudget()): number {
  if (residentBytes >= budgetBytes) return Math.max(2, currentLeafCount);   // 已达字节预算：冻结
  return LAYER_HARD_CEIL;                                                    // 预算内：放到硬顶
}

// 旧 LayerSnap 同形（undo 包/引擎 pre-snap；用完 disposeViewSnap）。
export interface ViewLeafSnap { pixels: PixelsSnapshot }
export function disposeViewSnap(snap: ViewLeafSnap | null | undefined): void {
  if (snap) disposePixelsSnapshot(snap.pixels);
}

// contentRev 全局单调重映射（(id,rev) 永不复用；见头注）。
let _globalRev = 0;
const _revByInstance = new WeakMap<LayerPixels, { seen: number; rev: number }>();
function revFor(lp: LayerPixels): number {
  let e = _revByInstance.get(lp);
  if (!e) { e = { seen: lp.contentVersion, rev: ++_globalRev }; _revByInstance.set(lp, e); return e.rev; }
  if (e.seen !== lp.contentVersion) { e.seen = lp.contentVersion; e.rev = ++_globalRev; }
  return e.rev;
}

/** 叶 view：旧 Layer 的读写面，像素 = tileset 注册表里的活 LayerPixels。 */
export class ViewLeaf {
  readonly isGroup = false as const;
  readonly id: number;
  name = "";
  visible = true;
  opacity = 1;
  mode = "source-over";
  clippingMask = false;
  lockAlpha = false;
  docW = 0;
  docH = 0;
  /** @internal 属性回灌（端口 resync 用）。 */
  _pixelsRef = 0;
  private _tiles: LayerTiles;
  private _bounds: { b: { x: number; y: number; w: number; h: number } | null; forRev: number; forInstance: LayerPixels } | null = null;

  constructor(tiles: LayerTiles, id: number) {
    this._tiles = tiles;
    this.id = id;
  }

  /** 活像素（tileset 注册表解析；叶已被删时端口不再发出本对象，getter 假定 ref 有效）。 */
  get pixels(): LayerPixels {
    const lp = this._tiles.tilesetPixels(this._pixelsRef);
    if (!lp) throw new Error(`ViewLeaf: tileset missing (id=${this.id}, ref=${this._pixelsRef} — stale view reference?)`);
    return lp;
  }

  /** 内容版本（全局单调不复用；flat-coloring-oracle 等 (id,rev) 缓存键）。 */
  get contentRev(): number { return revFor(this.pixels); }

  // ---- 派生只读视图（紧内容框；rev-keyed 缓存，语义同旧物化视图的 bbox）----
  private _contentBounds(): { x: number; y: number; w: number; h: number } | null {
    const lp = this.pixels;
    const rev = lp.contentVersion;
    if (this._bounds && this._bounds.forRev === rev && this._bounds.forInstance === lp) return this._bounds.b;
    this._bounds = { b: lp.contentBounds(true), forRev: rev, forInstance: lp };
    return this._bounds.b;
  }

  residentBytes(): number { return this.pixels.byteUsage; }

  get bboxX(): number { return this._contentBounds()?.x ?? 0; }
  get bboxY(): number { return this._contentBounds()?.y ?? 0; }
  get bboxW(): number { return this._contentBounds()?.w ?? 0; }
  get bboxH(): number { return this._contentBounds()?.h ?? 0; }
  get width(): number { return this.bboxW; }
  get height(): number { return this.bboxH; }

  // ---- 写者入口（活 LayerPixels 直写；token 开着 = 写时扣押，纪律同 T2）----
  editRegionBytes(x0: number, y0: number, w: number, h: number, fn: (buf: Uint8ClampedArray, ox: number, oy: number) => void): void {
    editPixelsBytes(this.pixels, x0, y0, w, h, fn);
  }
  replaceFromBytes(data: Uint8ClampedArray, ox: number, oy: number, w: number, h: number): void {
    const lp = this.pixels;
    lp.clear();
    if (w > 0 && h > 0) lp.putRegion(ox, oy, w, h, data);
  }
  clearAll(): void { this.pixels.clear(); }

  sampleAt(docX: number, docY: number): [number, number, number, number] {
    return this.pixels.sampleAt(Math.floor(docX), Math.floor(docY)) as [number, number, number, number];
  }
  getImageData(docX: number, docY: number, w: number, h: number): ImageData {
    return new ImageData(this.pixels.getRegion(docX, docY, w, h), w, h);
  }
  putImageData(docX: number, docY: number, img: ImageData): void {
    this.pixels.putRegion(docX, docY, img.width, img.height, img.data);
  }
  applyRegionDiff(docX: number, docY: number, w: number, h: number, src: Uint8ClampedArray): { tx: number; ty: number }[] {
    return this.pixels.applyRegionDiff(docX, docY, w, h, src);
  }

  // undo/pre-snap 快照（句柄共享零拷贝；归属交 caller，用完 disposeViewSnap）。
  snapshot(): ViewLeafSnap { return { pixels: this.pixels.snapshot() }; }
  restoreFromSnapshot(snap: ViewLeafSnap): void { this.pixels.restore(snap.pixels); }

  /** CPU 算法读者的只读物化（液化 startSnap/选区 preSnap）；空层 imageData:null。 */
  snapshotImageData(): { bboxX: number; bboxY: number; bboxW: number; bboxH: number; imageData: ImageData | null } {
    const lp = this.pixels;
    const b = lp.contentBounds(true);
    if (!b) return { bboxX: 0, bboxY: 0, bboxW: 0, bboxH: 0, imageData: null };
    return { bboxX: b.x, bboxY: b.y, bboxW: b.w, bboxH: b.h, imageData: new ImageData(lp.getRegion(b.x, b.y, b.w, b.h), b.w, b.h) };
  }
}

/** 组 view：纯结构镜像（每次 resync 重建，children 里叶按 id 复用）。 */
export class ViewGroup {
  readonly isGroup = true as const;
  readonly id: number;
  name = "";
  visible = true;
  opacity = 1;
  mode = "pass-through";
  clippingMask = false;
  children: ViewNode[] = [];
  constructor(id: number) { this.id = id; }
}

export type ViewNode = ViewLeaf | ViewGroup;

// ---- 树工具（view 节点版；doc.ts eachLeaf/flattenLeaves/findNodeById/countLeaves 的后继）----
export function eachViewLeaf(nodes: readonly ViewNode[], fn: (leaf: ViewLeaf) => void): void {
  for (const n of nodes) {
    if (n.isGroup) eachViewLeaf(n.children, fn);
    else fn(n);
  }
}
export function flattenViewLeaves(nodes: readonly ViewNode[]): ViewLeaf[] {
  const out: ViewLeaf[] = [];
  eachViewLeaf(nodes, (l) => out.push(l));
  return out;
}
export function findViewNodeById(nodes: readonly ViewNode[], id: number | null): ViewNode | null {
  for (const n of nodes) {
    if (n.id === id) return n;
    if (n.isGroup) {
      const f = findViewNodeById(n.children, id);
      if (f) return f;
    }
  }
  return null;
}
export function countViewLeaves(nodes: readonly ViewNode[]): number {
  let c = 0;
  eachViewLeaf(nodes, () => c++);
  return c;
}

/** app 的文档读写端口（旧 ctx.doc = DocView 的后继；单例，跨换文档稳定）。 */
export class PaintingView {
  private _wp: PaintingWorkpiece;
  private _nodes: ViewNode[] = [];
  private _leafCache = new Map<number, ViewLeaf>();
  private _lastRoot: unknown = null;
  // 内存预算档（board 按 GL 配额配）。
  private _memBudgetBytes: number | null = null;

  constructor(wp: PaintingWorkpiece) {
    if (!wp.layerTree) throw new Error("PaintingView: needs a tree-mode PaintingWorkpiece (opts.tree)");
    this._wp = wp;
    // 主动跟车：任何 commit/undo/redo/cancel 后立刻 resync——持有 ViewLeaf 引用跨 commit 的
    // 消费者（引擎/测试）读 props 不吃 stale 镜像（lazy _sync 只兜「谁先读 layers」的路径）。
    wp.onChange(() => this._sync());
  }

  private get _tree() { return this._wp.layerTree!; }

  /** 根引用身份同步：LayerTree 每写换新根 → 引用变了才重建镜像（叶按 id 复用）。 */
  private _sync(): void {
    const json = this._tree.view();
    if (json === this._lastRoot) return;
    this._lastRoot = json;
    const alive = new Set<number>();
    const build = (ns: readonly TreeNode[]): ViewNode[] => ns.map((n): ViewNode => {
      if (isGroupNode(n)) {
        const g = new ViewGroup(n.id);
        g.name = n.name; g.visible = n.visible; g.opacity = n.opacity; g.mode = n.mode;
        g.clippingMask = n.clippingMask;
        g.children = build(n.children);
        return g;
      }
      return this._syncLeaf(n, json.width, json.height, alive);
    });
    this._nodes = build(json.nodes);
    for (const id of [...this._leafCache.keys()]) {
      if (!alive.has(id)) this._leafCache.delete(id);
    }
  }
  private _syncLeaf(n: TreeLeaf, docW: number, docH: number, alive: Set<number>): ViewLeaf {
    let leaf = this._leafCache.get(n.id);
    if (!leaf) { leaf = new ViewLeaf(this._wp.layerTiles, n.id); this._leafCache.set(n.id, leaf); }
    leaf.name = n.name; leaf.visible = n.visible; leaf.opacity = n.opacity; leaf.mode = n.mode;
    leaf.clippingMask = n.clippingMask; leaf.lockAlpha = n.lockAlpha;
    leaf._pixelsRef = n.pixelsRef;
    leaf.docW = docW; leaf.docH = docH;
    alive.add(n.id);
    return leaf;
  }

  // ---- DocView 同形读面 ----
  get width(): number { return this._tree.view().width; }
  get height(): number { return this._tree.view().height; }
  get activeId(): number | null { return this._tree.view().activeId; }
  get referenceLayerId(): number | null { return this._tree.view().referenceLayerId; }
  get layers(): ViewNode[] { this._sync(); return this._nodes; }

  get activeLayer(): ViewNode | null { return findViewNodeById(this.layers, this.activeId); }
  findLayer(id: number): ViewNode | null { return findViewNodeById(this.layers, id); }

  /** 扁平叶序 index 兼容 getter（session-state 持久化用）。 */
  get activeIndex(): number {
    return flattenViewLeaves(this.layers).findIndex((l) => l.id === this.activeId);
  }

  /** 节点同级位置（面板按钮态用）。 */
  locateNode(id: number): { parentId: number | null; index: number } | null {
    const walk = (ns: readonly ViewNode[], parent: ViewGroup | null): { parentId: number | null; index: number } | null => {
      for (let i = 0; i < ns.length; i++) {
        const n = ns[i];
        if (n.id === id) return { parentId: parent ? parent.id : null, index: i };
        if (n.isGroup) { const r = walk(n.children, n); if (r) return r; }
      }
      return null;
    };
    return walk(this.layers, null);
  }
  canMoveLayer(id: number, toward: number): boolean {
    const find = (ns: readonly ViewNode[]): { arr: readonly ViewNode[]; i: number } | null => {
      for (let i = 0; i < ns.length; i++) {
        const n = ns[i];
        if (n.id === id) return { arr: ns, i };
        if (n.isGroup) { const r = find(n.children); if (r) return r; }
      }
      return null;
    };
    const loc = find(this.layers);
    if (!loc) return false;
    const j = loc.i + toward;
    return j >= 0 && j < loc.arr.length;
  }

  /** 「能否在当前 active 写像素」单谓词（语义沿旧 PaintDoc.activeEditableLeaf）。 */
  activeEditableLeaf({ allowHidden = false }: { allowHidden?: boolean } = {}): { leaf: ViewLeaf | null; reason: string | null } {
    const a = this.activeLayer;
    if (!a) return { leaf: null, reason: "none" };
    if (a.isGroup) return { leaf: null, reason: "group" };
    if (!a.visible && !allowHidden) return { leaf: null, reason: "hidden" };
    return { leaf: a, reason: null };
  }
  /**
   * 像素笔的**写靶叶列表** = activeEditableLeaf 的复数推广（2026-08-28，液化对图层组）。
   * - `allowGroup=false`（缺省）→ 与 activeEditableLeaf 逐字同义：组硬拒 / 隐藏软拒 / 单叶放行。
   * - `allowGroup=true`（filter 声明了 supportsLayerGroup，唯一户 = 液化）→ 组 = 组内**全部叶**，
   *   **含隐藏叶**（对齐 floating-transform.lift(group) 的「整组一起动」）；组自身或祖先隐藏仍按
   *   hidden 软拒（盲改护栏）；空组按 "group" 拒（没叶可写，提示照旧「请选择一个图层」）。
   */
  activeStrokeLeaves({ allowGroup = false, allowHidden = false }: { allowGroup?: boolean; allowHidden?: boolean } = {}):
      { leaves: ViewLeaf[]; reason: string | null } {
    const a = this.activeLayer;
    if (a && a.isGroup && allowGroup) {
      if (this.activeNodeHidden() && !allowHidden) return { leaves: [], reason: "hidden" };
      const leaves = flattenViewLeaves(a.children);
      if (!leaves.length) return { leaves: [], reason: "group" };
      // 全隐组护栏（2026-08-28 user 拍板「隐藏叶可以跟，但全隐=与画在隐藏图层同款护栏」）：
      //   组可见但组内**无任何有效可见叶**（叶自身或其子组链隐藏）→ hidden 软拒（盲改）。
      //   部分可见照常放行——隐藏叶跟着可见叶动是整组变换语义，不是盲改。
      const anyVisible = (ns: readonly ViewNode[]): boolean => ns.some((n) => n.visible && (n.isGroup ? anyVisible(n.children) : true));
      if (!anyVisible(a.children) && !allowHidden) return { leaves: [], reason: "hidden" };
      return { leaves, reason: null };
    }
    const { leaf, reason } = this.activeEditableLeaf({ allowHidden });
    return { leaves: leaf ? [leaf] : [], reason };
  }

  /** active 自身或任一祖先组隐藏？（变换类操作的盲改软拒。） */
  activeNodeHidden(): boolean {
    const path: ViewNode[] = [];
    const walk = (ns: readonly ViewNode[], stack: ViewNode[]): boolean => {
      for (const n of ns) {
        if (n.id === this.activeId) { path.push(...stack, n); return true; }
        if (n.isGroup && walk(n.children, [...stack, n])) return true;
      }
      return false;
    };
    walk(this.layers, []);
    return path.some((n) => !n.visible);
  }
  getReferenceLayer(): ViewNode | null {
    if (this.referenceLayerId == null) return null;
    return findViewNodeById(this.layers, this.referenceLayerId);
  }
  /** 魔棒/油漆桶 source：reference 优先，否则 active（组不可作源 → null）。 */
  getFloodSourceLayer(): ViewLeaf | null {
    const ref = this.getReferenceLayer();
    if (ref && !ref.isGroup) return ref;
    const a = this.activeLayer;
    return a && !a.isGroup ? a : null;
  }

  // ---- 选区（T4a：substrate 归 SelectionComponent；此处 = 端口镜像口）----
  // setter = 预览直写（lasso 引擎/预览 tx/pre-applied 换手；记账走 SelectionFace → 组件）。
  get selection(): Selection | null { return this._wp.selection.view(); }
  set selection(v: Selection | null) { this._wp.selection._rawWrite(v); }
  /** 换文档收尾（跨 session 不沿用选区——旧 adoptState 语义）。 */
  clearSelectionOnLoad(): void { this._wp.selection.clearOnLoad(); }

  // ---- 内存预算 / 层数上限（语义沿旧 PaintDoc.maxLayers；C3 债 b：物化 canvas 拆除后
  //   驻留恒单份 tile 计费，countMat 档随之消灭）----
  configureMemory(budgetBytes: number): void {
    this._memBudgetBytes = budgetBytes;
  }
  get maxLayers(): number {
    const leaves = flattenViewLeaves(this.layers);
    let resident = 0;
    for (const l of leaves) resident += l.residentBytes();
    return computeMaxLayers(leaves.length, resident, this._memBudgetBytes ?? layerByteBudget());
  }
}
