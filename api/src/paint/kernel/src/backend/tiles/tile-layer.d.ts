import { type TileHandle } from "./cpu-tile-pool.ts";
export type TileSwapObserver = (lp: LayerPixels, key: number, old: TileHandle | null) => void;
export declare function addTileSwapObserver(fn: TileSwapObserver): () => void;
export interface PixelsSnapshot {
    across: number;
    tiles: [number, TileHandle][];
}
export declare function disposePixelsSnapshot(snap: PixelsSnapshot): void;
export declare class LayerPixels {
    readonly docW: number;
    readonly docH: number;
    private _across;
    private _tiles;
    private _contentVersion;
    constructor(docW: number, docH: number);
    dispose(): void;
    get tileCount(): number;
    get contentVersion(): number;
    get byteUsage(): number;
    isEmpty(): boolean;
    getTile(tx: number, ty: number): Uint8ClampedArray | null;
    getTileHandle(tx: number, ty: number): TileHandle | null;
    handles(): IterableIterator<TileHandle>;
    putTile(tx: number, ty: number, pixels: Uint8ClampedArray): void;
    forEachTile(cb: (tx: number, ty: number, pixels: Uint8ClampedArray) => void): void;
    forEachTileHandle(cb: (tx: number, ty: number, h: TileHandle) => void): void;
    putRegion(sx0: number, sy0: number, sw: number, sh: number, src: Uint8ClampedArray): void;
    applyRegionDiff(sx0: number, sy0: number, sw: number, sh: number, src: Uint8ClampedArray): {
        tx: number;
        ty: number;
    }[];
    getRegion(x0: number, y0: number, w: number, h: number): Uint8ClampedArray;
    sampleAt(x: number, y: number): [number, number, number, number];
    contentBounds(tight?: boolean): {
        x: number;
        y: number;
        w: number;
        h: number;
    } | null;
    clear(): void;
    flippedHorizontal(): LayerPixels;
    rotated90CCW(): LayerPixels;
    offsetWrapped(ox: number, oy: number): LayerPixels;
    cropped(dx: number, dy: number, newW: number, newH: number): LayerPixels;
    snapshot(): PixelsSnapshot;
    snapshotEquals(snap: PixelsSnapshot): boolean;
    restore(snap: PixelsSnapshot): void;
    _swapTileHandle(key: number, h: TileHandle | null): TileHandle | null;
    private _setTileBuf;
    private _releaseAll;
}
export declare function editRegionBytes(lp: LayerPixels, rx0: number, ry0: number, rw: number, rh: number, fn: (buf: Uint8ClampedArray, ox: number, oy: number) => void): void;
