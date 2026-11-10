// Selection —— 选区，doc 的一等公民。**不可变值对象**，底座 = 稀疏 gray8 tile（S5，v0.4.6）。
//
// 设计见 CONTEXT.md (Selection) / ai-docs/20260528-lasso-and-selection.md / journal/20260721 Architecture.md
// （spec:18「selection-mask 单通道 tile 层，进 undo history」、spec:208-210）。给下个 AI：
//
// - **maskCanvas 死了**（v0.4.6）。mask = doc 网格对齐的稀疏 gray8 tile（0..255 = AA 覆盖度），
//   句柄来自共享 appTilePool() → 选区自动吃池的压缩驻留 + 配额，undo 里按压缩字节计费。
//   doc 空间寻址（不再与任何 layer.bbox 对齐）——这是杀 H7（液化选区按 layer.bbox 烤半拉）的数据结构前提。
// - **不可变**：构造后 tiles/bbox 不再改；compose/invert/morphed/croppedTo/… 返回新 Selection（或 null）。
//   退化（空 mask）一律返回 **null**（= 没选区）——包括 subtract 减光（旧 canvas 版会留一个全透明
//   的“隐形选区”，v0.4.6 起按 tile bbox 精确判空，行为更诚实）。
// - **所有权纪律**（对齐 LayerSnap）：Selection 持有 tile 句柄，js 无析构 → 被丢弃前必须 dispose()。
//   别名持有（doc 快照等）用 clone()（零拷贝，句柄 acquire）。漏网由池 FR assert 点名。
//   持有点：doc.selection 槽、SwapSelectionOp 包（disposeData）、doc.snapshotAll 快照、
//   lasso/toolbar 的中间产物（消费后就地 dispose）。瞬时读者（stroke 引擎烤 mask、GL 上传）不持有。
// - bboxX/Y/W/H 保持公开（消费面到处在读）；v0.4.6 起 = per-tile 内容 bbox 聚合（**紧**——
//   旧版 compose 的“合成 bbox 可能略大”TODO 就此了账）。
// - 蚂蚁线 outline 已抽 src/marching-ants.ts 深模块（自持缓存，keyed by Selection 对象身份）。
// - CPU 算法读者走 materializeMaskRegion()/sampleAt() 窄读口（gray8，无 4 倍 RGBA 浪费）。
// - GPU：bboxMask() 给 bbox 对齐的 gray8 平面（懒缓存）→ gl-doc-renderer 直传 R8 纹理
//   （S7 改走 cpu-gpu-tile-bridge）。
// - 纯 in-process：全部零 canvas 依赖，node 直测（C3 债 b：fromAlphaCanvas/materializeMaskCanvas 死口拆除）。

import { TILE_SIZE } from "../common/tile-geometry.ts";
import { appTilePool } from "./tiles/app-tile-pool.ts";
import { computeBBox, type TileHandle } from "./tiles/cpu-tile-pool.ts";

// applyMaskPostStroke / fillOnLayer / clearOnLayer 调用方（Layer）的最小形状。
interface LayerLike {
  bboxX: number;
  bboxY: number;
  snapshotImageData(): LayerSnapLike;
  putImageData(docX: number, docY: number, img: ImageData): void;
  editRegionBytes(x0: number, y0: number, w: number, h: number, fn: (buf: Uint8ClampedArray, ox: number, oy: number) => void): void;
}

// Layer.snapshotImageData() 产物（applyMaskPostStroke 的 preSnap/afterSnap 形状——CPU 算法的只读物化，非 undo 包）。
interface LayerSnapLike {
  bboxX: number;
  bboxY: number;
  bboxW: number;
  bboxH: number;
  imageData?: ImageData | null;
}

type ComposeMode = "new" | "union" | "subtract" | "intersect";

// tile 键：与 doc 宽度无关的打包（Selection 不知道 doc 尺寸；网格恒对齐 doc 原点，tx/ty ≥ 0）。
// 32768 tiles ≈ 8M px 边长，够到天荒地老。
const PACK = 32768;
const packKey = (tx: number, ty: number) => ty * PACK + tx;
const unpackTx = (k: number) => k % PACK;
const unpackTy = (k: number) => Math.floor(k / PACK);

const GRAY_TILE = TILE_SIZE * TILE_SIZE;

// 硬形态学（pixel-art 逻辑）：grid 上 8-连通 膨胀(grow)/腐蚀(!grow)，radius 轮。
//   每轮「先收集再应用」(double-buffer) 保证恰好 radius 像素环，不在同轮内自传播。
//   grid 外侧：膨胀时当「空」(continue)，腐蚀时当「非选区」(touch=把贴边的腐蚀掉)。
//   ← 从 lasso.js _morphMask 搬来（v242：expand/shrink 改成选区编辑 op，不再 bake 进魔术棒）。
function morphBinary(grid: Uint8Array, w: number, h: number, radius: number, grow: boolean): void {
  if (radius <= 0) return;
  for (let k = 0; k < radius; k++) {
    const changes = [];
    for (let y = 0; y < h; y++) {
      const row = y * w;
      for (let x = 0; x < w; x++) {
        const p = row + x;
        const isAcc = grid[p] === 1;
        if (grow ? isAcc : !isAcc) continue;
        let touch = false;
        for (let dy = -1; dy <= 1 && !touch; dy++) {
          const ny = y + dy;
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = x + dx;
            if (nx < 0 || nx >= w || ny < 0 || ny >= h) { if (!grow) { touch = true; break; } continue; }
            const nAcc = grid[ny * w + nx] === 1;
            if (grow ? nAcc : !nAcc) { touch = true; break; }
          }
        }
        if (touch) changes.push(p);
      }
    }
    if (!changes.length) break;
    const val = grow ? 1 : 0;
    for (let i = 0; i < changes.length; i++) grid[changes[i]] = val;
  }
}

export class Selection {
  // 内容 bbox（doc 坐标，per-tile bbox 聚合 = 紧）。公开只读消费（到处在读，别写）。
  bboxX: number;
  bboxY: number;
  bboxW: number;
  bboxH: number;

  private _tiles: Map<number, TileHandle>;
  private _disposed = false;
  // 懒缓存（不可变 → 一次算永远对）：bbox 对齐 gray8 平面（GL 上传 / CPU 密集读者）。
  private _bboxMask: { x: number; y: number; w: number; h: number; data: Uint8Array } | null = null;

  /** 内部构造：接管 tiles 里句柄的所有权。外部走工厂（full/fromGray8Region/fromLayerAlpha/compose…）。 */
  private constructor(tiles: Map<number, TileHandle>, bbox: { x: number; y: number; w: number; h: number }) {
    this._tiles = tiles;
    this.bboxX = bbox.x; this.bboxY = bbox.y;
    this.bboxW = bbox.w; this.bboxH = bbox.h;
  }

  // ---- 生命周期（所有权纪律，文件头）----

  /** 零拷贝别名副本（句柄 acquire）。存进快照/长期持有处用它，别裸存引用。 */
  clone(): Selection {
    this._assertAlive();
    const tiles = new Map<number, TileHandle>();
    this._tiles.forEach((h, k) => tiles.set(k, h.acquire()));
    return new Selection(tiles, { x: this.bboxX, y: this.bboxY, w: this.bboxW, h: this.bboxH });
  }

  /** 释放全部 tile 句柄。**被丢弃前必须调**；双 dispose 立刻 throw（所有权 bug 就地暴露）。 */
  dispose(): void {
    if (this._disposed) throw new Error("Selection: double dispose");
    this._disposed = true;
    this._tiles.forEach((h) => { if (!h.released) h.release(); });
    this._tiles.clear();
    this._bboxMask = null;
  }

  get disposed(): boolean { return this._disposed; }

  private _assertAlive(): void {
    if (this._disposed) throw new Error("Selection: use after dispose");
  }

  /** 只读句柄迭代（undo 配额估计用；别 release 这些）。 */
  tileHandles(): IterableIterator<TileHandle> {
    this._assertAlive();
    return this._tiles.values();
  }
  get tileCount(): number { return this._tiles.size; }

  // ---- 工厂 ----

  /** 从 tiles 建；空 map → null（退化=没选区）。接管句柄所有权。 */
  private static _fromTiles(tiles: Map<number, TileHandle>): Selection | null {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    tiles.forEach((h, k) => {
      const b = h.bbox();
      if (!b) return;   // 防御：全零格不该入 map（建造侧已滤）
      const ox = unpackTx(k) * TILE_SIZE, oy = unpackTy(k) * TILE_SIZE;
      if (ox + b.x < minX) minX = ox + b.x;
      if (oy + b.y < minY) minY = oy + b.y;
      if (ox + b.x + b.w > maxX) maxX = ox + b.x + b.w;
      if (oy + b.y + b.h > maxY) maxY = oy + b.y + b.h;
    });
    if (minX === Infinity) {
      tiles.forEach((h) => h.release());
      return null;
    }
    return new Selection(tiles, { x: minX, y: minY, w: maxX - minX, h: maxY - minY });
  }

  /**
   * 核心工厂：doc 矩形 (x0,y0,w,h) 的 gray8 数据（行优先，w 宽）→ 稀疏 tile。
   * 全零格不建 tile；整体全零 → null。data 只读（拷贝进 tile，不接管）。
   * 负坐标部分裁掉（选区恒在 doc 网格 ≥0 侧；v125 起所有入口 clip 到 doc）。
   */
  static fromGray8Region(x0: number, y0: number, w: number, h: number, data: Uint8Array | Uint8ClampedArray): Selection | null {
    if (w <= 0 || h <= 0) return null;
    const pool = appTilePool();
    const tiles = new Map<number, TileHandle>();
    const ix0 = Math.max(0, x0), iy0 = Math.max(0, y0);
    const ix1 = x0 + w, iy1 = y0 + h;
    if (ix1 <= ix0 || iy1 <= iy0) return null;
    const tx0 = Math.floor(ix0 / TILE_SIZE), ty0 = Math.floor(iy0 / TILE_SIZE);
    const tx1 = Math.floor((ix1 - 1) / TILE_SIZE), ty1 = Math.floor((iy1 - 1) / TILE_SIZE);
    for (let ty = ty0; ty <= ty1; ty++) {
      for (let tx = tx0; tx <= tx1; tx++) {
        const tox = tx * TILE_SIZE, toy = ty * TILE_SIZE;
        const cx0 = Math.max(tox, ix0), cy0 = Math.max(toy, iy0);
        const cx1 = Math.min(tox + TILE_SIZE, ix1), cy1 = Math.min(toy + TILE_SIZE, iy1);
        if (cx1 <= cx0 || cy1 <= cy0) continue;
        let buf: Uint8Array | null = null;
        for (let y = cy0; y < cy1; y++) {
          const srow = (y - y0) * w;
          const drow = (y - toy) * TILE_SIZE;
          for (let x = cx0; x < cx1; x++) {
            const v = data[srow + (x - x0)];
            if (v === 0) continue;
            if (!buf) buf = new Uint8Array(GRAY_TILE);
            buf[drow + (x - tox)] = v;
          }
        }
        if (buf) {
          const bbox = computeBBox("gray8", buf, TILE_SIZE);
          if (bbox) tiles.set(packKey(tx, ty), pool.createTile("gray8", buf, bbox));
        }
      }
    }
    return Selection._fromTiles(tiles);
  }

  // ⚠不变量（user 拍板 2026-07-29）：**Selection mask 恒二值 0/255**——所有工厂出厂即二值，
  //   羽化是将来的显式后处理，别让 AA 灰度从任何入口溜进来（各入口按 ≥128 阈值化）。

  /** 从图层 alpha 建（v0.7.38「从当前图层建选区」）。α≥128 → 255（恒二值不变量同上）；
   *  空层 → null（= 没选区）。像素走 tiles 直读口 getImageData（v0.6.39 唯一正确读法，零 canvas
   *  往返）；剪贴蒙版层按**原始** alpha（未被裁剪的），与 Procreate 一致。 */
  static fromLayerAlpha(layer: { bboxX: number; bboxY: number; bboxW: number; bboxH: number;
    getImageData(x: number, y: number, w: number, h: number): ImageData }): Selection | null {
    const w = layer.bboxW, h = layer.bboxH;
    if (w <= 0 || h <= 0) return null;
    const d = layer.getImageData(layer.bboxX, layer.bboxY, w, h).data;
    const g = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) g[i] = d[i * 4 + 3] >= 128 ? 255 : 0;
    return Selection.fromGray8Region(layer.bboxX, layer.bboxY, w, h, g);
  }

  /** 全白选区（select all / 反选-无选区 / 整层选区）。x/y 给 layer 偏移用。 */
  static full(docW: number, docH: number, x = 0, y = 0): Selection | null {
    const w = docW | 0, h = docH | 0;
    if (w <= 0 || h <= 0) return null;
    const g = new Uint8Array(w * h).fill(255);
    return Selection.fromGray8Region(x, y, w, h, g);
  }

  // ---- 组合（per-tile 布尔，8-bit AA 边）----

  /**
   * 把 newSel 按 mode 合并到 oldSel（两者皆 Selection|null）。退化（空）→ null。
   *   new → 替换；union → ∪；subtract → \；intersect → ∩
   * AA 公式对齐旧 Canvas2D 合成（union=src-over、subtract=dst-out、intersect=dst-in），偏差 ≤1/255。
   * 只读两个入参（不接管所有权；调用方自己管 dispose）。mode="new"/!oldSel 时**原样返回 newSel**、
   * !newSel 时原样返回 oldSel（与旧版同——调用方按“返回 === 入参”判断所有权是否转移）。
   */
  static compose(oldSel: Selection | null, newSel: Selection | null, mode: ComposeMode): Selection | null {
    if (!newSel) return oldSel;
    if (mode === "new" || !oldSel) return newSel;
    oldSel._assertAlive(); newSel._assertAlive();
    const pool = appTilePool();
    const tiles = new Map<number, TileHandle>();
    const keys = new Set<number>();
    if (mode === "intersect") {
      oldSel._tiles.forEach((_h, k) => { if (newSel._tiles.has(k)) keys.add(k); });
    } else if (mode === "subtract") {
      oldSel._tiles.forEach((_h, k) => keys.add(k));
    } else {   // union
      oldSel._tiles.forEach((_h, k) => keys.add(k));
      newSel._tiles.forEach((_h, k) => keys.add(k));
    }
    for (const k of keys) {
      const oh = oldSel._tiles.get(k) ?? null;
      const nh = newSel._tiles.get(k) ?? null;
      if (mode === "union" && oh && !nh) { tiles.set(k, oh.acquire()); continue; }   // 无对手格：原样共享
      if (mode === "union" && nh && !oh) { tiles.set(k, nh.acquire()); continue; }
      if (mode === "subtract" && !nh) { tiles.set(k, oh!.acquire()); continue; }
      const o = oh ? oh.bytes() : null;
      const n = nh ? nh.bytes() : null;
      const buf = new Uint8Array(GRAY_TILE);
      let any = false;
      for (let i = 0; i < GRAY_TILE; i++) {
        const ov = o ? o[i] : 0;
        const nv = n ? n[i] : 0;
        let r: number;
        if (mode === "union") r = nv + Math.round(ov * (255 - nv) / 255);
        else if (mode === "subtract") r = Math.round(ov * (255 - nv) / 255);
        else r = Math.round(ov * nv / 255);   // intersect
        buf[i] = r;
        if (r !== 0) any = true;
      }
      if (!any) continue;
      const bbox = computeBBox("gray8", buf, TILE_SIZE);
      if (bbox) tiles.set(k, pool.createTile("gray8", buf, bbox));
    }
    return Selection._fromTiles(tiles);
  }

  /** 反选：docW×docH 内 255-v。返回新 Selection（全选的反 = null 由调用方语义兜——mask 全零时返 null）。 */
  invert(docW: number, docH: number): Selection | null {
    this._assertAlive();
    const g = this.materializeMaskRegion(0, 0, docW, docH);
    for (let i = 0; i < g.length; i++) g[i] = 255 - g[i];
    return Selection.fromGray8Region(0, 0, docW, docH, g);
  }

  /**
   * 硬形态学 扩张(radius>0)/收缩(radius<0)：选区编辑 op。返回新 Selection（或 null=收没了）。
   *   - 二值化阈值 128（与蚂蚁线 outline 的 >128 一致——选区"在不在"按半透明分界）。
   *   - 8-连通（Chebyshev/方形增长），|radius| 轮，pixel-art 逻辑（硬边，不羽化）。
   *   - 膨胀时 bbox 每边外扩 radius 并 clamp 到 doc；收缩沿用原 bbox。
   *   白边场景：魔术棒停在线稿 AA 半透明处 → 对选区 expand 几 px 钻到线下 → 填色无白边。
   */
  morphed(radius: number, docW: number, docH: number): Selection | null {
    this._assertAlive();
    const r = Math.round(radius);
    if (r === 0) return this;
    if (this.bboxW <= 0 || this.bboxH <= 0) return this;
    const grow = r > 0;
    const a = Math.abs(r);
    const pad = grow ? a : 0;
    let nx0 = this.bboxX - pad, ny0 = this.bboxY - pad;
    let nx1 = this.bboxX + this.bboxW + pad, ny1 = this.bboxY + this.bboxH + pad;
    nx0 = Math.max(0, nx0); ny0 = Math.max(0, ny0);
    nx1 = Math.min(docW, nx1); ny1 = Math.min(docH, ny1);
    const nw = nx1 - nx0, nh = ny1 - ny0;
    if (nw <= 0 || nh <= 0) return null;
    const src = this.materializeMaskRegion(nx0, ny0, nw, nh);
    const grid = new Uint8Array(nw * nh);
    for (let i = 0; i < nw * nh; i++) if (src[i] >= 128) grid[i] = 1;
    morphBinary(grid, nw, nh, a, grow);
    // 网格 → 硬边 0/255 gray8
    let any = false;
    for (let i = 0; i < nw * nh; i++) {
      src[i] = grid[i] ? 255 : 0;
      if (grid[i]) any = true;
    }
    if (!any) return null;          // 收缩到空 = 没选区
    return Selection.fromGray8Region(nx0, ny0, nw, nh, src);
  }

  // ---- 窄读口（CPU 算法读者：applyMaskPostStroke / liquify / filters / 魔棒下游）----

  /** doc 矩形 → gray8 平面（缺 tile / bbox 外 = 0）。每次新分配（调用方可写）。 */
  materializeMaskRegion(x0: number, y0: number, w: number, h: number): Uint8Array {
    this._assertAlive();
    const out = new Uint8Array(Math.max(0, w * h));
    if (w <= 0 || h <= 0) return out;
    const ix1 = x0 + w, iy1 = y0 + h;
    this._tiles.forEach((handle, k) => {
      const tox = unpackTx(k) * TILE_SIZE, toy = unpackTy(k) * TILE_SIZE;
      const cx0 = Math.max(tox, x0), cy0 = Math.max(toy, y0);
      const cx1 = Math.min(tox + TILE_SIZE, ix1), cy1 = Math.min(toy + TILE_SIZE, iy1);
      if (cx1 <= cx0 || cy1 <= cy0) return;
      const tile = handle.bytes();
      for (let y = cy0; y < cy1; y++) {
        let si = (y - toy) * TILE_SIZE + (cx0 - tox);
        let di = (y - y0) * w + (cx0 - x0);
        for (let x = cx0; x < cx1; x++) out[di++] = tile[si++];
      }
    });
    return out;
  }

  /** 单点采样（0..255；界外 0）。 */
  sampleAt(docX: number, docY: number): number {
    this._assertAlive();
    const x = Math.floor(docX), y = Math.floor(docY);
    if (x < 0 || y < 0) return 0;
    const h = this._tiles.get(packKey(Math.floor(x / TILE_SIZE), Math.floor(y / TILE_SIZE)));
    if (!h) return 0;
    return h.bytes()[(y % TILE_SIZE) * TILE_SIZE + (x % TILE_SIZE)];
  }

  /** bbox 对齐 gray8 平面（懒缓存；**只读**，别写）。GL R8 直传 / 反复读者用。 */
  bboxMask(): { x: number; y: number; w: number; h: number; data: Uint8Array } {
    this._assertAlive();
    if (!this._bboxMask) {
      this._bboxMask = {
        x: this.bboxX, y: this.bboxY, w: this.bboxW, h: this.bboxH,
        data: this.materializeMaskRegion(this.bboxX, this.bboxY, this.bboxW, this.bboxH),
      };
    }
    return this._bboxMask;
  }

  // ---- 作用到 layer（改 layer 像素，不改自身）----

  // 笔刷/橡皮/液化结束后：把 layer 在选区外的像素 revert 到 preSnap（"stroke 只在选区内生效"）。
  // per-pixel：选区外取 pre，选区内取 after。brush/eraser 都对（按 mask 选 pre/after，不是 composite）。
  applyMaskPostStroke(layer: LayerLike, preSnap: LayerSnapLike | null): void {
    if (!preSnap) return;
    this._assertAlive();
    const afterSnap = layer.snapshotImageData();
    const px0 = preSnap.bboxX, py0 = preSnap.bboxY;
    const px1 = px0 + preSnap.bboxW, py1 = py0 + preSnap.bboxH;
    const ax0 = afterSnap.bboxX, ay0 = afterSnap.bboxY;
    const ax1 = ax0 + afterSnap.bboxW, ay1 = ay0 + afterSnap.bboxH;
    const ux0 = Math.min(px0, ax0), uy0 = Math.min(py0, ay0);
    const ux1 = Math.max(px1, ax1), uy1 = Math.max(py1, ay1);
    const uw = ux1 - ux0, uh = uy1 - uy0;
    if (uw <= 0 || uh <= 0) return;

    const mask = this.materializeMaskRegion(ux0, uy0, uw, uh);   // doc 空间窄读（gray8）
    const preData = preSnap.imageData ? preSnap.imageData.data : null;
    const afterData = afterSnap.imageData ? afterSnap.imageData.data : null;

    const out = new ImageData(uw, uh);
    const odata = out.data;
    for (let y = 0; y < uh; y++) {
      for (let x = 0; x < uw; x++) {
        const docX = ux0 + x, docY = uy0 + y;
        const oi = (y * uw + x) * 4;
        const useAfter = mask[y * uw + x] > 0;
        if (useAfter && afterData) {
          const aix = docX - ax0, aiy = docY - ay0;
          if (aix >= 0 && aix < afterSnap.bboxW && aiy >= 0 && aiy < afterSnap.bboxH) {
            const i = (aiy * afterSnap.bboxW + aix) * 4;
            odata[oi] = afterData[i]; odata[oi + 1] = afterData[i + 1];
            odata[oi + 2] = afterData[i + 2]; odata[oi + 3] = afterData[i + 3];
          }
        } else if (!useAfter && preData) {
          const pix = docX - px0, piy = docY - py0;
          if (pix >= 0 && pix < preSnap.bboxW && piy >= 0 && piy < preSnap.bboxH) {
            const i = (piy * preSnap.bboxW + pix) * 4;
            odata[oi] = preData[i]; odata[oi + 1] = preData[i + 1];
            odata[oi + 2] = preData[i + 2]; odata[oi + 3] = preData[i + 3];
          }
        }
      }
    }
    layer.putImageData(ux0, uy0, out);   // out 已是 post-stroke-masked 结果，整块替换该区
  }

  // 选区内填色（调用方负责 push history）。source-over 叠在已有像素上（color RGB + alpha=mask）。
  // v0.6.41 去 canvas 化：gray8 mask + 字节 over（同为 gl-smoke fillParity 的 golden 参照——精度只升不降）。
  fillOnLayer(layer: LayerLike, color: string): void {
    if (!layer) return;
    this._assertAlive();
    const w = this.bboxW, h = this.bboxH;
    if (w <= 0 || h <= 0) return;
    const m = parseInt(color.slice(1), 16);
    const cr = (m >> 16) & 255, cg = (m >> 8) & 255, cb = m & 255;
    const mask = this.materializeMaskRegion(this.bboxX, this.bboxY, w, h);
    layer.editRegionBytes(this.bboxX, this.bboxY, w, h, (buf) => {
        for (let i = 0; i < w * h; i++) {
          const as = mask[i] / 255;
          if (as <= 0) continue;
          const o = i * 4;
          const ab = buf[o + 3] / 255;
          const ao = as + ab * (1 - as);
          buf[o]     = Math.round((cr * as + buf[o]     * ab * (1 - as)) / ao);
          buf[o + 1] = Math.round((cg * as + buf[o + 1] * ab * (1 - as)) / ao);
          buf[o + 2] = Math.round((cb * as + buf[o + 2] * ab * (1 - as)) / ao);
          buf[o + 3] = Math.round(ao * 255);
        }
      });
  }

  // 清除选区内像素（dst-out mask；alpha 衰减、RGB 保留——tile 惯例）。v0.6.41 字节版。
  clearOnLayer(layer: LayerLike): void {
    if (!layer) return;
    this._assertAlive();
    const w = this.bboxW, h = this.bboxH;
    if (w <= 0 || h <= 0) return;
    const mask = this.materializeMaskRegion(this.bboxX, this.bboxY, w, h);
    layer.editRegionBytes(this.bboxX, this.bboxY, w, h, (buf) => {
        for (let i = 0; i < w * h; i++) {
          if (mask[i]) buf[i * 4 + 3] = Math.round(buf[i * 4 + 3] * (255 - mask[i]) / 255);
        }
      });
  }

  // ---- crop / resample 时变换自身 → 新 Selection（doc.cropTo/resampleTo 用；region 式，对齐 LayerPixels 先例）----

  /** 裁剪：doc 原点平移 (dx,dy)，新画布 nw×nh。clamp 到画布内，全裁掉 → null。 */
  croppedTo(dx: number, dy: number, nw: number, nh: number): Selection | null {
    this._assertAlive();
    const tL = this.bboxX - dx, tT = this.bboxY - dy;
    const tR = tL + this.bboxW, tB = tT + this.bboxH;
    const newL = Math.max(0, tL), newT = Math.max(0, tT);
    const newR = Math.min(nw, tR), newB = Math.min(nh, tB);
    const newW = newR - newL, newH = newB - newT;
    if (newW <= 0 || newH <= 0) return null;
    const src = this.materializeMaskRegion(newL + dx, newT + dy, newW, newH);
    return Selection.fromGray8Region(newL, newT, newW, newH, src);
  }

  /** 水平翻转：mask 左右镜像，bbox 在 docW 内镜像。 */
  flippedHorizontal(docW: number): Selection | null {
    this._assertAlive();
    const w = this.bboxW, h = this.bboxH;
    const src = this.materializeMaskRegion(this.bboxX, this.bboxY, w, h);
    const dst = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) dst[y * w + (w - 1 - x)] = src[y * w + x];
    return Selection.fromGray8Region(docW - (this.bboxX + w), this.bboxY, w, h, dst);
  }

  /**
   * 逆时针旋转 90°。docW = **旧** doc 宽。与 doc.rotate90CCW 一致：旧 (x,y) → 新 (y, W-1-x)。
   *   新 bbox：newX=bboxY, newY=docW-(bboxX+bboxW), newW=bboxH, newH=bboxW。
   */
  rotated90CCW(docW: number, _docH: number): Selection | null {
    this._assertAlive();
    const w = this.bboxW, h = this.bboxH;
    const src = this.materializeMaskRegion(this.bboxX, this.bboxY, w, h);
    const nw = h, nh = w;
    const dst = new Uint8Array(nw * nh);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) dst[(w - 1 - x) * nw + y] = src[y * w + x];
    return Selection.fromGray8Region(this.bboxY, docW - (this.bboxX + w), nw, nh, dst);
  }

  /** 重采样：mask 同步缩放 (sx,sy)。v0.6.46 字节版：面积平均缩放 → ≥128 二值化（选区不变量：恒 0/255）。零 canvas。 */
  resampledTo(sx: number, sy: number): Selection | null {
    this._assertAlive();
    const oW = this.bboxW, oH = this.bboxH;
    const nbw = Math.max(1, Math.round(oW * sx));
    const nbh = Math.max(1, Math.round(oH * sy));
    const src = this.materializeMaskRegion(this.bboxX, this.bboxY, oW, oH);
    const g = resampleMaskArea(src, oW, oH, nbw, nbh);
    return Selection.fromGray8Region(Math.round(this.bboxX * sx), Math.round(this.bboxY * sy), nbw, nbh, g);
  }

  /** 偏移环绕：随 doc.offsetWrap 平移。dx,dy 已归一化到 [0,W)/[0,H)。整数平移，硬搬像素。 */
  offsetWrapped(dx: number, dy: number, docW: number, docH: number): Selection | null {
    this._assertAlive();
    const bx = this.bboxX, by = this.bboxY, w = this.bboxW, h = this.bboxH;
    const src = this.materializeMaskRegion(bx, by, w, h);
    const dst = new Uint8Array(docW * docH);
    for (let y = 0; y < h; y++) {
      const ny = (by + y + dy) % docH;
      for (let x = 0; x < w; x++) {
        const v = src[y * w + x];
        if (v === 0) continue;
        dst[ny * docW + ((bx + x + dx) % docW)] = v;
      }
    }
    return Selection.fromGray8Region(0, 0, docW, docH, dst);
  }
}

// gray8 mask 面积平均缩放 + ≥128 二值化（resampledTo 用；模块级纯函数，node 直测）。
function resampleMaskArea(src: Uint8Array, sw: number, sh: number, tw: number, th: number): Uint8Array {
  const out = new Uint8Array(tw * th);
  const xr = sw / tw, yr = sh / th;
  for (let dy = 0; dy < th; dy++) {
    const y0 = dy * yr, y1 = (dy + 1) * yr;
    const iy0 = Math.floor(y0), iy1 = Math.min(sh, Math.ceil(y1));
    for (let dx = 0; dx < tw; dx++) {
      const x0 = dx * xr, x1 = (dx + 1) * xr;
      const ix0 = Math.floor(x0), ix1 = Math.min(sw, Math.ceil(x1));
      let acc = 0, area = 0;
      for (let yy = iy0; yy < iy1; yy++) {
        const wy = Math.min(y1, yy + 1) - Math.max(y0, yy);
        if (wy <= 0) continue;
        for (let xx = ix0; xx < ix1; xx++) {
          const wx = Math.min(x1, xx + 1) - Math.max(x0, xx);
          if (wx <= 0) continue;
          acc += src[yy * sw + xx] * wx * wy; area += wx * wy;
        }
      }
      out[dy * tw + dx] = (area > 0 && acc / area >= 128) ? 255 : 0;
    }
  }
  return out;
}

// ---- 多边形栅格器（v0.6.19 多边形套索，模块级纯函数，node 直测）----
// 整数格点顶点 → 0/255 硬边 gray8（锁像素格点边缘；与蚂蚁线/morphed 的 128 阈值族天然对齐）。
// 判据 = 像素中心 (px+0.5, py+0.5) 的 even-odd 交叉数（与 Canvas2D fill("evenodd") 同语义，无 AA）。
// 中心恰在边上的平局用半开区间 [xa, xb)（左含右不含）——每像素归属唯一，邻接多边形不重叠不漏缝。
export function rasterizePolygonGray8(
  verts: Array<{ x: number; y: number }>,
): { x0: number; y0: number; w: number; h: number; g: Uint8Array } | null {
  if (verts.length < 3) return null;
  let mnx = Infinity, mny = Infinity, mxx = -Infinity, mxy = -Infinity;
  for (const v of verts) {
    if (v.x < mnx) mnx = v.x; if (v.x > mxx) mxx = v.x;
    if (v.y < mny) mny = v.y; if (v.y > mxy) mxy = v.y;
  }
  const x0 = Math.floor(mnx), y0 = Math.floor(mny);
  const w = Math.ceil(mxx) - x0, h = Math.ceil(mxy) - y0;
  if (w <= 0 || h <= 0) return null;   // 共线/零面积
  const g = new Uint8Array(w * h);
  const xs: number[] = [];
  let any = false;
  for (let py = y0; py < y0 + h; py++) {
    const yc = py + 0.5;
    xs.length = 0;
    for (let i = 0; i < verts.length; i++) {
      const a = verts[i], b = verts[(i + 1) % verts.length];
      if ((a.y <= yc) === (b.y <= yc)) continue;   // 不跨扫描线（水平边天然跳过）
      xs.push(a.x + ((yc - a.y) * (b.x - a.x)) / (b.y - a.y));
    }
    if (xs.length < 2) continue;
    xs.sort((u, v) => u - v);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      // 填 px 使 px+0.5 ∈ [xa, xb)
      const pxA = Math.max(x0, Math.ceil(xs[k] - 0.5));
      const pxB = Math.min(x0 + w - 1, Math.ceil(xs[k + 1] - 0.5) - 1);
      for (let px = pxA; px <= pxB; px++) { g[(py - y0) * w + (px - x0)] = 255; any = true; }
    }
  }
  return any ? { x0, y0, w, h, g } : null;
}
