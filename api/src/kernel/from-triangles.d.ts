import { type Pt3 } from "./geom.ts";
import { Kernel } from "./kernel.ts";
export interface TriangleCastOptions {
    /** 弯折 ≤ 这个角度（度）的边变 soft + smooth。 */
    softDeg: number;
}
export interface TriangleCastReport {
    /** 输入三角数。 */
    triangles: number;
    /** 退化（点重合 / 三点共线）丢掉的。 */
    degenerate: number;
    /** 重复（同三个点，含反面朝向的双面片）丢掉的。 */
    duplicate: number;
    /** 不干净、交给结算机切的。 */
    repaired: number;
    /** 结算机也拒绝的（没进来）。 */
    rejected: number;
    /** 变成软边的条数。 */
    softened: number;
}
export declare function kernelFromTriangles(positions: readonly Pt3[], tris: readonly number[], opt: TriangleCastOptions): {
    kernel: Kernel;
    report: TriangleCastReport;
};
