import { type AnimCurve } from "./anim-curve.ts";
export type PressureShaper = (p: number) => number;
export interface PressureShapeSource {
    pressureGamma?: number;
    pressureCurve?: AnimCurve | null | unknown;
}
/** 烤 LUT（256 项，t = i/255，值钳 0..1）。 */
export declare function bakePressureLut(curve: AnimCurve): Float32Array;
/** LUT 线性插值查表（p 先钳 0..1）。 */
export declare function lookupPressureLut(lut: Float32Array, p: number): number;
/** 按笔设置造整形函数：合法 pressureCurve → LUT 查表；否则 p^gamma（gamma 地板 0.01，同旧引擎）。 */
export declare function makePressureShaper(s: PressureShapeSource): PressureShaper;
/** gamma → 曲线（5 key 采样 v = t^g，clampedAuto）；g = 1 → 共线 = 精确恒等。「改用曲线」按钮的起点。 */
export declare function curveFromGamma(gamma: number): AnimCurve;
