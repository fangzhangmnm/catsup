// subdivide.ts —— sticky 插入 + 打交点切边（公理 4 "dividing" 的算法本体：
// 「dividing 不是独立功能，是 face-finding 预处理阶段的副产品」drill L239）。
// 交点检测当前是 all-pairs 扫（每次插入 O(n)）——**Bentley–Ottmann 的换入点就在本文件**，
// 接口不变；M1 规模下 all-pairs 足够，先把行为钉死在测试里。
//
// created / retraced 的语义边界（face-lifecycle 的 BIRTH 靠它裁决）：
//   created  = 沿画线方向新生的边          —— 是手势边
//   retraced = 画线与既有边重合的段        —— 是手势边（retrace 空环生膜的依据）
//   既有边被交点切开产生的子边           —— **不是**手势边（T 触碰空环不许生膜）

import { type Pt3, Q, dist3, pointOnSegment3, ptKey3, quantize3, samePt3, segIntersections3 } from "./geom.ts";
import { type EdgeId, PlanarGraph } from "./topology.ts";

/**
 * sticky 插入的「碰到」容差 = 量化格（2026-09-07 VR 真机案，edited by Claude Fable 5.1）：
 * 身份是逐轴 Q/2 的格（ptKey3），几何测试原先用 Euclid EPS=Q/2——格的半对角线 0.87Q 比 EPS 大，
 * 于是一条新段能在「离顶点 0.5Q~0.87Q」的带里擦过一个既有顶点而不把它切进来；之后任何切点落进该顶点的格
 * 就 ensureVertex 到它，splitEdge 撞上既有边 → 「边 4-3 已存在」。斜置矩形角点量化后边不精确沿轴，
 * 再沿理想轴向画过头就是这条带（fuzz 50 次内必中）。容差 ≥ 半对角线 = 洞封死：凡可能量化成同一顶点的都当碰到。
 */
export const INSERT_TOL = Q;

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
  aIn: Pt3,
  bIn: Pt3,
  onSplit?: (parent: EdgeId, child1: EdgeId, child2: EdgeId) => void,
): InsertResult {
  const a = quantize3(aIn), b = quantize3(bIn);
  if (samePt3(a, b)) return { created: [], retraced: [] };
  const lenAB = dist3(a, b);
  const tOf = (p: Pt3): number =>
    ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y) + (p.z - a.z) * (b.z - a.z)) / (lenAB * lenAB);

  // 1. 收集切割点：新段自身端点 + 与全部既有边的交点/重叠端点 + 落在新段上的既有顶点
  const cutByKey = new Map<string, Pt3>();
  const addCut = (p: Pt3): void => { cutByKey.set(ptKey3(p), p); };
  addCut(a); addCut(b);

  const pendingSplits = new Map<EdgeId, Pt3[]>(); // 既有边 → 待切点（边内部）
  for (const e of g.edges()) {
    const pa = g.pt(e.a), pb = g.pt(e.b);
    const hits = segIntersections3(a, b, pa, pb, INSERT_TOL);
    for (const p of hits) {
      addCut(p);
      // 切点落在端点的格里 = 就是那个端点（重合即同一），不切
      if (!samePt3(p, pa) && !samePt3(p, pb)) {
        const list = pendingSplits.get(e.id) ?? [];
        list.push(p);
        pendingSplits.set(e.id, list);
      }
    }
  }
  for (const v of g.vertices()) {
    const p = { x: v.x, y: v.y, z: v.z };
    if (pointOnSegment3(p, a, b, INSERT_TOL)) addCut(p);
  }

  // 2. 切开既有边。每条边的切点来自单次 segIntersections（至多 2 个、互异、都在内部）；
  //    按离该边 a 端的距离排序依次切，后一刀落在前一刀的 e2 半边里。
  for (const [eid, points] of pendingSplits) {
    const ea = g.pt(g.edge(eid).a);
    points.sort((p, q) => dist3(ea, p) - dist3(ea, q));
    let target = eid;
    for (const p of points) {
      const te = g.edge(target);
      const at = g.vertexAt(p);
      if (at !== undefined && (at === te.a || at === te.b)) continue;   // 切点已是本边端点：无事
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
    if (samePt3(p1, p2)) continue;
    const v1 = g.ensureVertex(p1), v2 = g.ensureVertex(p2);
    if (v1 === v2) continue;
    const existing = g.edgeBetween(v1, v2);
    if (existing !== undefined) retraced.push(existing);
    else created.push(g.addEdge(v1, v2));
  }
  return { created, retraced };
}
