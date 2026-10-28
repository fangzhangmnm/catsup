// arc-build.ts —— 弧的四种模式（SU 对照，2026-10-24 查档：Arc = 圆心 / 起点 / 角度；2 Point Arc = 弦 + 凸度；3 Point Arc = 起点 / 枢轴 / 终点；Pie = Arc 闭合成扇面）
// 的共同构造：手势量 → 段 + 曲线规格（+ 扇面的两条半径）→ op。工具与数值小窗（applyVcb）共用，改半径 / 角度 / 段数只换数。created 2026-10-24 by Claude Fable 5.1
import type { CurveSpec, Pt3 } from "../kernel/kernel.ts";
import { normalize3, sub3 } from "../kernel/geom.ts";
import type { DrawPlane } from "./pick.ts";
import type { Op } from "./ops.ts";
import type { PoolRef } from "../scene/scene.ts";
import { arcSegmentsOnPlane, centerArcSegments, curveSpecToLocal } from "./tools.ts";

export type ArcMode = "two" | "center" | "three" | "pie";
export const ARC_MODES: readonly { id: ArcMode; label: string; hint: string }[] = [
  { id: "two", label: "两点弧", hint: "起点 → 终点 → 拉凸度" },
  { id: "center", label: "圆心弧", hint: "圆心 → 起点 → 转角度" },
  { id: "three", label: "三点弧", hint: "起点 → 弧上一点 → 终点" },
  { id: "pie", label: "扇形", hint: "圆心 → 起点 → 转角度，两条半径闭合成面" },
];

/** 一个弧手势的量（世界坐标）：two / three 用 a b p；center / pie 用 center a sweep。 */
export interface ArcGesture { mode: ArcMode; plane: DrawPlane; a: Pt3; b?: Pt3; p?: Pt3; center?: Pt3; sweep?: number; segments: number }
export interface BuiltArc { segs: [Pt3, Pt3][]; radii: [Pt3, Pt3][]; spec: CurveSpec; center: Pt3; radius: number; sweep: number; end: Pt3 }

export function buildArc(g: ArcGesture): BuiltArc | null {
  const pl = g.plane.plane, basis = g.plane.basis, n = g.segments;
  if (g.mode === "two" || g.mode === "three") {
    if (!g.b || !g.p) return null;
    const arc = arcSegmentsOnPlane(pl, basis, g.a, g.b, g.p, n);   // 圆过 a、b，弧经过 p（三点弧的枢轴 = p）
    if (!arc) return null;
    return { segs: arc.segs, radii: [], spec: spec(arc.center, arc.radius, pl.n, g.a, n, arc.sweep), center: arc.center, radius: arc.radius, sweep: arc.sweep, end: g.b };
  }
  if (!g.center || g.sweep === undefined) return null;
  const arc = centerArcSegments(pl, basis, g.center, g.a, g.sweep, n);
  if (!arc) return null;
  const radii: [Pt3, Pt3][] = g.mode === "pie" ? [[g.center, g.a], [g.center, arc.end]] : [];
  return { segs: arc.segs, radii, spec: spec(arc.center, arc.radius, pl.n, g.a, n, g.sweep), center: arc.center, radius: arc.radius, sweep: g.sweep, end: arc.end };
}
/** 弧的曲线规格：整圆等效段数 = 本弧段数按扫角放大。 */
function spec(center: Pt3, radius: number, normal: Pt3, a: Pt3, n: number, sweep: number): CurveSpec {
  const full = Math.max(3, Math.round((n * Math.PI * 2) / Math.max(1e-9, Math.abs(sweep))));
  return { kind: "arc", closed: false, params: { center, radius, normal, xaxis: normalize3(sub3(a, center)), segments: full } };
}
/** 落定 op：弧段带曲线规格；扇面另加两条半径（普通边）→ 两个 op 一个 batch（一次撤销）。 */
export function arcOp(toLocal: (p: Pt3) => Pt3, at: PoolRef, built: BuiltArc): Op {
  const arc: Op = { op: "addEdges", at, segs: built.segs.map(([u, v]) => [toLocal(u), toLocal(v)]), curve: curveSpecToLocal(toLocal, built.spec) };
  if (!built.radii.length) return arc;
  return { op: "batch", label: "pie", ops: [arc, { op: "addEdges", at, segs: built.radii.map(([u, v]) => [toLocal(u), toLocal(v)]) }] };
}
