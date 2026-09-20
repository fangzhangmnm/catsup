// triangulate.ts —— 膜（顶点环 + 洞）→ 三角形顶点索引三元组；纯函数，走 vendored earcut（src/vendor/earcut）。
// 只给 bake 用（三方看的三角汤）；内核本身永远不三角化。created 2026-09-20 by Claude Fable 5.1

import earcut from "../vendor/earcut/earcut.js";
import { type PlaneParams, type Pt3, planeBasis, projectToPlane } from "../kernel/geom.ts";

/** 返回 [a,b,c] 顶点索引（索引空间 = 传入的 vertices 数组）。绕向沿用 earcut（与外环一致）。 */
export function triangulateRings(vertices: readonly Pt3[], plane: PlaneParams, outer: readonly number[], holes: readonly (readonly number[])[]): [number, number, number][] {
  const basis = planeBasis(plane);
  const flat: number[] = [];
  const map: number[] = [];
  const holeIndices: number[] = [];
  const push = (ring: readonly number[]): void => {
    for (const v of ring) { const q = projectToPlane(vertices[v], basis); flat.push(q.x, q.y); map.push(v); }
  };
  push(outer);
  for (const h of holes) { holeIndices.push(map.length); push(h); }
  const tri = earcut(flat, holeIndices.length ? holeIndices : null, 2);
  const out: [number, number, number][] = [];
  for (let i = 0; i + 2 < tri.length; i += 3) out.push([map[tri[i]], map[tri[i + 1]], map[tri[i + 2]]]);
  return out;
}
