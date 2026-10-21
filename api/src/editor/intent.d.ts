import type { Pt3 } from "../kernel/geom.ts";
/** 一维：自由值 free 的符号 = 意图；候选 candidate 反号 → false；零保留；|free| < dead → 全合法。 */
export declare function intentAllows1D(free: number, candidate: number, dead: number): boolean;
/** 三维：自由位移 free 决定意图；候选位移 candidate 与之点积 < 0 → false；|free| < dead → 全合法。 */
export declare function intentAllows3D(free: Pt3, candidate: Pt3, dead: number): boolean;
/** 意图门的死区：屏上拖动不足 dragPx（= eps.drag，手势「算开始」的同一门槛）就还没有意图。 */
export declare function hasIntent(movedPx: number, dragPx: number): boolean;
