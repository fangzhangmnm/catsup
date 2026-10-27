import type { FaceId, Kernel, Pt3, VertexId } from "../../../kernel/kernel.ts";
import { type Xform } from "../../../scene/xform.ts";
export type SnapCurves = "rigid" | "points";
export interface GridSnapOptions {
    /** 格子边长（格子坐标里，米）。 */ step: number;
    curves: SnapCurves;
    /** 拉正（DT101）：和格子三根轴差这么多度以内的边拉正（两端点在那根轴上的坐标拉成一样）；缺 = 不拉正。 */ straighten?: number;
    /** 吸格点；缺 = 吸（老 op 只有吸格点）。 */ grid?: boolean;
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
    /** 拉正：被拉成一样的坐标有几个（点 × 轴；披露用）。 */
    aligned: number;
}
/**
 * 规划：scope = 只看这些点（null = 池里全部）；lattice = 池本地坐标 → 格子坐标的仿射变换（格点 = 三个分量都是 step 的整数倍）。
 * 物体自己的坐标架 → lattice = 坐标架的逆；世界格点 → lattice = 池到世界的变换。
 * 拉正（opt.straighten，DT101，user「拉正 好想要，比snap更好……这个可以和snap合租。就是可以拉正不snap之类的？」）在格子坐标里逐根轴做：
 *   一条边和这根轴几乎垂直（差 straighten° 以内）→ 两端点在这根轴上的坐标该一样（几乎竖直的边 → x、y 一样；几乎水平的边 → z 一样）；
 *   这样连成伙，每伙取同一个值（clusterValue）。范围外连着的点 = 锚：伙里有锚就取锚的值、锚不动。
 *   圆 / 弧整条看：只在它法向最贴近的那根轴上拉平（不按每段的方向拉，免得把圆拉歪）。
 *   拉正和吸格点一起做 = 先拉正、再把拉正后的坐标吸上格点（圆 / 弧整条平移时按拉正后的圆心吸）。
 */
export declare function planGridSnap(k: Kernel, scope: readonly VertexId[] | null, lattice: Xform, opt: GridSnapOptions): GridSnapPlan;
/**
 * 这几张面在原平面里三角化要补的对角线（两端点坐标；环上本来就有的边不算）。三角永远是平的 = 吸完怎么挪都不会破。
 * 带洞的面一起算（对角线会连到洞上）。
 */
export declare function triangulationDiagonals(k: Kernel, faces: readonly FaceId[]): [Pt3, Pt3][];
