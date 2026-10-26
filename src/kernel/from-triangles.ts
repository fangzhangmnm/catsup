// from-triangles.ts —— 三角网 → 肥皂膜内核（导入外来网格 T11 / 以后的「mesh → brep」cast 同一个口）。created 2026-10-26 by Claude Opus 5.5
// 为什么不走结算机（absorb）：结算机是给交互编辑的——每步按「被碰的平面 × 脏边」算影响域；一次喂几千个三角 = 几千张平面 × 几千条脏边，
//   实测 3000 三角 20–40 s（平方）。三角网自己已经说清了拓扑（哪几个点围一张面），所以干净的部分直接按存档的路装（Kernel.fromBrep，
//   和开文件同一条路、同一套校验），只有「不干净」的三角（骑边 / 交叉 / 同平面互相盖住）才交给结算机去切——结算机本来就是干这个的。
// 「干净」用的是内核自己的谓词（planarize 的骑边 / 相交，精确格点运算），不另立标准：装进来的状态 = 内核自己会认的状态。
// 变成软边（user 10-25「不好的面都变成软边好了」）：两张面之间弯折 ≤ softDeg（锐角阈值，默认 20°，与油漆桶 / 拍平同一个量）→ soft + smooth；
//   同平面的对角线（弯折 0）也软——什么都不删，共面三角留给用户用「拍平 + 擦内线」收（账本 §3.1 T11）。
// 三角的绕向（正面）现在丢：内核还没有正反面（T10 / DT8）；那时这里要把绕向带进去。
import { type PlaneParams, type Pt3, COPLANAR_TOL_DEFAULT, Q, cross3, dist3, distToPlane, dot3, planeFromPoints, quantize3, sub3 } from "./geom.ts";
import { type BrepSnapshot, type EdgeId, Kernel } from "./kernel.ts";
import { STICKY } from "./subdivide.ts";
import { fromLattice3, toLattice3 } from "./exact/lattice.ts";
import { pointRidesInterior, segSeg3Exact } from "./exact/predicates3d.ts";

export interface TriangleCastOptions {
  /** 弯折 ≤ 这个角度（度）的边变 soft + smooth。 */
  softDeg: number;
}
export interface TriangleCastReport {
  /** 输入三角数。 */
  triangles: number;
  /** 退化（点重合 / 三点共线）丢掉的。 */
  degenerate: number;
  /** 重复（同三个点，含反面朝向的双面片）丢掉的。 */
  duplicate: number;
  /** 不干净、交给结算机切的。 */
  repaired: number;
  /** 结算机也拒绝的（没进来）。 */
  rejected: number;
  /** 变成软边的条数。 */
  softened: number;
}

/** 两张面算「同一平面」的法向夹角上限（弧度）：再加「三个点都在 τ 内」——内核判「在平面上」用的就是 τ。 */
const SAME_PLANE_RAD = 1e-3;

export function kernelFromTriangles(positions: readonly Pt3[], tris: readonly number[], opt: TriangleCastOptions): { kernel: Kernel; report: TriangleCastReport } {
  const tau = COPLANAR_TOL_DEFAULT, r = STICKY.r;
  const report: TriangleCastReport = { triangles: Math.floor(tris.length / 3), degenerate: 0, duplicate: 0, repaired: 0, rejected: 0, softened: 0 };
  // ① 点：量化 + r 内合一（内核的身份分辨率；先到先得 = 代表点两两 > r）
  const verts: Pt3[] = [], remap: number[] = [];
  const cell = new Map<string, number[]>();
  const ck = (x: number, y: number, z: number): string => `${x},${y},${z}`;
  for (const p0 of positions) {
    const p = quantize3(p0);
    if (![p.x, p.y, p.z].every(Number.isFinite)) { remap.push(-1); continue; }
    const cx = Math.floor(p.x / r), cy = Math.floor(p.y / r), cz = Math.floor(p.z / r);
    let hit = -1;
    for (let dx = -1; dx <= 1 && hit < 0; dx++) for (let dy = -1; dy <= 1 && hit < 0; dy++) for (let dz = -1; dz <= 1 && hit < 0; dz++) {
      for (const i of cell.get(ck(cx + dx, cy + dy, cz + dz)) ?? []) if (dist3(verts[i], p) <= r) { hit = i; break; }
    }
    if (hit < 0) { hit = verts.length; verts.push(p); const k = ck(cx, cy, cz); (cell.get(k) ?? cell.set(k, []).get(k)!).push(hit); }
    remap.push(hit);
  }
  // ② 三角：去退化、去重；③ 按平面分组（先到的三角定这一组的平面）
  interface Tri { v: [number, number, number]; group: number }
  const T: Tri[] = [], seen = new Set<string>();
  const groups: { plane: PlaneParams; tris: number[] }[] = [];
  const gIndex = new Map<string, number[]>();
  const nq = (v: number): number => Math.round(v * 200), dq = (v: number): number => Math.round(v * 1000);
  const gKey = (pl: PlaneParams): [number, number, number, number] => [nq(pl.n.x), nq(pl.n.y), nq(pl.n.z), dq(pl.d)];
  const findGroup = (pl: PlaneParams, pts: Pt3[]): number => {
    for (const s of [1, -1]) {
      const [a, b, c, d] = gKey({ n: { x: pl.n.x * s, y: pl.n.y * s, z: pl.n.z * s }, d: pl.d * s });
      for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (let k = -1; k <= 1; k++) for (let l = -1; l <= 1; l++) {
        for (const gi of gIndex.get(`${a + i},${b + j},${c + k},${d + l}`) ?? []) {
          const g = groups[gi];
          if (Math.abs(dot3(g.plane.n, pl.n)) < Math.cos(SAME_PLANE_RAD)) continue;
          if (pts.every((p) => distToPlane(p, g.plane) <= tau)) return gi;
        }
      }
    }
    return -1;
  };
  for (let t = 0; t + 2 < tris.length; t += 3) {
    const a = remap[tris[t]], b = remap[tris[t + 1]], c = remap[tris[t + 2]];
    if (a === undefined || b === undefined || c === undefined || a < 0 || b < 0 || c < 0 || a === b || b === c || a === c) { report.degenerate++; continue; }
    const pl = planeFromPoints(verts[a], verts[b], verts[c]);
    if (!pl) { report.degenerate++; continue; }
    const key = [a, b, c].sort((x, y) => x - y).join(",");
    if (seen.has(key)) { report.duplicate++; continue; }
    seen.add(key);
    let gi = findGroup(pl, [verts[a], verts[b], verts[c]]);
    if (gi < 0) { gi = groups.length; groups.push({ plane: pl, tris: [] }); const [x, y, z, d] = gKey(pl); const k = `${x},${y},${z},${d}`; (gIndex.get(k) ?? gIndex.set(k, []).get(k)!).push(gi); }
    // 外环在平面基里逆时针（fromBrep 要求）：绕向法向与平面法向反 → 翻
    const nt = cross3(sub3(verts[b], verts[a]), sub3(verts[c], verts[a]));
    const v: [number, number, number] = dot3(nt, groups[gi].plane.n) >= 0 ? [a, b, c] : [a, c, b];
    groups[gi].tris.push(T.length);
    T.push({ v, group: gi });
  }
  const build = (keep: (ti: number) => boolean): Kernel => Kernel.fromBrep(snapshotOf(verts, T, groups, keep, tau));
  // ④ 先全部按存档的路装；装不上（理论上不该）→ 全部交给结算机
  let k: Kernel;
  try { k = build(() => true); } catch {
    const all = T.map((_, i) => i);
    k = absorbInto(new Kernel(), all.map((i) => T[i].v.map((vi) => verts[vi])), report);
    report.repaired = all.length - report.rejected;
    softenAll(k, opt.softDeg, report);
    return { kernel: k, report };
  }
  // ⑤ 干净吗（内核自己的谓词）：骑边、相交、同平面互相盖住 → 牵连到的三角交给结算机
  const bad = dirtyTriangles(k, verts, T, groups);
  if (bad.size) {
    k = absorbInto(build((ti) => !bad.has(ti)), [...bad].sort((x, y) => x - y).map((i) => T[i].v.map((vi) => verts[vi])), report);
    report.repaired = bad.size - report.rejected;
  }
  softenAll(k, opt.softDeg, report);
  return { kernel: k, report };
}

function snapshotOf(verts: readonly Pt3[], T: readonly { v: readonly number[]; group: number }[], groups: readonly { plane: PlaneParams }[], keep: (ti: number) => boolean, tau: number): BrepSnapshot {
  const vIdx = new Map<number, number>(), vs: Pt3[] = [];
  const pIdx = new Map<number, number>(), planes: PlaneParams[] = [];
  const eSeen = new Set<string>(), edges: [number, number][] = [];
  const faces: { plane: number; outer: number[]; holes: number[][] }[] = [];
  const vi = (i: number): number => { let j = vIdx.get(i); if (j === undefined) { j = vs.length; vIdx.set(i, j); vs.push(verts[i]); } return j; };
  for (let ti = 0; ti < T.length; ti++) {
    if (!keep(ti)) continue;
    const t = T[ti], ring = t.v.map(vi);
    for (let i = 0; i < 3; i++) { const a = ring[i], b = ring[(i + 1) % 3], key = a < b ? `${a},${b}` : `${b},${a}`; if (!eSeen.has(key)) { eSeen.add(key); edges.push([a, b]); } }
    let p = pIdx.get(t.group);
    if (p === undefined) { p = planes.length; pIdx.set(t.group, p); planes.push(groups[t.group].plane); }
    faces.push({ plane: p, outer: ring, holes: [] });
  }
  return { coplanarTol: tau, vertices: vs, edges, planes, faces };
}

/** 牵连到「不干净」的三角下标：planarize 会切的（骑边 / 相交，精确）+ 同平面的三角互相盖住（一个三角的顶点落在同组另一个三角里面）。 */
function dirtyTriangles(k: Kernel, verts: readonly Pt3[], T: readonly { v: readonly number[]; group: number }[], groups: readonly { plane: PlaneParams; tris: number[] }[]): Set<number> {
  const g = k.graph, r = STICKY.r, rL = Math.round(r / Q);
  const rides = (p: Pt3, a: Pt3, b: Pt3): boolean => pointRidesInterior(toLattice3(p), toLattice3(a), toLattice3(b), rL);
  const hits = (ea: Pt3, eb: Pt3, oa: Pt3, ob: Pt3): Pt3[] => segSeg3Exact(toLattice3(ea), toLattice3(eb), toLattice3(oa), toLattice3(ob), rL).points.map((q) => quantize3(fromLattice3(q)));
  const snapV = (p: Pt3): Pt3 => { let best: Pt3 | null = null, bd = r; for (const v of g.verticesNear(p, p)) { const d = dist3(p, v); if (d <= bd) { bd = d; best = { x: v.x, y: v.y, z: v.z }; } } return best ?? p; };
  const badEdges = new Set<EdgeId>(), badVerts = new Set<string>();
  const key = (p: Pt3): string => `${p.x},${p.y},${p.z}`;
  for (const e of g.edges()) {
    const ea = g.pt(e.a), eb = g.pt(e.b);
    for (const o of g.edgesNear(ea, eb)) {
      if (o.id <= e.id) continue;
      const oa = g.pt(o.a), ob = g.pt(o.b);
      for (let p of hits(ea, eb, oa, ob)) {
        p = snapV(p);
        if (rides(p, ea, eb) || rides(p, oa, ob)) { badEdges.add(e.id); badEdges.add(o.id); }
      }
    }
    for (const v of g.verticesNear(ea, eb)) {
      if (v.id === e.a || v.id === e.b) continue;
      const p = { x: v.x, y: v.y, z: v.z };
      if (rides(p, ea, eb)) { badEdges.add(e.id); badVerts.add(key(p)); }
    }
  }
  const out = new Set<number>();
  const eKey = (a: Pt3, b: Pt3): string => { const ka = key(a), kb = key(b); return ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`; };
  const badE = new Set<string>([...badEdges].map((id) => { const e = g.edge(id); return eKey(g.pt(e.a), g.pt(e.b)); }));
  for (let ti = 0; ti < T.length; ti++) {
    const p = T[ti].v.map((i) => verts[i]);
    if (p.some((q) => badVerts.has(key(q))) || [0, 1, 2].some((i) => badE.has(eKey(p[i], p[(i + 1) % 3])))) out.add(ti);
  }
  // 同平面互相盖住：边不相交、不骑边的前提下，两个三角重叠 ⇔ 一个的顶点严格落在另一个里面（距三条边都 > r）
  for (const grp of groups) {
    if (grp.tris.length < 2) continue;
    const n = grp.plane.n, ax = Math.abs(n.x) >= Math.abs(n.y) && Math.abs(n.x) >= Math.abs(n.z) ? 0 : Math.abs(n.y) >= Math.abs(n.z) ? 1 : 2;
    const uv = (p: Pt3): [number, number] => (ax === 0 ? [p.y, p.z] : ax === 1 ? [p.z, p.x] : [p.x, p.y]);
    const tri2 = grp.tris.map((ti) => T[ti].v.map((i) => uv(verts[i])));
    const vset = [...new Set(grp.tris.flatMap((ti) => T[ti].v))];
    // 二维格：格边 = 组里三角包围盒的中位尺寸
    const sizes = tri2.map((t) => Math.max(Math.max(t[0][0], t[1][0], t[2][0]) - Math.min(t[0][0], t[1][0], t[2][0]), Math.max(t[0][1], t[1][1], t[2][1]) - Math.min(t[0][1], t[1][1], t[2][1]))).sort((a, b) => a - b);
    const s = Math.max(sizes[sizes.length >> 1], r * 4);
    const grid = new Map<string, number[]>();
    tri2.forEach((t, j) => {
      const x0 = Math.floor(Math.min(t[0][0], t[1][0], t[2][0]) / s), x1 = Math.floor(Math.max(t[0][0], t[1][0], t[2][0]) / s);
      const y0 = Math.floor(Math.min(t[0][1], t[1][1], t[2][1]) / s), y1 = Math.floor(Math.max(t[0][1], t[1][1], t[2][1]) / s);
      for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) { const kk = `${x},${y}`; (grid.get(kk) ?? grid.set(kk, []).get(kk)!).push(j); }
    });
    // 投影到坐标平面会把距离按 |n_ax| 缩放；「离边 > r」按 3D 距离量
    const scale = Math.abs(ax === 0 ? n.x : ax === 1 ? n.y : n.z);
    for (const vi of vset) {
      const q = uv(verts[vi]);
      for (const j of grid.get(`${Math.floor(q[0] / s)},${Math.floor(q[1] / s)}`) ?? []) {
        const ti = grp.tris[j];
        if (T[ti].v.includes(vi)) continue;
        if (strictlyInside(q, tri2[j], r * scale)) { out.add(ti); for (const tj of grp.tris) if (T[tj].v.includes(vi)) out.add(tj); }
      }
    }
  }
  return out;
}

/** 二维点严格在三角里面：到三条边所在直线的有向距离都 > m（同号）。 */
function strictlyInside(q: [number, number], t: [number, number][], m: number): boolean {
  let sign = 0;
  for (let i = 0; i < 3; i++) {
    const a = t[i], b = t[(i + 1) % 3];
    const ex = b[0] - a[0], ey = b[1] - a[1], L = Math.hypot(ex, ey);
    if (L === 0) return false;
    const d = (ex * (q[1] - a[1]) - ey * (q[0] - a[0])) / L;
    if (Math.abs(d) <= m) return false;
    const s = Math.sign(d);
    if (sign === 0) sign = s; else if (s !== sign) return false;
  }
  return true;
}

/** 交给结算机：先整批（一次），拒了就分小批、小批再拒就逐个；被拒的不进来（计数）。每次都在副本上试，失败不弄脏手里那份；返回最后成功的那份。 */
function absorbInto(k: Kernel, faces: Pt3[][], report: TriangleCastReport): Kernel {
  let cur = k;
  const tryAbsorb = (batch: Pt3[][]): boolean => {
    const c = cur.clone();
    try { c.absorb(batch.map((f) => [f]), []); } catch { return false; }
    cur = c;
    return true;
  };
  if (!faces.length || tryAbsorb(faces)) return cur;
  for (let i = 0; i < faces.length; i += 32) {
    const chunk = faces.slice(i, i + 32);
    if (tryAbsorb(chunk)) continue;
    for (const f of chunk) if (!tryAbsorb([f])) report.rejected++;
  }
  return cur;
}

function softenAll(k: Kernel, deg: number, report: TriangleCastReport): void {
  const ids = k.edges().map((e) => e.id).filter((e) => { const b = k.bendDeg(e); return b !== null && b <= deg + 1e-9; });
  k.setEdgeLayer("soft", ids, true);
  k.setEdgeLayer("smooth", ids, true);
  report.softened = ids.length;
}
