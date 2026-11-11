import { type FilterKernel, type FilterParams } from "./kernel.ts";
import { type AnimCurve } from "../../common/anim-curve.ts";
export type CurveChannel = "comp" | "r" | "g" | "b" | "a";
export declare const CURVE_CHANNELS: readonly CurveChannel[];
export interface CurvesParams extends FilterParams {
    active: CurveChannel;
    comp: AnimCurve;
    r: AnimCurve;
    g: AnimCurve;
    b: AnimCurve;
    a: AnimCurve;
}
/** 参数 → AnimCurve：AnimCurve 原样（校验后）；旧 [x0..255, y0..255][] 点表 → 转 0..1 曲线；其他 → 恒等。 */
export declare function curveOf(p: unknown): AnimCurve;
export declare const CurvesKernel: FilterKernel;
