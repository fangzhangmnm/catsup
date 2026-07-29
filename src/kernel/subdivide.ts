// subdivide.ts —— sticky 插入 + 打交点切边（公理 4 "dividing" 的算法本体：
// 「dividing 不是独立功能，是 face-finding 预处理阶段的副产品」drill L239）。
// 交点检测当前是 all-pairs 扫（每次插入 O(n)）——**Bentley–Ottmann 的换入点就在本文件**，
// 接口不变；M1 规模下 all-pairs 足够，先把行为钉死在测试里。
//
// created / retraced 的语义边界（face-lifecycle 的 BIRTH 靠它裁决）：
//   created  = 沿画线方向新生的边          —— 是手势边
//   retraced = 画线与既有边重合的段        —— 是手势边（retrace 空环生膜的依据）
//   既有边被交点切开产生的子边           —— **不是**手势边（T 触碰空环不许生膜）

import { type Pt, dist, pointOnSegment, ptKey, quantize, samePt, segIntersections } from "./geom.ts";
import { type EdgeId, PlanarGraph } from "./topology.ts";

export interface InsertResult {
  created: EdgeId[];
  retraced: EdgeId[];
}

/**
 * 把线段 [aIn,bIn] sticky 地插入平面图：
 * 与既有边的交点处双方都切开；与既有边共线重叠的段去重成同一条边（重合即同一）。
 * onSplit：既有边被切开时回调（调用方用它维护手势边集等跨切割身份）。
 */
export function insertSegment(
  g: PlanarGraph,
  aIn: Pt,
  bIn: Pt,
  onSplit?: (parent: EdgeId, child1: EdgeId, child2: EdgeId) => void,
): InsertResult {
  const a = quantize(aIn), b = quantize(bIn);
  if (samePt(a, b)) return { created: [], retraced: [] };
  const lenAB = dist(a, b);
  const tOf = (p: Pt): number => ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / (lenAB * lenAB);

  // 1. 收集切割点：新段自身端点 + 与全部既有边的交点/重叠端点 + 落在新段上的既有顶点
  const cutByKey = new Map<string, Pt>();
  const addCut = (p: Pt): void => { cutByKey.set(ptKey(p), p); };
  addCut(a); addCut(b);

  const pendingSplits = new Map<EdgeId, Pt[]>(); // 既有边 → 待切点（边内部）
  for (const e of g.edges()) {
    const pa = g.pt(e.a), pb = g.pt(e.b);
    const hits = segIntersections(a, b, pa, pb);
    for (const p of hits) {
      addCut(p);
      if (!samePt(p, pa) && !samePt(p, pb)) {
        const list = pendingSplits.get(e.id) ?? [];
        list.push(p);
        pendingSplits.set(e.id, list);
      }
    }
  }
  for (const v of g.vertices()) {
    const p = { x: v.x, y: v.y };
    if (pointOnSegment(p, a, b)) addCut(p);
  }

  // 2. 切开既有边。每条边的切点来自单次 segIntersections（至多 2 个、互异、都在内部）；
  //    按离该边 a 端的距离排序依次切，后一刀落在前一刀的 e2 半边里。
  for (const [eid, points] of pendingSplits) {
    const ea = g.pt(g.edge(eid).a);
    points.sort((p, q) => dist(ea, p) - dist(ea, q));
    let target = eid;
    for (const p of points) {
      const { e1, e2 } = g.splitEdge(target, p);
      onSplit?.(target, e1, e2);
      target = e2;
    }
  }

  // 3. 沿新段按参数序连相邻切点：既有边 = retraced，新边 = created
  const cuts = [...cutByKey.values()].sort((p, q) => tOf(p) - tOf(q));
  const created: EdgeId[] = [];
  const retraced: EdgeId[] = [];
  for (let i = 0; i + 1 < cuts.length; i++) {
    const p1 = cuts[i], p2 = cuts[i + 1];
    if (samePt(p1, p2)) continue;
    const v1 = g.ensureVertex(p1), v2 = g.ensureVertex(p2);
    if (v1 === v2) continue;
    const existing = g.edgeBetween(v1, v2);
    if (existing !== undefined) retraced.push(existing);
    else created.push(g.addEdge(v1, v2));
  }
  return { created, retraced };
}
