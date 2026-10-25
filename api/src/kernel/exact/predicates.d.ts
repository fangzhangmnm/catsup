import type { IPt2, IPt3 } from "./lattice.ts";
/** 过滤器统计（基准 / 调参用）：fast = 过滤器直接给出符号；slow = 退到 BigInt。 */
export declare const PRED_STATS: {
    fast: number;
    slow: number;
    reset(): void;
};
/** 2D 定向：c 在有向线 a→b 的左边 +1、右边 −1、共线 0。 */
export declare function orient2d(a: IPt2, b: IPt2, c: IPt2): -1 | 0 | 1;
export declare function orient2dD(a: {
    x: number;
    y: number;
}, b: {
    x: number;
    y: number;
}, c: {
    x: number;
    y: number;
}): -1 | 0 | 1;
/** 3D 定向：d 在 a,b,c 所定平面的哪一侧（右手：+1 = d 在 (b−a)×(c−a) 的正侧），共面 0。 */
export declare function orient3d(a: IPt3, b: IPt3, c: IPt3, d: IPt3): -1 | 0 | 1;
/** 点 p 是否在闭线段 [a,b] 上（共线 + 包围盒内；精确）。 */
export declare function onSegment2d(p: IPt2, a: IPt2, b: IPt2): boolean;
/** 两线段关系（精确，闭线段）。proper = 内部真交；touch = 一端落在对方上（含端点重合）；overlap = 共线且重叠（含只共一个端点的情形归 touch）；none = 不交。 */
export type SegRelation = "none" | "proper" | "touch" | "overlap";
export declare function segSeg2d(p1: IPt2, p2: IPt2, q1: IPt2, q2: IPt2): SegRelation;
/**
 * 真交 / 触交的交点（有理数，精确）：p1 + t·(p2−p1)，t = num/den（den > 0 规范化）。只对 segSeg2d ∈ {proper, touch} 且不共线的情形有定义；共线重叠没有单一交点。
 * 返回 BigInt 分子分母（den = cross(p2−p1, q2−q1)）。
 */
export interface Rational {
    num: bigint;
    den: bigint;
}
export declare function intersectParam(p1: IPt2, p2: IPt2, q1: IPt2, q2: IPt2): Rational | null;
/** 有理数比较（den > 0）。 */
export declare const cmpRational: (a: Rational, b: Rational) => -1 | 0 | 1;
/** 交点落在哪个像素（边长 P 的格；像素 k 覆盖 [kP, (k+1)P)）：floor 精确。 */
export declare function intersectionCell(p1: IPt2, p2: IPt2, t: Rational, P: number): IPt2;
export declare function floorDiv(a: bigint, b: bigint): bigint;
/** 格点所在像素。 */
export declare const cellOf: (p: IPt2, P: number) => IPt2;
/** 线段 [a,b] 是否碰到闭像素 [cx·P,(cx+1)·P]×[cy·P,(cy+1)·P]（精确：包围盒 + 四角定向，Liang–Barsky 的符号版）。 */
export declare function segHitsCell(a: IPt2, b: IPt2, cell: IPt2, P: number): boolean;
