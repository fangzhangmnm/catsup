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
