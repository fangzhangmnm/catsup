import { MeshKernel } from "./mesh-kernel.ts";
/** 这条边两侧明暗连续吗。 */
export declare function edgeSmooth(m: MeshKernel, e: number): boolean;
/** 这条边不画线吗（SketchUp 的「软」）：手标的软边，或没手标、按「默认平滑」平滑的边。 */
export declare function edgeSoft(m: MeshKernel, e: number): boolean;
/** 手标：sharp = 棱 / smooth = 平滑且不画线 / none = 清掉，交给「默认平滑」。别的位（接缝 / 隐藏 / 裸线）不动。 */
export declare function markEdges(m: MeshKernel, edges: readonly number[], mark: "sharp" | "smooth" | "none"): void;
/**
 * SU 体转过来（scene/kinds.ts brepToMesh）以后保住原来的样子：「默认平滑」设成「按角度 deg」，SU 里本来是硬的、但夹角小于 deg 的边手标成棱
 * （不然它们会被自动平滑掉）。返回手标了几条。
 */
export declare function keepLookUnderAngle(m: MeshKernel, deg: number): number;
