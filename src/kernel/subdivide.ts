// subdivide.ts —— sticky 插入 + 打交点切边（公理 4 "dividing" 的算法本体：
// 「dividing 不是独立功能，是 face-finding 预处理阶段的副产品」drill L239）。
// 交点检测当前是 all-pairs 扫（每次插入 O(n)）——**Bentley–Ottmann 的换入点就在本文件**，
// 接口不变；M1 规模下 all-pairs 足够，先把行为钉死在测试里。
//
// created / retraced 的语义边界（face-lifecycle 的 BIRTH 靠它裁决）：
//   created  = 沿画线方向新生的边          —— 是手势边
//   retraced = 画线与既有边重合的段        —— 是手势边（retrace 空环生膜的依据）
//   既有边被交点切开产生的子边           —— **不是**手势边（T 触碰空环不许生膜）

import { type Pt3, Q, dist3, ptKey3, quantize3, samePt3 } from "./geom.ts";
import { fromLattice3, toLattice3 } from "./exact/lattice.ts";
import { pointNearSegment, segSeg3Exact } from "./exact/predicates3d.ts";
import { type EdgeId, PlanarGraph } from "./topology.ts";

/**
 * sticky 插入的「碰到」容差 = 量化格（2026-09-07 VR 真机案，edited by Claude Fable 5.1）：
 * 身份是逐轴 Q/2 的格（ptKey3），几何测试原先用 Euclid EPS=Q/2——格的半对角线 0.87Q 比 EPS 大，
 * 于是一条新段能在「离顶点 0.5Q~0.87Q」的带里擦过一个既有顶点而不把它切进来；之后任何切点落进该顶点的格
 * 就 ensureVertex 到它，splitEdge 撞上既有边 → 「边 4-3 已存在」。斜置矩形角点量化后边不精确沿轴，
 * 再沿理想轴向画过头就是这条带（fuzz 50 次内必中）。容差 ≥ 半对角线 = 洞封死：凡可能量化成同一顶点的都当碰到。
 */
/**
 * sticky 半径 = 身份分辨率（D11，user 2026-10-24「3um可以，确实要比最小精度要大一点」）：Q = 1 µm 只是存储格；相距 ≤ STICKY_R 的两个点就是一个点。
 * 新段端点 / 交点落在既有顶点 r 内 → 就是那个顶点；既有顶点离新段 ≤ r → 切进来；本次切点彼此 ≤ r → 合一（优先既有顶点）；moveVertices 落点 ≤ r → 落到既有顶点上；
 * planarize 自愈同一把尺。INSERT_TOL（「这条边在这段上」的归属判定：手势边 / 曲线 / 层）跟着它走，不然吸过去的端点会让边掉出自己的曲线。
 * 研究稿 ai-docs/20261024-d11-tau-band-study.md：nasty fuzz 守恒拒绝 29 → 4，clean / 全量 golden 零变化。STICKY.r 仍可被 scripts/d11-sticky-sweep.mjs 进程内改（仪表）。
 */
export const STICKY_R = 3 * Q;
export const STICKY = { r: STICKY_R };
export const INSERT_TOL = STICKY_R;

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
  const r = STICKY.r;
  /** r 内最近的既有顶点（身份分辨率：就是它）。 */
  const nearestVertex = (p: Pt3): Pt3 | null => { let best: Pt3 | null = null, bd = r; for (const v of g.verticesNear(p, p)) { const d = dist3(p, v); if (d <= bd) { bd = d; best = { x: v.x, y: v.y, z: v.z }; } } return best; };
  const a = nearestVertex(quantize3(aIn)) ?? quantize3(aIn), b = nearestVertex(quantize3(bIn)) ?? quantize3(bIn);
  if (samePt3(a, b) || dist3(a, b) <= r) return { created: [], retraced: [] };
  const lenAB = dist3(a, b);
  const tOf = (p: Pt3): number =>
    ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y) + (p.z - a.z) * (b.z - a.z)) / (lenAB * lenAB);

  // 1. 收集切割点：新段自身端点 + 与全部既有边的交点/重叠端点 + 落在新段上的既有顶点
  const cutByKey = new Map<string, Pt3>();
  /** 切点 ≤ r 内合一：既有顶点优先，其次先到者（身份分辨率；切点间 1–2 µm 的双胞就是尖刺）。 */
  const addCut = (p: Pt3): void => {
    const isV = g.vertexAt(p) !== undefined;
    for (const [key, q] of cutByKey) { if (dist3(p, q) <= r) { if (isV && g.vertexAt(q) === undefined) { cutByKey.delete(key); break; } return; } }
    cutByKey.set(ptKey3(p), p);
  };
  addCut(a); addCut(b);

  const pendingSplits = new Map<EdgeId, Pt3[]>(); // 既有边 → 待切点（边内部）
  // EGC 期 2：相交 / 斜交 / 共线重叠 / 骑边全部精确判（格点整数 + BigInt，exact/predicates3d.ts）；r 是唯一容差（身份分辨率）
  const rL = Math.round(r / Q), La = toLattice3(a), Lb = toLattice3(b);
  for (const e of g.edgesNear(a, b)) {   // 空间网格：只看新段附近的边（超集，判定照旧）
    const pa = g.pt(e.a), pb = g.pt(e.b);
    const rel = segSeg3Exact(La, Lb, toLattice3(pa), toLattice3(pb), rL);
    for (const lp of rel.points) {
      let p = quantize3(fromLattice3(lp));
      // 交点落在某个既有顶点 r 内 = 就是那个顶点（本边端点优先）
      if (dist3(p, pa) <= r) p = pa; else if (dist3(p, pb) <= r) p = pb; else p = nearestVertex(p) ?? p;
      addCut(p);
      // 切点落在端点的格里 = 就是那个端点（重合即同一），不切
      if (!samePt3(p, pa) && !samePt3(p, pb)) {
        const list = pendingSplits.get(e.id) ?? [];
        list.push(p);
        pendingSplits.set(e.id, list);
      }
    }
  }
  for (const v of g.verticesNear(a, b)) {
    const p = { x: v.x, y: v.y, z: v.z };
    if (pointNearSegment(toLattice3(p), La, Lb, rL)) addCut(p);
  }

  // 2. 切开既有边。每条边的切点来自单次 segIntersections（至多 2 个、互异、都在内部）；
  //    按离该边 a 端的距离排序依次切，后一刀落在前一刀的 e2 半边里。
  const rep = (p: Pt3): Pt3 => { for (const q of cutByKey.values()) if (dist3(p, q) <= r) return q; return p; };
  for (const [eid, points0] of pendingSplits) {
    const ea = g.pt(g.edge(eid).a);
    const points = [...new Map(points0.map((p) => { const q = rep(p); return [ptKey3(q), q] as const; })).values()];
    points.sort((p, q) => dist3(ea, p) - dist3(ea, q));
    let target = eid;
    for (const p of points) {
      const te = g.edge(target);
      const at = g.vertexAt(p);
      if (at !== undefined && (at === te.a || at === te.b)) continue;   // 切点已是本边端点：无事
      if (dist3(p, g.pt(te.a)) <= r || dist3(p, g.pt(te.b)) <= r) continue;   // r 内 = 端点（身份分辨率）
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
