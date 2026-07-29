// inference.ts —— 吸附推断的**平面版第一批标本**（M2 vibe 勘探载体，DOM-free 可 node 测）。
// 定位（验收③的门）：inference 是所有 B/C 类动词的**输入前置层**，不是某工具的内部特性——
// 所以它是独立模块、所有取点动作（画线/矩形/移动）都从这里过；但 engine 系统化是下一个纪元，
// 这里只有最朴素的四种：endpoint > midpoint > on-edge > axis（优先级即列举序）。
// 勘探发现由人类记进 journals/（AI 不写）。

import type { Kernel, Pt, EdgeId, VertexId } from "../kernel/kernel.ts";

export type SnapKind = "endpoint" | "midpoint" | "on-edge" | "axis-x" | "axis-y";

export interface SnapResult {
  pt: Pt;
  kind: SnapKind | null;
  edge?: EdgeId;      // on-edge / midpoint 命中的边
}

/**
 * 取点推断：raw = 光标原始点；anchor = 手势起点（画线第二点/矩形对角/移动目标时非空，
 * 轴向锁定只在有 anchor 时生效）；excludeVid = 移动中被抓顶点（其端点/它自己的边不参与吸附）。
 */
export function inferPoint(
  k: Kernel,
  raw: Pt,
  anchor: Pt | null,
  tol: number,
  excludeVid: VertexId | null = null,
): SnapResult {
  // 1. endpoint
  let bestV: { pt: Pt; d: number } | null = null;
  for (const v of k.vertices()) {
    if (v.id === excludeVid) continue;
    const d = Math.hypot(v.x - raw.x, v.y - raw.y);
    if (d <= tol && (!bestV || d < bestV.d)) bestV = { pt: { x: v.x, y: v.y }, d };
  }
  if (bestV) return { pt: bestV.pt, kind: "endpoint" };

  // 2. midpoint
  let bestM: { pt: Pt; d: number; edge: EdgeId } | null = null;
  for (const e of edgesExcluding(k, excludeVid)) {
    const a = k.graph.pt(e.a), b = k.graph.pt(e.b);
    const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const d = Math.hypot(m.x - raw.x, m.y - raw.y);
    if (d <= tol && (!bestM || d < bestM.d)) bestM = { pt: m, d, edge: e.id };
  }
  if (bestM) return { pt: bestM.pt, kind: "midpoint", edge: bestM.edge };

  // 3. on-edge（投影到最近边）
  let bestE: { pt: Pt; d: number; edge: EdgeId } | null = null;
  for (const e of edgesExcluding(k, excludeVid)) {
    const a = k.graph.pt(e.a), b = k.graph.pt(e.b);
    const p = projectToSegment(raw, a, b);
    const d = Math.hypot(p.x - raw.x, p.y - raw.y);
    if (d <= tol && (!bestE || d < bestE.d)) bestE = { pt: p, d, edge: e.id };
  }
  if (bestE) return { pt: bestE.pt, kind: "on-edge", edge: bestE.edge };

  // 4. axis（相对 anchor 的水平/垂直锁；SU 配色约定 X=红 Y=绿在渲染层）
  if (anchor) {
    const dx = Math.abs(raw.x - anchor.x), dy = Math.abs(raw.y - anchor.y);
    if (dy <= tol && dx > dy) return { pt: { x: raw.x, y: anchor.y }, kind: "axis-x" };
    if (dx <= tol && dy > dx) return { pt: { x: anchor.x, y: raw.y }, kind: "axis-y" };
  }
  return { pt: raw, kind: null };
}

function edgesExcluding(k: Kernel, excludeVid: VertexId | null) {
  const all = k.edges();
  if (excludeVid === null) return all;
  return all.filter((e) => e.a !== excludeVid && e.b !== excludeVid);
}

function projectToSegment(p: Pt, a: Pt, b: Pt): Pt {
  const len2 = (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
  if (len2 === 0) return { x: a.x, y: a.y };
  let t = ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / len2;
  t = Math.max(0, Math.min(1, t));
  return { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) };
}
