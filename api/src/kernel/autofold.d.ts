import { type Pt3 } from "./geom.ts";
export interface FoldResult {
    /** 每片 = 世界坐标环（顺环序；片在 tol 内共面）。 */
    pieces: Pt3[][];
    /** 折缝 = 片与片之间、不是原边的边（世界坐标端点对）。 */
    creases: [Pt3, Pt3][];
}
/** 非平面环（外环 + 洞）→ 平面片 + 折缝；整环共面不该调它；分不开（四个投影都不简单）→ null。 */
export declare function foldDecompose(outer: readonly Pt3[], holes: readonly (readonly Pt3[])[], tol: number): FoldResult | null;
