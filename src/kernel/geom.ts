// geom.ts —— 几何判定与量化：全内核唯一的数值层（零 DOM 零 IO）。
// 公理 3「重合即同一」的机制根基：所有进入拓扑的坐标先量化到 Q 网格，
// 顶点身份 = 量化格点的精确 Map 查找（不做 epsilon 等价——那有传递性坑）。
// 量化本身可能制造重合——那正是 sticky 公理在干活，不是 bug。
// M3 的 coplanarity 容差旋钮（spec：头号 UX 旋钮）将来落在本模块这个接缝。

export interface Pt { readonly x: number; readonly y: number; }

export const Q = 1e-6;          // 量化网格步长
export const EPS = Q / 2;       // 距离容差（半格内视为重合）
export const EPS_AREA = 1e-9;   // 有向面积低于此视为退化环

export function quantize(p: Pt): Pt {
  return { x: Math.round(p.x / Q) * Q, y: Math.round(p.y / Q) * Q };
}

/** 量化格点的精确身份 key（顶点去重用）。输入须已量化。 */
export function ptKey(p: Pt): string {
  return `${Math.round(p.x / Q)},${Math.round(p.y / Q)}`;
}

export function samePt(a: Pt, b: Pt): boolean {
  return Math.abs(a.x - b.x) <= EPS && Math.abs(a.y - b.y) <= EPS;
}

export function dist(a: Pt, b: Pt): number { return Math.hypot(a.x - b.x, a.y - b.y); }

export function angleOf(from: Pt, to: Pt): number { return Math.atan2(to.y - from.y, to.x - from.x); }

/** (a-o)×(b-o) 叉积；>0 = b 在 oa 左侧。 */
export function cross(o: Pt, a: Pt, b: Pt): number {
  return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
}

/** p 是否落在线段 ab 上（含端点，EPS 容差）。 */
export function pointOnSegment(p: Pt, a: Pt, b: Pt): boolean {
  const len = dist(a, b);
  if (len <= EPS) return samePt(p, a);
  if (Math.abs(cross(a, b, p)) / len > EPS) return false; // 垂距超容差
  const t = ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / (len * len);
  return t >= -EPS / len && t <= 1 + EPS / len;
}

/**
 * 两线段的交点集：正常相交/T 交 → 1 点；共线重叠 → 重叠区两端点；不交 → []。
 * 返回点已量化。subdivide 拿这个打交点切边（公理 4 dividing 的算法本体）。
 */
export function segIntersections(a1: Pt, a2: Pt, b1: Pt, b2: Pt): Pt[] {
  const dax = a2.x - a1.x, day = a2.y - a1.y;
  const dbx = b2.x - b1.x, dby = b2.y - b1.y;
  const denom = dax * dby - day * dbx;
  const lenA = Math.hypot(dax, day), lenB = Math.hypot(dbx, dby);
  if (lenA <= EPS || lenB <= EPS) return [];

  if (Math.abs(denom) / (lenA * lenB) < 1e-12) {
    // 平行：若共线则算重叠区
    if (Math.abs(cross(a1, a2, b1)) / lenA > EPS) return [];
    // 把 b1/b2 投影到 a 的参数轴
    const tOf = (p: Pt): number => ((p.x - a1.x) * dax + (p.y - a1.y) * day) / (lenA * lenA);
    let t1 = tOf(b1), t2 = tOf(b2);
    if (t1 > t2) [t1, t2] = [t2, t1];
    const lo = Math.max(0, t1), hi = Math.min(1, t2);
    if (hi < lo - EPS / lenA) return [];
    const at = (t: number): Pt => quantize({ x: a1.x + t * dax, y: a1.y + t * day });
    const p1 = at(lo), p2 = at(hi);
    return samePt(p1, p2) ? [p1] : [p1, p2];
  }

  const t = ((b1.x - a1.x) * dby - (b1.y - a1.y) * dbx) / denom;
  const s = ((b1.x - a1.x) * day - (b1.y - a1.y) * dax) / denom;
  const tolT = EPS / lenA, tolS = EPS / lenB;
  if (t < -tolT || t > 1 + tolT || s < -tolS || s > 1 + tolS) return [];
  return [quantize({ x: a1.x + t * dax, y: a1.y + t * day })];
}

/** 环的有向面积（shoelace）；CCW 为正。 */
export function signedArea(ring: readonly Pt[]): number {
  let s = 0;
  for (let i = 0; i < ring.length; i++) {
    const p = ring[i], q = ring[(i + 1) % ring.length];
    s += p.x * q.y - q.x * p.y;
  }
  return s / 2;
}

/** 射线法点在环内（不含环上；环上结果未定义——调用方自己保证离边界有距离）。 */
export function pointInRing(p: Pt, ring: readonly Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i], b = ring[j];
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) {
      inside = !inside;
    }
  }
  return inside;
}

/** 点到线段距离（playground hitTest 用）。 */
export function distToSegment(p: Pt, a: Pt, b: Pt): number {
  const len2 = (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
  if (len2 === 0) return dist(p, a);
  let t = ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / len2;
  t = Math.max(0, Math.min(1, t));
  return dist(p, { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) });
}

// ============================ 3D 层（M3 升维） ============================
// 拓扑存 3D 点；face-finding 仍是 2D 管线——每个平面用**确定性正交基**投影下来跑。
// coplanarity 容差 τ 只用于「平面分组/归属」判定；几何本身保持精确共面
// （把点拍到平面上是输入侧 inference 的职责——drill L297 的结论，防 τ 松了 PSLG 被斜边打脏）。

export interface Pt3 { readonly x: number; readonly y: number; readonly z: number; }

export function quantize3(p: Pt3): Pt3 {
  return { x: Math.round(p.x / Q) * Q, y: Math.round(p.y / Q) * Q, z: Math.round(p.z / Q) * Q };
}
export function ptKey3(p: Pt3): string {
  return `${Math.round(p.x / Q)},${Math.round(p.y / Q)},${Math.round(p.z / Q)}`;
}
export function samePt3(a: Pt3, b: Pt3): boolean {
  return Math.abs(a.x - b.x) <= EPS && Math.abs(a.y - b.y) <= EPS && Math.abs(a.z - b.z) <= EPS;
}
export function dist3(a: Pt3, b: Pt3): number { return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z); }
export const sub3 = (a: Pt3, b: Pt3): Pt3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
export const add3 = (a: Pt3, b: Pt3): Pt3 => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
export const scale3 = (a: Pt3, s: number): Pt3 => ({ x: a.x * s, y: a.y * s, z: a.z * s });
export const dot3 = (a: Pt3, b: Pt3): number => a.x * b.x + a.y * b.y + a.z * b.z;
export const cross3 = (a: Pt3, b: Pt3): Pt3 => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
});
export const len3 = (a: Pt3): number => Math.hypot(a.x, a.y, a.z);
export function normalize3(a: Pt3): Pt3 {
  const l = len3(a);
  return l > 0 ? scale3(a, 1 / l) : a;
}

/** 平面：单位法向 n + 距离 d（n·p = d）。canonical：n 首个非微小分量为正。 */
export interface PlaneParams { readonly n: Pt3; readonly d: number; }

export function canonicalPlane(nRaw: Pt3, d: number): PlaneParams {
  let n = normalize3(nRaw), dd = d;
  const first = Math.abs(n.x) > 1e-9 ? n.x : Math.abs(n.y) > 1e-9 ? n.y : n.z;
  if (first < 0) { n = scale3(n, -1); dd = -dd; }
  return { n, d: dd };
}

/** 三点定平面；共线（叉积过小）→ null。 */
export function planeFromPoints(a: Pt3, b: Pt3, c: Pt3): PlaneParams | null {
  const nRaw = cross3(sub3(b, a), sub3(c, a));
  const l = len3(nRaw);
  const scaleRef = Math.max(dist3(a, b), dist3(a, c));
  if (l <= EPS * scaleRef || scaleRef <= EPS) return null; // 共线/退化
  const n = normalize3(nRaw);
  return canonicalPlane(n, dot3(n, a));
}

export function distToPlane(p: Pt3, pl: PlaneParams): number {
  return Math.abs(dot3(p, pl.n) - pl.d);
}

/** 确定性正交基：同一 canonical 平面每次算出同一 (u,v)——投影坐标跨重跑稳定的根基。 */
export function planeBasis(pl: PlaneParams): { u: Pt3; v: Pt3 } {
  const n = pl.n;
  // 选与 n 最不平行的坐标轴起基
  const ax = Math.abs(n.x), ay = Math.abs(n.y), az = Math.abs(n.z);
  const seed: Pt3 = ax <= ay && ax <= az ? { x: 1, y: 0, z: 0 } : ay <= az ? { x: 0, y: 1, z: 0 } : { x: 0, y: 0, z: 1 };
  const u = normalize3(cross3(n, seed));
  const v = cross3(n, u); // 已单位（n⊥u 且均单位）
  return { u, v };
}

export function projectToPlane(p: Pt3, basis: { u: Pt3; v: Pt3 }): Pt {
  return { x: dot3(p, basis.u), y: dot3(p, basis.v) };
}
export function liftFromPlane(p2: Pt, pl: PlaneParams, basis: { u: Pt3; v: Pt3 }): Pt3 {
  return add3(add3(scale3(basis.u, p2.x), scale3(basis.v, p2.y)), scale3(pl.n, pl.d));
}

/** p 是否落在 3D 线段 ab 上（含端点，EPS 容差）。 */
export function pointOnSegment3(p: Pt3, a: Pt3, b: Pt3): boolean {
  const len = dist3(a, b);
  if (len <= EPS) return samePt3(p, a);
  const d = len3(cross3(sub3(p, a), sub3(b, a))) / len; // 点到直线距离
  if (d > EPS) return false;
  const t = dot3(sub3(p, a), sub3(b, a)) / (len * len);
  return t >= -EPS / len && t <= 1 + EPS / len;
}

/** 点到 3D 线段距离。 */
export function distToSegment3(p: Pt3, a: Pt3, b: Pt3): number {
  const ab = sub3(b, a);
  const len2 = dot3(ab, ab);
  if (len2 === 0) return dist3(p, a);
  let t = dot3(sub3(p, a), ab) / len2;
  t = Math.max(0, Math.min(1, t));
  return dist3(p, add3(a, scale3(ab, t)));
}

/**
 * 3D 线段交点集：斜交（距离 > EPS）→ []；共面相交/T 交 → 1 点；共线重叠 → 重叠区两端点。
 * 返回点已量化。
 */
export function segIntersections3(a1: Pt3, a2: Pt3, b1: Pt3, b2: Pt3): Pt3[] {
  const da = sub3(a2, a1), db = sub3(b2, b1);
  const lenA = len3(da), lenB = len3(db);
  if (lenA <= EPS || lenB <= EPS) return [];
  const n = cross3(da, db);
  const nl = len3(n);

  if (nl / (lenA * lenB) < 1e-12) {
    // 平行：共线才有重叠
    const offLine = len3(cross3(sub3(b1, a1), da)) / lenA;
    if (offLine > EPS) return [];
    const tOf = (p: Pt3): number => dot3(sub3(p, a1), da) / (lenA * lenA);
    let t1 = tOf(b1), t2 = tOf(b2);
    if (t1 > t2) [t1, t2] = [t2, t1];
    const lo = Math.max(0, t1), hi = Math.min(1, t2);
    if (hi < lo - EPS / lenA) return [];
    const at = (t: number): Pt3 => quantize3(add3(a1, scale3(da, t)));
    const p1 = at(lo), p2 = at(hi);
    return samePt3(p1, p2) ? [p1] : [p1, p2];
  }

  // skew 距离（公垂线长）超容差 → 不交
  const skew = Math.abs(dot3(sub3(b1, a1), n)) / nl;
  if (skew > EPS) return [];
  const nn = nl * nl;
  const t = dot3(cross3(sub3(b1, a1), db), n) / nn;
  const s = dot3(cross3(sub3(b1, a1), da), n) / nn;
  const tolT = EPS / lenA, tolS = EPS / lenB;
  if (t < -tolT || t > 1 + tolT || s < -tolS || s > 1 + tolS) return [];
  return [quantize3(add3(a1, scale3(da, t)))];
}
