// Tile 几何（纯函数，零依赖、零副作用、node 全可测）。
//
// WebGL2+tiling 重写的最底座：把「doc 像素坐标」↔「256² tile 网格坐标」之间的换算收成一处。
// 见 ai-docs/20260614-perf-webgl-memory-clip.md §3（TileStore 是突破层数上限的核心深模块；本文件是它的几何子层）。
//
// 约定（与 doc 坐标系一致）：
//   - doc 空间：(0,0)=左上，x 右、y 下，尺寸 docW×docH。
//   - tile (tx,ty)（0 起）覆盖 doc 矩形 [tx·256, ty·256] 起、256×256 大。
//     文档右/下边缘若非 256 整数倍，末行/末列 tile 仍是满 256²，越界像素恒透明、不参与。
//   - tileKey = ty·tilesAcross + tx —— 稀疏 map 的稳定整数键（同一 doc 尺寸内唯一）。
//   - 矩形一律 {x,y,w,h} 原点+尺寸（对齐 layer.bbox{X,Y,W,H}）；w≤0||h≤0 视为空。

export const TILE_SIZE = 256;

// 网格列数 / 行数（向上取整：边缘不足一 tile 也占一整 tile）。
export function tilesAcross(docW: number): number {
  return Math.max(1, Math.ceil(docW / TILE_SIZE));
}
export function tilesDown(docH: number): number {
  return Math.max(1, Math.ceil(docH / TILE_SIZE));
}
export function tileCount(docW: number, docH: number): number {
  return tilesAcross(docW) * tilesDown(docH);
}

// (tx,ty) → 稀疏 map 键。tilesAcross 由调用方传入（避免每次取 doc 尺寸）。
export function tileKey(tx: number, ty: number, across: number): number {
  return ty * across + tx;
}
// 键 → (tx,ty)（与 tileKey 互逆）。
export function tileCoord(key: number, across: number): { tx: number; ty: number } {
  return { tx: key % across, ty: Math.floor(key / across) };
}

// tile (tx,ty) 在 doc 空间的左上原点（像素）。tile 永远 256×256。
export function tileDocOrigin(tx: number, ty: number): { x: number; y: number } {
  return { x: tx * TILE_SIZE, y: ty * TILE_SIZE };
}

// doc 矩形 {x,y,w,h} 覆盖到的 tile 索引闭区间 {tx0,ty0,tx1,ty1}（含端点），已 clamp 到网格。
// 矩形为空（w≤0||h≤0）或整体落在 doc 之外 → null。
// 用途：一笔描边的 dirty bbox → 要重传/标脏的 tile 集；选区/填充影响的 tile 集。
export function tileRangeForRect(
  x: number, y: number, w: number, h: number,
  docW: number, docH: number,
): { tx0: number; ty0: number; tx1: number; ty1: number } | null {
  if (w <= 0 || h <= 0) return null;
  // 与 doc 边界求交（越界部分不产生 tile）。
  const ix0 = Math.max(0, x);
  const iy0 = Math.max(0, y);
  const ix1 = Math.min(docW, x + w);   // 排他右/下边
  const iy1 = Math.min(docH, y + h);
  if (ix1 <= ix0 || iy1 <= iy0) return null;   // 与 doc 无交集

  const across = tilesAcross(docW);
  const down = tilesDown(docH);
  const tx0 = Math.floor(ix0 / TILE_SIZE);
  const ty0 = Math.floor(iy0 / TILE_SIZE);
  // 末覆盖像素 = ix1-1（ix1 排他）；其所在 tile 即闭区间右端。
  const tx1 = Math.min(across - 1, Math.floor((ix1 - 1) / TILE_SIZE));
  const ty1 = Math.min(down - 1, Math.floor((iy1 - 1) / TILE_SIZE));
  return { tx0, ty0, tx1, ty1 };
}

// 遍历 doc 矩形覆盖的每个 tile，回调 (tx,ty)。空/无交 → 不回调。
export function forEachTileInRect(
  x: number, y: number, w: number, h: number,
  docW: number, docH: number,
  cb: (tx: number, ty: number) => void,
): void {
  const r = tileRangeForRect(x, y, w, h, docW, docH);
  if (!r) return;
  for (let ty = r.ty0; ty <= r.ty1; ty++) {
    for (let tx = r.tx0; tx <= r.tx1; tx++) cb(tx, ty);
  }
}
