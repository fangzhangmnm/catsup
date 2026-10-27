// autofold.ts —— 公理 1（平面性）的执行机构：非平面环（含洞）→ 平面片 + 折缝。
// created by Claude Fable 5, 2026-09-01 · user 同日拍板规则：「十边形对折应该只出一条折缝」
// rev2 2026-10-27 Claude Fable 5.1（家族周账 F-105 / Fable 账单 K3；user 10-27「拖乱一个八边形，整张面会消失」「L形的面，我拖L的一个头，然后破面的时候乱掉了」）：
//   正确性来自三角化、好看来自合并——
//   ① 快路（无洞）：极大共面段（runs）+ 结点间折缝弦，折缝最少；**但只在验证通过时采用**：每条弦必须是多边形内部的对角线、
//      片的投影面积之和 = 原环投影面积（以前 L 形拖一个头：结点三角形跨过缺口、两片盖进多边形外面，就是少了这一步验证）。
//   ② 兜底（带洞 / 快路不过 / 以前返回 null 的全部）：投影到环的最佳拟合平面（投影不简单就换坐标平面）→ 洞桥接进外环 →
//      耳切三角化（简单多边形上必成功、三角形全在多边形内、互不重叠）→ 共面相邻三角形贪心合回最大平面块（合并只在结果仍是
//      一个圆盘且全在 tol 内同一平面时发生）。片的投影互不重叠、并集 = 原多边形（含洞），折缝 = 片与片之间不是原边的边。
//   ③ 四个投影平面都不简单（真拧成麻花、或环自己打结）→ null，调用方 BURST（诚实退路，现在只剩这一种情况）。
// 性质（证明留档 ai-docs/proofs/20261027-autofold-triangulation.md）：不出多边形、片的投影互不重叠、带洞也行、确定性（同输入同输出）、
//   凸环上折缝最少（快路保 09-01 规则）。消费方 = settle.ts planarPieces（像的平面化 ④）。

import { type Pt, type Pt3, EPS, EPS_AREA, distToPlane, planeBasis, planeFromPoints, planeOfRing, pointInRing, projectToPlane, segIntersections, signedArea, type PlaneParams } from "./geom.ts";
import { orient2dD } from "./exact/predicates.ts";
import { delaunayFlips } from "./cdt.ts";

export interface FoldResult {
  /** 每片 = 世界坐标环（顺环序；片在 tol 内共面）。 */
  pieces: Pt3[][];
  /** 折缝 = 片与片之间、不是原边的边（世界坐标端点对）。 */
  creases: [Pt3, Pt3][];
}

/** 非平面环（外环 + 洞）→ 平面片 + 折缝；整环共面不该调它；分不开（四个投影都不简单）→ null。 */
export function foldDecompose(outer: readonly Pt3[], holes: readonly (readonly Pt3[])[], tol: number): FoldResult | null {
  if (outer.length < 3) return null;
  // 两条路都算，取片少的（片同样多取缝少的；再平手取快路——稳定）：快路在「对折」上最少，兜底在「拉单顶角」这类大半平的环上更少。
  const fast = holes.length ? null : fastRuns(outer, tol);
  const tri = triangulateAndMerge(outer, holes, tol);
  if (fast && tri) return tri.pieces.length < fast.pieces.length || (tri.pieces.length === fast.pieces.length && tri.creases.length < fast.creases.length) ? tri : fast;
  return fast ?? tri;
}

// ---------- 快路：极大共面段 + 结点弦（v1 的算法）+ 验证 ----------

function fastRuns(pts: readonly Pt3[], tol: number): FoldResult | null {
  const n = pts.length;
  if (n < 4) return null;
  const fitOf = (idxs: readonly number[]): PlaneParams | null => {
    for (let a = 1; a + 1 < idxs.length; a++) { const pl = planeFromPoints(pts[idxs[0]], pts[idxs[a]], pts[idxs[a + 1]]); if (pl) return pl; }
    return null;
  };
  const coplanar = (idxs: readonly number[]): boolean => { const pl = fitOf(idxs); return !pl || idxs.every((i) => distToPlane(pts[i], pl) <= tol); };
  const runs: number[][] = [];
  let cur = [0, 1];
  for (let i = 2; i < n; i++) { const trial = [...cur, i]; if (coplanar(trial)) cur = trial; else { runs.push(cur); cur = [cur[cur.length - 1], i]; } }
  const wrapTrial = [...cur, 0];
  if (runs.length && coplanar([...cur, ...runs[0]])) runs[0] = [...cur, ...runs[0]];
  else if (coplanar(wrapTrial)) runs.push(wrapTrial);
  else { runs.push(cur); runs.push([cur[cur.length - 1], 0]); }
  if (runs.length < 2) return null;
  const junctions = runs.map((r) => r[0]);
  const k = junctions.length;
  const pieces = runs.filter((r) => new Set(r).size >= 3);
  const creases: [number, number][] = [];
  if (k === 2) creases.push([junctions[0], junctions[1]]);
  else {
    for (let i = 0; i < k; i++) creases.push([junctions[i], junctions[(i + 1) % k]]);
    if (!coplanar(junctions)) return null;
    if (new Set(junctions).size >= 3) pieces.push([...junctions]);
  }
  if (!pieces.length) return null;
  // 验证（rev2）：在最佳拟合平面的投影里——环简单、每条弦是内部对角线、片简单且同向、面积守恒。任一不过 → 走兜底。
  const plane = planeOfRing(pts);
  if (!plane) return null;
  const B = planeBasis(plane);
  const q = pts.map((p) => projectToPlane(p, B));
  if (!isSimpleRing(q)) return null;
  const A0 = signedArea(q);
  if (Math.abs(A0) <= EPS_AREA) return null;
  const sign = Math.sign(A0);
  for (const [i, j] of creases) {
    if (i === j || (j === (i + 1) % n) || (i === (j + 1) % n)) continue;   // 弦就是原边（二点段兜底时会出现）：无害
    if (!chordInside(q, i, j)) return null;
  }
  let sum = 0;
  for (const pc of pieces) {
    const r = pc.map((i) => q[i]);
    if (!isSimpleRing(r)) return null;
    const a = signedArea(r);
    if (Math.sign(a) !== sign) return null;
    sum += Math.abs(a);
  }
  if (Math.abs(sum - Math.abs(A0)) > 1e-9 * Math.abs(A0) + EPS_AREA) return null;
  return { pieces: pieces.map((pc) => pc.map((i) => pts[i])), creases: creases.filter(([i, j]) => i !== j).map(([i, j]) => [pts[i], pts[j]] as [Pt3, Pt3]) };
}

/** 弦 (i, j) 是环的内部对角线：中点在环内，且和任何不相邻的边不相交。 */
function chordInside(q: readonly Pt[], i: number, j: number): boolean {
  const n = q.length, a = q[i], b = q[j];
  if (!pointInRing({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, q)) return false;
  for (let e = 0; e < n; e++) {
    const e2 = (e + 1) % n;
    if (e === i || e2 === i || e === j || e2 === j) continue;
    if (segIntersections(a, b, q[e], q[e2]).length) return false;
  }
  return true;
}

/** 投影环简单：无重复点、面积非零、不相邻的边互不相交、相邻的边只在公共端点相碰。 */
function isSimpleRing(q: readonly Pt[]): boolean {
  const n = q.length;
  if (n < 3 || Math.abs(signedArea(q)) <= EPS_AREA) return false;
  for (let i = 0; i < n; i++) {
    const a = q[i], b = q[(i + 1) % n];
    if (Math.hypot(a.x - b.x, a.y - b.y) <= EPS) return false;
    for (let j = i + 1; j < n; j++) {
      const c = q[j], d = q[(j + 1) % n];
      const adjacent = j === i + 1 || (i === 0 && j === n - 1);
      const x = segIntersections(a, b, c, d);
      if (adjacent) { if (x.length > 1) return false; continue; }   // 相邻边重叠（折回去）= 不简单
      if (x.length) return false;
    }
  }
  return true;
}

// ---------- 兜底：投影 → 桥洞 → 耳切 → 合并 ----------

interface Projection { plane: PlaneParams; q: Pt[]; }

function triangulateAndMerge(outer: readonly Pt3[], holes: readonly (readonly Pt3[])[], tol: number): FoldResult | null {
  // 全局点表：外环 + 各洞串起来；id = 下标。
  const P: Pt3[] = [...outer];
  const holeIds: number[][] = [];
  for (const h of holes) { const ids: number[] = []; for (const p of h) { ids.push(P.length); P.push(p); } holeIds.push(ids); }
  const outerIds = outer.map((_, i) => i);
  for (const plane of candidatePlanes(outer)) {
    const B = planeBasis(plane);
    const q = P.map((p) => projectToPlane(p, B));
    const pr: Projection = { plane, q };
    if (!projectionUsable(pr, outerIds, holeIds)) continue;
    const merged = bridgeHoles(pr, outerIds, holeIds);
    if (!merged) continue;
    const off = P.map((p) => distToPlane(p, plane));   // 离拟合平面多远：先切最翘的顶点（见 earClip）
    const tris0 = earClip(pr, merged, off);
    if (!tris0) continue;
    // 质量整理（user 10-27「耳切三角化……很丑……能不能用一个更均匀，regular的triangulation」）：不是原边的对角线按空圆准则翻到约束 Delaunay
    // ——折缝 = 翻完的对角线，不再有细长条。原边（外环 + 洞）是约束，永远不翻；翻只在严格凸四边形里做，覆盖集合不变（证明留档 §4）。
    const constrained = new Set<string>();
    const ringKeys = (ids: readonly number[]): void => { for (let i = 0; i < ids.length; i++) { const a = ids[i], b = ids[(i + 1) % ids.length]; constrained.add(a < b ? `${a}-${b}` : `${b}-${a}`); } };
    ringKeys(outerIds); for (const h of holeIds) ringKeys(h);
    const tris = delaunayFlips(pr.q, tris0, constrained);
    return mergeCoplanar(P, pr, tris, outerIds, holeIds, tol);
  }
  return null;
}

function candidatePlanes(outer: readonly Pt3[]): PlaneParams[] {
  const out: PlaneParams[] = [];
  const fit = planeOfRing(outer);
  if (fit) out.push(fit);
  out.push({ n: { x: 0, y: 0, z: 1 }, d: 0 }, { n: { x: 1, y: 0, z: 0 }, d: 0 }, { n: { x: 0, y: 1, z: 0 }, d: 0 });
  return out;
}

/** 投影可用：外环简单；每个洞简单、全在外环内、和外环 / 别的洞不相交。 */
function projectionUsable(pr: Projection, outerIds: readonly number[], holeIds: readonly number[][]): boolean {
  const ring = (ids: readonly number[]): Pt[] => ids.map((i) => pr.q[i]);
  const O = ring(outerIds);
  if (!isSimpleRing(O)) return false;
  const rings = [O, ...holeIds.map(ring)];
  for (let h = 1; h < rings.length; h++) {
    const H = rings[h];
    if (!isSimpleRing(H)) return false;
    if (!H.every((p) => pointInRing(p, O))) return false;
    for (let g = 0; g < rings.length; g++) {
      if (g === h) continue;
      if (ringsCross(H, rings[g])) return false;
      if (g > 0 && H.some((p) => pointInRing(p, rings[g]))) return false;   // 洞套洞
    }
  }
  return true;
}
function ringsCross(a: readonly Pt[], b: readonly Pt[]): boolean {
  for (let i = 0; i < a.length; i++) for (let j = 0; j < b.length; j++) if (segIntersections(a[i], a[(i + 1) % a.length], b[j], b[(j + 1) % b.length]).length) return true;
  return false;
}

/**
 * 洞桥接（Eberly）：外环按 CCW、洞按 CW；每个洞取最右点 M，向 +x 射线找最近的外环边，取可见顶点 P（优先射线命中的端点；
 * 若有反射顶点落在三角 (M, I, P) 内则取和射线夹角最小的那个），把洞串进外环：… P, M, 洞一圈, M, P, …。
 * 返回的是 id 列表（桥接的两个顶点各出现两次）；null = 找不到可见顶点（理论上简单多边形里不会）。
 */
function bridgeHoles(pr: Projection, outerIds: readonly number[], holeIds: readonly number[][]): number[] | null {
  const q = pr.q;
  const ccw = (ids: readonly number[]): number[] => (signedArea(ids.map((i) => q[i])) >= 0 ? [...ids] : [...ids].reverse());
  let poly = ccw(outerIds);
  const holesCW = holeIds.map((h) => ccw(h).reverse());
  // 洞按最右点的 x 降序处理（右边的先并进去，保证后面的射线只会打到外环 / 已并入的洞）
  const order = holesCW.map((h, k) => ({ k, mx: Math.max(...h.map((i) => q[i].x)) })).sort((a, b) => b.mx - a.mx || a.k - b.k).map((o) => o.k);
  for (const k of order) {
    const h = holesCW[k];
    let mIdx = 0;
    for (let i = 1; i < h.length; i++) { const a = q[h[i]], b = q[h[mIdx]]; if (a.x > b.x || (a.x === b.x && a.y < b.y)) mIdx = i; }
    const M = q[h[mIdx]];
    // 射线 M + t·(1,0) 与 poly 各边的最近交点
    let bestT = Infinity, bestE = -1, bestI: Pt | null = null;
    for (let e = 0; e < poly.length; e++) {
      const a = q[poly[e]], b = q[poly[(e + 1) % poly.length]];
      if ((a.y > M.y) === (b.y > M.y)) { if (!(Math.abs(a.y - M.y) <= EPS && Math.abs(b.y - M.y) <= EPS)) continue; }
      const dy = b.y - a.y;
      let t: number, ix: number;
      if (Math.abs(dy) <= EPS) { ix = Math.max(a.x, b.x); t = ix - M.x; if (Math.min(a.x, b.x) - M.x > EPS) ix = Math.min(a.x, b.x), t = ix - M.x; }
      else { const u = (M.y - a.y) / dy; if (u < -EPS || u > 1 + EPS) continue; ix = a.x + u * (b.x - a.x); t = ix - M.x; }
      if (t < -EPS) continue;
      if (t < bestT) { bestT = t; bestE = e; bestI = { x: ix, y: M.y }; }
    }
    if (bestE < 0 || !bestI) return null;
    const ea = poly[bestE], eb = poly[(bestE + 1) % poly.length];
    let pPos: number;
    if (Math.hypot(q[ea].x - bestI.x, q[ea].y - bestI.y) <= EPS) pPos = bestE;
    else if (Math.hypot(q[eb].x - bestI.x, q[eb].y - bestI.y) <= EPS) pPos = (bestE + 1) % poly.length;
    else {
      pPos = q[ea].x > q[eb].x ? bestE : (bestE + 1) % poly.length;
      const Pp = q[poly[pPos]];
      // 三角 (M, I, P) 内的反射顶点 → 取和射线夹角最小的（相等取离 M 最近的）
      let bestAng = Infinity, bestD = Infinity;
      for (let v = 0; v < poly.length; v++) {
        if (v === pPos) continue;
        const pv = q[poly[v]];
        const prev = q[poly[(v + poly.length - 1) % poly.length]], next = q[poly[(v + 1) % poly.length]];
        if (orient2dD(prev, pv, next) >= 0) continue;   // 不是反射顶点
        if (!inTriangle(pv, M, bestI, Pp)) continue;
        const ang = Math.atan2(Math.abs(pv.y - M.y), pv.x - M.x), d = Math.hypot(pv.x - M.x, pv.y - M.y);
        if (ang < bestAng - 1e-12 || (Math.abs(ang - bestAng) <= 1e-12 && d < bestD)) { bestAng = ang; bestD = d; pPos = v; }
      }
    }
    const Pid = poly[pPos];
    const rot = [...h.slice(mIdx), ...h.slice(0, mIdx)];
    poly = [...poly.slice(0, pPos + 1), ...rot, h[mIdx], Pid, ...poly.slice(pPos + 1)];
  }
  return poly;
}
function inTriangle(p: Pt, a: Pt, b: Pt, c: Pt): boolean {
  const s1 = orient2dD(a, b, p), s2 = orient2dD(b, c, p), s3 = orient2dD(c, a, p);
  return (s1 >= 0 && s2 >= 0 && s3 >= 0) || (s1 <= 0 && s2 <= 0 && s3 <= 0);
}

/**
 * 耳切（CCW 多边形，允许桥接造成的重复顶点）：返回三角形 id 三元组；退化（剩下的全共线）照样收敛。
 * 切哪只耳：**离拟合平面最远的顶点优先**（同分取下标小的）——把翘起来的顶点先单独切成三角，剩下的环越来越平，
 * 后面的合并才能并成大块（否则从翘点出发扇形切，每个三角各在一个平面，一块都合不起来：拉单顶角会出 n−2 片）。
 */
function earClip(pr: Projection, poly: readonly number[], off: readonly number[]): [number, number, number][] | null {
  const q = pr.q;
  const ids = [...poly];
  const tris: [number, number, number][] = [];
  const isEar = (i: number): boolean => {
    const n = ids.length, a = ids[(i + n - 1) % n], b = ids[i], c = ids[(i + 1) % n];
    if (orient2dD(q[a], q[b], q[c]) <= 0) return false;
    for (let k = 0; k < n; k++) {
      const v = ids[k];
      if (v === a || v === b || v === c) continue;
      const pv = q[v];
      if (samePt2(pv, q[a]) || samePt2(pv, q[b]) || samePt2(pv, q[c])) continue;   // 桥接重复点
      if (inTriangleStrict(pv, q[a], q[b], q[c])) return false;
    }
    return true;
  };
  let guard = 0;
  while (ids.length > 3) {
    const n = ids.length;
    let cut = -1;
    const order = ids.map((v, i) => i).sort((a, b) => off[ids[b]] - off[ids[a]] || a - b);
    for (const i of order) if (isEar(i)) { cut = i; break; }
    if (cut < 0) {
      // 没有耳：先剔零面积的（共线三点），再不行 = 多边形不简单
      let dg = -1;
      for (let i = 0; i < n; i++) { const a = ids[(i + n - 1) % n], b = ids[i], c = ids[(i + 1) % n]; if (orient2dD(q[a], q[b], q[c]) === 0) { dg = i; break; } }
      if (dg < 0) return null;
      ids.splice(dg, 1);
    } else {
      tris.push([ids[(cut + n - 1) % n], ids[cut], ids[(cut + 1) % n]]);
      ids.splice(cut, 1);
    }
    if (++guard > 4 * poly.length + 8) return null;
  }
  if (ids.length === 3 && orient2dD(q[ids[0]], q[ids[1]], q[ids[2]]) > 0) tris.push([ids[0], ids[1], ids[2]]);
  return tris;
}
function samePt2(a: Pt, b: Pt): boolean { return Math.abs(a.x - b.x) <= EPS && Math.abs(a.y - b.y) <= EPS; }
function inTriangleStrict(p: Pt, a: Pt, b: Pt, c: Pt): boolean {
  // 严格内部或落在边上（边上的也算挡住：耳的边不许穿过别的顶点）
  return orient2dD(a, b, p) >= 0 && orient2dD(b, c, p) >= 0 && orient2dD(c, a, p) >= 0;
}

/**
 * 合并：共面相邻三角形贪心并成最大平面块。只在「并完仍是一个圆盘」且「全部顶点在 tol 内同一平面」时并。
 * 圆盘判据：和当前块共享 1 条边 → 第三个顶点不能已经在块里（否则夹出洞 / 捏点）；共享 2 条边 → 公共顶点在块边界上只有这两条边。
 */
function mergeCoplanar(P: readonly Pt3[], pr: Projection, tris: readonly [number, number, number][], outerIds: readonly number[], holeIds: readonly number[][], tol: number): FoldResult {
  const key = (a: number, b: number): string => (a < b ? `${a}-${b}` : `${b}-${a}`);
  const edgesOf = (t: readonly [number, number, number]): [number, number][] => [[t[0], t[1]], [t[1], t[2]], [t[2], t[0]]];
  // 邻接：边 → 三角形
  const byEdge = new Map<string, number[]>();
  tris.forEach((t, ti) => { for (const [a, b] of edgesOf(t)) { const k = key(a, b); const l = byEdge.get(k); if (l) l.push(ti); else byEdge.set(k, [ti]); } });
  const used = new Array<boolean>(tris.length).fill(false);
  const pieces: Pt3[][] = [];
  const pieceBoundaries: Map<string, [number, number]>[] = [];
  for (let seed = 0; seed < tris.length; seed++) {
    if (used[seed]) continue;
    used[seed] = true;
    const t0 = tris[seed];
    const plane = planeFromPoints(P[t0[0]], P[t0[1]], P[t0[2]]);
    const verts = new Set<number>(t0);
    const boundary = new Map<string, [number, number]>();   // 有向：按三角形 CCW 的方向存
    for (const [a, b] of edgesOf(t0)) boundary.set(key(a, b), [a, b]);
    const bdeg = new Map<number, number>();
    const recount = (): void => { bdeg.clear(); for (const [a, b] of boundary.values()) { bdeg.set(a, (bdeg.get(a) ?? 0) + 1); bdeg.set(b, (bdeg.get(b) ?? 0) + 1); } };
    recount();
    let grew = true;
    while (grew) {
      grew = false;
      // 候选 = 和边界相邻的未用三角形，按下标升序（确定性）
      const cand = new Set<number>();
      for (const k of boundary.keys()) for (const ti of byEdge.get(k) ?? []) if (!used[ti]) cand.add(ti);
      for (const ti of [...cand].sort((a, b) => a - b)) {
        if (used[ti]) continue;
        const t = tris[ti];
        if (plane && !t.every((v) => distToPlane(P[v], plane) <= tol)) continue;
        const shared = edgesOf(t).filter(([a, b]) => boundary.has(key(a, b)));
        if (shared.length === 1) {
          const [a, b] = shared[0];
          const apex = t.find((v) => v !== a && v !== b)!;
          if (verts.has(apex)) continue;
        } else if (shared.length === 2) {
          const common = shared[0].find((v) => shared[1].includes(v))!;
          if ((bdeg.get(common) ?? 0) !== 2) continue;
        } else continue;
        // 并入：共享边离开边界，其余边进边界
        for (const [a, b] of edgesOf(t)) { const k = key(a, b); if (boundary.has(k)) boundary.delete(k); else boundary.set(k, [a, b]); }
        for (const v of t) verts.add(v);
        used[ti] = true; recount(); grew = true;
      }
    }
    pieces.push(walkBoundary(boundary, P));
    pieceBoundaries.push(boundary);
  }
  // 折缝 = 片边界里不是原边的边（去重）
  const orig = new Set<string>();
  const addRing = (ids: readonly number[]): void => { for (let i = 0; i < ids.length; i++) orig.add(key(ids[i], ids[(i + 1) % ids.length])); };
  addRing(outerIds); for (const h of holeIds) addRing(h);
  const seen = new Set<string>();
  const creases: [Pt3, Pt3][] = [];
  for (const b of pieceBoundaries) for (const [k, [a, c]] of b) { if (orig.has(k) || seen.has(k)) continue; seen.add(k); creases.push([P[a], P[c]]); }
  return { pieces, creases };
}

/** 把一个圆盘块的边界（有向边集合）走成一个环；起点取最小 id（确定性）。 */
function walkBoundary(boundary: Map<string, [number, number]>, P: readonly Pt3[]): Pt3[] {
  const next = new Map<number, number>();
  for (const [a, b] of boundary.values()) next.set(a, b);
  const start = Math.min(...next.keys());
  const ring: Pt3[] = [];
  let v = start, guard = 0;
  do { ring.push(P[v]); v = next.get(v)!; } while (v !== undefined && v !== start && ++guard <= boundary.size + 1);
  return ring;
}
