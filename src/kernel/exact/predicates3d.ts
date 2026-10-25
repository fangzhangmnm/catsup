// exact/predicates3d.ts —— 3D 精确谓词（格点整数 + BigInt；EGC 期 2，设计稿 ai-docs/20261024-exact-geometry-design.md §4 期 2）。
// 插边 / 自愈只问三件事，全部精确：① 点离闭线段 ≤ r（距离² 与 r² 的整数比较）；② 两段相交 / 斜交 ≤ r 时「该在哪里共一个顶点」；③ 共线重叠区。
// 容差只剩 r（身份分辨率：≤ r 的点是一个点，subdivide.ts STICKY.r）；构造出的点一律落回格点（最近格点，精确舍入）。created 2026-10-24 by Claude Fable 5.1
import type { IPt3 } from "./lattice.ts";
import { floorDiv } from "./predicates.ts";

const B = (v: number): bigint => BigInt(v);
type V = [bigint, bigint, bigint];
const sub = (p: IPt3, q: IPt3): V => [B(p.x - q.x), B(p.y - q.y), B(p.z - q.z)];
const dot = (a: V, b: V): bigint => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V, b: V): V => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const isZero = (v: V): boolean => v[0] === 0n && v[1] === 0n && v[2] === 0n;
/** 最近整数（四舍五入到格点；精确）：round(num / den)，den > 0。 */
export const roundDiv = (num: bigint, den: bigint): bigint => floorDiv(2n * num + den, 2n * den);

/** |p − q|² ≤ r²。 */
export function withinR(p: IPt3, q: IPt3, r: number): boolean { const w = sub(p, q); return dot(w, w) <= B(r) * B(r); }
export const distSq = (p: IPt3, q: IPt3): bigint => { const w = sub(p, q); return dot(w, w); };

/** 包围盒预筛（整数 number，精确；BigInt 只给过了预筛的少数）：点离段的包围盒 > r 就不可能 ≤ r。 */
const outsideBox = (p: IPt3, a: IPt3, b: IPt3, r: number): boolean =>
  p.x < Math.min(a.x, b.x) - r || p.x > Math.max(a.x, b.x) + r || p.y < Math.min(a.y, b.y) - r || p.y > Math.max(a.y, b.y) + r || p.z < Math.min(a.z, b.z) - r || p.z > Math.max(a.z, b.z) + r;
const boxesApart = (a1: IPt3, a2: IPt3, b1: IPt3, b2: IPt3, r: number): boolean =>
  Math.max(a1.x, a2.x) + r < Math.min(b1.x, b2.x) || Math.max(b1.x, b2.x) + r < Math.min(a1.x, a2.x) ||
  Math.max(a1.y, a2.y) + r < Math.min(b1.y, b2.y) || Math.max(b1.y, b2.y) + r < Math.min(a1.y, a2.y) ||
  Math.max(a1.z, a2.z) + r < Math.min(b1.z, b2.z) || Math.max(b1.z, b2.z) + r < Math.min(a1.z, a2.z);

/** 点到闭线段 [a,b] 的距离² ≤ r²（精确）。 */
export function pointNearSegment(p: IPt3, a: IPt3, b: IPt3, r: number): boolean {
  if (outsideBox(p, a, b, r)) return false;
  const d = sub(b, a), w = sub(p, a), r2 = B(r) * B(r);
  const dd = dot(d, d);
  if (dd === 0n) return dot(w, w) <= r2;
  const wd = dot(w, d);
  if (wd <= 0n) return dot(w, w) <= r2;
  if (wd >= dd) return distSq(p, b) <= r2;
  return dot(w, w) * dd - wd * wd <= r2 * dd;
}
/** 点「骑」在线段内部：离段 ≤ r，且沿段的投影离两端都 ≥ r（贴着端点的归合并，不归切）。 */
export function pointRidesInterior(p: IPt3, a: IPt3, b: IPt3, r: number): boolean {
  if (outsideBox(p, a, b, r)) return false;
  const d = sub(b, a), w = sub(p, a), rb = B(r), r2 = rb * rb;
  const dd = dot(d, d);
  if (dd <= 4n * r2) return false;   // 段长 ≤ 2r：没有「内部」
  const wd = dot(w, d);
  if (wd <= 0n || wd >= dd) return false;
  if (wd * wd < r2 * dd) return false;                       // 离 a 端沿段 < r
  const vd = dd - wd; if (vd * vd < r2 * dd) return false;   // 离 b 端沿段 < r
  return dot(w, w) * dd - wd * wd <= r2 * dd;
}

export type SegSegKind = "none" | "cross" | "near" | "overlap";
/**
 * 两段关系（a1≠a2、b1≠b2）：
 *   cross   = 精确共面且在两段内部 / 端点处相交 → 交点（格点舍入）；
 *   near    = 斜交但公垂线 ≤ r 且垂足都在段上 → A 上的垂足（格点舍入；之后 B 靠「骑边」规则穿过它）；
 *   overlap = 共线重叠 → 重叠区两端（都是某段的端点，精确）；
 *   none    = 其余（含平行不共线：留给骑边规则）。
 */
const NONE: { kind: SegSegKind; points: IPt3[] } = { kind: "none", points: [] };
export function segSeg3Exact(a1: IPt3, a2: IPt3, b1: IPt3, b2: IPt3, r: number): { kind: SegSegKind; points: IPt3[] } {
  if (boxesApart(a1, a2, b1, b2, r)) return NONE;
  const d1 = sub(a2, a1), d2 = sub(b2, b1), n = cross(d1, d2);
  if (isZero(n)) {
    const w = sub(b1, a1);
    if (!isZero(cross(w, d1))) return { kind: "none", points: [] };   // 平行不共线
    const dd = dot(d1, d1);
    const t = (p: IPt3): bigint => dot(sub(p, a1), d1);   // 参数 × dd
    let lo = t(b1), hi = t(b2); if (lo > hi) [lo, hi] = [hi, lo];
    const L = lo > 0n ? lo : 0n, H = hi < dd ? hi : dd;
    if (H < L) return { kind: "none", points: [] };
    const at = (tv: bigint): IPt3 => (tv === 0n ? a1 : tv === dd ? a2 : tv === t(b1) ? b1 : b2);   // 重叠区端点必是某段端点
    return { kind: "overlap", points: H === L ? [at(L)] : [at(L), at(H)] };
  }
  const w = sub(b1, a1), nn = dot(n, n), wn = dot(w, n);
  const rb = B(r);
  if (wn * wn > rb * rb * nn) return { kind: "none", points: [] };   // 公垂线 > r
  const sN = dot(cross(w, d2), n), tN = dot(cross(w, d1), n);        // s = sN / nn（A 上）、t = tN / nn（B 上），nn > 0
  if (sN < 0n || sN > nn || tN < 0n || tN > nn) return { kind: "none", points: [] };
  const p: IPt3 = { x: Number(B(a1.x) + roundDiv(sN * d1[0], nn)), y: Number(B(a1.y) + roundDiv(sN * d1[1], nn)), z: Number(B(a1.z) + roundDiv(sN * d1[2], nn)) };
  return { kind: wn === 0n ? "cross" : "near", points: [p] };
}
