// cpu-gpu-tile-bridge —— CPU tile ↔ GPU tile 转换的唯一入口（S7；spec :178-186）。
//
// 契约：
//   - 存 cpuId → gpuId 的对应关系。tile 两侧都只读 → **身份即内容**：命中且 gpu 侧还活着
//     就复用，跳过上传（CoW 下 commit 后只有变更 tile 换了 cpuId → 增量上传自然发生）。
//     映射**只防重复劳动**——使用者自己维护「哪个坐标用哪个 tile」，这里不管。
//   - **禁反查**：没有 gpu→cpu 的查询口（spec:186）；用死 gpu id 查任何东西都不支持。
//   - **batch only**：无单个创建（spec:184）。
//   - purgeDead：扫两池的存活谓词，清掉任一侧已死的条目（spec:182）。
//   - 大 FBO with bbox 的批量口（spec:185，per-tile readPixels 太慢）：
//     readbackRegionToTiles = 一次 readPixels 整 bbox → 切成对齐 doc 网格的 256² tile 字节
//     （切片是纯函数 sliceRegionToTiles，node 全测；S8 brush commit 的消费口）。
//
// bytes 惰性取（entry.bytes 是回调）：映射命中时**不物化** CPU 字节——压缩驻留的 tile
//   在 GPU 副本还活着时零解压成本。

import { TILE_SIZE, tileRangeForRect } from "../../common/tile-geometry.ts";
import type { GpuTilePool } from "./gpu-tile-pool.ts";

export interface UploadEntry { cpuId: number; bytes: () => Uint8Array }

export class CpuGpuTileBridge {
  private _pool: GpuTilePool;
  private _map = new Map<number, number>();   // cpuId → gpuId
  readonly stats = { hits: 0, uploads: 0 };

  constructor(pool: GpuTilePool) { this._pool = pool; }

  // 保证每个 cpu tile 在 GPU 有活副本；返回 gpu id（与 entries 对齐）。
  // miss/死副本收集成一批 uploadBatch（allocBatch 语义：不 grow、可抛 GPU_POOL_EXHAUSTED——
  //   调用方先 reserve 或接住降级）。
  ensureUploaded(entries: UploadEntry[]): number[] {
    const out = new Array<number>(entries.length);
    const missIdx: number[] = [];
    for (let i = 0; i < entries.length; i++) {
      const mapped = this._map.get(entries[i].cpuId);
      if (mapped !== undefined && this._pool.isAlive(mapped)) {
        this._pool.slotOf(mapped);   // touch（LRU 最近使用）
        out[i] = mapped;
        this.stats.hits++;
      } else {
        missIdx.push(i);
      }
    }
    if (missIdx.length) {
      const ids = this._pool.uploadBatch(missIdx.map((i) => ({ bytes: entries[i].bytes() })));
      for (let j = 0; j < missIdx.length; j++) {
        const i = missIdx[j];
        this._map.set(entries[i].cpuId, ids[j]);
        out[i] = ids[j];
        this.stats.uploads++;
      }
    }
    return out;
  }

  // FBO/readback 同时造出 cpu+gpu 双份时登记对应关系（防下次重复劳动）。
  registerPair(cpuId: number, gpuId: number): void { this._map.set(cpuId, gpuId); }

  // 需求精算探针（v0.10.8 frame-demand）：该 cpu tile 在 GPU 有活副本吗（不 touch LRU）。
  hasLive(cpuId: number): boolean {
    const g = this._map.get(cpuId);
    return g !== undefined && this._pool.isAlive(g);
  }

  // 清掉任一侧已死的条目。cpuAlive 由 cpu 池提供存活谓词；gpu 侧问 pool.isAlive。
  purgeDead(cpuAlive: (cpuId: number) => boolean): void {
    for (const [cpuId, gpuId] of this._map) {
      if (!cpuAlive(cpuId) || !this._pool.isAlive(gpuId)) this._map.delete(cpuId);
    }
  }

  clear(): void { this._map.clear(); }
  get size(): number { return this._map.size; }
}

// ---- 纯函数：大区域字节 → 对齐 doc 网格的 256² tile 字节（node 全测） ----
// pixels = (x,y,w,h) 区域的 flat RGBA（行优先，w 宽，y 向下——readPixels 的调用方负责翻转到该朝向）。
// 产出覆盖区域的每个 doc tile：满 256² 字节，区域外补透明 0（与 LayerPixels.putTile 对齐）。
export function sliceRegionToTiles(
  pixels: Uint8Array, x: number, y: number, w: number, h: number,
  docW: number, docH: number,
): { tx: number; ty: number; bytes: Uint8Array }[] {
  const r = tileRangeForRect(x, y, w, h, docW, docH);
  if (!r) return [];
  const out: { tx: number; ty: number; bytes: Uint8Array }[] = [];
  for (let ty = r.ty0; ty <= r.ty1; ty++) {
    for (let tx = r.tx0; tx <= r.tx1; tx++) {
      const bytes = new Uint8Array(TILE_SIZE * TILE_SIZE * 4);
      const tox = tx * TILE_SIZE, toy = ty * TILE_SIZE;
      const ix0 = Math.max(tox, x), iy0 = Math.max(toy, y);
      const ix1 = Math.min(tox + TILE_SIZE, x + w), iy1 = Math.min(toy + TILE_SIZE, y + h);
      for (let yy = iy0; yy < iy1; yy++) {
        const si = ((yy - y) * w + (ix0 - x)) * 4;
        const di = ((yy - toy) * TILE_SIZE + (ix0 - tox)) * 4;
        bytes.set(pixels.subarray(si, si + (ix1 - ix0) * 4), di);
      }
      out.push({ tx, ty, bytes });
    }
  }
  return out;
}
