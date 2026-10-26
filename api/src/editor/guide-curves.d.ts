import type { Pt3 } from "../kernel/kernel.ts";
/** 射线（光标）离圆最近的那一点：射线和圆所在平面的交点，沿圆心方向推到半径上。射线几乎平行于圆面 / 正对圆心 = null。 */
export declare function nearestOnCircle(c: Pt3, n: Pt3, r: number, rayO: Pt3, rayD: Pt3): Pt3 | null;
/** 直线 p + t·dir（dir 单位向量；len 有 = 线段 t ∈ [0, len]）和圆的交点（0–2 个）。 */
export declare function lineCircle(p: Pt3, dir: Pt3, c: Pt3, n: Pt3, r: number, len?: number): Pt3[];
/** 两个共面的圆的交点（0–2 个）；不共面（法向不平行或不在同一平面）= 空。 */
export declare function circleCircle(c1: Pt3, n1: Pt3, r1: number, c2: Pt3, n2: Pt3, r2: number): Pt3[];
/** 直线 p + t·dir（dir 单位向量；len 有 = 线段）和球的交点（0–2 个）。 */
export declare function lineSphere(p: Pt3, dir: Pt3, c: Pt3, r: number, len?: number): Pt3[];
/** 球被平面 n·x = d（n 单位向量）切出来的那一圈：圆心 / 半径；平面没碰到球 = null。 */
export declare function spherePlane(c: Pt3, r: number, n: Pt3, d: number): {
    c: Pt3;
    r: number;
} | null;
/** 射线最先碰到的球面点（t > 0）；从球里面看（起点在球内）= null（不然永远吸到球的背面）。返回点和射线参数 t。 */
export declare function raySphereFront(c: Pt3, r: number, rayO: Pt3, rayD: Pt3): {
    p: Pt3;
    t: number;
} | null;
