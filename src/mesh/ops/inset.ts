// mesh/ops/inset.ts —— 插入（面内插一圈，Blender I 的「各自」档）。created 2026-10-27 by Claude Opus 5.5
// 每张面各自：环上的点复制一份、往面里收 dist（等宽：沿两条邻边内法线的角平分线走 dist / cos(半角)，尖角限长）、面改指向新环、新旧环之间长一圈四边形（= extrudeFaces 单面挤出、再把新点挪进面里）。
// 区域内插（相邻的几张面当一整块、只收外圈）以后做。确定性：按面 id 升序、只读内核。
import type { Pt3 } from "../../kernel/geom.ts";
import { MeshKernel } from "../mesh-kernel.ts";
import { extrudeFaces, type ExtrudeResult } from "./extrude.ts";

const sub = (a: Pt3, b: Pt3): Pt3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const add = (a: Pt3, b: Pt3): Pt3 => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
const mul = (a: Pt3, s: number): Pt3 => ({ x: a.x * s, y: a.y * s, z: a.z * s });
const dot = (a: Pt3, b: Pt3): number => a.x * b.x + a.y * b.y + a.z * b.z;
const cross = (a: Pt3, b: Pt3): Pt3 => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x });
const unit = (a: Pt3): Pt3 | null => { const L = Math.hypot(a.x, a.y, a.z); return L > 1e-12 ? mul(a, 1 / L) : null; };

/** 一张面（环 P、法向 n）往里收 dist 之后的环（等宽；尖角处限长 4×dist）。 */
export function insetRing(P: readonly Pt3[], n: Pt3, dist: number): Pt3[] {
  const N = P.length;
  return P.map((p1, i) => {
    const p0 = P[(i - 1 + N) % N], p2 = P[(i + 1) % N];
    const e1 = unit(sub(p1, p0)), e2 = unit(sub(p2, p1));
    if (!e1 || !e2) return p1;
    const in1 = unit(cross(n, e1)) ?? { x: 0, y: 0, z: 0 }, in2 = unit(cross(n, e2)) ?? in1;   // 绕 +n 逆时针的环：n × 边方向 = 指向面内
    const b = unit(add(in1, in2)) ?? in1, c = dot(b, in1);
    return add(p1, mul(b, dist / Math.max(c, 0.25)));
  });
}
/** 这张面最多能收多少（形心到各边所在直线的最短距离 × 0.98；再收环会自交）。 */
export function maxInset(P: readonly Pt3[], n: Pt3): number {
  let cx = 0, cy = 0, cz = 0;
  for (const p of P) { cx += p.x; cy += p.y; cz += p.z; }
  const c = { x: cx / P.length, y: cy / P.length, z: cz / P.length };
  let best = Infinity;
  for (let i = 0; i < P.length; i++) {
    const a = P[i], e = unit(sub(P[(i + 1) % P.length], a));
    if (!e) continue;
    const inward = unit(cross(n, e));
    if (inward) best = Math.min(best, Math.abs(dot(sub(c, a), inward)));
  }
  return Number.isFinite(best) ? best * 0.98 : 0;
}

/** 插入：这些面各自往里插一圈（dist 本地长度；超过这张面的上限就按上限）。返回每张面的挤出结果（新点映射 + 那一圈四边形）。 */
export function insetFaces(k: MeshKernel, fs: readonly number[], dist: number): ExtrudeResult[] {
  const out: ExtrudeResult[] = [];
  for (const f of [...new Set(fs)].filter((x) => k.hasF(x)).sort((a, b) => a - b)) {
    const ring = k.faceVerts(f), P = ring.map((v) => k.pt(v)), n = k.faceNormal(f);
    const d = Math.max(0, Math.min(dist, maxInset(P, n)));
    const target = insetRing(P, n, d);
    const r = extrudeFaces(k, [f]);
    ring.forEach((v, i) => k.setPos(r.newVerts.get(v)!, target[i]));
    out.push(r);
  }
  return out;
}
