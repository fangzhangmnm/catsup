// weld.ts —— 焊接（B19，SU Weld Edges；user 2026-10-24「断是永久的，不自愈 同意，weld进wishlist」「weld现在满需要的」）。
// 纯函数 planWeld：选中的边（所属曲线整条连坐）→ 一条有序链（无分叉、连通；闭合或开口）+ 该登记成什么曲线：
//   全是同一圆参数的弧 → 弧 / 圆（闭合）；否则折线曲线（逻辑上一条边：选 / 擦 / 高亮当整体）。失败 → 人话原因。
// created 2026-10-24 by Claude Fable 5.1
import type { Kernel } from "./kernel.ts";
import type { CurveId, CurveSpec } from "./curves.ts";
import type { EdgeId, VertexId } from "./kernel.ts";
import { dist3, dot3, normalize3, sub3 } from "./geom.ts";

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
  return { edges: ordered, closed, spec, curves: [...curves] };
}
