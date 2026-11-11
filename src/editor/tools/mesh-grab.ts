// tools/mesh-grab.ts —— 抓住的点 P0（白模 W-13，2026-11-11 Claude Opus 5.5；自由建模的移动 / 挤出共用，算式在 controller/lock-drag.ts）。
// 按下时光标底下那个元素，如果它在要动的这些点里：点 = 它的位置；边 = 边上离按下射线最近的点；面 = 按下射线和这张面（显示用的那套三角形）的交点。
// 都不是（按在空处 / 按在别的东西上）= null：调用方用原来的参考点（按下射线和「过轴心、垂直视线的平面」的交点）。世界坐标。
import type { Pt3 } from "../../kernel/geom.ts";
import { applyPt } from "../../scene/xform.ts";
import type { ToolCtx } from "../tool-handler.ts";

export function grabPointOn(ctx: ToolCtx, sx: number, sy: number, moving: ReadonlySet<number>): Pt3 | null {
  const view = ctx.live(), c = ctx.classify(view, ctx.pick(sx, sy));
  if (c.kind !== "entity") return null;
  const m = ctx.mesh(), X = ctx.ctxXform(), W = (v: number): Pt3 => applyPt(X, m.pt(v)), ray = ctx.frame().ray(sx, sy, ctx.vp()), h = c.local;
  if (h.vertex !== undefined) return moving.has(h.vertex) ? W(h.vertex) : null;
  if (h.edge !== undefined) {
    if (!m.hasE(h.edge) || !moving.has(m.edgeA[h.edge]) || !moving.has(m.edgeB[h.edge])) return null;
    const a = W(m.edgeA[h.edge]), b = W(m.edgeB[h.edge]), u = { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z }, r = ray.dir, w0 = { x: a.x - ray.origin.x, y: a.y - ray.origin.y, z: a.z - ray.origin.z };
    const uu = u.x * u.x + u.y * u.y + u.z * u.z, ur = u.x * r.x + u.y * r.y + u.z * r.z, rr = r.x * r.x + r.y * r.y + r.z * r.z, uw = u.x * w0.x + u.y * w0.y + u.z * w0.z, rw = r.x * w0.x + r.y * w0.y + r.z * w0.z, den = uu * rr - ur * ur;
    const s = den > 1e-18 ? Math.min(1, Math.max(0, (ur * rw - rr * uw) / den)) : 0;   // 线段上离射线最近的参数
    return { x: a.x + u.x * s, y: a.y + u.y * s, z: a.z + u.z * s };
  }
  if (h.face !== undefined) {
    if (!m.hasF(h.face)) return null;
    const ring = m.faceVerts(h.face);
    if (!ring.every((v) => moving.has(v))) return null;
    let best: Pt3 | null = null, bt = Infinity;
    for (const [i, j, k] of m.faceTriangles(h.face)) {   // Möller–Trumbore（两面都算）
      const p0 = W(ring[i]), p1 = W(ring[j]), p2 = W(ring[k]), d = ray.dir, o = ray.origin;
      const e1 = { x: p1.x - p0.x, y: p1.y - p0.y, z: p1.z - p0.z }, e2 = { x: p2.x - p0.x, y: p2.y - p0.y, z: p2.z - p0.z };
      const p = { x: d.y * e2.z - d.z * e2.y, y: d.z * e2.x - d.x * e2.z, z: d.x * e2.y - d.y * e2.x }, det = e1.x * p.x + e1.y * p.y + e1.z * p.z;
      if (Math.abs(det) < 1e-18) continue;
      const s = { x: o.x - p0.x, y: o.y - p0.y, z: o.z - p0.z }, uu = (s.x * p.x + s.y * p.y + s.z * p.z) / det;
      if (uu < -1e-9 || uu > 1 + 1e-9) continue;
      const q = { x: s.y * e1.z - s.z * e1.y, y: s.z * e1.x - s.x * e1.z, z: s.x * e1.y - s.y * e1.x }, vv = (d.x * q.x + d.y * q.y + d.z * q.z) / det;
      if (vv < -1e-9 || uu + vv > 1 + 1e-9) continue;
      const t = (e2.x * q.x + e2.y * q.y + e2.z * q.z) / det;
      if (t > 0 && t < bt) { bt = t; best = { x: o.x + d.x * t, y: o.y + d.y * t, z: o.z + d.z * t }; }
    }
    return best;
  }
  return null;
}
