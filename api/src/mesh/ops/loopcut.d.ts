import { MeshKernel } from "../mesh-kernel.ts";
/** startVert = 起手那条边上的新点（N 圈接着切剩下那段用）。 */
export interface LoopCutResult {
    edges: number[];
    newVerts: number[];
    closed: boolean;
    startVert?: number;
}
/** 环切一圈。t = 在起手那条边上从 edgeA 那头量的位置；整圈的点都在同一侧的 t 处（W-8 2026-11-10：以前每条边各从自己的 edgeA 量，t ≠ 0.5 时切成锯齿；t = 0.5 两种量法一样）。 */
export declare function loopCut(k: MeshKernel, start: number, t?: number): LoopCutResult;
/**
 * 环切 cuts 圈（W-8；Fable 11-10 裁定：N 圈均分在 1/(N+1)、2/(N+1)…，位置不起作用；一条记录 = 一步撤销）。cuts ≤ 1 = loopCut(k, start, t)。
 * 做法：从起手那条边的 edgeA 那头起，每次在剩下那段的第一个均分点切一圈，再接着切剩下那段。第一圈切不出 = 空结果。
 */
export declare function loopCuts(k: MeshKernel, start: number, cuts?: number, t?: number): LoopCutResult;
