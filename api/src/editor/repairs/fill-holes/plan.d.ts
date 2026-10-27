import type { EdgeId, Kernel, Pt3 } from "../../../kernel/kernel.ts";
export interface HolePlan {
    /** 要补的环（按点的顺序，池本地坐标）；按环里最小的边 id 排（确定）。 */
    loops: Pt3[][];
    /** 没补的：不在一个平面上 / 缠在一起。 */
    skipped: number;
}
/** scopeEdges 有 = 只要碰到这些边的环。 */
export declare function planHoles(k: Kernel, scopeEdges: ReadonlySet<EdgeId> | null): HolePlan;
