// guide-pick.ts —— 参考几何的拾取（D18，2026-10-24；user「参考线橡皮擦不掉，以及参考点怎么删」）。纯函数：屏距 ≤ 容差的最近参考点 / 参考线（无限长）。
// 参考点先于参考线（同实体拾取「点 > 边」的口径）；都用本帧度量（桌面 px / VR 度）。created 2026-10-24 by Claude Fable 5.1
import type { Pt3 } from "../kernel/kernel.ts";
import { add3 } from "../kernel/geom.ts";
import type { GuidesWorld } from "../scene/guides.ts";
import type { PointerFrame, Viewport } from "./pointer-frame.ts";

export type GuidePick = { kind: "point" | "line" | "circle" | "sphere"; id: number; d: number };
/** 圆在屏上的折线（拾取 / 画都用这么多段；量纲：段）。 */
export const CIRCLE_SEGS = 72;
/** 圆周上的点：圆心 c、法向 n、半径 r，第 i / segs 圈。 */
export function circlePoints(c: Pt3, n: Pt3, r: number, segs = CIRCLE_SEGS): Pt3[] {
  const a = Math.abs(n.x) < 0.9 ? { x: 1, y: 0, z: 0 } : { x: 0, y: 1, z: 0 };
  const ul = Math.hypot(n.y * a.z - n.z * a.y, n.z * a.x - n.x * a.z, n.x * a.y - n.y * a.x) || 1;
  const u = { x: (n.y * a.z - n.z * a.y) / ul, y: (n.z * a.x - n.x * a.z) / ul, z: (n.x * a.y - n.y * a.x) / ul };
  const v = { x: n.y * u.z - n.z * u.y, y: n.z * u.x - n.x * u.z, z: n.x * u.y - n.y * u.x };
  return Array.from({ length: segs }, (_, i) => { const t = (i / segs) * 2 * Math.PI, cs = Math.cos(t) * r, sn = Math.sin(t) * r; return { x: c.x + u.x * cs + v.x * sn, y: c.y + u.y * cs + v.y * sn, z: c.z + u.z * cs + v.z * sn }; });
}
/** 参考球画成三圈（过球心、分别垂直于 x / y / z）——拾取按离这三圈的屏距。 */
export const SPHERE_RINGS: readonly Pt3[] = [{ x: 0, y: 0, z: 1 }, { x: 0, y: 1, z: 0 }, { x: 1, y: 0, z: 0 }];

export function pickGuide(G: GuidesWorld, pf: PointerFrame, vp: Viewport, sx: number, sy: number, tol: number): GuidePick | null {
  let best: GuidePick | null = null;
  for (const q of G.points) {
    const d = pf.distTo(sx, sy, q.p, vp);
    if (d <= tol && (!best || d < best.d)) best = { kind: "point", id: q.id, d };
  }
  if (best) return best;
  for (const l of G.lines) {
    const d = pf.distToSeg(sx, sy, l.p, add3(l.p, l.dir), vp, true).d;
    if (d <= tol && (!best || d < best.d)) best = { kind: "line", id: l.id, d };
  }
  const ringDist = (pts: Pt3[]): number => { let m = Infinity; for (let i = 0; i < pts.length; i++) m = Math.min(m, pf.distToSeg(sx, sy, pts[i], pts[(i + 1) % pts.length], vp).d); return m; };
  for (const c of G.circles) { const d = ringDist(circlePoints(c.c, c.n, c.r)); if (d <= tol && (!best || d < best.d)) best = { kind: "circle", id: c.id, d }; }
  for (const s of G.spheres) { const d = Math.min(...SPHERE_RINGS.map((n) => ringDist(circlePoints(s.c, n, s.r)))); if (d <= tol && (!best || d < best.d)) best = { kind: "sphere", id: s.id, d }; }
  return best;
}

/** 擦掉 ids 之后的参考几何（预演用：刮过的先从画面上消失）。 */
export function withoutGuides(G: GuidesWorld, ids: ReadonlySet<number>): GuidesWorld {
  return ids.size ? { lines: G.lines.filter((l) => !ids.has(l.id)), points: G.points.filter((q) => !ids.has(q.id)), circles: G.circles.filter((c) => !ids.has(c.id)), spheres: G.spheres.filter((s) => !ids.has(s.id)) } : G;
}
