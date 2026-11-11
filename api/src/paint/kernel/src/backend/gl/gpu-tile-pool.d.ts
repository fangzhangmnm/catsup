import type { Gl2Port, Gl2Texture, PooledFBO } from "../../common/gl2-port.ts";
export declare const GPU_TILE_BYTES: number;
export interface GpuTileBackend {
    readonly capacity: number;
    recreate(newCapacity: number): void;
    uploadSlice(slice: number, pixels: Uint8Array): void;
    copySlice(from: PooledFBO, slice: number, srcX: number, srcY: number, w: number, h: number): void;
}
export interface PinSets {
    required: Set<number>;
    preferred: Set<number>;
}
export declare class GpuTilePool {
    private _backend;
    private _maxSlices;
    private _slot;
    private _sliceOwner;
    private _free;
    private _nextId;
    private _frame;
    private _lastUse;
    private _lastBatch;
    private _pinProviders;
    readonly stats: {
        evictions: number;
        recreations: number;
        uploads: number;
        copies: number;
    };
    constructor(backend: GpuTileBackend, maxSlices: number);
    private _initSlices;
    get capacity(): number;
    get generation(): number;
    get maxSlices(): number;
    get allocatedCount(): number;
    get committedBytes(): number;
    get quotaBytes(): number;
    registerPinProvider(fn: () => PinSets): void;
    isAlive(id: number): boolean;
    slotOf(id: number): number;
    reserve(totalSlices: number): boolean;
    private _recreate;
    clearAll(): void;
    allocBatch(n: number): number[];
    uploadBatch(items: {
        bytes: Uint8Array;
    }[]): number[];
    copyBatchFrom(src: PooledFBO, items: {
        srcX: number;
        srcY: number;
        w: number;
        h: number;
    }[]): number[];
    evict(id: number): void;
    frameMaintain(): void;
    private _collectPins;
    private _evictForSpace;
}
export declare class IndexTexture {
    private _port;
    readonly tex: Gl2Texture;
    readonly across: number;
    readonly down: number;
    private _data;
    constructor(glctx: Gl2Port, docW: number, docH: number);
    rebuild(byKey: Map<number, number>, pool: GpuTilePool): void;
    setSlice(tx: number, ty: number, slice: number): void;
    dispose(): void;
    private _upload;
}
