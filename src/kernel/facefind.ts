// facefind.ts —— 纯区域提取：抽「平面细分的所有有界面」。
// ⚠ 术语护栏（drill L269）：这**不是** minimum-weight cycle basis——别去追那个，会被带沟里。
//    参考口径：Eberly《Constructing a Cycle Basis for a Planar Graph》、Jiang & Bunke、npm min-cycles。
// 管线：filament 剥离 → 顶点处 wedge 角排序 → 最紧转弯 trace（CCW=有界面留，CW=外壳）
//       → 壳环按面积从小到大挂洞（嵌套天然是树）。
// 本模块零 face 知识：返回的是候选区域（region），谁有膜由 face-lifecycle 裁决（face 是存储态非派生量）。
//
// findRegions 的 region?: Bounds 参数 = **局部性接缝**：M1 忽略、整平面重跑；
// 「增量局部 face-finding」是 spec 点名的工程命门（SU 流畅手感的真正来源），
// 以后在此接缝内换入最小重算，接口不变。

import { type Pt, EPS_AREA, angleOf, pointInRing, signedArea } from "./geom.ts";
import { type EdgeId, type VertexId, PlanarGraph } from "./topology.ts";

/** 区域提取的作用域：edges = 参与的边子集（默认全图）；project = 顶点投影到 2D
 *  （默认取 x,y——2D 场景/俯视）。M3 起每个平面组传自己的边集 + canonical 基投影。 */
export interface FindScope {
  edges?: Iterable<EdgeId>;
  project?: (vid: VertexId) => Pt;
  bounds?: Bounds;   // 局部性接缝（M1-M3 忽略；增量局部 face-finding 的换入点）
}

/** 有向边：瞬态值对象（不存半边实体）。forward = 沿 edge.a→edge.b 方向。 */
export interface DirEdge { readonly edge: EdgeId; readonly forward: boolean; }

export interface Ring {
  edges: DirEdge[];      // 沿环行进的有向边序列
  pts: Pt[];             // pts[i] = edges[i] 的起点；长度 = edges.length
}

export interface Region {
  outer: Ring;           // CCW
  holes: Ring[];         // CW（来自被包含组件的外壳环）
  area: number;          // outer 面积 − 洞面积
}

/** M3 局部性接缝的形参占位（M1 忽略）。 */
export interface Bounds { minX: number; minY: number; maxX: number; maxY: number; }

const hk = (e: EdgeId, forward: boolean): string => `${e}:${forward ? "f" : "r"}`;

export function findRegions(g: PlanarGraph, scope?: FindScope): Region[] {
  const project = scope?.project ?? ((vid: VertexId) => { const p = g.pt(vid); return { x: p.x, y: p.y }; });
  const scopeEdges = scope?.edges ? [...scope.edges].map((id) => g.edge(id)) : g.edges();
  const pp = new Map<VertexId, Pt>();
  const p2 = (vid: VertexId): Pt => {
    let v = pp.get(vid);
    if (!v) { v = project(vid); pp.set(vid, v); }
    return v;
  };
  // --- 0. filament 剥离：迭代摘掉度数 1 的顶点及其边（悬挂链围不成面；drill L257-260）。
  //     被剥的边仍在拓扑里（wire edge 一等公民），只是不参与找面。
  const deg = new Map<VertexId, number>();
  const alive = new Set<EdgeId>();
  for (const e of scopeEdges) {
    alive.add(e.id);
    deg.set(e.a, (deg.get(e.a) ?? 0) + 1);
    deg.set(e.b, (deg.get(e.b) ?? 0) + 1);
  }
  const queue: VertexId[] = [...deg.entries()].filter(([, d]) => d === 1).map(([v]) => v);
  while (queue.length) {
    const vid = queue.pop()!;
    if ((deg.get(vid) ?? 0) !== 1) continue;
    for (const eid of g.vertex(vid).edges) {
      if (!alive.has(eid)) continue;
      alive.delete(eid);
      const e = g.edge(eid);
      for (const end of [e.a, e.b]) {
        const d = (deg.get(end) ?? 0) - 1;
        deg.set(end, d);
        if (d === 1) queue.push(end);
      }
    }
  }
  if (alive.size === 0) return [];

  // --- 1. wedge：每个顶点把存活出边按辐射角排序（环形缓冲区）。
  //     平面内方向是 S¹ 可全序——这正是先切平面的意义（drill L245）。
  const sortedStar = new Map<VertexId, { eid: EdgeId; to: VertexId; angle: number }[]>();
  const starOf = (vid: VertexId) => {
    let s = sortedStar.get(vid);
    if (!s) {
      s = [];
      const v = g.vertex(vid);
      for (const eid of v.edges) {
        if (!alive.has(eid)) continue;
        const to = g.otherEnd(g.edge(eid), vid);
        s.push({ eid, to, angle: angleOf(p2(vid), p2(to)) });
      }
      s.sort((p, q) => p.angle - q.angle);
      sortedStar.set(vid, s);
    }
    return s;
  };

  // 最紧转弯：到达 v 后，取「反向方向」在角序里的严格前驱（顺时针紧邻的出边）。
  // 该规则让内部面 trace 成 CCW、每条有向半边恰好属于一个环（drill L247-255）。
  const nextDir = (arriveFrom: VertexId, at: VertexId): { eid: EdgeId; to: VertexId } => {
    const star = starOf(at);
    const back = angleOf(p2(at), p2(arriveFrom));
    // 找 angle 严格小于 back 的最大者；没有则环回最大 angle
    let best: { eid: EdgeId; to: VertexId } | undefined;
    for (let i = star.length - 1; i >= 0; i--) {
      if (star[i].angle < back - 1e-12) { best = star[i]; break; }
    }
    if (!best) best = star[star.length - 1];
    return best;
  };

  // --- 2. trace：每条有向半边只属于一个环。
  const visited = new Set<string>();
  const ccw: { ring: Ring; area: number }[] = [];
  const shells: { ring: Ring; areaAbs: number }[] = [];

  for (const eid of alive) {
    const e = g.edge(eid);
    for (const forward of [true, false]) {
      if (visited.has(hk(eid, forward))) continue;
      const edges: DirEdge[] = [];
      const pts: Pt[] = [];
      let curEdge = eid;
      let from = forward ? e.a : e.b;
      let to = forward ? e.b : e.a;
      // 沿最紧转弯走到回到起始半边
      for (;;) {
        const fwd = g.edge(curEdge).a === from;
        const k = hk(curEdge, fwd);
        if (visited.has(k)) break; // 回到已走的半边 = 环闭合
        visited.add(k);
        edges.push({ edge: curEdge, forward: fwd });
        pts.push(p2(from));
        const nx = nextDir(from, to);
        from = to;
        to = nx.to;
        curEdge = nx.eid;
      }
      if (edges.length < 2) continue;
      const area = signedArea(pts);
      const ring: Ring = { edges, pts };
      if (area > EPS_AREA) ccw.push({ ring, area });
      else if (area < -EPS_AREA) shells.push({ ring, areaAbs: -area });
      // |area|≈0：退化环（filament 剥离后不应出现），丢弃
    }
  }

  // --- 3. 嵌套挂洞：每个组件的 CW 外壳环，挂到「包含它的最小 CCW 面」上（drill L262-264）。
  //     组件间不共享顶点（sticky 已合并重合点），包含判定用壳环任一顶点严格内外。
  //     最外层组件的壳不被任何面包含 → 弃（无界外部）。
  const regions: Region[] = ccw
    .sort((p, q) => p.area - q.area) // 从小到大，「最小包含面」= 第一个命中
    .map((c) => ({ outer: c.ring, holes: [] as Ring[], area: c.area }));

  for (const sh of shells) {
    const probe = sh.ring.pts[0];
    for (const r of regions) {
      if (r.outer.pts.length && ringContains(r.outer, sh.ring, probe)) {
        r.holes.push(sh.ring);
        r.area -= sh.areaAbs;
        break;
      }
    }
  }
  return regions;
}

/** 壳环是否落在候选外环内部。同组件（共享边）时壳不算被自己包（比如同一方环的 CW 壳 vs CCW 面）。 */
function ringContains(outer: Ring, shell: Ring, probe: Pt): boolean {
  // 同组件守卫：壳环与外环共享任何边 → 不是包含关系（是同一条边界的两面）
  const outerEdges = new Set(outer.edges.map((d) => d.edge));
  if (shell.edges.some((d) => outerEdges.has(d.edge))) return false;
  return pointInRing(probe, outer.pts);
}

/** 取 region（或存储态 face——同形状）内部一个代表点（face-lifecycle 的 anchor 匹配用）。
 *  扫描线法：过洞外的中高线取奇偶区间中点；顶点 y 撞线时微调。 */
export function representativePoint(r: { outer: Ring; holes: Ring[] }): Pt {
  const ys = r.outer.pts.map((p) => p.y);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const allRings = [r.outer, ...r.holes];
  for (let attempt = 1; attempt <= 8; attempt++) {
    const yc = minY + ((maxY - minY) * attempt) / (attempt + 1); // 1/2, 2/3, 3/4, …

    // 避开与任何顶点同高
    if (allRings.some((ring) => ring.pts.some((p) => Math.abs(p.y - yc) < 1e-9))) continue;
    const xs: number[] = [];
    for (const ring of allRings) {
      for (let i = 0; i < ring.pts.length; i++) {
        const a = ring.pts[i], b = ring.pts[(i + 1) % ring.pts.length];
        if (a.y > yc !== b.y > yc) xs.push(a.x + ((yc - a.y) * (b.x - a.x)) / (b.y - a.y));
      }
    }
    if (xs.length < 2) continue;
    xs.sort((p, q) => p - q);
    // 奇偶规则：区间 [xs[0],xs[1]]、[xs[2],xs[3]]… 在内部；取最宽的
    let bestX = NaN, bestW = -1;
    for (let i = 0; i + 1 < xs.length; i += 2) {
      const w = xs[i + 1] - xs[i];
      if (w > bestW) { bestW = w; bestX = (xs[i] + xs[i + 1]) / 2; }
    }
    if (bestW > 1e-9) return { x: bestX, y: yc };
  }
  // 兜底：外环质心（凸形下正确；理论上到不了这里）
  const cx = r.outer.pts.reduce((s, p) => s + p.x, 0) / r.outer.pts.length;
  const cy = r.outer.pts.reduce((s, p) => s + p.y, 0) / r.outer.pts.length;
  return { x: cx, y: cy };
}

/** 点是否在 region 内（外环内且不在任何洞内）。边界上结果未定义。 */
export function regionContains(r: Region, p: Pt): boolean {
  if (!pointInRing(p, r.outer.pts)) return false;
  for (const h of r.holes) if (pointInRing(p, h.pts)) return false;
  return true;
}
