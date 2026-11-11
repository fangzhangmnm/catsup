// paint/tip-reach.ts —— 每颗笔尖碰到哪些三角形（贴图主线 1-4a 第三节，施工单 ai-docs/20261110-paint-workorders-9.md）。created 2026-11-11 by Claude Opus 5.5
// 输入：一颗笔尖（世界里的球心和半径）、起点（夹着这颗笔尖的那两个路上的点各自打中的三角形）、目标。
// 输出：画布多边形（1-3a 的归属单位）→ 挂在它下面的那几个空间三角形（镜像的两半、复制出来的面，会有好几个对着同一块）。
// 做法：从起点往外找。沿公共的边往外走：和球相交（球心到三角形最近的点 ≤ 半径 + 余量）= 收下、接着看它的邻居；不相交 = 不收、也不从它往外走。
//   起点自己不相交 = 往外多看一圈。余量 =（归属表往块外延的格数 + 1）× 这个三角形的格长（块边上的格子位置是公式往外延出去的值）。
//   只在同一份摆放里走；藏起来的面不在格子里（不走）；拐角选项：朝向和起点三角形差得比它多的不收、也不从它往外走。
//   收下的里面，所在的面不走这张画的去掉（连通已经用过它了）。
// 球和三角形求最近点全仓只有这一处（sphereTriDist）。
import type { TargetGeo } from "./space-target.ts";

/** 点到三角形（三个角 a、b、c，各 3 个数，从 P 的 off 起）的最近距离（Ericson《Real-Time Collision Detection》5.1.5 那一段）。全仓只有这一处。 */
export function sphereTriDist(px: number, py: number, pz: number, P: ArrayLike<number>, off: number): number {
  const ax = P[off], ay = P[off + 1], az = P[off + 2], bx = P[off + 3], by = P[off + 4], bz = P[off + 5], cx = P[off + 6], cy = P[off + 7], cz = P[off + 8];
  const abx = bx - ax, aby = by - ay, abz = bz - az, acx = cx - ax, acy = cy - ay, acz = cz - az, apx = px - ax, apy = py - ay, apz = pz - az;
  const d1 = abx * apx + aby * apy + abz * apz, d2 = acx * apx + acy * apy + acz * apz;
  const at = (qx: number, qy: number, qz: number): number => Math.hypot(px - qx, py - qy, pz - qz);
  if (d1 <= 0 && d2 <= 0) return at(ax, ay, az);
  const bpx = px - bx, bpy = py - by, bpz = pz - bz, d3 = abx * bpx + aby * bpy + abz * bpz, d4 = acx * bpx + acy * bpy + acz * bpz;
  if (d3 >= 0 && d4 <= d3) return at(bx, by, bz);
  const vc = d1 * d4 - d3 * d2;
  if (vc <= 0 && d1 >= 0 && d3 <= 0) { const v = d1 / (d1 - d3); return at(ax + abx * v, ay + aby * v, az + abz * v); }
  const cpx = px - cx, cpy = py - cy, cpz = pz - cz, d5 = abx * cpx + aby * cpy + abz * cpz, d6 = acx * cpx + acy * cpy + acz * cpz;
  if (d6 >= 0 && d5 <= d6) return at(cx, cy, cz);
  const vb = d5 * d2 - d1 * d6;
  if (vb <= 0 && d2 >= 0 && d6 <= 0) { const w = d2 / (d2 - d6); return at(ax + acx * w, ay + acy * w, az + acz * w); }
  const va = d3 * d6 - d5 * d4;
  if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) { const w = (d4 - d3) / (d4 - d3 + (d5 - d6)); return at(bx + (cx - bx) * w, by + (cy - by) * w, bz + (cz - bz) * w); }
  const den = 1 / (va + vb + vc), v = vb * den, w = vc * den;
  return at(ax + abx * v + acx * w, ay + aby * v + acy * w, az + abz * v + acz * w);
}

export interface Tip { readonly x: number; readonly y: number; readonly z: number; readonly r: number }
export interface ReachStart { readonly ti: number; readonly tri: number }
export interface ReachOpts {
  /** 拐角：和起点三角形的朝向差得比这个角度（度）多的不收、也不从它往外走。不给 = 不限。 */
  readonly maxAngleDeg?: number;
}
/** 这颗笔尖要画的：目标（第几项）→ 画布多边形 → 挂在它下面的空间三角形（格子里的编号，升序）。 */
export type Reach = Map<number, Map<number, number[]>>;

/** 一颗笔尖碰到哪些三角形（见文件头）。geos = 名单里各项算好的东西；starts = 起点（可以在不同的项里；同一份摆放里才连通）。 */
export function tipReach(geos: readonly TargetGeo[], tip: Tip, starts: readonly ReachStart[], o: ReachOpts = {}): Reach {
  const out: Reach = new Map(), cosMax = o.maxAngleDeg === undefined ? -Infinity : Math.cos((o.maxAngleDeg * Math.PI) / 180);
  const byGeo = new Map<number, number[]>();
  for (const s of starts) { const l = byGeo.get(s.ti) ?? []; if (!l.includes(s.tri)) l.push(s.tri); byGeo.set(s.ti, l); }
  for (const [ti, seeds] of byGeo) {
    const g = geos[ti], margin = (g.table.gap / 2 + 1);
    const hits = (t: number): boolean => sphereTriDist(tip.x, tip.y, tip.z, g.wpos, 9 * t) <= tip.r + margin * g.texelLen[t];
    const faces = new Map<number, Set<number>>(), seen = new Set<number>(), queue: number[] = [];
    const seedN = seeds.map((t) => [g.wnorm[3 * t], g.wnorm[3 * t + 1], g.wnorm[3 * t + 2]]);
    const turnsOk = (t: number): boolean => cosMax === -Infinity || seedN.some((n) => n[0] * g.wnorm[3 * t] + n[1] * g.wnorm[3 * t + 1] + n[2] * g.wnorm[3 * t + 2] >= cosMax - 1e-12);
    const take = (t: number): void => { const f = g.grid.face[t], s = faces.get(f) ?? new Set<number>(); s.add(t); faces.set(f, s); };
    for (const t of seeds) {
      if (seen.has(t)) continue;
      seen.add(t);
      if (hits(t)) { take(t); queue.push(t); continue; }
      for (let k = g.adjStart[t]; k < g.adjStart[t + 1]; k++) {   // 起点自己不相交：往外多看一圈
        const u = g.adj[k];
        if (seen.has(u) || !turnsOk(u)) continue;
        seen.add(u);
        if (hits(u)) { take(u); queue.push(u); }
      }
    }
    for (let qi = 0; qi < queue.length; qi++) {
      const t = queue[qi];
      for (let k = g.adjStart[t]; k < g.adjStart[t + 1]; k++) {
        const u = g.adj[k];
        if (seen.has(u)) continue;
        seen.add(u);
        if (!turnsOk(u) || !hits(u)) continue;
        take(u); queue.push(u);
      }
    }
    const polys = new Map<number, number[]>();
    for (const [f, ts] of faces) {
      if (!g.target.walks(f)) continue;   // 不走这张画：连通用过了，不吃
      const fp = g.table.faces.get(f);
      if (!fp) continue;                   // 这张面在这一列上没有值：画布上没有它
      const l = polys.get(fp.poly) ?? [];
      l.push(...ts); polys.set(fp.poly, l);
    }
    for (const l of polys.values()) l.sort((a, b) => a - b);
    if (polys.size) out.set(ti, polys);
  }
  return out;
}
