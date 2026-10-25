import type { IPt3 } from "./lattice.ts";
/** 最近整数（四舍五入到格点；精确）：round(num / den)，den > 0。 */
export declare const roundDiv: (num: bigint, den: bigint) => bigint;
/** |p − q|² ≤ r²。 */
export declare function withinR(p: IPt3, q: IPt3, r: number): boolean;
export declare const distSq: (p: IPt3, q: IPt3) => bigint;
/** 点到闭线段 [a,b] 的距离² ≤ r²（精确）。 */
export declare function pointNearSegment(p: IPt3, a: IPt3, b: IPt3, r: number): boolean;
/** 点「骑」在线段内部：离段 ≤ r，且沿段的投影离两端都 ≥ r（贴着端点的归合并，不归切）。 */
export declare function pointRidesInterior(p: IPt3, a: IPt3, b: IPt3, r: number): boolean;
export type SegSegKind = "none" | "cross" | "near" | "overlap";
export declare function segSeg3Exact(a1: IPt3, a2: IPt3, b1: IPt3, b2: IPt3, r: number): {
    kind: SegSegKind;
    points: IPt3[];
};
