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
/**
 * 标准答案的 8 位版（统筹 11-11 裁定 ②：三维的累积和画画内核二维笔尖同一种精度、同一种量化次序）：按笔尖的先后，每颗笔尖往每一格写一次、写完四舍五入到 8 位。
 * 写的是预乘的 (c·v, v)：淡彩 = 每通道取最大；叠色 = src + dst·(1 − src.a)（dst 取上一步量化过的字节 / 255）。返回 目标 → 格子 → RGBA 字节。
 * 上面的 strokeTruth 是不量化的连续版，留着当参考值：叠色一路叠下去，每一步的舍入会留一部分在下一步里，两版最多差约 1.06/255（1-4b 量的，测试里写着）。
 */
export declare function strokeTruth8(geos: readonly TargetGeo[], tips: readonly {
    readonly tip: InkTip;
    readonly reach: Reach;
}[], hardness: number, mode: Accum, color: readonly [number, number, number]): Map<number, Map<number, Uint8ClampedArray>>;
