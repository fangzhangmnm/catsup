// shared-tile-pool —— 几块画板合用的一个显卡图块池（CatsUp 施工单十九第 2 刀；画画软件不用，它一次只开一张画、每块画板照旧自己开一个）。
// created 2026-11-12 by Claude Opus 5.5（CatsUp 统筹批的提案 = CatsUp ai-docs/20261112-kernel-shared-pool-and-sleep-proposal.md）
//
// 为什么能合用：图块池本来就只是缓存（CPU 恒为 SSoT，见 gpu-tile-pool.ts 头注释），本来就认几个使用者（每帧只收谁也没钉住的片；
//   池长大 = 全部片号作废、generation 变，使用者照代数重传——raster-service / frame-demand / gl-room 本来就在查）。
// 宿主拿到的是一个不透明的东西（统筹 11-12 改）：只有报数的口和 dispose。池和图组留在内核里面，房间（GlRoom）经 sharedCoreOf 自己取——
//   露出去 = 池的全部方法都变成对外的口，以后内核想改池的结构就动不了。宿主（CatsUp）的白名单只许 import 这里的 createSharedTilePool / SharedTilePool。
// 退租顺序：合用它的画板都 dispose 了再 dispose 池；池先退了、画板还拿来用 = 抛、说清原因（GlRoom 里查）。
import { TILE_SIZE } from "../../common/tile-geometry.ts";
import type { Gl2Port, Gl2TileArena } from "../../common/gl2-port.ts";
import { GpuTilePool } from "./gpu-tile-pool.ts";

/** 报数的口：承诺了多少显存（字节）、多少片、图块边长（清单算每层的索引小图用）、现在有几个醒着没退租的房间在用。 */
export interface SharedTilePoolStats { readonly committedBytes: number; readonly slices: number; readonly tileSize: number; readonly users: number }
export interface SharedTilePool {
  readonly stats: SharedTilePoolStats;
  readonly disposed: boolean;
  /** 退租：图组还给 Port（真显卡立即释放）。幂等。之后合用它的画板再用 = 抛。 */
  dispose(): void;
}

/** 内核里面的那一半（宿主拿不到）。 */
export interface SharedPoolCore { readonly pool: GpuTilePool; readonly arena: Gl2TileArena; disposed: boolean }
const CORE = new WeakMap<SharedTilePool, SharedPoolCore>();

/** 建一个合用的池：起步和单块画板一样大（64 片，不超过 maxSlices），在 maxSlices 额度里按两倍长。 */
export function createSharedTilePool(glctx: Gl2Port, maxSlices: number): SharedTilePool {
  const arena = glctx.createTileArena(TILE_SIZE, Math.min(64, maxSlices));
  const core: SharedPoolCore = { pool: new GpuTilePool(arena, maxSlices), arena, disposed: false };
  const handle: SharedTilePool = {
    get stats(): SharedTilePoolStats { return { committedBytes: core.pool.committedBytes, slices: core.pool.capacity, tileSize: TILE_SIZE, users: core.pool.pinProviderCount }; },
    get disposed(): boolean { return core.disposed; },
    dispose(): void { if (core.disposed) return; core.disposed = true; core.arena.dispose(); },
  };
  CORE.set(handle, core);
  return handle;
}

/** 内核里面用：取合用池的那一半（GlRoom 构造时）。不是 createSharedTilePool 建的 = 抛。 */
export function sharedCoreOf(h: SharedTilePool): SharedPoolCore {
  const c = CORE.get(h);
  if (!c) throw new Error("sharedCoreOf: not a SharedTilePool made by createSharedTilePool");
  return c;
}
