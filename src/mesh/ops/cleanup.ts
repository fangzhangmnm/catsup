// mesh/ops/cleanup.ts —— 整理：有限溶解（Blender Limited Dissolve：两侧几乎共面的边并掉、再溶解共线的二度点）、去重点（距离内的点合并）。created 2026-10-27 by Claude Fable 5.1
import { MeshKernel } from "../mesh-kernel.ts";
import { joinFaces, dissolveVertex } from "./join.ts";
import { mergeVerts } from "./merge.ts";

/** 两面法向夹角 ≤ deg 的内部边（恰两张不同面）并掉；然后把变成二度共线（夹角 ≤ deg）的点溶掉。返回并掉的边数 / 点数。 */
export function limitedDissolve(k: MeshKernel, deg = 5): { edges: number; verts: number } {
  const cos = Math.cos((deg * Math.PI) / 180);
  let edges = 0, verts = 0;
  for (const e of k.edges()) {
    if (!k.hasE(e)) continue;
    const fl = k.eFaces(e); if (fl.length !== 2 || fl[0] === fl[1]) continue;
    const na = k.faceNormal(fl[0]), nb = k.faceNormal(fl[1]);
    if (na.x * nb.x + na.y * nb.y + na.z * nb.z < cos) continue;
    try { joinFaces(k, e); edges++; } catch { /* 共享不止一条边：留着 */ }
  }
  for (const v of k.verts()) {
    if (!k.hasV(v)) continue;
    const es = k.vEdges(v); if (es.length !== 2) continue;
    const p = k.pt(v), o = (e: number): number => (k.edgeA[e] === v ? k.edgeB[e] : k.edgeA[e]);
    const a = k.pt(o(es[0])), b = k.pt(o(es[1]));
    const u = { x: a.x - p.x, y: a.y - p.y, z: a.z - p.z }, w = { x: b.x - p.x, y: b.y - p.y, z: b.z - p.z };
    const lu = Math.hypot(u.x, u.y, u.z), lw = Math.hypot(w.x, w.y, w.z); if (!lu || !lw) continue;
    if (-(u.x * w.x + u.y * w.y + u.z * w.z) / (lu * lw) < cos) continue;   // 不是反向共线
    try { dissolveVertex(k, v); verts++; } catch { /* 某张面会少于 3 点：留着 */ }
  }
  return { edges, verts };
}

/** 去重点：相距 ≤ dist 的顶点并成一个（到中心）。格子桶，O(n)。返回并掉的点数。 */
export function removeDoubles(k: MeshKernel, dist = 1e-4): number {
  const cell = Math.max(dist, 1e-12);
  const bucket = new Map<string, number[]>();
  const key = (x: number, y: number, z: number): string => `${Math.floor(x / cell)},${Math.floor(y / cell)},${Math.floor(z / cell)}`;
  for (const v of k.verts()) { const p = k.pt(v); const kk = key(p.x, p.y, p.z); (bucket.get(kk) ?? bucket.set(kk, []).get(kk)!).push(v); }
  const parent = new Map<number, number>(k.verts().map((v) => [v, v]));
  const find = (x: number): number => { while (parent.get(x) !== x) { parent.set(x, parent.get(parent.get(x)!)!); x = parent.get(x)!; } return x; };
  for (const v of k.verts()) {
    const p = k.pt(v), cx = Math.floor(p.x / cell), cy = Math.floor(p.y / cell), cz = Math.floor(p.z / cell);
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) for (const w of bucket.get(`${cx + dx},${cy + dy},${cz + dz}`) ?? []) {
      if (w <= v) continue;
      const q = k.pt(w);
      if (Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z) <= dist) { const a = find(v), b = find(w); if (a !== b) parent.set(Math.max(a, b), Math.min(a, b)); }
    }
  }
  const groups = new Map<number, number[]>();
  for (const v of k.verts()) (groups.get(find(v)) ?? groups.set(find(v), []).get(find(v))!).push(v);
  let merged = 0;
  for (const g of [...groups.values()].sort((a, b) => a[0] - b[0])) if (g.length > 1) { mergeVerts(k, g.sort((a, b) => a - b), "center"); merged += g.length - 1; }
  return merged;
}
