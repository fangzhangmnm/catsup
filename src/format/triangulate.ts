// triangulate.ts —— 膜（顶点环 + 洞）→ 三角形顶点索引三元组；纯函数，走 vendored earcut（src/vendor/earcut）+ 约束 Delaunay 翻边。
// 只给 bake / 渲染缓存用（三方和显卡看的三角汤）；内核本身永远不三角化。created 2026-09-20 by Claude Fable 5.1
// 2026-10-27 Claude Fable 5.1：earcut 之后按空圆准则翻对角线（kernel/cdt.ts）——user「耳切三角化……对游戏引擎也不友好……能不能用一个更均匀，regular的triangulation」。
//   环的边是约束不翻；结果 = 约束 Delaunay（最大化最小角，没有能避免的细长条）。导出的 glb 和屏幕上画的是同一份。

import earcut from "../vendor/earcut/earcut.js";
import { type PlaneParams, type Pt3, planeBasis, planeOfRing, projectToPlane, type Pt } from "../kernel/geom.ts";
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

/**
 * 一张多边形面（单环，无洞）按**它自己的绕向**切三角形（2026-10-28 Claude Opus 5.5；纪元账本 FM130 user「导出的时候面的法向一堆错误」「不一定是法向也可能是面的朝向」）。
 * planeOfRing 返回的是**规范化了符号**的平面（同一张平面无论环怎么绕都同一个法向——SU 体的去重要它），triangulateRings 按那个平面的基投影切 →
 * 面的真实朝向（Newell，环的绕向）和规范方向相反时三角形整张反了（实测：立方体 12 个三角形反 6 个、球 224 反 96）。这里按 Newell 对一下，反了就整批翻回来。
 * 网格体的三角化（MeshKernel.triangles、导出 bakeMesh）都走它；SU 体的膜本来就按规范平面存、渲染另有自己的路，不受影响。
 */
export function triangulateFace(pts: readonly Pt3[]): [number, number, number][] {
  const n = pts.length;
  if (n < 3) return [];
  if (n === 3) return [[0, 1, 2]];
  const plane = planeOfRing(pts);
  if (!plane) return [];
  const tris = triangulateRings(pts, plane, pts.map((_, i) => i), []);
  let nx = 0, ny = 0, nz = 0;
  for (let i = 0; i < n; i++) { const a = pts[i], b = pts[(i + 1) % n]; nx += (a.y - b.y) * (a.z + b.z); ny += (a.z - b.z) * (a.x + b.x); nz += (a.x - b.x) * (a.y + b.y); }
  return nx * plane.n.x + ny * plane.n.y + nz * plane.n.z < 0 ? tris.map(([a, b, c]) => [a, c, b] as [number, number, number]) : tris;
}
