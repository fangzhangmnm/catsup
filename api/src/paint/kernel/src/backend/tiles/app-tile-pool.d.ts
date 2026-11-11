import { CpuTilePool, type TileCodec } from "./cpu-tile-pool.ts";
export declare const RAW_TILE_QUOTA_BYTES: number;
export declare function setTilePoolLeakReporter(fn: (info: string) => void): void;
export declare function setTilePoolCodec(codec: TileCodec): void;
export declare function appTilePool(): CpuTilePool;
