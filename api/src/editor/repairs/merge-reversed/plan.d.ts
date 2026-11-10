import { type MeshKernel } from "../../../mesh/mesh-kernel.ts";
export interface MergeReversedPlan {
    /** 要删的面（每对一张，升序）。 */
    remove: number[];
    /** 并了几对。 */
    pairs: number;
    /** 没并的几处：两张材质不同 / 一张隐藏一张没隐藏 / 同一圈点叠了不止两张。 */
    skipped: number;
    /** 几块封闭的（朝外）。 */
    shells: number;
    /** 几块开口的、没有单层的面可跟（朝向照第一张）。 */
    sheets: number;
}
/** materialOf = 槽号 → 这个槽指的材质（按材质比，不按槽号比；和导出看到的一样）。 */
export declare function planMergeReversed(k: MeshKernel, materialOf: (slot: number) => number): MergeReversedPlan;
