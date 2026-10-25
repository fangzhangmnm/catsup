// tau-flatten.ts —— τ 带里的投影一致性（EGC 期 3b）。created by Claude Fable 5.1, 2026-10-24
//
// 问题（ai-docs/20261024-exact-geometry-design.md §4 期 3b）：内核有两把尺子——身份 r = 3 µm（planarize 在 3D 里合并 / 切开 ≤ r 的东西），
// 共面 τ（coplanarTol，同一平面组的成员资格）。同一平面组里两条边 3D 相距 (r, 2τ] 时，3D 的 planarize 看不见它们，
// 可它们投到平面上会相交 / 骑边 / 顶点重合 → 交给 findRegions 的不是 PSLG → 守恒断言拒绝这一步（「推拉帽离平行膜 0.5 mm」那类）。
//
// 做法（容差建模的合并公理：非邻接特征的容差区不许相交，相交就并成一个）：对每张被碰平面，顶点投到平面基底再落格（整数），
// 用 3D 精确谓词取 z = 0 当 2D 用：
//   ① 两顶点投影 ≤ r → 合并（新并进旧；同龄高 id 并进低 id）；
//   ② 顶点投影骑在边内部 ≤ r → 边穿过该顶点（边弯 ≤ 2τ，顶点不动）；
//   ③ 两边投影真交 → 在「参照边」自己的 3D 点上切开，另一条边穿过它（参照 = 旧边；同龄 = 低 id）。
// 只配脏边 × 平面组（局部性：前置状态已满足不变量）。改了就返回 true，结算机再跑一轮 3D planarize + 重算影响域，直到不动点。
// 顶点被挪 / 边被弯 ≤ 2τ 都在 τ 语义之内（τ 说「这么近就是同一张平面」）；τ 本身多大是建模语义旋钮，不在这里定。

import { type Pt3, Q, dist3, projectToPlane, quantize3 } from "./geom.ts";
import { type IPt3 } from "./exact/lattice.ts";
import { pointRidesInterior, segSeg3Exact, withinR } from "./exact/predicates3d.ts";
import { type EdgeId, type VertexId, PlanarGraph } from "./topology.ts";

export interface FlattenPlane { basis: { u: Pt3; v: Pt3 }; edges: ReadonlySet<EdgeId>; }
export interface FlattenCtx {
  /** 身份分辨率（米）。 */
  r: number;
  /** 本次操作前就存在的顶点 → 参照物（新几何让位）。 */
  isOldVertex: (v: VertexId) => boolean;
  isOldEdge: (e: EdgeId) => boolean;
  /** 本次新来 / 动过的边（只配这些；本机维护：合并后 to 的边入脏，死边出脏）。 */
  dirty: Set<EdgeId>;
  onSplit?: (parent: EdgeId, children: readonly EdgeId[]) => void;
  /** 顶点合并回调，**在合并之前**调用（图里 from 还在，可沿 from 的边找到引用它的膜环改写 vids）。 */
  onMerge?: (from: VertexId, to: VertexId) => void;
}
/** 调试钩子（默认 null 零开销）。 */
export const FLATTEN_DEBUG: { log: ((line: string) => void) | null } = { log: null };

/** 对一批平面做一轮 τ-flatten；返回是否改了图。一轮只做一类（合并 > 切割），改了就该让调用方重跑 planarize 再来。 */
export function flattenPlanes(g: PlanarGraph, planes: Iterable<FlattenPlane>, ctx: FlattenCtx): boolean {
  const rL = Math.round(ctx.r / Q);
  // 一轮内先收集全部合并 / 切点再应用（判定基于轮初几何，与遍历顺序无关）
  const merges: [VertexId, VertexId][] = [];       // [from, to]
  const cuts = new Map<EdgeId, Map<VertexId | string, Pt3>>();
  const addCut = (eid: EdgeId, p: Pt3, key: VertexId | string): void => {
    let m = cuts.get(eid);
    if (!m) { m = new Map(); cuts.set(eid, m); }
    for (const q of m.values()) if (dist3(p, q) <= ctx.r) return;
    m.set(key, p);
  };
  const older = (a: VertexId, b: VertexId): VertexId => {   // 谁当参照：旧 > 新；同龄低 id
    const oa = ctx.isOldVertex(a), ob = ctx.isOldVertex(b);
    if (oa !== ob) return oa ? a : b;
    return a < b ? a : b;
  };
  for (const pl of planes) {
    const live: { id: EdgeId; a: VertexId; b: VertexId; pa: IPt3; pb: IPt3; x0: number; x1: number; y0: number; y1: number }[] = [];
    const proj = new Map<VertexId, IPt3>();
    const P = (v: VertexId): IPt3 => {
      let p = proj.get(v);
      if (!p) { const q = projectToPlane(g.pt(v), pl.basis); p = { x: Math.round(q.x / Q), y: Math.round(q.y / Q), z: 0 }; proj.set(v, p); }
      return p;
    };
    for (const eid of pl.edges) {
      if (!g.hasEdge(eid)) continue;
      const e = g.edge(eid);
      const pa = P(e.a), pb = P(e.b);
      live.push({ id: eid, a: e.a, b: e.b, pa, pb, x0: Math.min(pa.x, pb.x) - rL, x1: Math.max(pa.x, pb.x) + rL, y0: Math.min(pa.y, pb.y) - rL, y1: Math.max(pa.y, pb.y) + rL });
    }
    const dirtyLive = live.filter((e) => ctx.dirty.has(e.id));
    if (dirtyLive.length === 0) continue;
    // ① 顶点对（脏边端点 × 组内全部顶点）
    const dirtyV = new Set<VertexId>(); for (const e of dirtyLive) { dirtyV.add(e.a); dirtyV.add(e.b); }
    const allV = new Set<VertexId>(); for (const e of live) { allV.add(e.a); allV.add(e.b); }
    const mergedAway = new Set<VertexId>();
    for (const v of dirtyV) {
      const pv = P(v);
      for (const o of allV) {
        if (o === v || (dirtyV.has(o) && o < v)) continue;
        const po = P(o);
        if (Math.abs(po.x - pv.x) > rL || Math.abs(po.y - pv.y) > rL || !withinR(pv, po, rL)) continue;   // 整数包围盒先筛，BigInt 只在候选上算
        const keep = older(v, o), drop = keep === v ? o : v;
        if (mergedAway.has(drop) || mergedAway.has(keep)) continue;
        mergedAway.add(drop);
        merges.push([drop, keep]);
      }
    }
    if (merges.length) continue;   // 这张平面有合并：先合并再说（合并会改边的端点，切点等下一轮）
    // ② 顶点骑边 / ③ 边边真交（脏边 × 组内边；脏×脏只配一次）
    const vertsOf = (e: { a: VertexId; b: VertexId }): VertexId[] => [e.a, e.b];
    for (const e of dirtyLive) {
      for (const o of live) {
        if (o.id === e.id || (ctx.dirty.has(o.id) && o.id < e.id)) continue;
        if (o.x1 < e.x0 || e.x1 < o.x0 || o.y1 < e.y0 || e.y1 < o.y0) continue;
        const shared = e.a === o.a || e.a === o.b || e.b === o.a || e.b === o.b;
        // ② 对方端点骑在我内部（和我的端点 ≤ r 的归 ①，这里不会出现）
        for (const [E, O] of [[e, o], [o, e]] as const) {
          for (const v of vertsOf(O)) {
            if (v === E.a || v === E.b) continue;
            const pv = P(v);
            if (pv.x < E.x0 || pv.x > E.x1 || pv.y < E.y0 || pv.y > E.y1) continue;
            if (pointRidesInterior(pv, E.pa, E.pb, rL)) addCut(E.id, g.pt(v), v);
          }
        }
        if (shared) continue;   // 共端点的两条边只可能是 ② 的共线骑边，上面已查
        // ③ 真交（segSeg3Exact 在 z = 0 面上：cross = 精确相交；near 在 2D 等价于某端点骑边 → ② 已查；overlap 的两端是端点 → ② 已查）
        const hit = segSeg3Exact(e.pa, e.pb, o.pa, o.pb, rL);
        if (hit.kind !== "cross") continue;
        const q = hit.points[0];
        // 交点可能落在端点上（touch）：那是 ② 的事（端点骑边）或 ① 的事；真内部才切
        if (!pointRidesInterior(q, e.pa, e.pb, rL) || !pointRidesInterior(q, o.pa, o.pb, rL)) continue;
        // 参照边 K：旧 > 新；同龄低 id。在 K 自己的 3D 线上取点（投影参数 t），落格；另一条边穿过它
        const eOld = ctx.isOldEdge(e.id), oOld = ctx.isOldEdge(o.id);
        const K = eOld !== oOld ? (eOld ? e : o) : (e.id < o.id ? e : o);
        const dx = K.pb.x - K.pa.x, dy = K.pb.y - K.pa.y;
        const t = Math.abs(dx) >= Math.abs(dy) ? (q.x - K.pa.x) / dx : (q.y - K.pa.y) / dy;
        const A = g.pt(K.a), Bp = g.pt(K.b);
        const p3 = quantize3({ x: A.x + t * (Bp.x - A.x), y: A.y + t * (Bp.y - A.y), z: A.z + t * (Bp.z - A.z) });
        const key = `${q.x},${q.y}`;
        addCut(e.id, p3, key); addCut(o.id, p3, key);
      }
    }
  }
  if (merges.length) {
    for (const [from, to] of merges) {
      if (!g.hasVertex(from) || !g.hasVertex(to)) continue;
      if (FLATTEN_DEBUG.log) FLATTEN_DEBUG.log(`merge v${from} → v${to}`);
      ctx.onMerge?.(from, to);
      const touched = [...g.vertex(from).edges];
      g.mergeVertex(from, to);
      for (const eid of touched) if (!g.hasEdge(eid)) ctx.dirty.delete(eid);
      for (const eid of g.vertex(to).edges) ctx.dirty.add(eid);
    }
    return true;
  }
  if (cuts.size === 0) return false;
  for (const [eid, m] of cuts) {
    if (!g.hasEdge(eid)) continue;
    const ea = g.pt(g.edge(eid).a);
    const pts = [...m.values()].sort((p, q) => dist3(ea, p) - dist3(ea, q));
    if (FLATTEN_DEBUG.log) { const f = (p: Pt3): string => `(${p.x.toFixed(6)},${p.y.toFixed(6)},${p.z.toFixed(6)})`; FLATTEN_DEBUG.log(`cut e${eid} ${f(ea)}-${f(g.pt(g.edge(eid).b))} at ${pts.map(f).join(" ")}`); }
    const chain = g.replaceEdgeWithChain(eid, pts);
    ctx.onSplit?.(eid, chain.map((c) => c.edge));
  }
  return true;
}
