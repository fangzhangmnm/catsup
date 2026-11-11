import type { TargetGeo } from "./space-target.ts";
import type { Reach, Tip } from "./tip-reach.ts";
export interface InkTip extends Tip {
    readonly alpha: number;
}
export type Accum = "max" | "over";
/** 一颗笔尖 × 一块画布多边形：格子（行 × 宽 + 列）→ 浓度（只有 > 0 的）。tris = 第三节挂在这块多边形下面的空间三角形（格子里的编号）。 */
export declare function tipCellsInPoly(g: TargetGeo, poly: number, tris: readonly number[], tip: InkTip, hardness: number): Map<number, number>;
/** 一颗笔尖吃了哪些格：目标（第几项）→ 格子 → 浓度。 */
export declare function tipCells(geos: readonly TargetGeo[], tip: InkTip, reach: Reach, hardness: number): Map<number, Map<number, number>>;
/** 一笔（按笔尖的先后）攒起来：目标 → 格子 → 浓度。mode = 取最大（淡彩）/ 叠加（叠色）。 */
export declare function strokeTruth(geos: readonly TargetGeo[], tips: readonly {
    readonly tip: InkTip;
    readonly reach: Reach;
}[], hardness: number, mode: Accum): Map<number, Map<number, number>>;
