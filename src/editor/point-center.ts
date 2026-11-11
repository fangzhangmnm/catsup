// editor/point-center.ts —— 一组点的中心（选择中心 / 轴挪到选择中心用；从 editor.ts 切出来的纯函数，2026-11-11 Claude Opus 5.5）。
import type { Pt3 } from "../kernel/geom.ts";

/** bbox = 包围盒中心（Blender 默认）；mean = 顶点平均（Blender 的 median point）。没有点 = null。 */
export function pointsCenter(pts: readonly Pt3[], algo: "bbox" | "mean"): Pt3 | null {
  if (!pts.length) return null;
  if (algo === "mean") { let x = 0, y = 0, z = 0; for (const p of pts) { x += p.x; y += p.y; z += p.z; } return { x: x / pts.length, y: y / pts.length, z: z / pts.length }; }
  let lo = { ...pts[0] }, hi = { ...pts[0] };
  for (const p of pts) { lo = { x: Math.min(lo.x, p.x), y: Math.min(lo.y, p.y), z: Math.min(lo.z, p.z) }; hi = { x: Math.max(hi.x, p.x), y: Math.max(hi.y, p.y), z: Math.max(hi.z, p.z) }; }
  return { x: (lo.x + hi.x) / 2, y: (lo.y + hi.y) / 2, z: (lo.z + hi.z) / 2 };
}
