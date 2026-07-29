// tools.ts —— 工具动词的纯逻辑层（DOM-free，node 可测）；main.ts 只做指针事件接线。
// 验收①在工具层的体现：rectSegments 只产出线段，Rect = kernel.addEdges(4 段)，
// 全链路无任何 Face 构造。

import type { Edge, EdgeId, Face, FaceId, Kernel, Pt, VertexId } from "../kernel/kernel.ts";

/** Rect 工具：对角两点 → 4 条边（轴对齐）。退化（零宽/零高）→ []。 */
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

/** 框选（window 语义：完全落框内才选中；俯视 x/y——3D 视图的屏幕空间框选在渲染层另做）：
 *  边=两端点都在框内；面=外环全部顶点在框内（用 faceRings3 世界坐标——face 环自己的
 *  pts 是平面基下的 2D，不是世界坐标）。 */
export function marqueePick(k: Kernel, m: Marquee): Selection {
  const inBox = (p: { x: number; y: number }): boolean =>
    p.x >= m.minX && p.x <= m.maxX && p.y >= m.minY && p.y <= m.maxY;
  const sel = emptySelection();
  for (const e of k.edges()) {
    if (inBox(k.graph.pt(e.a)) && inBox(k.graph.pt(e.b))) sel.edges.add(e.id);
  }
  for (const f of k.faces()) {
    const rings = k.faceRings3(f.id);
    if (rings && rings.outer.every(inBox)) sel.faces.add(f.id);
  }
  return sel;
}

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

/** 橡皮刮擦：沿指针轨迹段收集命中的边（去重进 acc）。 */
export function scrubHits(k: Kernel, from: Pt, to: Pt, tol: number, acc: Set<EdgeId>): void {
  const steps = Math.max(1, Math.ceil(Math.hypot(to.x - from.x, to.y - from.y) / (tol > 0 ? tol : 1)));
  for (let i = 0; i <= steps; i++) {
    const p = { x: from.x + ((to.x - from.x) * i) / steps, y: from.y + ((to.y - from.y) * i) / steps };
    const hit = k.hitTest(p, tol);
    if (hit.edge !== undefined) acc.add(hit.edge);
  }
}

/** 类型 re-export 便利（main.ts 少一层 import）。 */
export type { Edge, Face };
