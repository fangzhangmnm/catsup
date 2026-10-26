// guide-curves.ts —— 参考圆 / 参考球（圆规 / 球规，纪元账本 DT50）的几何：纯函数（零 DOM，node 直测）。created 2026-10-26 by Claude Opus 5.5
// 求解器（solver.ts）每帧拿它们在光标附近产 0-D 目标：圆上离光标最近的点、圆 × 线 / 边 / 圆、球 ∩ 画图平面那一圈上最近的点、球 × 线 / 边、射线先碰到的球面点。
// 弯的轨迹不进 1-D 合成器（那套只认直线和平面）；这里给的都是点，求解器照常按秩 / 屏距裁决。
import type { Pt3 } from "../kernel/kernel.ts";
import { add3, cross3, dot3, scale3, sub3 } from "../kernel/geom.ts";

/** 「在圆上 / 共面」的容差：相对半径（加一个绝对下限，防 r 很小）。 */
const tolOf = (r: number): number => 1e-6 * Math.max(1, r);
const len3 = (v: Pt3): number => Math.hypot(v.x, v.y, v.z);

/** 射线（光标）离圆最近的那一点：射线和圆所在平面的交点，沿圆心方向推到半径上。射线几乎平行于圆面 / 正对圆心 = null。 */
export function nearestOnCircle(c: Pt3, n: Pt3, r: number, rayO: Pt3, rayD: Pt3): Pt3 | null {
  const den = dot3(rayD, n);
  if (Math.abs(den) < 1e-9) return null;
  const t = dot3(sub3(c, rayO), n) / den;
  const hit = add3(rayO, scale3(rayD, t)), d = sub3(hit, c), dp = sub3(d, scale3(n, dot3(d, n))), L = len3(dp);
  return L > 1e-12 ? add3(c, scale3(dp, r / L)) : null;
}

/** 直线 p + t·dir（dir 单位向量；len 有 = 线段 t ∈ [0, len]）和圆的交点（0–2 个）。 */
export function lineCircle(p: Pt3, dir: Pt3, c: Pt3, n: Pt3, r: number, len?: number): Pt3[] {
  const tol = tolOf(r), inSeg = (t: number): boolean => len === undefined || (t >= -tol && t <= len + tol);
  const dn = dot3(dir, n);
  if (Math.abs(dn) > 1e-9) {   // 穿过圆面：只有穿过点在圆周上才算
    const t = dot3(sub3(c, p), n) / dn, q = add3(p, scale3(dir, t));
    return inSeg(t) && Math.abs(len3(sub3(q, c)) - r) <= tol ? [q] : [];
  }
  if (Math.abs(dot3(sub3(p, c), n)) > tol) return [];   // 平行于圆面但不在圆面里
  const w = sub3(p, c), b = dot3(w, dir), cc = dot3(w, w) - r * r, disc = b * b - cc;
  if (disc < -tol * r) return [];
  const s = Math.sqrt(Math.max(0, disc)), out: Pt3[] = [];
  for (const t of s < 1e-12 ? [-b] : [-b - s, -b + s]) if (inSeg(t)) out.push(add3(p, scale3(dir, t)));
  return out;
}

/** 两个共面的圆的交点（0–2 个）；不共面（法向不平行或不在同一平面）= 空。 */
export function circleCircle(c1: Pt3, n1: Pt3, r1: number, c2: Pt3, n2: Pt3, r2: number): Pt3[] {
  const tol = tolOf(Math.max(r1, r2));
  if (len3(cross3(n1, n2)) > 1e-6 || Math.abs(dot3(sub3(c2, c1), n1)) > tol) return [];
  const d = sub3(c2, c1), D = len3(d);
  if (D < 1e-12 || D > r1 + r2 + tol || D < Math.abs(r1 - r2) - tol) return [];
  const a = (r1 * r1 - r2 * r2 + D * D) / (2 * D), h = Math.sqrt(Math.max(0, r1 * r1 - a * a));
  const ex = scale3(d, 1 / D), ey = cross3(n1, ex), m = add3(c1, scale3(ex, a));
  return h < 1e-12 ? [m] : [add3(m, scale3(ey, h)), sub3(m, scale3(ey, h))];
}

/** 直线 p + t·dir（dir 单位向量；len 有 = 线段）和球的交点（0–2 个）。 */
export function lineSphere(p: Pt3, dir: Pt3, c: Pt3, r: number, len?: number): Pt3[] {
  const tol = tolOf(r), w = sub3(p, c), b = dot3(w, dir), cc = dot3(w, w) - r * r, disc = b * b - cc;
  if (disc < -tol * r) return [];
  const s = Math.sqrt(Math.max(0, disc)), out: Pt3[] = [];
  for (const t of s < 1e-12 ? [-b] : [-b - s, -b + s]) if (len === undefined || (t >= -tol && t <= len + tol)) out.push(add3(p, scale3(dir, t)));
  return out;
}

/** 球被平面 n·x = d（n 单位向量）切出来的那一圈：圆心 / 半径；平面没碰到球 = null。 */
export function spherePlane(c: Pt3, r: number, n: Pt3, d: number): { c: Pt3; r: number } | null {
  const h = dot3(n, c) - d;
  if (Math.abs(h) >= r) return null;
  return { c: sub3(c, scale3(n, h)), r: Math.sqrt(r * r - h * h) };
}

/** 射线最先碰到的球面点（t > 0）；从球里面看（起点在球内）= null（不然永远吸到球的背面）。返回点和射线参数 t。 */
export function raySphereFront(c: Pt3, r: number, rayO: Pt3, rayD: Pt3): { p: Pt3; t: number } | null {
  const w = sub3(rayO, c);
  if (dot3(w, w) <= r * r) return null;
  const b = dot3(w, rayD), cc = dot3(w, w) - r * r, disc = b * b - cc;
  if (disc < 0) return null;
  const t = -b - Math.sqrt(disc);
  return t > 0 ? { p: add3(rayO, scale3(rayD, t)), t } : null;
}
