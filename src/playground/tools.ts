// tools.ts —— 工具动词的纯逻辑层（DOM-free，node 可测）；main.ts 只做指针事件接线。
// 验收①在工具层的体现：rectSegments 只产出线段，Rect = kernel.addEdges(4 段)，
// 全链路无任何 Face 构造。

import type { Edge, EdgeId, Face, FaceId, Kernel, Pt, Pt3, VertexId } from "../kernel/kernel.ts";
import { liftFromPlane, projectToPlane, type PlaneParams } from "../kernel/geom.ts";

/** Rect 工具（任意平面版）：对角两点（须在平面上）→ 4 条边。退化 → []。 */
export function rectSegmentsOnPlane(
  plane: PlaneParams,
  basis: { u: Pt3; v: Pt3 },
  a3: Pt3,
  b3: Pt3,
): [Pt3, Pt3][] {
  const a = projectToPlane(a3, basis), b = projectToPlane(b3, basis);
  if (Math.abs(a.x - b.x) < 1e-9 || Math.abs(a.y - b.y) < 1e-9) return [];
  const c = (x: number, y: number): Pt3 => liftFromPlane({ x, y }, plane, basis);
  const p1 = c(a.x, a.y), p2 = c(b.x, a.y), p3 = c(b.x, b.y), p4 = c(a.x, b.y);
  return [[p1, p2], [p2, p3], [p3, p4], [p4, p1]];
}

/** Rect 工具（2D/俯视版，测试与验收①沿用）：对角两点 → 4 条边（轴对齐）。退化 → []。 */
export function rectSegments(a: Pt, b: Pt): [Pt, Pt][] {
  if (Math.abs(a.x - b.x) < 1e-9 || Math.abs(a.y - b.y) < 1e-9) return [];
  const p1 = { x: a.x, y: a.y }, p2 = { x: b.x, y: a.y }, p3 = { x: b.x, y: b.y }, p4 = { x: a.x, y: b.y };
  return [[p1, p2], [p2, p3], [p3, p4], [p4, p1]];
}

export interface Marquee { minX: number; minY: number; maxX: number; maxY: number; }
export function marqueeOf(a: Pt, b: Pt): Marquee {
  return { minX: Math.min(a.x, b.x), minY: Math.min(a.y, b.y), maxX: Math.max(a.x, b.x), maxY: Math.max(a.y, b.y) };
}

export interface Selection { edges: Set<EdgeId>; faces: Set<FaceId>; }
export const emptySelection = (): Selection => ({ edges: new Set(), faces: new Set() });

/** 移动工具的目标展开：顶点→自己；边→两端点；面→外环+洞环全部顶点。 */
export function moveTargets(k: Kernel, hit: { vertex?: VertexId; edge?: EdgeId; face?: FaceId }): VertexId[] {
  if (hit.vertex !== undefined) return [hit.vertex];
  if (hit.edge !== undefined) {
    const e = k.graph.edge(hit.edge);
    return [e.a, e.b];
  }
  if (hit.face !== undefined) {
    const f = k.face(hit.face);
    if (!f) return [];
    const ids = new Set<VertexId>();
    for (const ring of [f.outer, ...f.holes]) {
      for (const d of ring.edges) {
        const e = k.graph.edge(d.edge);
        ids.add(e.a); ids.add(e.b);
      }
    }
    return [...ids];
  }
  return [];
}

/** 批量平移：目标顶点集整体位移 delta（moveVertices 一批收口；z 缺省 0）。 */
export function translateMoves(
  k: Kernel,
  vids: readonly VertexId[],
  delta: { x: number; y: number; z?: number },
): { id: VertexId; to: { x: number; y: number; z: number } }[] {
  return vids
    .filter((id) => k.graph.hasVertex(id))
    .map((id) => {
      const p = k.graph.pt(id);
      return { id, to: { x: p.x + delta.x, y: p.y + delta.y, z: p.z + (delta.z ?? 0) } };
    });
}

/** 类型 re-export 便利（main.ts 少一层 import）。 */
export type { Edge, Face };
