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
import { type EdgeId, PlanarGraph } from "./topology.ts";

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
 * 平面分组：候选平面 = 每顶点处两两 incident 边张成的平面（经 registry 容差合并）；
 * 归属 = 两端点都在 τ 内的边。keepPlanes = 存储 face 的平面（防被 prune）。
 * 返回 planeId → 边集（≥3 条才可能围面；少于 3 条的组丢弃）。
 */
export function groupCoplanar(
  g: PlanarGraph,
  reg: PlaneRegistry,
  tol: number,
  keepPlanes: ReadonlySet<PlaneId>,
): Map<PlaneId, EdgeId[]> {
  // 1. 候选平面
  for (const v of g.vertices()) {
    const star = [...v.edges];
    const pv = g.pt(v.id);
    for (let i = 0; i < star.length; i++) {
      for (let j = i + 1; j < star.length; j++) {
        const pi = g.pt(g.otherEnd(g.edge(star[i]), v.id));
        const pj = g.pt(g.otherEnd(g.edge(star[j]), v.id));
        const pl = planeFromPoints(pv, pi, pj);
        if (pl) reg.ensure(pl, tol);
      }
    }
  }
  // 2. 归属（cover：一条边可进多组）
  const out = new Map<PlaneId, EdgeId[]>();
  const edges = g.edges();
  for (const rec of reg.all()) {
    const members: EdgeId[] = [];
    for (const e of edges) {
      if (distToPlane(g.pt(e.a), rec.plane) <= tol && distToPlane(g.pt(e.b), rec.plane) <= tol) {
        members.push(e.id);
      }
    }
    if (members.length >= 3) out.set(rec.id, members);
  }
  // 3. prune
  const keep = new Set<PlaneId>([...out.keys(), ...keepPlanes]);
  reg.prune(keep);
  return out;
}
