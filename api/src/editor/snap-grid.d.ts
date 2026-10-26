import type { FaceId, Kernel, Pt3, VertexId } from "../kernel/kernel.ts";
import { type Xform } from "../scene/xform.ts";
export type SnapCurves = "rigid" | "points";
export interface GridSnapOptions {
    step: number;
    curves: SnapCurves;
}
export interface GridSnapPlan {
    /** 挪点（id → 新位置，池本地坐标）；本来就在格点上的不在里面。按 id 排好（确定）。 */
    moves: {
        id: VertexId;
        to: Pt3;
    }[];
    /** 整条平移、保持是圆的曲线条数。 */
    curves: number;
    /** 曲线只有一部分在范围里、因此没动的点。 */
    skipped: number;
    /** 整条平移的曲线上的点：执行时单独一批先挪（内核挪点：一批里有点合并 = 这批挪过的曲线都不再算圆，别处的合并不能连累它们）。 */
    rigid: ReadonlySet<VertexId>;
}
/**
 * 规划：scope = 只看这些点（null = 池里全部）；lattice = 池本地坐标 → 格子坐标的仿射变换（格点 = 三个分量都是 step 的整数倍）。
 * 物体自己的坐标架 → lattice = 坐标架的逆；世界格点 → lattice = 池到世界的变换。
 */
export declare function planGridSnap(k: Kernel, scope: readonly VertexId[] | null, lattice: Xform, opt: GridSnapOptions): GridSnapPlan;
/**
 * 这几张面在原平面里三角化要补的对角线（两端点坐标；环上本来就有的边不算）。三角永远是平的 = 吸完怎么挪都不会破。
 * 带洞的面一起算（对角线会连到洞上）。
 */
export declare function triangulationDiagonals(k: Kernel, faces: readonly FaceId[]): [Pt3, Pt3][];
