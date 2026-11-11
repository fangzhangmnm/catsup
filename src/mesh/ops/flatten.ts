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
 * 一圈点自己的朝向 = 最贴合它们的那个平面的法向（最小二乘：协方差矩阵最小特征值那个方向）。
 * 解法：协方差矩阵的伴随阵 adj(C) 和 C 同一组特征向量、特征值是另两个的乘积，所以 C 最小的那个在 adj(C) 里最大——
 * 拿 adj(C) 行列式最大的那一行当起点（点几乎共面时它已经就是答案），再用 adj(C) 乘、每遍归一（= 反幂迭代，不用求逆），收敛为止、最多 FIT_ITERS 遍。
 * adj(C) 半正定，乘的过程中方向不会来回翻。两个最小的特征值几乎一样大时（点云不扁）收敛慢、本来也没有唯一的面，用到上限那一遍。
 * 不用周围面的法向平均：套在胳膊上的一圈点，周围的面朝四面八方，平均下来几乎是零；最贴合平面的法向正好是胳膊的方向。
 * 少于 3 个点 / 几乎共线（贴合平面不唯一）= null。方向的正负不管（压平和正负无关）。
 * （白模 W-5 补丁，2026-11-10：以前只取那一行、没有迭代——点不在一个平面上时会偏，Fable 审出来的。）
 */
export const FIT_ITERS = 64;
export function bestFitNormal(pts: readonly Pt3[]): Pt3 | null {
  if (pts.length < 3) return null;
  let cx = 0, cy = 0, cz = 0;
  for (const p of pts) { cx += p.x; cy += p.y; cz += p.z; }
  cx /= pts.length; cy /= pts.length; cz /= pts.length;
  let xx = 0, xy = 0, xz = 0, yy = 0, yz = 0, zz = 0;
  for (const p of pts) { const x = p.x - cx, y = p.y - cy, z = p.z - cz; xx += x * x; xy += x * y; xz += x * z; yy += y * y; yz += y * z; zz += z * z; }
  // 伴随阵（对称）：对角 dx dy dz，非对角 a = (x,y)、b = (x,z)、c = (y,z)
  const dx = yy * zz - yz * yz, dy = xx * zz - xz * xz, dz = xx * yy - xy * xy, big = Math.max(dx, dy, dz), tr = xx + yy + zz;
  if (!(big > 1e-12 * tr * tr)) return null;   // 共线 / 全叠在一起：两个方向都没有展开
  const a = xz * yz - xy * zz, b = xy * yz - xz * yy, c = xy * xz - yz * xx;
  const unit = (v: Pt3): Pt3 | null => { const L = len3(v); return L > 0 && Number.isFinite(L) ? scale3(v, 1 / L) : null; };
  let n = unit(big === dx ? { x: dx, y: a, z: b } : big === dy ? { x: a, y: dy, z: c } : { x: b, y: c, z: dz });
  for (let i = 0; n && i < FIT_ITERS; i++) {
    const m = unit({ x: dx * n.x + a * n.y + b * n.z, y: a * n.x + dy * n.y + c * n.z, z: b * n.x + c * n.y + dz * n.z });
    if (!m) break;
    const moved = Math.abs(m.x - n.x) + Math.abs(m.y - n.y) + Math.abs(m.z - n.z);
    n = m;
    if (moved < 1e-15) break;
  }
  return n;
}

/** 压平：每个点沿 axis 压到过 pivot 的平面上（= scaleAlong 缩到 0）。只回会动的点（正好在那个平面上的不动；差一点点的也压——镜像面要正好是零）。 */
export function flattenMoves(pts: ReadonlyMap<number, Pt3>, pivot: Pt3, axis: Pt3): { v: number; to: Pt3 }[] {
  const out: { v: number; to: Pt3 }[] = [];
  for (const [v, p] of pts) { if (dot3(sub3(p, pivot), axis) === 0) continue; out.push({ v, to: scaleAlong(p, pivot, axis, 0) }); }
  return out;
}
