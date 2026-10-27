// triangulate.ts —— 膜（顶点环 + 洞）→ 三角形顶点索引三元组；纯函数，走 vendored earcut（src/vendor/earcut）+ 约束 Delaunay 翻边。
// 只给 bake / 渲染缓存用（三方和显卡看的三角汤）；内核本身永远不三角化。created 2026-09-20 by Claude Fable 5.1
// 2026-10-27 Claude Fable 5.1：earcut 之后按空圆准则翻对角线（kernel/cdt.ts）——user「耳切三角化……对游戏引擎也不友好……能不能用一个更均匀，regular的triangulation」。
//   环的边是约束不翻；结果 = 约束 Delaunay（最大化最小角，没有能避免的细长条）。导出的 glb 和屏幕上画的是同一份。

import earcut from "../vendor/earcut/earcut.js";
import { type PlaneParams, type Pt3, planeBasis, projectToPlane, type Pt } from "../kernel/geom.ts";
import { delaunayFlips, type Tri } from "../kernel/cdt.ts";

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
  const local: Tri[] = [];
  for (let i = 0; i + 2 < tri.length; i += 3) local.push([tri[i], tri[i + 1], tri[i + 2]]);
  // 约束 = 环的边（局部下标空间）；翻完再映回顶点索引
  const q: Pt[] = []; for (let i = 0; i + 1 < flat.length; i += 2) q.push({ x: flat[i], y: flat[i + 1] });
  const constrained = new Set<string>();
  let base = 0;
  for (const ring of [outer, ...holes]) { const n = ring.length; for (let i = 0; i < n; i++) { const a = base + i, b = base + ((i + 1) % n); constrained.add(a < b ? `${a}-${b}` : `${b}-${a}`); } base += n; }
  return delaunayFlips(q, local, constrained).map(([a, b, c]) => [map[a], map[b], map[c]] as [number, number, number]);
}
