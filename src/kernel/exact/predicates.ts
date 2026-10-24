// exact/predicates.ts —— 精确几何谓词（Shewchuk 1997 的「浮点过滤 + 精确后备」；后备 = BigInt，因为格点坐标 2^31、2D 行列式 2^64 > 2^53）。
// 全部输入是格点整数（exact/lattice.ts）。返回的是**符号**（-1 / 0 / +1）或分类，绝不返回带误差的数。
// 过滤器：差值 (b−a) 等都是精确整数（< 2^32，double 精确表示）；乘积与减法各带一次舍入，误差界按 Shewchuk ccwerrboundA / o3derrboundA。
// 设计稿 ai-docs/20261024-exact-geometry-design.md §2–§3。created 2026-10-24 by Claude Fable 5.1
import type { IPt2, IPt3 } from "./lattice.ts";

const EPS = 2 ** -53;
const CCW_ERR_A = (3 + 16 * EPS) * EPS;        // Shewchuk orient2d 过滤界
const O3D_ERR_A = (7 + 56 * EPS) * EPS;        // Shewchuk orient3d 过滤界
/** 过滤器统计（基准 / 调参用）：fast = 过滤器直接给出符号；slow = 退到 BigInt。 */
export const PRED_STATS = { fast: 0, slow: 0, reset(): void { this.fast = 0; this.slow = 0; } };

const sgnBig = (v: bigint): -1 | 0 | 1 => (v > 0n ? 1 : v < 0n ? -1 : 0);
const sgn = (v: number): -1 | 0 | 1 => (v > 0 ? 1 : v < 0 ? -1 : 0);

/** 2D 定向：c 在有向线 a→b 的左边 +1、右边 −1、共线 0。 */
export function orient2d(a: IPt2, b: IPt2, c: IPt2): -1 | 0 | 1 {
  const acx = a.x - c.x, bcx = b.x - c.x, acy = a.y - c.y, bcy = b.y - c.y;   // 精确整数
  const detleft = acx * bcy, detright = acy * bcx;
  const det = detleft - detright;
  // 同号且都非零时才有机会被过滤（Shewchuk 的 detsum 分支）；异号直接可判
  let detsum: number;
  if (detleft > 0) { if (detright <= 0) { PRED_STATS.fast++; return sgn(det); } detsum = detleft + detright; }
  else if (detleft < 0) { if (detright >= 0) { PRED_STATS.fast++; return sgn(det); } detsum = -detleft - detright; }
  else { PRED_STATS.fast++; return sgn(det); }
  if (Math.abs(det) >= CCW_ERR_A * detsum) { PRED_STATS.fast++; return sgn(det); }
  PRED_STATS.slow++;
  return sgnBig(BigInt(acx) * BigInt(bcy) - BigInt(acy) * BigInt(bcx));
}

/** 3D 定向：d 在 a,b,c 所定平面的哪一侧（右手：+1 = d 在 (b−a)×(c−a) 的正侧），共面 0。 */
export function orient3d(a: IPt3, b: IPt3, c: IPt3, d: IPt3): -1 | 0 | 1 {
  const adx = a.x - d.x, bdx = b.x - d.x, cdx = c.x - d.x;
  const ady = a.y - d.y, bdy = b.y - d.y, cdy = c.y - d.y;
  const adz = a.z - d.z, bdz = b.z - d.z, cdz = c.z - d.z;
  const bdxcdy = bdx * cdy, cdxbdy = cdx * bdy;
  const cdxady = cdx * ady, adxcdy = adx * cdy;
  const adxbdy = adx * bdy, bdxady = bdx * ady;
  const det = adz * (bdxcdy - cdxbdy) + bdz * (cdxady - adxcdy) + cdz * (adxbdy - bdxady);
  const permanent = (Math.abs(bdxcdy) + Math.abs(cdxbdy)) * Math.abs(adz) + (Math.abs(cdxady) + Math.abs(adxcdy)) * Math.abs(bdz) + (Math.abs(adxbdy) + Math.abs(bdxady)) * Math.abs(cdz);
  if (Math.abs(det) > O3D_ERR_A * permanent) { PRED_STATS.fast++; return sgn(det); }
  PRED_STATS.slow++;
  const A = [BigInt(adx), BigInt(ady), BigInt(adz)], B = [BigInt(bdx), BigInt(bdy), BigInt(bdz)], Cc = [BigInt(cdx), BigInt(cdy), BigInt(cdz)];
  const v = A[2] * (B[0] * Cc[1] - Cc[0] * B[1]) + B[2] * (Cc[0] * A[1] - A[0] * Cc[1]) + Cc[2] * (A[0] * B[1] - B[0] * A[1]);
  return sgnBig(v);
}

/** 点 p 是否在闭线段 [a,b] 上（共线 + 包围盒内；精确）。 */
export function onSegment2d(p: IPt2, a: IPt2, b: IPt2): boolean {
  if (orient2d(a, b, p) !== 0) return false;
  return Math.min(a.x, b.x) <= p.x && p.x <= Math.max(a.x, b.x) && Math.min(a.y, b.y) <= p.y && p.y <= Math.max(a.y, b.y);
}

/** 两线段关系（精确，闭线段）。proper = 内部真交；touch = 一端落在对方上（含端点重合）；overlap = 共线且重叠（含只共一个端点的情形归 touch）；none = 不交。 */
export type SegRelation = "none" | "proper" | "touch" | "overlap";
export function segSeg2d(p1: IPt2, p2: IPt2, q1: IPt2, q2: IPt2): SegRelation {
  const d1 = orient2d(q1, q2, p1), d2 = orient2d(q1, q2, p2), d3 = orient2d(p1, p2, q1), d4 = orient2d(p1, p2, q2);
  if (d1 * d2 < 0 && d3 * d4 < 0) return "proper";
  if (d1 === 0 && d2 === 0 && d3 === 0 && d4 === 0) {
    // 共线：按参数区间
    const dx = p2.x - p1.x, dy = p2.y - p1.y;
    const key = Math.abs(dx) >= Math.abs(dy) ? (p: IPt2): number => p.x : (p: IPt2): number => p.y;
    const lo = Math.min(key(p1), key(p2)), hi = Math.max(key(p1), key(p2)), qlo = Math.min(key(q1), key(q2)), qhi = Math.max(key(q1), key(q2));
    if (hi < qlo || qhi < lo) return "none";
    if (hi === qlo || qhi === lo) return "touch";
    return "overlap";
  }
  if ((d1 === 0 && onSegment2d(p1, q1, q2)) || (d2 === 0 && onSegment2d(p2, q1, q2)) || (d3 === 0 && onSegment2d(q1, p1, p2)) || (d4 === 0 && onSegment2d(q2, p1, p2))) return "touch";
  return "none";
}

/**
 * 真交 / 触交的交点（有理数，精确）：p1 + t·(p2−p1)，t = num/den（den > 0 规范化）。只对 segSeg2d ∈ {proper, touch} 且不共线的情形有定义；共线重叠没有单一交点。
 * 返回 BigInt 分子分母（den = cross(p2−p1, q2−q1)）。
 */
export interface Rational { num: bigint; den: bigint; }
export function intersectParam(p1: IPt2, p2: IPt2, q1: IPt2, q2: IPt2): Rational | null {
  const rx = BigInt(p2.x - p1.x), ry = BigInt(p2.y - p1.y), sx = BigInt(q2.x - q1.x), sy = BigInt(q2.y - q1.y);
  const den = rx * sy - ry * sx;
  if (den === 0n) return null;
  const wx = BigInt(q1.x - p1.x), wy = BigInt(q1.y - p1.y);
  const num = wx * sy - wy * sx;   // t = (w × s) / (r × s)
  return den > 0n ? { num, den } : { num: -num, den: -den };
}
/** 有理数比较（den > 0）。 */
export const cmpRational = (a: Rational, b: Rational): -1 | 0 | 1 => sgnBig(a.num * b.den - b.num * a.den);
/** 交点落在哪个像素（边长 P 的格；像素 k 覆盖 [kP, (k+1)P)）：floor 精确。 */
export function intersectionCell(p1: IPt2, p2: IPt2, t: Rational, P: number): IPt2 {
  const PB = BigInt(P);
  const cx = floorDiv(BigInt(p1.x) * t.den + t.num * BigInt(p2.x - p1.x), t.den * PB);
  const cy = floorDiv(BigInt(p1.y) * t.den + t.num * BigInt(p2.y - p1.y), t.den * PB);
  return { x: Number(cx), y: Number(cy) };
}
export function floorDiv(a: bigint, b: bigint): bigint { const q = a / b; return (a % b !== 0n && (a < 0n) !== (b < 0n)) ? q - 1n : q; }
/** 格点所在像素。 */
export const cellOf = (p: IPt2, P: number): IPt2 => ({ x: Math.floor(p.x / P), y: Math.floor(p.y / P) });

/** 线段 [a,b] 是否碰到闭像素 [cx·P,(cx+1)·P]×[cy·P,(cy+1)·P]（精确：包围盒 + 四角定向，Liang–Barsky 的符号版）。 */
export function segHitsCell(a: IPt2, b: IPt2, cell: IPt2, P: number): boolean {
  const x0 = cell.x * P, x1 = x0 + P, y0 = cell.y * P, y1 = y0 + P;
  if (Math.max(a.x, b.x) < x0 || Math.min(a.x, b.x) > x1 || Math.max(a.y, b.y) < y0 || Math.min(a.y, b.y) > y1) return false;
  if (a.x === b.x || a.y === b.y) return true;   // 轴向段：包围盒重叠即碰到
  // 四角分居线两侧（或有角在线上）↔ 直线穿过方块；再加包围盒 = 线段穿过
  const c1 = orient2d(a, b, { x: x0, y: y0 }), c2 = orient2d(a, b, { x: x1, y: y0 }), c3 = orient2d(a, b, { x: x1, y: y1 }), c4 = orient2d(a, b, { x: x0, y: y1 });
  const mn = Math.min(c1, c2, c3, c4), mx = Math.max(c1, c2, c3, c4);
  return mn <= 0 && mx >= 0;
}
