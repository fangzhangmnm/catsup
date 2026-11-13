import type { MeshKernel } from "./mesh-kernel.ts";
import type { ColumnDef } from "./columns.ts";
/** 这条边两侧明暗连续吗。 */
export declare function edgeSmooth(m: MeshKernel, e: number): boolean;
/** 这条边不画线吗（SketchUp 的「软」）：手标的软边，或没手标、按「默认平滑」平滑的边。 */
export declare function edgeSoft(m: MeshKernel, e: number): boolean;
/**
 * 成批判（每条边都问的：重建线、导出、转硬表面画线、导入计数、平滑组泛洪）：三列和「默认平滑」一次拿在手里，判法和上面两个逐字一样
 * （测试 test/mesh-edge-marks.test.ts 逐条边对拍）。只在这一趟用：内核改了要重拿。单条问的照旧用 edgeSmooth / edgeSoft。
 */
export interface EdgeLook {
    smooth(e: number): boolean;
    soft(e: number): boolean;
}
export declare function edgeLookOf(m: MeshKernel): EdgeLook;
/** 边上标什么（指令 meshEdgeMarks 的 mark）：手标三档（sharp / smooth / none——none = 清掉手标，不碰接缝）+ 接缝的标 / 清（施工单二十二第 1 刀）。 */
export type EdgeMark = "sharp" | "smooth" | "none" | "seam" | "unseam";
/** 这一档写哪几列、各写几（手标三档只动手标三列；接缝两档只动接缝那一列）。 */
export declare function markValues(mark: EdgeMark): readonly (readonly [ColumnDef, 0 | 1])[];
/** 这条边已经是这一档了吗（指令只算还要改的边）。 */
export declare function isMarked(m: MeshKernel, e: number, mark: EdgeMark): boolean;
/** 指令点名写（操作本意，按保留名写；第一次写「有」才建那一列）。 */
export declare function markEdges(m: MeshKernel, edges: readonly number[], mark: EdgeMark): void;
/**
 * SU 体转过来（scene/kinds.ts brepToMesh）以后保住原来的样子：「默认平滑」设成「按角度 deg」，SU 里本来是硬的、但夹角小于 deg 的边手标成棱
 * （不然它们会被自动平滑掉）。返回手标了几条。
 */
export declare function keepLookUnderAngle(m: MeshKernel, deg: number): number;
