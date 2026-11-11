import type { GpuTilePool } from "./gpu-tile-pool.ts";
export interface UploadEntry {
    cpuId: number;
    bytes: () => Uint8Array;
}
export declare class CpuGpuTileBridge {
    private _pool;
    private _map;
    readonly stats: {
        hits: number;
        uploads: number;
    };
    constructor(pool: GpuTilePool);
    ensureUploaded(entries: UploadEntry[]): number[];
    registerPair(cpuId: number, gpuId: number): void;
    hasLive(cpuId: number): boolean;
    purgeDead(cpuAlive: (cpuId: number) => boolean): void;
    clear(): void;
    get size(): number;
}
export declare function sliceRegionToTiles(pixels: Uint8Array, x: number, y: number, w: number, h: number, docW: number, docH: number): {
    tx: number;
    ty: number;
    bytes: Uint8Array;
}[];
