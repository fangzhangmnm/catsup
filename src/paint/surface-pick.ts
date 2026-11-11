// paint/surface-pick.ts —— 落点：一条射线 → 打到模型的哪个三角形 → 哪一格（贴图主线 1-3a 第四节，施工单 ai-docs/20261110-paint-workorders-7.md）。created 2026-11-10 by Claude Opus 5.5
// 纯计算：不碰显卡、不碰页面、不 import 画画内核。射线在网格体自己的坐标里（定义坐标）。
// · 打的是第一节那一套三角形（MeshKernel.faceTriangles = 显示 / 导出 / 内核同一份）；藏起来的面不算。
// · 找最近的三角形不逐个试：三维仓里没有现成的空间索引（碰撞那边是暴力 + 包围盒粗筛），这里写一个最简单的均匀格子——三角形按包围盒登记进格子，
//   射线从进格子的那一点起一格一格往前走（Amanatides–Woo），每格只试登记在里面的三角形；最近的命中落在当前格以内就停。
// · 打中的面在这一列上没有值 → 照实返回「打中了，但这张面不在这张画上」，不当成没打中。
import type { Pt3 } from "../kernel/geom.ts";

export interface PickMesh {
  faces(): number[];
  faceVerts(f: number): number[];
  pt(v: number): Pt3;
  faceTriangles(f: number): readonly (readonly [number, number, number])[];
  cornerValues(f: number, guid: string): Float32Array | null;
  isFaceHidden?(f: number): boolean;
}
/** 均匀格子：所有（没藏起来的）三角形的角（每个 9 个数）、属于哪张面、是那张面的第几个三角形、角在环上的位置，加上格子到三角形的登记表。 */
export interface TriGrid {
  readonly pos: Float64Array; readonly face: Int32Array; readonly triInFace: Int32Array; readonly corner: Int32Array;
  readonly min: Pt3; readonly cell: number; readonly nx: number; readonly ny: number; readonly nz: number;
  readonly start: Int32Array; readonly list: Int32Array;
}
export type PickResult =
  | null
  | { readonly face: number; readonly inPaint: false; readonly pos: Pt3; readonly t: number }
  | { readonly face: number; readonly inPaint: true; readonly tri: number; readonly bary: readonly [number, number, number]; readonly pos: Pt3; readonly t: number; readonly uv: readonly [number, number]; readonly cell: readonly [number, number] };

/** 建格子（模型改了就重建；O(三角形数)）。 */
export function buildTriGrid(m: PickMesh): TriGrid {
  const P: number[] = [], F: number[] = [], K: number[] = [], C: number[] = [];
  for (const f of m.faces()) {
    if (m.isFaceHidden?.(f)) continue;
    const vs = m.faceVerts(f);
    m.faceTriangles(f).forEach((t, k) => { for (const i of t) { const p = m.pt(vs[i]); P.push(p.x, p.y, p.z); C.push(i); } F.push(f); K.push(k); });
  }
  const n = F.length;
  let x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, y1 = -Infinity, z1 = -Infinity;
  for (let i = 0; i < P.length; i += 3) { x0 = Math.min(x0, P[i]); y0 = Math.min(y0, P[i + 1]); z0 = Math.min(z0, P[i + 2]); x1 = Math.max(x1, P[i]); y1 = Math.max(y1, P[i + 1]); z1 = Math.max(z1, P[i + 2]); }
  if (!n) return { pos: new Float64Array(0), face: new Int32Array(0), triInFace: new Int32Array(0), corner: new Int32Array(0), min: { x: 0, y: 0, z: 0 }, cell: 1, nx: 1, ny: 1, nz: 1, start: new Int32Array(2), list: new Int32Array(0) };
  const ext = Math.max(x1 - x0, y1 - y0, z1 - z0, 1e-9), cell = ext / Math.max(1, Math.ceil(2 * Math.cbrt(n)));   // 最长的一边约 2 × 三角形数的立方根格
  const nx = Math.max(1, Math.ceil((x1 - x0) / cell) || 1), ny = Math.max(1, Math.ceil((y1 - y0) / cell) || 1), nz = Math.max(1, Math.ceil((z1 - z0) / cell) || 1);
  const ix = (x: number, lo: number, cnt: number): number => Math.min(cnt - 1, Math.max(0, Math.floor((x - lo) / cell)));
  const span = (t: number): [number, number, number, number, number, number] => {
    const o = 9 * t;
    return [ix(Math.min(P[o], P[o + 3], P[o + 6]), x0, nx), ix(Math.max(P[o], P[o + 3], P[o + 6]), x0, nx), ix(Math.min(P[o + 1], P[o + 4], P[o + 7]), y0, ny), ix(Math.max(P[o + 1], P[o + 4], P[o + 7]), y0, ny), ix(Math.min(P[o + 2], P[o + 5], P[o + 8]), z0, nz), ix(Math.max(P[o + 2], P[o + 5], P[o + 8]), z0, nz)];
  };
  const count = new Int32Array(nx * ny * nz + 1);
  for (let t = 0; t < n; t++) { const [a, b, c, d, e, g] = span(t); for (let z = e; z <= g; z++) for (let y = c; y <= d; y++) for (let x = a; x <= b; x++) count[(z * ny + y) * nx + x + 1]++; }
  for (let i = 1; i < count.length; i++) count[i] += count[i - 1];
  const start = count.slice(), fill = count.slice(0, -1), list = new Int32Array(start[start.length - 1]);
  for (let t = 0; t < n; t++) { const [a, b, c, d, e, g] = span(t); for (let z = e; z <= g; z++) for (let y = c; y <= d; y++) for (let x = a; x <= b; x++) list[fill[(z * ny + y) * nx + x]++] = t; }
  return { pos: Float64Array.from(P), face: Int32Array.from(F), triInFace: Int32Array.from(K), corner: Int32Array.from(C), min: { x: x0, y: y0, z: z0 }, cell, nx, ny, nz, start, list };
}

/** Möller–Trumbore（两面都算）：命中的 t 和重心坐标 (u, v)（相对角 0）；没中 = null。 */
function hitTri(g: TriGrid, t: number, o: Pt3, d: Pt3): { t: number; u: number; v: number } | null {
  const P = g.pos, k = 9 * t;
  const e1x = P[k + 3] - P[k], e1y = P[k + 4] - P[k + 1], e1z = P[k + 5] - P[k + 2], e2x = P[k + 6] - P[k], e2y = P[k + 7] - P[k + 1], e2z = P[k + 8] - P[k + 2];
  const px = d.y * e2z - d.z * e2y, py = d.z * e2x - d.x * e2z, pz = d.x * e2y - d.y * e2x, det = e1x * px + e1y * py + e1z * pz;
  if (Math.abs(det) < 1e-18) return null;
  const inv = 1 / det, sx = o.x - P[k], sy = o.y - P[k + 1], sz = o.z - P[k + 2], u = (sx * px + sy * py + sz * pz) * inv;
  if (u < -1e-12 || u > 1 + 1e-12) return null;
  const qx = sy * e1z - sz * e1y, qy = sz * e1x - sx * e1z, qz = sx * e1y - sy * e1x, v = (d.x * qx + d.y * qy + d.z * qz) * inv;
  if (v < -1e-12 || u + v > 1 + 1e-12) return null;
  const tt = (e2x * qx + e2y * qy + e2z * qz) * inv;
  return tt > 1e-12 ? { t: tt, u, v } : null;
}

/** 射线最先打中的三角形（格子里的编号）+ t + 重心；没中 = null。 */
export function castRay(g: TriGrid, o: Pt3, d: Pt3): { tri: number; t: number; u: number; v: number } | null {
  if (!g.face.length) return null;
  const c = g.cell, lo = [g.min.x, g.min.y, g.min.z], hi = [g.min.x + g.nx * c, g.min.y + g.ny * c, g.min.z + g.nz * c], O = [o.x, o.y, o.z], D = [d.x, d.y, d.z];
  let t0 = 0, t1 = Infinity;
  for (let a = 0; a < 3; a++) {   // 射线进出格子总包围盒
    if (Math.abs(D[a]) < 1e-300) { if (O[a] < lo[a] || O[a] > hi[a]) return null; continue; }
    let ta = (lo[a] - O[a]) / D[a], tb = (hi[a] - O[a]) / D[a];
    if (ta > tb) [ta, tb] = [tb, ta];
    t0 = Math.max(t0, ta); t1 = Math.min(t1, tb);
    if (t0 > t1) return null;
  }
  const N = [g.nx, g.ny, g.nz], cellOf = (x: number, a: number): number => Math.min(N[a] - 1, Math.max(0, Math.floor((x - lo[a]) / c)));
  const cur = [0, 1, 2].map((a) => cellOf(O[a] + D[a] * t0, a)), step = D.map((x) => (x > 0 ? 1 : x < 0 ? -1 : 0));
  const tMax = [0, 1, 2].map((a) => (step[a] === 0 ? Infinity : (lo[a] + (cur[a] + (step[a] > 0 ? 1 : 0)) * c - O[a]) / D[a]));
  const tDelta = [0, 1, 2].map((a) => (step[a] === 0 ? Infinity : c / Math.abs(D[a])));
  let best: { tri: number; t: number; u: number; v: number } | null = null;
  const seen = new Set<number>();
  for (;;) {
    const id = (cur[2] * g.ny + cur[1]) * g.nx + cur[0];
    for (let i = g.start[id]; i < g.start[id + 1]; i++) {
      const t = g.list[i];
      if (seen.has(t)) continue;
      seen.add(t);
      const h = hitTri(g, t, o, d);
      if (h && (!best || h.t < best.t || (h.t === best.t && t < best.tri))) best = { tri: t, ...h };
    }
    const a = tMax[0] < tMax[1] ? (tMax[0] < tMax[2] ? 0 : 2) : tMax[1] < tMax[2] ? 1 : 2, exit = tMax[a];
    if (best && best.t <= exit + 1e-12) return best;   // 最近的命中就在这一格以内：后面的格子不会更近
    if (exit > t1) return best;
    cur[a] += step[a];
    if (cur[a] < 0 || cur[a] >= N[a]) return best;
    tMax[a] += tDelta[a];
  }
}

/** 落点。guid = 那一列贴图坐标；cell = 贴图坐标往下取整（和显示时最近邻取样取到的那一格相同）。 */
export function pickSurface(m: PickMesh, g: TriGrid, guid: string, o: Pt3, d: Pt3): PickResult {
  const h = castRay(g, o, d);
  if (!h) return null;
  const f = g.face[h.tri], pos = { x: o.x + d.x * h.t, y: o.y + d.y * h.t, z: o.z + d.z * h.t }, v = m.cornerValues(f, guid);
  if (!v) return { face: f, inPaint: false, pos, t: h.t };
  const w: [number, number, number] = [1 - h.u - h.v, h.u, h.v], c = [g.corner[3 * h.tri], g.corner[3 * h.tri + 1], g.corner[3 * h.tri + 2]];
  const uv: [number, number] = [w[0] * v[2 * c[0]] + w[1] * v[2 * c[1]] + w[2] * v[2 * c[2]], w[0] * v[2 * c[0] + 1] + w[1] * v[2 * c[1] + 1] + w[2] * v[2 * c[2] + 1]];
  return { face: f, inPaint: true, tri: g.triInFace[h.tri], bary: w, pos, t: h.t, uv, cell: [Math.floor(uv[0]), Math.floor(uv[1])] };
}
