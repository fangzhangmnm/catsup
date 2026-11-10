// cpu-tile-compression —— tile 的同步 deflate codec（vendored fflate 的 sync 路径）。
//
// 为什么同步（而不是 CompressionStream）：TileHandle.bytes() 是同步读（75+ 个同步读者），
// 压缩驻留的 tile 被读时必须**同步**解压回填——DecompressionStream 是异步的，救不了。
// 「后台化」由 background-sync-jobs 按预算切片调 pool.compactOldest() 实现，不靠异步 codec
// （spec: journal/20260721 Architecture.md §cpu-tile-compression——放副线程是后续升级，接口不变）。
//
// 格式：裸 deflate 字节流（无自述头——format/bbox/原长都在池的 TileRecord 里，不重复存）。
// 动漫向的自定义 filter+编码（spec line 119-121）是后续候选：换 codec 只动这里（池按 codec 注入）。

import { deflateSync, inflateSync } from "../../../vendor/fflate/fflate.esm.js";
import type { TileCodec } from "./cpu-tile-pool.ts";

export const deflateTileCodec: TileCodec = {
  name: "deflate-v1",
  compress(bytes: Uint8Array): Uint8Array {
    return deflateSync(bytes, { level: 6 });
  },
  decompress(bytes: Uint8Array, byteLength: number): Uint8Array {
    // out 预分配到已知原长：fflate 直接填入，长度天然精确；不符即数据坏 → throw（池会让读者看到异常）
    const out = inflateSync(bytes, { out: new Uint8Array(byteLength) });
    if (out.byteLength !== byteLength) throw new Error(`deflate-v1: inflated length mismatch ${out.byteLength} != ${byteLength}`);
    return out;
  },
};
