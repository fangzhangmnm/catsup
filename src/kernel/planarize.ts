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

import { type Pt3, dist3, pointOnSegment3, ptKey3, samePt3, segIntersections3 } from "./geom.ts";
import { type EdgeId, PlanarGraph } from "./topology.ts";

export interface PlanarizeResult {
  changed: boolean;
}

const MAX_ROUNDS = 32; // 量化把切点拍进新重合的连锁极短；超限=数值异常，宁炸不糊

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
    const addCut = (eid: EdgeId, p: Pt3): void => {
      let m = cuts.get(eid);
      if (!m) { m = new Map(); cuts.set(eid, m); }
      m.set(ptKey3(p), p);
    };
    const edges = g.edges();
    const verts = g.vertices();
    if (!dirty) {
      for (let i = 0; i < edges.length; i++) {
        const e = edges[i];
        const ea = g.pt(e.a), eb = g.pt(e.b);
        for (let j = i + 1; j < edges.length; j++) {
          const o = edges[j];
          const oa = g.pt(o.a), ob = g.pt(o.b);
          for (const p of segIntersections3(ea, eb, oa, ob)) {
            if (!samePt3(p, ea) && !samePt3(p, eb)) addCut(e.id, p);
            if (!samePt3(p, oa) && !samePt3(p, ob)) addCut(o.id, p);
          }
        }
        for (const v of verts) {
          if (v.id === e.a || v.id === e.b) continue;
          const p = { x: v.x, y: v.y, z: v.z };
          if (pointOnSegment3(p, ea, eb)) addCut(e.id, p);
        }
      }
    } else {
      const dirtyEdges = edges.filter((e) => dirty!.has(e.id));
      const dirtyVerts = new Set<number>();
      for (const e of dirtyEdges) { dirtyVerts.add(e.a); dirtyVerts.add(e.b); }
      for (const e of dirtyEdges) {
        const ea = g.pt(e.a), eb = g.pt(e.b);
        for (const o of edges) {
          if (o.id === e.id) continue;
          if (dirty.has(o.id) && o.id < e.id) continue;   // 脏×脏只配一次
          const oa = g.pt(o.a), ob = g.pt(o.b);
          for (const p of segIntersections3(ea, eb, oa, ob)) {
            if (!samePt3(p, ea) && !samePt3(p, eb)) addCut(e.id, p);
            if (!samePt3(p, oa) && !samePt3(p, ob)) addCut(o.id, p);
          }
        }
        for (const v of verts) {
          if (v.id === e.a || v.id === e.b) continue;
          const p = { x: v.x, y: v.y, z: v.z };
          if (pointOnSegment3(p, ea, eb)) addCut(e.id, p);
        }
      }
      for (const o of edges) {
        if (dirty.has(o.id)) continue;
        const oa = g.pt(o.a), ob = g.pt(o.b);
        for (const vid of dirtyVerts) {
          if (vid === o.a || vid === o.b || !g.hasVertex(vid)) continue;
          const p = g.pt(vid);
          if (pointOnSegment3(p, oa, ob)) addCut(o.id, p);
        }
      }
    }
    if (cuts.size === 0) return { changed };
    changed = true;
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
