// tools/mesh-snap.ts —— 自由建模的吸附目标（点 > 线 > 面）。created 2026-10-30 by Claude Opus 5.5（从 tools/mesh-transform.ts 搬出来：挤出也要吸，user 10-30「7也做」= Shift 只管吸附）。
// 规矩（user 10-27「然后自由建模的吸附就是点（包括原点）-线（包括轴）-面」「shift挪就是开吸附啊，也不一定是点。点>线>面，就是控制吸附开关」）：
// 吸附开不开 = 工具算（ctx.snapBase() XOR Shift，stance.ts SNAP_BASE）；这里只回答「光标下吸到哪」。
import type { Pt3 } from "../../kernel/kernel.ts";
import type { SnapKind } from "../solver.ts";
import { add3, cross3, dot3, normalize3, scale3, sub3 } from "../../kernel/geom.ts";
import { applyPt } from "../../scene/xform.ts";
import type { ToolCtx } from "../tool-handler.ts";

/** 吸附目标：光标吸附圈里最近的点（含原点）> 线（边上最近的点、三根轴）> 光标射线打到的面；moving 里的点、连着它们的边 / 面不算。O(网格)，几千面以内每帧零点几毫秒。 */
export function meshSnapTarget(ctx: ToolCtx, s: { x: number; y: number }, moving: { has(v: number): boolean }): { p: Pt3; kind: SnapKind } | null {
  const m = ctx.mesh(), X = ctx.ctxXform(), vp = ctx.vp(), fr = ctx.frame(), R = ctx.snapPx();
  const scr = new Map<number, { x: number; y: number } | null>(), W = new Map<number, Pt3>();
  const w = (v: number): Pt3 => { let p = W.get(v); if (!p) { p = applyPt(X, m.pt(v)); W.set(v, p); } return p; };
  const sp = (v: number): { x: number; y: number } | null => { if (!scr.has(v)) scr.set(v, fr.project?.(w(v), vp) ?? null); return scr.get(v)!; };
  let best: { p: Pt3; kind: SnapKind } | null = null, bd = R;
  for (const v of m.verts()) { if (moving.has(v)) continue; const q = sp(v); if (!q) continue; const d = Math.hypot(q.x - s.x, q.y - s.y); if (d <= bd) { bd = d; best = { p: w(v), kind: "endpoint" }; } }
  const F = ctx.contextFrame(), qo = fr.project?.(F.origin, vp);   // 原点也是「点」（user 10-27「点（包括原点）-线（包括轴）-面」）
  if (qo) { const d = Math.hypot(qo.x - s.x, qo.y - s.y); if (d <= bd) { bd = d; best = { p: F.origin, kind: "origin" }; } }
  if (best) return best;
  { const ray = fr.ray(s.x, s.y, vp);   // 三根轴也是「线」：光标射线离轴线最近的那一点，投到屏幕上在吸附圈里
    for (const [ax, kind] of [[F.x, "axis-x"], [F.y, "axis-y"], [F.z, "axis-z"]] as const) {
      const u = normalize3(ax), w0 = sub3(F.origin, ray.origin), b = dot3(u, ray.dir), cc = dot3(ray.dir, ray.dir), dd = dot3(u, w0), ee = dot3(ray.dir, w0), den = cc - b * b;
      if (den < 1e-9) continue;
      const t = (b * ee - cc * dd) / den, p = add3(F.origin, scale3(u, t)), q = fr.project?.(p, vp);
      if (!q) continue;
      const d = Math.hypot(q.x - s.x, q.y - s.y);
      if (d <= bd) { bd = d; best = { p, kind }; }
    }
  }
  for (const e of m.edges()) {
    const a = m.edgeA[e], b = m.edgeB[e];
    if (moving.has(a) || moving.has(b)) continue;
    const qa = sp(a), qb = sp(b); if (!qa || !qb) continue;
    const ux = qb.x - qa.x, uy = qb.y - qa.y, L2 = ux * ux + uy * uy; if (L2 < 1e-9) continue;
    const u = Math.max(0, Math.min(1, ((s.x - qa.x) * ux + (s.y - qa.y) * uy) / L2)), d = Math.hypot(qa.x + ux * u - s.x, qa.y + uy * u - s.y);
    if (d <= bd) { bd = d; const pa = w(a), pb = w(b); best = { p: add3(pa, scale3(sub3(pb, pa), u)), kind: "on-edge" }; }
  }
  if (best) return best;
  const ray = fr.ray(s.x, s.y, vp), { tris, faceOfTri } = m.triangles();
  let bt = Infinity;
  for (let i = 0; i < faceOfTri.length; i++) {
    const A = tris[3 * i], B = tris[3 * i + 1], C = tris[3 * i + 2];
    if (moving.has(A) || moving.has(B) || moving.has(C) || m.isFaceHidden(faceOfTri[i])) continue;
    const t = rayTri(ray.origin, ray.dir, w(A), w(B), w(C));
    if (t !== null && t < bt) bt = t;
  }
  return Number.isFinite(bt) ? { p: add3(ray.origin, scale3(ray.dir, bt)), kind: "on-face" } : null;
}
/** 射线 × 三角形（Möller–Trumbore）：命中的射线参数（> 0），没中 = null。 */
function rayTri(o: Pt3, d: Pt3, a: Pt3, b: Pt3, c: Pt3): number | null {
  const e1 = sub3(b, a), e2 = sub3(c, a), p = cross3(d, e2), det = dot3(e1, p);
  if (Math.abs(det) < 1e-12) return null;
  const inv = 1 / det, tv = sub3(o, a), u = dot3(tv, p) * inv;
  if (u < 0 || u > 1) return null;
  const q = cross3(tv, e1), v = dot3(d, q) * inv;
  if (v < 0 || u + v > 1) return null;
  const t = dot3(e2, q) * inv;
  return t > 1e-9 ? t : null;
}

