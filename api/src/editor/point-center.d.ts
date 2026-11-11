import type { Pt3 } from "../kernel/geom.ts";
/** bbox = 包围盒中心（Blender 默认）；mean = 顶点平均（Blender 的 median point）。没有点 = null。 */
export declare function pointsCenter(pts: readonly Pt3[], algo: "bbox" | "mean"): Pt3 | null;
