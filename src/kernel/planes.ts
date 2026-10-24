// planes.ts —— coplanarity 分组（3D→2D 两段式的第一段，drill L227-234）。
// ⚠ 这是 cover 不是 partition：一条边可同时属于多个共面组（它是几个平面的交线）——
//    这正是非流形的来源（公理 2）。
// PlaneRegistry = 平面的 sticky 身份：容差合并（τ = 头号 UX 旋钮，drill L297）+
// **确定性正交基**（同一 canonical 平面 → 同一 (u,v) → 投影坐标跨重跑稳定，
// 2D face-finding 管线因此可以原样复用）。
// 容差只用于分组/归属判定；几何保持精确共面——把点拍到平面上是输入侧 inference 的职责。

import {
  type PlaneParams,
  type Pt3,
  distToPlane,
  dot3,
  planeBasis,
  planeFromPoints,
} from "./geom.ts";
import { type Edge, type VertexId, type EdgeId, PlanarGraph } from "./topology.ts";

export type PlaneId = number;

export interface PlaneRec {
  readonly id: PlaneId;
  readonly plane: PlaneParams;
  readonly basis: { u: Pt3; v: Pt3 };
}

/** 法向一致性（数值尘埃级；刻意倾斜的平面远超此差）。匹配不分正负（n,d 与 −n,−d 是同一张几何平面；
 *  canonicalPlane 按「首个非零分量」定号在 n.x≈0 的噪声带会翻转）。同一边环落进两张近平行候选平面的去重在
 *  face-lifecycle.regionsByPlane（2026-09-07 fuzz 案，edited by Claude Fable 5.1）。 */
const ANGLE_DOT = 1 - 1e-10;

export class PlaneRegistry {
  private recs = new Map<PlaneId, PlaneRec>();
  private nextId = 1;

  all(): PlaneRec[] { return [...this.recs.values()]; }
  rec(id: PlaneId): PlaneRec {
    const r = this.recs.get(id);
    if (!r) throw new Error(`plane ${id} 不存在`);
    return r;
  }

  /** 容差匹配既有平面（法向同或反 + |Δd|≤τ，同一张几何平面只准一条记录）；没有则注册。 */
  ensure(pl: PlaneParams, tol: number): PlaneRec {
    for (const r of this.recs.values()) {
      const c = dot3(r.plane.n, pl.n);
      if (Math.abs(c) >= ANGLE_DOT && Math.abs(r.plane.d - (c < 0 ? -pl.d : pl.d)) <= tol) return r;
    }
    const rec: PlaneRec = { id: this.nextId++, plane: pl, basis: planeBasis(pl) };
    this.recs.set(rec.id, rec);
    return rec;
  }

  /**
   * 持久化装载：按存储参数**精确**注册（不做容差匹配——文件里的记录本来就是 τ 合并后的产物；
   * 装载顺序 = 文件顺序，id 从当前计数器起）。只给 Kernel.fromBrep 用。created 2026-09-20 by Claude Fable 5.1
   */
  restore(pl: PlaneParams): PlaneRec {
    const rec: PlaneRec = { id: this.nextId++, plane: pl, basis: planeBasis(pl) };
    this.recs.set(rec.id, rec);
    return rec;
  }

  /** 清理无人引用的平面（keep = 当前有边组或有存储 face 的平面）。 */
  prune(keep: ReadonlySet<PlaneId>): void {
    for (const id of [...this.recs.keys()]) {
      if (!keep.has(id)) this.recs.delete(id);
    }
  }

  clone(): PlaneRegistry {
    const c = new PlaneRegistry();
    c.nextId = this.nextId;
    for (const [id, r] of this.recs) c.recs.set(id, r); // PlaneRec 不可变，浅拷安全
    return c;
  }
}

/**
 * 候选平面发现：seeds 处两两 incident 边张成的平面经 registry 容差合并（sticky 身份）；返回这些平面的 id。
 * 新平面只会出现在新几何周围，所以局部结算只从脏顶点长；全局模式从全部顶点长。
 */
export function discoverPlanes(g: PlanarGraph, reg: PlaneRegistry, tol: number, seeds: Iterable<VertexId>): Set<PlaneId> {
  const out = new Set<PlaneId>();
  for (const id of new Set(seeds)) {
    if (!g.hasVertex(id)) continue;
    const v = g.vertex(id);
    const star = [...v.edges];
    const pv = g.pt(v.id);
    for (let i = 0; i < star.length; i++) {
      for (let j = i + 1; j < star.length; j++) {
        const pi = g.pt(g.otherEnd(g.edge(star[i]), v.id));
        const pj = g.pt(g.otherEnd(g.edge(star[j]), v.id));
        const pl = planeFromPoints(pv, pi, pj);
        if (pl) out.add(reg.ensure(pl, tol).id);
      }
    }
  }
  return out;
}

/**
 * 局部结算的作用域（影响域定理，2026-10-23，Claude Fable 5.1；立宪页 §3「局部性定理」）：
 *   only  = 被碰到的平面；
 *   edges = 每张被碰平面上**这次要用的边集**，由结算机按影响域算出（脏边 ∪ 受影响膜的环边 ∪ 从脏顶点沿裸线可达的边 ∪ 影响域包围盒内落在该平面上的边）。
 * 这里不再维护「平面 → 全部成员边」的缓存（10-21 的 PlaneMembership 在溶解步之后过期且永不自愈 → 总账 #26）：
 * 边属于哪张平面是一个几何谓词，不是状态；要用时按影响域现算。不给 scope = 全局（擦边路径 / 差分 oracle）。
 */
export interface CoplanarScope {
  only: ReadonlySet<PlaneId>;
  edges: ReadonlyMap<PlaneId, ReadonlySet<EdgeId>>;
}

/**
 * 平面分组 → planeId → 边集（≥3 条才可能围面；少于 3 条的组丢弃）。keepPlanes = 存储 face 的平面（防被 prune）。
 * 全局：候选平面从全部顶点长，归属 = 两端点都在 τ 内的边，全扫（cover：一条边可进多组）。
 * 局部：只按 scope.edges 分发（成员边由调用方按影响域给出，已在平面上），没检查过的平面一律留着。
 */
export function groupCoplanar(
  g: PlanarGraph,
  reg: PlaneRegistry,
  tol: number,
  keepPlanes: ReadonlySet<PlaneId>,
  scope?: CoplanarScope,
): Map<PlaneId, EdgeId[]> {
  const out = new Map<PlaneId, EdgeId[]>();
  if (!scope) {
    discoverPlanes(g, reg, tol, g.vertices().map((v) => v.id));
    const edges = g.edges();
    const onPlane = (e: Edge, pl: PlaneParams): boolean => distToPlane(g.pt(e.a), pl) <= tol && distToPlane(g.pt(e.b), pl) <= tol;
    for (const rec of reg.all()) {
      const members: EdgeId[] = [];
      for (const e of edges) if (onPlane(e, rec.plane)) members.push(e.id);
      if (members.length >= 3) out.set(rec.id, members);
    }
    reg.prune(new Set<PlaneId>([...out.keys(), ...keepPlanes]));
    return out;
  }
  for (const pid of scope.only) {
    const members = [...(scope.edges.get(pid) ?? [])].filter((id) => g.hasEdge(id)).sort((a, b) => a - b);   // 与全局的 id 序一致：环起点 / 事件逐字可比（差分 oracle）
    if (members.length >= 3) out.set(pid, members);
  }
  const keep = new Set<PlaneId>([...out.keys(), ...keepPlanes]);
  for (const rec of reg.all()) if (!scope.only.has(rec.id)) keep.add(rec.id);
  reg.prune(keep);
  return out;
}
