// weld.ts —— 焊接（B19，SU Weld Edges；user 2026-10-24「断是永久的，不自愈 同意，weld进wishlist」「weld现在满需要的」）。
// 纯函数 planWeld：选中的边（所属曲线整条连坐）→ 一条有序链（无分叉、连通；闭合或开口）+ 该登记成什么曲线：
//   全是同一圆参数的弧 → 弧 / 圆（闭合）；点都在一个圆上、每段等长 → 也认成弧 / 圆（fitCircle，2026-10-26）；否则折线曲线（逻辑上一条边：选 / 擦 / 高亮当整体）。失败 → 人话原因。
// created 2026-10-24 by Claude Fable 5.1
import type { Kernel } from "./kernel.ts";
import type { CurveId, CurveSpec } from "./curves.ts";
import type { EdgeId, VertexId } from "./kernel.ts";
import { COPLANAR_TOL_DEFAULT, type Pt3, add3, cross3, dist3, dot3, normalize3, planeOfRing, scale3, sub3 } from "./geom.ts";

export interface WeldPlan { edges: EdgeId[]; closed: boolean; spec: CurveSpec; curves: CurveId[] }

export function planWeld(k: Kernel, ids: readonly EdgeId[]): WeldPlan | string {
  const g = k.graph;
  const set = new Set<EdgeId>(), curves = new Set<CurveId>();
  for (const id of ids) {
    if (!g.hasEdge(id)) continue;
    const cid = k.curveOf(id);
    if (cid !== undefined) { curves.add(cid); for (const e of k.curveById(cid)!.edges) if (g.hasEdge(e)) set.add(e); }
    else set.add(id);
  }
  if (set.size < 2) return "焊接：至少选两条边（或一条边 + 一条曲线）";
  const adj = new Map<VertexId, EdgeId[]>();
  for (const e of set) { const E = g.edge(e); for (const v of [E.a, E.b]) (adj.get(v) ?? adj.set(v, []).get(v)!).push(e); }
  for (const es of adj.values()) if (es.length > 2) return "焊接：有分叉，只能焊一条链";
  const ends = [...adj.entries()].filter(([, es]) => es.length === 1).map(([v]) => v);
  if (ends.length !== 0 && ends.length !== 2) return "焊接：选中的边不是一条链";
  const closed = ends.length === 0;
  const start: VertexId = closed ? g.edge([...set][0]).a : ends[0];
  const ordered: EdgeId[] = []; const seen = new Set<EdgeId>(); let cur = start;
  for (;;) {
    const next = (adj.get(cur) ?? []).find((e) => !seen.has(e));
    if (next === undefined) break;
    seen.add(next); ordered.push(next);
    const E = g.edge(next); cur = E.a === cur ? E.b : E.a;
    if (closed && cur === start) break;
  }
  if (ordered.length !== set.size) return "焊接：选中的边不连通";
  let spec: CurveSpec = { kind: "polyline", closed };
  const cs = [...curves].map((id) => k.curveById(id)!);
  const allCovered = [...set].every((e) => k.curveOf(e) !== undefined);
  if (allCovered && cs.length && cs.every((c) => c.params && (c.kind === "arc" || c.kind === "circle"))) {
    const p0 = cs[0].params!;
    const same = cs.every((c) => { const p = c.params!; return dist3(p.center, p0.center) < 1e-6 && Math.abs(p.radius - p0.radius) < 1e-6 && Math.abs(Math.abs(dot3(p.normal, p0.normal)) - 1) < 1e-6; });
    if (same) spec = { kind: closed ? "circle" : "arc", closed, params: { center: { ...p0.center }, radius: p0.radius, normal: { ...p0.normal }, xaxis: normalize3(sub3(g.pt(start), p0.center)), segments: p0.segments } };
  }
  if (spec.kind === "polyline") spec = fitCircle(g, start, ordered, closed) ?? spec;
  return { edges: ordered, closed, spec, curves: [...curves] };
}

/**
 * 认回圆（user 10-26「焊边橡皮为什么没把多边形变成圆弧」→「自动认回圆和弧同意」）：链至少 3 段、所有点在一张平面上（τ 内）、到同一个圆心等距（τ 内）、
 * 每段等长（2τ 内）→ 圆（闭合）/ 圆弧（开），带圆心、半径、法向、起点方向、段数——和画圆 / 画弧工具登记的同一种参数（圆心吸附、偏移、推拉都认）。
 * 不满足（不在圆上、段长不一）→ null，照旧是折线。
 */
function fitCircle(g: Kernel["graph"], start: VertexId, ordered: readonly EdgeId[], closed: boolean): CurveSpec | null {
  if (ordered.length < 3) return null;
  const pts: Pt3[] = [g.pt(start)];
  let cur = start;
  for (const e of ordered) { const E = g.edge(e); cur = E.a === cur ? E.b : E.a; pts.push(g.pt(cur)); }
  if (closed) pts.pop();
  const tol = COPLANAR_TOL_DEFAULT;
  const plane = planeOfRing(pts);
  if (!plane || pts.some((p) => Math.abs(dot3(plane.n, p) - plane.d) > tol)) return null;
  // 圆心 = 三点（起点 / 中间 / 末点，闭合取三等分）的外心
  const n = pts.length, A = pts[0], B = pts[Math.floor(n / (closed ? 3 : 2))], C = pts[closed ? Math.floor((2 * n) / 3) : n - 1];
  const ab = sub3(B, A), ac = sub3(C, A), w = cross3(ab, ac), ww = dot3(w, w);
  if (ww < 1e-24) return null;
  const c = add3(A, scale3(add3(scale3(cross3(w, ab), dot3(ac, ac)), scale3(cross3(ac, w), dot3(ab, ab))), 1 / (2 * ww)));
  const r = dist3(A, c);
  if (!(r > tol) || pts.some((p) => Math.abs(dist3(p, c) - r) > tol)) return null;
  const segs = (closed ? pts.map((p, i) => dist3(p, pts[(i + 1) % n])) : pts.slice(1).map((p, i) => dist3(p, pts[i])));
  if (Math.max(...segs) - Math.min(...segs) > 2 * tol) return null;
  return { kind: closed ? "circle" : "arc", closed, params: { center: c, radius: r, normal: plane.n, xaxis: normalize3(sub3(A, c)), segments: ordered.length } };
}
