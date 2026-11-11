export declare const BSPLINE_PAD = 8;
/** 系数平面：data = premult float RGBA，尺寸 (w+2·PAD)×(h+2·PAD)；w/h = 逻辑（源）尺寸。 */
export interface SplinePlane {
    data: Float32Array;
    w: number;
    h: number;
}
export declare function b3(t: number): number;
/** straight RGBA u8 (w×h) → 预滤波 B 样条系数平面（premult float，PAD 边距，4 通道独立）。
 *  一次性 O(n)；调用方按源身份缓存（源不可变期间复用）。 */
export declare function prefilterToSplinePlane(rgba: Uint8ClampedArray, w: number, h: number): SplinePlane;
export declare function sampleSplinePremult(plane: SplinePlane, sx: number, sy: number, out: Uint8ClampedArray | Float32Array, oi: number): void;
