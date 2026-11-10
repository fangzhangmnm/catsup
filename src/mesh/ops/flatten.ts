// mesh/ops/flatten.ts —— 只沿一根轴缩放（缩放手势的锁轴那一档）+ 压平要的两样：一圈点自己的朝向、压平后每个点去哪。
// created 2026-11-10 by Claude Opus 5.5（白模第一批 W-5；user「think about how to implement S X 0 efficiently」）。
// 「压平」= 沿一个方向缩到 0：和缩放手势锁轴时是同一段 scaleAlong（Fable：算法别写第二份）。纯函数，不碰拓扑；提交走 meshMove。
import type { Pt3 } from "../../kernel/geom.ts";
import { add3, dot3, scale3, sub3, len3 } from "../../kernel/geom.ts";

/**
 * 只沿 axis（单位长）以 pivot 为中心缩放 f 倍：p + axis·((p − pivot)·axis·(f − 1))。
 * f = 0 = 压到「过 pivot、垂直 axis」的平面上（Blender S X 0）；f = −1 = 沿这根轴翻过来。
 * 缩放手势（tools/mesh-transform.ts 锁轴那一档）和「压平」（editor/mesh-edits）共用这一段。
 */
export function scaleAlong(p: Pt3, pivot: Pt3, axis: Pt3, f: number): Pt3 {
  return add3(p, scale3(axis, dot3(sub3(p, pivot), axis) * (f - 1)));
}

/**
 * 一圈点自己的朝向 = 最贴合它们的那个平面的法向（最小二乘：协方差矩阵最小特征值那个方向；行列式最大的那一行解出来）。
 * 不用周围面的法向平均：套在胳膊上的一圈点，周围的面朝四面八方，平均下来几乎是零；最贴合平面的法向正好是胳膊的方向。
 * 少于 3 个点 / 几乎共线（贴合平面不唯一）= null。方向的正负不管（压平和正负无关）。
 */
export function bestFitNormal(pts: readonly Pt3[]): Pt3 | null {
  if (pts.length < 3) return null;
  let cx = 0, cy = 0, cz = 0;
  for (const p of pts) { cx += p.x; cy += p.y; cz += p.z; }
  cx /= pts.length; cy /= pts.length; cz /= pts.length;
  let xx = 0, xy = 0, xz = 0, yy = 0, yz = 0, zz = 0;
  for (const p of pts) { const x = p.x - cx, y = p.y - cy, z = p.z - cz; xx += x * x; xy += x * y; xz += x * z; yy += y * y; yz += y * z; zz += z * z; }
  const dx = yy * zz - yz * yz, dy = xx * zz - xz * xz, dz = xx * yy - xy * xy, big = Math.max(dx, dy, dz), tr = xx + yy + zz;
  if (!(big > 1e-12 * tr * tr)) return null;   // 共线 / 全叠在一起：两个方向都没有展开
  const n = big === dx ? { x: dx, y: xz * yz - xy * zz, z: xy * yz - xz * yy }
    : big === dy ? { x: xz * yz - xy * zz, y: dy, z: xy * xz - yz * xx }
    : { x: xy * yz - xz * yy, y: xy * xz - yz * xx, z: dz };
  const L = len3(n);
  return L > 0 ? scale3(n, 1 / L) : null;
}

/** 压平：每个点沿 axis 压到过 pivot 的平面上（= scaleAlong 缩到 0）。只回会动的点（正好在那个平面上的不动；差一点点的也压——镜像面要正好是零）。 */
export function flattenMoves(pts: ReadonlyMap<number, Pt3>, pivot: Pt3, axis: Pt3): { v: number; to: Pt3 }[] {
  const out: { v: number; to: Pt3 }[] = [];
  for (const [v, p] of pts) { if (dot3(sub3(p, pivot), axis) === 0) continue; out.push({ v, to: scaleAlong(p, pivot, axis, 0) }); }
  return out;
}
