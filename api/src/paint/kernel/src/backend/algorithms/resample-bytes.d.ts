export interface BytesPlane {
    data: Uint8ClampedArray;
    w: number;
    h: number;
}
export declare function areaResampleBytes(src: Uint8ClampedArray, sw: number, sh: number, tw: number, th: number): Uint8ClampedArray;
export declare function nearestResampleBytes(src: Uint8ClampedArray, sw: number, sh: number, tw: number, th: number): Uint8ClampedArray;
export declare function bilinearResampleBytes(src: Uint8ClampedArray, sw: number, sh: number, tw: number, th: number): Uint8ClampedArray;
export declare function bicubicResampleBytes(src: Uint8ClampedArray, sw: number, sh: number, tw: number, th: number): Uint8ClampedArray;
/** 双三次**点**采样（v0.6.61 液化第四核）：src[sx,sy]（浮点，straight RGBA）→ ddat[dstIdx..+3]。
 *  与 bicubicResampleBytes 同口径：Catmull-Rom 4×4、premult 累加、α 反振铃限幅（中央 2×2）、
 *  越界 tap=0（透明，防拉丝——同 liquify bilinearSample 的 v136 修）。
 *  整数坐标退化成精确点采样（liquify center-at-integer / v147 整数 march 约定依赖此性质）。 */
export declare function bicubicSamplePremult(src: Uint8ClampedArray, sw: number, sh: number, sx: number, sy: number, ddat: Uint8ClampedArray, dstIdx: number): void;
/** 统一入口。mode：nearest / area（=缩小优化"sharper"的字节正解）/ bilinear / bicubic /
 *  auto（两轴都缩→area；否则 bicubic——装裱模板 commit 的默认策略）。 */
export declare function resampleBytes(src: Uint8ClampedArray, sw: number, sh: number, tw: number, th: number, mode?: string): Uint8ClampedArray;
