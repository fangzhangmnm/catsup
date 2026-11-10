// app 级唯一 CPU tile 池（单例）。tileSize = TILE_SIZE（唯一定义在 tile-geometry.ts），注入 ctor。
//
// - 泄漏上报走注入（setTilePoolLeakReporter，app boot 接 error-badge funnel）——tiles/ 不 import
//   app 模块，保持零依赖可 node 测。
// - codec 由 S3（cpu-tile-compression）接入 setTilePoolCodec；接入前 raw quota 不 enforcement
//   （行为 = 旧 LayerPixels 裸数组时代，无回归）。
// - 生命周期：靠引用计数自然清空（LayerPixels.dispose / undo disposeData）。clearAll 是
//   核弹按钮，留给 workpiece 生命周期统一调（S4），别在换文档半途按——adopt 期间新旧两棵树共存。

import { CpuTilePool, type TileCodec } from "./cpu-tile-pool.ts";
import { TILE_SIZE } from "../../common/tile-geometry.ts";

// raw tile 总配额（超了就阻塞压缩最古老；需 codec 就位才 enforcement）。
// 2048² doc 满层 = 64 tile = 16MiB；384MiB ≈ 24 满层，超出走压缩。dev-console 可调。
export const RAW_TILE_QUOTA_BYTES = 384 * 1024 * 1024;

let _pool: CpuTilePool | null = null;
let _onLeak: ((info: string) => void) | null = null;

export function setTilePoolLeakReporter(fn: (info: string) => void): void { _onLeak = fn; }
export function setTilePoolCodec(codec: TileCodec): void {
  // codec 热接（boot 顺序无关）：现有池直接换。tile 只读，换 codec 只影响之后的压缩/解压。
  _codec = codec;
  if (_pool) _pool.setCodec(codec);
}
let _codec: TileCodec | null = null;

export function appTilePool(): CpuTilePool {
  if (!_pool) {
    _pool = new CpuTilePool({
      tileSize: TILE_SIZE,
      rawQuotaBytes: RAW_TILE_QUOTA_BYTES,
      codec: _codec,
      onLeak: (info) => _onLeak?.(info),
    });
  }
  return _pool;
}
