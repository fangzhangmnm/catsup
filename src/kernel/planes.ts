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
import { IdMap } from "./id-table.ts";

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

/**
 * 平面索引的桶（2026-10-26 Claude Opus 5.5；纪元账本 DT93：ensure 原来逐条比全部平面，4.9 万面的球挪一个点光「发现平面」就 50 ms）。
 * 键 = 规范化法向（最大分量取正）各分量 / D_N + d / D_D 取整；查询时离桶边不到容差的那一维再看隔壁桶，法向两个符号都查
 * （规范化在两个最大分量差不多大时会翻号）。桶宽只影响一桶装几条，不影响匹配结果——匹配仍是下面那条精确谓词。
 */
const D_N = 1e-3;               // 法向分量桶宽（ANGLE_DOT 对应的分量差 ≤ √(2·1e-10) ≈ 1.5e-5，远小于桶宽）
const N_EPS = 2e-5;
const keyN = (x: number): number => Math.floor(x / D_N);

/** restoreFrom 的来源：真身的 PlaneRegistry 或差量。 */
export interface PlaneSource { planeOrNull(id: PlaneId): PlaneRec | null | undefined; readonly nextPlaneId: number; readonly bucketWidth: number; pendingRecs(): readonly PlaneRec[]; }

export class PlaneRegistry {
  private recs = new IdMap<PlaneRec>();   // 按 id 下标（O3）：all() / values() 按 id 序
  private nextId = 1;
  /** 桶 → 平面 id（升序）。clone 共享数组，写时复制。 */
  private buckets = new Map<string, PlaneId[]>();
  private shared = new WeakSet<PlaneId[]>();

  all(): PlaneRec[] { return [...this.recs.values()]; }
  /** 不拷数组的遍历（热路径用）。 */
  values(): IterableIterator<PlaneRec> { return this.recs.values(); }
  rec(id: PlaneId): PlaneRec {
    const r = this.recs.get(id);
    if (!r) throw new Error(`plane ${id} 不存在`);
    return r;
  }

  private static canon(pl: PlaneParams): { n: Pt3; d: number } {
    const { n, d } = pl, ax = Math.abs(n.x), ay = Math.abs(n.y), az = Math.abs(n.z);
    const m = ax >= ay && ax >= az ? n.x : ay >= az ? n.y : n.z;
    return m < 0 ? { n: { x: -n.x, y: -n.y, z: -n.z }, d: -d } : { n, d };
  }
  private dBucket(tol: number): number { return Math.max(4 * tol, 1e-6); }
  private keyOf(pl: PlaneParams): string {
    const c = PlaneRegistry.canon(pl);
    return `${keyN(c.n.x)},${keyN(c.n.y)},${keyN(c.n.z)},${Math.floor(c.d / this.dW)}`;
  }
  /** d 的桶宽：第一次登记时按当次容差定（整个 registry 的容差是同一个 τ），之后不变。 */
  private dW = 0;
  private index(rec: PlaneRec): void {
    const k = this.keyOf(rec.plane);
    let arr = this.buckets.get(k);
    if (!arr) { this.buckets.set(k, [rec.id]); return; }
    if (this.shared.has(arr)) { arr = [...arr]; this.buckets.set(k, arr); }
    arr.push(rec.id);   // id 单调增 → 数组保持升序
  }
  private unindex(rec: PlaneRec): void {
    const k = this.keyOf(rec.plane);
    const arr = this.buckets.get(k);
    if (!arr) return;
    const next = arr.filter((id) => id !== rec.id);
    if (next.length) this.buckets.set(k, next); else this.buckets.delete(k);
  }
  /** 可能匹配 pl 的平面 id（两个法向符号 × 离桶边近的维度再看隔壁），升序去重。 */
  private candidates(pl: PlaneParams, tol: number): PlaneId[] {
    const out = new Set<PlaneId>();
    for (const sgn of [1, -1]) {
      const n = { x: sgn * pl.n.x, y: sgn * pl.n.y, z: sgn * pl.n.z }, d = sgn * pl.d;
      const span = (x: number, w: number, eps: number): number[] => { const q = Math.floor(x / w), r = x - q * w; return r < eps ? [q - 1, q] : w - r < eps ? [q, q + 1] : [q]; };
      for (const ix of span(n.x, D_N, N_EPS)) for (const iy of span(n.y, D_N, N_EPS)) for (const iz of span(n.z, D_N, N_EPS)) for (const id of span(d, this.dW, tol * 1.01)) {
        const arr = this.buckets.get(`${ix},${iy},${iz},${id}`);
        if (arr) for (const pid of arr) out.add(pid);
      }
    }
    return [...out].sort((a, b) => a - b);
  }

  /** 容差匹配既有平面（法向同或反 + |Δd|≤τ，同一张几何平面只准一条记录）；没有则注册。多条都匹配时取最早登记的（= 原来逐条扫的结果）。 */
  ensure(pl: PlaneParams, tol: number): PlaneRec {
    if (!this.dW) this.dW = this.dBucket(tol);
    this.flushPending();
    if (tol * 2.02 < this.dW) {   // d 那一维最多看一个隔壁桶 ⇔ 容差 < 桶宽的一半
      for (const id of this.candidates(pl, tol)) {
        const r = this.recs.get(id)!;
        const c = dot3(r.plane.n, pl.n);
        if (Math.abs(c) >= ANGLE_DOT && Math.abs(r.plane.d - (c < 0 ? -pl.d : pl.d)) <= tol) return r;
      }
    } else {   // 容差比建索引时的桶还宽（别的调用方给了更大的 τ）：退回逐条扫，结果不变
      for (const r of this.recs.values()) {
        const c = dot3(r.plane.n, pl.n);
        if (Math.abs(c) >= ANGLE_DOT && Math.abs(r.plane.d - (c < 0 ? -pl.d : pl.d)) <= tol) return r;
      }
    }
    const rec: PlaneRec = { id: this.nextId++, plane: pl, basis: planeBasis(pl) };
    this.recs.set(rec.id, rec);
    this.index(rec);
    return rec;
  }

  /**
   * 持久化装载：按存储参数**精确**注册（不做容差匹配——文件里的记录本来就是 τ 合并后的产物；
   * 装载顺序 = 文件顺序，id 从当前计数器起）。只给 Kernel.fromBrep 用。created 2026-09-20 by Claude Fable 5.1
   */
  restore(pl: PlaneParams): PlaneRec {
    const rec: PlaneRec = { id: this.nextId++, plane: pl, basis: planeBasis(pl) };
    this.recs.set(rec.id, rec);
    if (this.dW) this.index(rec); else this.pending.push(rec);
    return rec;
  }
  /** restore 在第一次 ensure（定下 d 桶宽）之前进来的记录，等桶宽定了再入索引。 */
  private pending: PlaneRec[] = [];
  private flushPending(): void { if (this.pending.length && this.dW) { for (const r of this.pending) if (this.recs.has(r.id)) this.index(r); this.pending = []; } }

  /** 清理无人引用的平面（keep = 当前有边组或有存储 face 的平面）。 */
  prune(keep: { has(id: PlaneId): boolean }): void {
    for (const id of [...this.recs.keys()]) if (!keep.has(id)) this.drop(id);
  }
  /** 只删这几张（局部结算：被碰到、又没边组没膜的平面），不扫全表。 */
  dropIds(ids: Iterable<PlaneId>): void { for (const id of ids) this.drop(id); }
  private drop(id: PlaneId): void { const r = this.recs.get(id); if (!r) return; this.recs.delete(id); if (this.dW) this.unindex(r); }

  /** 倒带（O1）：平面记录不可变，只对齐集合——base 没有的删（出索引）、base 有的补回；桶宽 / 待入索引照 base（桶宽变了 = 整个索引重建，少见）。 */
  restoreFrom(src: PlaneSource, pids: Iterable<PlaneId>): void {
    const ids = [...pids];
    for (const id of ids) if (this.recs.has(id) && !src.planeOrNull(id)) this.drop(id);
    if (this.dW !== src.bucketWidth) { this.dW = src.bucketWidth; this.buckets = new Map(); this.shared = new WeakSet(); for (const r of this.recs.values()) if (this.dW) this.index(r); }
    for (const id of ids) { const r = src.planeOrNull(id); if (r && !this.recs.has(id)) { this.recs.set(id, r); if (this.dW) this.index(r); } }
    this.pending = [...src.pendingRecs()];
    this.nextId = src.nextPlaneId;
  }
  planeOrNull(id: PlaneId): PlaneRec | undefined { return this.recs.get(id); }
  get nextPlaneId(): number { return this.nextId; }
  get bucketWidth(): number { return this.dW; }
  pendingRecs(): readonly PlaneRec[] { return this.pending; }
  ids(): Iterable<PlaneId> { return this.recs.keys(); }
  clone(): PlaneRegistry {
    const c = new PlaneRegistry();
    c.nextId = this.nextId;
    c.dW = this.dW;
    for (const [id, r] of this.recs) c.recs.set(id, r); // PlaneRec 不可变，浅拷安全
    for (const [k, arr] of this.buckets) { c.buckets.set(k, arr); this.shared.add(arr); c.shared.add(arr); }
    c.pending = [...this.pending];
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
  keepPlanes: { has(id: PlaneId): boolean },
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
    reg.prune({ has: (id) => out.has(id) || keepPlanes.has(id) });
    return out;
  }
  for (const pid of scope.only) {
    const members = [...(scope.edges.get(pid) ?? [])].filter((id) => g.hasEdge(id)).sort((a, b) => a - b);   // 与全局的 id 序一致：环起点 / 事件逐字可比（差分 oracle）
    if (members.length >= 3) out.set(pid, members);
  }
  // 只可能删「这次碰到、又没边组没膜」的平面（没碰的一律留着）——直接删这几张，不拼全表保留集（2026-10-26 Claude Opus 5.5，纪元账本 DT93）
  reg.dropIds([...scope.only].filter((pid) => !out.has(pid) && !keepPlanes.has(pid)));
  return out;
}
