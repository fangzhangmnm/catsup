export declare const TILE_SIZE = 256;
export declare function tilesAcross(docW: number): number;
export declare function tilesDown(docH: number): number;
export declare function tileCount(docW: number, docH: number): number;
export declare function tileKey(tx: number, ty: number, across: number): number;
export declare function tileCoord(key: number, across: number): {
    tx: number;
    ty: number;
};
export declare function tileDocOrigin(tx: number, ty: number): {
    x: number;
    y: number;
};
export declare function tileRangeForRect(x: number, y: number, w: number, h: number, docW: number, docH: number): {
    tx0: number;
    ty0: number;
    tx1: number;
    ty1: number;
} | null;
export declare function forEachTileInRect(x: number, y: number, w: number, h: number, docW: number, docH: number, cb: (tx: number, ty: number) => void): void;
