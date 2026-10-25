// planarize.ts —— 平面性不变量的自愈机（sticky geometry 协议的裁决核心）。
// created by Claude Fable 5, 2026-09-01 · spec = ai-docs/20260901-move-spec.md §2
//
// 对抗契约（user 2026-09-01）：「对抗攻击者瞎动你的顶点——但不许破坏更底层的引用完整性——
// 然后你自愈。」
//   前置：顶点坐标任意脏（边边交叉 / 顶点骑边 / 共线重叠随便来）；拓扑层引用必须完整。
//   后置：无边边交叉、无顶点骑在边内部、无共线重叠、无平行重边（重合即同一）。
//   确定性：输出只依赖终态几何（arrangement 规范性），与调用/遍历顺序无关。
//
// 与 insertSegment 的关系：insertSegment = 本机的「单线段增量特例」（画笔用它注入手势身份）；
// move/rotate/scale/duplicate 等变换动词 = 扰动坐标 + 本机自愈（不注入手势 → 永不生膜）。
// 血缘接缝：replaceEdgeWithChain 返回有向子边——将来画笔管线统一到本机时由此传手势身份；
// 膜搬运不需要血缘（顶点 id 环快照 + 覆盖函数，见 face-lifecycle.reconcileCoverage）。
//
// 复杂度：all-pairs 扫 + 不动点迭代（与 subdivide.ts 同款权衡）；Bentley–Ottmann 换入点同在。

import { type Pt3, Q, dist3, ptKey3, quantize3 } from "./geom.ts";
import { fromLattice3, toLattice3 } from "./exact/lattice.ts";
import { pointRidesInterior, segSeg3Exact } from "./exact/predicates3d.ts";
import { STICKY } from "./subdivide.ts";
import { type EdgeId, PlanarGraph } from "./topology.ts";

export interface PlanarizeResult {
  changed: boolean;
}

const MAX_ROUNDS = 32; // 量化把切点拍进新重合的连锁极短；超限=数值异常，宁炸不糊
/** 调试钩子（不收敛时看每轮切了什么；默认 null 零开销）。 */
export const PLANARIZE_DEBUG: { log: ((line: string) => void) | null } = { log: null };

/** onSplit：既有边被切成链时回调（parent, children）——结算机用它维护手势集 / 随葬集的切割血缘。 */
/**
 * dirty（局部性接缝，2026-10-21 #14）：只有这些边是本次新来 / 动过的——前置状态已是平面化的，所以新切点必含至少一条脏边：
 * 脏边 × 全部边、脏边 × 全部顶点、全部边 × 脏边的端点。每轮切出的子边成为下一轮的脏边。不给 = 全对扫（旧行为）。
 */
export function planarize(g: PlanarGraph, onSplit?: (parent: EdgeId, children: readonly EdgeId[]) => void, dirtyIn?: ReadonlySet<EdgeId>): PlanarizeResult {
  let changed = false;
  let dirty: Set<EdgeId> | null = dirtyIn ? new Set([...dirtyIn].filter((id) => g.hasEdge(id))) : null;
  for (let round = 0; round < MAX_ROUNDS; round++) {
    if (dirty && dirty.size === 0) return { changed };
    // 1. 收集每条边的内部切点：边边交点/重叠端点 + 骑在边内部的既有顶点
    const cuts = new Map<EdgeId, Map<string, Pt3>>();
    const r = STICKY.r;
    const near = (p: Pt3, q: Pt3): boolean => dist3(p, q) <= r;   // 身份分辨率（D11）：r 内 = 同一点
    // ① 顶点对 ≤ r 先合并（高 id 并进低 id；保边 id）：两个 3 µm 之隔的顶点互相「骑」对方的边，切永远切不完（种子 1 振荡 32 轮），合并才是终态
    {
      const pool = dirty ? [...new Set([...dirty].filter((id) => g.hasEdge(id)).flatMap((id) => { const e = g.edge(id); return [e.a, e.b]; }))] : g.vertices().map((v) => v.id);
      let merged = false;
      for (const vid of pool) {
        if (!g.hasVertex(vid)) continue;
        const p = g.pt(vid);
        for (const o of g.verticesNear(p, p)) {
          if (o.id === vid || !g.hasVertex(vid) || !near(p, o)) continue;
          const [keep, drop] = o.id < vid ? [o.id, vid] : [vid, o.id];
          const touched = [...g.vertex(drop).edges];
          g.mergeVertex(drop, keep);
          merged = true; changed = true;
          if (dirty) { for (const eid of [...g.vertex(keep).edges]) dirty.add(eid); for (const eid of touched) if (!g.hasEdge(eid)) dirty.delete(eid); }
          if (drop === vid) break;
        }
      }
      if (merged) continue;   // 合并改了星形：这一轮重来
    }
    /** 骑边（精确，EGC 期 2）：离边 ≤ r 且沿段投影离两端都 ≥ r；贴着端点的归合并（上面）或根本不算。 */
    const rL = Math.round(r / Q);
    const rides = (p: Pt3, a: Pt3, b: Pt3): boolean => pointRidesInterior(toLattice3(p), toLattice3(a), toLattice3(b), rL);
    /** 相交 / 斜交 ≤ r / 共线重叠（精确）→ 落格的点。 */
    const hits = (ea: Pt3, eb: Pt3, oa: Pt3, ob: Pt3): Pt3[] => segSeg3Exact(toLattice3(ea), toLattice3(eb), toLattice3(oa), toLattice3(ob), rL).points.map((q) => quantize3(fromLattice3(q)));
    const addCut = (eid: EdgeId, p: Pt3): void => {
      let m = cuts.get(eid);
      if (!m) { m = new Map(); cuts.set(eid, m); }
      for (const q of m.values()) if (near(p, q)) return;   // 同边切点 r 内合一
      m.set(ptKey3(p), p);
    };
    /** 交点吸到既有顶点（r 内），再决定要不要切。 */
    const snapV = (p: Pt3): Pt3 => { let best: Pt3 | null = null, bd = r; for (const v of g.verticesNear(p, p)) { const d = dist3(p, v); if (d <= bd) { bd = d; best = { x: v.x, y: v.y, z: v.z }; } } return best ?? p; };
    const edges = g.edges();
    if (!dirty) {
      const verts = g.vertices();
      for (let i = 0; i < edges.length; i++) {
        const e = edges[i];
        const ea = g.pt(e.a), eb = g.pt(e.b);
        for (let j = i + 1; j < edges.length; j++) {
          const o = edges[j];
          const oa = g.pt(o.a), ob = g.pt(o.b);
          for (let p of hits(ea, eb, oa, ob)) {
            p = snapV(p);
            if (rides(p, ea, eb)) addCut(e.id, p);
            if (rides(p, oa, ob)) addCut(o.id, p);
          }
        }
        for (const v of verts) {
          if (v.id === e.a || v.id === e.b) continue;
          const p = { x: v.x, y: v.y, z: v.z };
          if (rides(p, ea, eb)) addCut(e.id, p);
        }
      }
    } else {
      // 空间网格（topology.ts edgesNear / verticesNear）：脏边只和自己附近的边 / 顶点配；脏顶点只和自己附近的边配（超集，判定照旧）
      const dirtyEdges = edges.filter((e) => dirty!.has(e.id));
      const dirtyVerts = new Set<number>();
      for (const e of dirtyEdges) { dirtyVerts.add(e.a); dirtyVerts.add(e.b); }
      for (const e of dirtyEdges) {
        const ea = g.pt(e.a), eb = g.pt(e.b);
        for (const o of g.edgesNear(ea, eb)) {
          if (o.id === e.id) continue;
          if (dirty.has(o.id) && o.id < e.id) continue;   // 脏×脏只配一次
          const oa = g.pt(o.a), ob = g.pt(o.b);
          for (let p of hits(ea, eb, oa, ob)) {
            p = snapV(p);
            if (rides(p, ea, eb)) addCut(e.id, p);
            if (rides(p, oa, ob)) addCut(o.id, p);
          }
        }
        for (const v of g.verticesNear(ea, eb)) {
          if (v.id === e.a || v.id === e.b) continue;
          const p = { x: v.x, y: v.y, z: v.z };
          if (rides(p, ea, eb)) addCut(e.id, p);
        }
      }
      for (const vid of dirtyVerts) {
        if (!g.hasVertex(vid)) continue;
        const p = g.pt(vid);
        for (const o of g.edgesNear(p, p)) {
          if (dirty.has(o.id) || vid === o.a || vid === o.b) continue;
          const oa = g.pt(o.a), ob = g.pt(o.b);
          if (rides(p, oa, ob)) addCut(o.id, p);
        }
      }
    }
    if (cuts.size === 0) return { changed };
    changed = true;
    if (PLANARIZE_DEBUG.log) { const f = (p: Pt3): string => `(${p.x.toFixed(6)},${p.y.toFixed(6)},${p.z.toFixed(6)})`; for (const [eid, m] of cuts) { const e = g.edge(eid); PLANARIZE_DEBUG.log(`round ${round} edge ${eid} ${f(g.pt(e.a))}-${f(g.pt(e.b))} cuts ${[...m.values()].map(f).join(" ")}`); } }
    // 2. 应用切割（重合子边自动并入既有边——replaceEdgeWithChain 的公理 3 容忍）
    const next = new Set<EdgeId>();
    for (const [eid, m] of cuts) {
      if (!g.hasEdge(eid)) continue; // 防御：同轮内不应失效（切割只换自己的 id）
      const ea = g.pt(g.edge(eid).a);
      const pts = [...m.values()].sort((p, q) => dist3(ea, p) - dist3(ea, q));
      const chain = g.replaceEdgeWithChain(eid, pts);
      for (const c of chain) next.add(c.edge);
      onSplit?.(eid, chain.map((c) => c.edge));
    }
    if (dirty) dirty = next;
  }
  throw new Error("planarize 未收敛（>32 轮）——量化连锁异常，检查输入几何");
}
