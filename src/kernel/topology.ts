// topology.ts —— PlanarGraph：vertex/edge 的原始增删（拓扑 ⊥ 几何：本层只管谁连谁 + 顶点坐标）。
// 公理 2（非流形连接）预留：Edge.faceLinks 是**变长列表**不是左/右两指针——
// 升维（M3 多平面）后一条边可挂 N 张面，这根 radial cycle 的位置现在就留好。
// 公理 3（重合即同一）：顶点身份 = 量化格点 Map；两点落同格 = 同一个 vertex。

import { type Pt3, ptKey3 } from "./geom.ts";

export type VertexId = number;
export type EdgeId = number;
/** face 实体住在 face-lifecycle.ts；本层只把 FaceId 当不透明号码挂在 faceLinks 上。 */
export type FaceId = number;

export interface Vertex { readonly id: VertexId; x: number; y: number; z: number; readonly edges: Set<EdgeId>; }
export interface Edge { readonly id: EdgeId; a: VertexId; b: VertexId; faceLinks: FaceId[]; }

/**
 * 边的空间网格（#14 性能第二轮，2026-10-21，Claude Fable 5.1）：均匀格（CELL 米），每条边登记在它穿过的格里（沿线每 CELL/2 采一点）；
 * 查询「离线段 ab 不远的边」= 沿 ab 采样格 ∪ 各自 26 邻格里的边（邻格扩一圈 = 容差 + 采样漏格的保险）。返回的是**超集**，调用方照旧做几何判定。
 * 场景很小（全在一格里）就退化成全扫（= 旧行为，不会更差）。
 */
const CELL = 1;
const cellOf = (v: number): number => Math.floor(v / CELL);
const cellKey = (ix: number, iy: number, iz: number): number => ((ix * 73856093) ^ (iy * 19349663) ^ (iz * 83492791)) | 0;

export class PlanarGraph {
  private vertsById = new Map<VertexId, Vertex>();
  private edgesById = new Map<EdgeId, Edge>();
  private vertByKey = new Map<string, VertexId>();
  private nextV = 1;
  private nextE = 1;
  private grid = new Map<number, Set<EdgeId>>();
  private edgeCells = new Map<EdgeId, number[]>();

  /** 线段 ab 穿过的格（去重）。 */
  private cellsAlong(a: Pt3, b: Pt3): { ix: number; iy: number; iz: number }[] {
    const out: { ix: number; iy: number; iz: number }[] = [];
    const seen = new Set<number>();
    const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
    const len = Math.hypot(dx, dy, dz);
    const n = Math.max(1, Math.ceil(len / (CELL / 2)));
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const ix = cellOf(a.x + dx * t), iy = cellOf(a.y + dy * t), iz = cellOf(a.z + dz * t);
      const k = cellKey(ix, iy, iz);
      if (seen.has(k)) continue;
      seen.add(k); out.push({ ix, iy, iz });
    }
    return out;
  }
  private indexEdge(id: EdgeId): void {
    const e = this.edge(id);
    const keys: number[] = [];
    for (const c of this.cellsAlong(this.pt(e.a), this.pt(e.b))) {
      const k = cellKey(c.ix, c.iy, c.iz);
      (this.grid.get(k) ?? this.grid.set(k, new Set()).get(k)!).add(id);
      keys.push(k);
    }
    this.edgeCells.set(id, keys);
  }
  private unindexEdge(id: EdgeId): void {
    for (const k of this.edgeCells.get(id) ?? []) { const set = this.grid.get(k); if (set) { set.delete(id); if (!set.size) this.grid.delete(k); } }
    this.edgeCells.delete(id);
  }
  /** 离线段 ab 不远的边（超集；含 a / b 落在一格里 = 点查）。 */
  edgesNear(a: Pt3, b: Pt3): Edge[] {
    const ids = new Set<EdgeId>();
    for (const c of this.cellsAlong(a, b)) {
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
        const set = this.grid.get(cellKey(c.ix + dx, c.iy + dy, c.iz + dz));
        if (set) for (const id of set) ids.add(id);
      }
    }
    const out: Edge[] = [];
    for (const id of ids) { const e = this.edgesById.get(id); if (e) out.push(e); }
    return out;
  }
  /**
   * 落在包围盒 [min, max]（外扩一格）附近的边（超集；调用方照旧做几何判定）。影响域定理的第四项用它：
   * 新膜包围盒里不连通的旧闭环 = 它的洞，不走顶点传递也得进边集。格太多（盒比边还多）就退化成全扫 + 包围盒相交测试。
   * added 2026-10-23 by Claude Fable 5.1
   */
  edgesInBox(min: Pt3, max: Pt3): Edge[] {
    const ix0 = cellOf(min.x) - 1, iy0 = cellOf(min.y) - 1, iz0 = cellOf(min.z) - 1;
    const ix1 = cellOf(max.x) + 1, iy1 = cellOf(max.y) + 1, iz1 = cellOf(max.z) + 1;
    const cells = (ix1 - ix0 + 1) * (iy1 - iy0 + 1) * (iz1 - iz0 + 1);
    const out: Edge[] = [];
    if (cells > this.edgesById.size) {
      const lo = { x: (ix0) * CELL, y: (iy0) * CELL, z: (iz0) * CELL }, hi = { x: (ix1 + 1) * CELL, y: (iy1 + 1) * CELL, z: (iz1 + 1) * CELL };
      for (const e of this.edgesById.values()) {
        const a = this.pt(e.a), b = this.pt(e.b);
        if (Math.max(a.x, b.x) < lo.x || Math.min(a.x, b.x) > hi.x || Math.max(a.y, b.y) < lo.y || Math.min(a.y, b.y) > hi.y || Math.max(a.z, b.z) < lo.z || Math.min(a.z, b.z) > hi.z) continue;
        out.push(e);
      }
      return out;
    }
    const ids = new Set<EdgeId>();
    for (let ix = ix0; ix <= ix1; ix++) for (let iy = iy0; iy <= iy1; iy++) for (let iz = iz0; iz <= iz1; iz++) {
      const set = this.grid.get(cellKey(ix, iy, iz));
      if (set) for (const id of set) ids.add(id);
    }
    for (const id of ids) { const e = this.edgesById.get(id); if (e) out.push(e); }
    return out;
  }
  /** 离线段 ab 不远的顶点（= 近边的端点；孤立顶点不存在，所以这就是全集的超集）。 */
  verticesNear(a: Pt3, b: Pt3): Vertex[] {
    const ids = new Set<VertexId>();
    for (const e of this.edgesNear(a, b)) { ids.add(e.a); ids.add(e.b); }
    const out: Vertex[] = [];
    for (const id of ids) { const v = this.vertsById.get(id); if (v) out.push(v); }
    return out;
  }

  vertices(): Vertex[] { return [...this.vertsById.values()]; }
  edges(): Edge[] { return [...this.edgesById.values()]; }
  vertexCount(): number { return this.vertsById.size; }
  edgeCount(): number { return this.edgesById.size; }

  vertex(id: VertexId): Vertex {
    const v = this.vertsById.get(id);
    if (!v) throw new Error(`vertex ${id} 不存在`);
    return v;
  }
  edge(id: EdgeId): Edge {
    const e = this.edgesById.get(id);
    if (!e) throw new Error(`edge ${id} 不存在`);
    return e;
  }
  hasEdge(id: EdgeId): boolean { return this.edgesById.has(id); }
  hasVertex(id: VertexId): boolean { return this.vertsById.has(id); }
  pt(id: VertexId): Pt3 { const v = this.vertex(id); return { x: v.x, y: v.y, z: v.z }; }
  otherEnd(e: Edge, v: VertexId): VertexId { return e.a === v ? e.b : e.a; }

  /** p 须已量化。 */
  vertexAt(p: Pt3): VertexId | undefined { return this.vertByKey.get(ptKey3(p)); }

  /** 重合即同一：同格点返回既有 vertex。p 须已量化。 */
  ensureVertex(p: Pt3): VertexId {
    const k = ptKey3(p);
    const existing = this.vertByKey.get(k);
    if (existing !== undefined) return existing;
    const id = this.nextV++;
    this.vertsById.set(id, { id, x: p.x, y: p.y, z: p.z, edges: new Set() });
    this.vertByKey.set(k, id);
    return id;
  }

  /** 直线世界里两点间至多一条边。 */
  edgeBetween(v1: VertexId, v2: VertexId): EdgeId | undefined {
    const star = this.vertex(v1).edges;
    for (const eid of star) {
      const e = this.edge(eid);
      if (e.a === v2 || e.b === v2) return eid;
    }
    return undefined;
  }

  /** 调用方负责先查 edgeBetween（重合即同一）；自环拒绝。 */
  addEdge(v1: VertexId, v2: VertexId): EdgeId {
    if (v1 === v2) throw new Error("拒绝自环边");
    if (this.edgeBetween(v1, v2) !== undefined) throw new Error(`边 ${v1}-${v2} 已存在（重合即同一，调用方应报 retrace）`);
    const id = this.nextE++;
    this.edgesById.set(id, { id, a: v1, b: v2, faceLinks: [] });
    this.vertex(v1).edges.add(id);
    this.vertex(v2).edges.add(id);
    this.indexEdge(id);
    return id;
  }

  /** 删边；孤立顶点顺带回收（无边的顶点不是一等实体——SU 的 stray vertex 不存在）。 */
  removeEdge(id: EdgeId): void {
    const e = this.edge(id);
    this.unindexEdge(id);
    this.edgesById.delete(id);
    for (const vid of [e.a, e.b]) {
      const v = this.vertex(vid);
      v.edges.delete(id);
      if (v.edges.size === 0) {
        this.vertsById.delete(vid);
        this.vertByKey.delete(ptKey3({ x: v.x, y: v.y, z: v.z }));
      }
    }
  }

  /**
   * 在 p（须已量化、落在边内部）把边切成两半。faceLinks 复制给两半
   * （几何上两半仍贴着同一批面；权威值由 face-lifecycle 重建）。
   */
  splitEdge(id: EdgeId, p: Pt3): { v: VertexId; e1: EdgeId; e2: EdgeId } {
    const e = this.edge(id);
    const links = [...e.faceLinks];
    const a = e.a, b = e.b;
    this.removeEdgeKeepVerts(id);
    const v = this.ensureVertex(p);
    // 重合即同一：切点落进既有顶点的格、而该顶点已与某端相连 → 那半边就是既有边（retrace），不新建也不 throw；
    // 复用的既有边 faceLinks 取并集（覆盖会清掉它原有的面链接——2026-09-07 v0.4.2 首版之误）
    const half = (x: VertexId, y: VertexId): EdgeId => {
      const ex = this.edgeBetween(x, y);
      if (ex === undefined) { const id = this.addEdge(x, y); this.edge(id).faceLinks = [...links]; return id; }
      const fl = this.edge(ex).faceLinks;
      for (const f of links) if (!fl.includes(f)) fl.push(f);
      return ex;
    };
    const e1 = half(a, v);
    const e2 = half(v, b);
    return { v, e1, e2 };
  }

  /**
   * 批量顶点搬迁（planarize 协议第 1 步的底层写：全部先摘 key、再改坐标、再上 key——
   * 中途无「一半已动」的 key 冲突瞬态）。调用方保证终态无 key 碰撞（碰撞=合并，须先在
   * kernel 层做完顶点合并再来）。added by Claude Fable 5 2026-09-01
   */
  relocateVertices(batch: readonly { id: VertexId; to: Pt3 }[]): void {
    const touched = new Set<EdgeId>();
    for (const { id } of batch) {
      const v = this.vertex(id);
      this.vertByKey.delete(ptKey3({ x: v.x, y: v.y, z: v.z }));
      for (const eid of v.edges) touched.add(eid);
    }
    for (const eid of touched) this.unindexEdge(eid);
    for (const { id, to } of batch) {
      const v = this.vertex(id);
      const k = ptKey3(to);
      if (this.vertByKey.has(k)) throw new Error("relocateVertices 终态 key 碰撞——合并该在调用方先做");
      v.x = to.x; v.y = to.y; v.z = to.z;
      this.vertByKey.set(k, id);
    }
    for (const eid of touched) this.indexEdge(eid);
  }

  /**
   * 把边替换为沿 a→b 的顶点链（planarize 的切割原语；splitEdge 的批量+去重容忍版）：
   * 链段若与既有边重合 → 复用既有边（重合即同一，公理 3）；顶点全程保留（不 GC 端点）。
   * pts 须已量化、按 a→b 参数序、不含 a/b 本身。返回沿 a→b 的有向子边序列。
   * added by Claude Fable 5 2026-09-01
   */
  replaceEdgeWithChain(id: EdgeId, pts: readonly Pt3[]): { edge: EdgeId; fwd: boolean }[] {
    const e = this.edge(id);
    const links = [...e.faceLinks];
    const a = e.a, b = e.b;
    this.removeEdgeKeepVerts(id);
    const chain: VertexId[] = [a, ...pts.map((p) => this.ensureVertex(p)), b];
    const out: { edge: EdgeId; fwd: boolean }[] = [];
    for (let i = 0; i + 1 < chain.length; i++) {
      const v1 = chain[i], v2 = chain[i + 1];
      if (v1 === v2) continue;
      const existing = this.edgeBetween(v1, v2);
      if (existing !== undefined) {
        out.push({ edge: existing, fwd: this.edge(existing).a === v1 });
        continue;
      }
      const ne = this.addEdge(v1, v2);
      this.edge(ne).faceLinks = [...links];
      out.push({ edge: ne, fwd: true });
    }
    return out;
  }

  /** 顶点移动的底层写（sticky 语义在 kernel 层编排；这里只改坐标 + 换 key）。 */
  relocateVertex(id: VertexId, p: Pt3): void {
    const v = this.vertex(id);
    const oldKey = ptKey3({ x: v.x, y: v.y, z: v.z });
    if (this.vertByKey.get(ptKey3(p)) !== undefined && this.vertByKey.get(ptKey3(p)) !== id) {
      throw new Error("relocateVertex 目标格点已被占用——sticky 合并该在调用方先做");
    }
    this.vertByKey.delete(oldKey);
    for (const eid of v.edges) this.unindexEdge(eid);
    v.x = p.x; v.y = p.y; v.z = p.z;
    this.vertByKey.set(ptKey3(p), id);
    for (const eid of v.edges) this.indexEdge(eid);
  }

  /**
   * 把顶点 from 并进 to（身份分辨率：两点 ≤ r 就是一个点；planarize 的合并原语，2026-10-24 D11）。
   * 尽量**保边 id**：from 的边改接到 to（曲线 / 层登记的 id 不变）；坍缩边（另一端就是 to）删；与 to 已有边平行重合的删（faceLinks 并进既有边）。from 随之消亡。
   */
  mergeVertex(from: VertexId, to: VertexId): void {
    if (from === to) return;
    const vf = this.vertex(from), vt = this.vertex(to);
    for (const eid of [...vf.edges]) {
      const e = this.edge(eid);
      const o = e.a === from ? e.b : e.a;
      if (o === to) { this.removeEdge(eid); continue; }   // 坍缩
      const dup = this.edgeBetween(o, to);
      if (dup !== undefined) {   // 平行重合：并进既有边
        const d = this.edge(dup);
        for (const f of e.faceLinks) if (!d.faceLinks.includes(f)) d.faceLinks.push(f);
        this.removeEdge(eid);
        continue;
      }
      this.unindexEdge(eid);
      if (e.a === from) e.a = to; else e.b = to;
      vf.edges.delete(eid); vt.edges.add(eid);
      this.indexEdge(eid);
    }
    if (this.vertsById.has(from) && this.vertex(from).edges.size === 0) {
      this.vertsById.delete(from);
      this.vertByKey.delete(ptKey3({ x: vf.x, y: vf.y, z: vf.z }));
    }
  }

  private removeEdgeKeepVerts(id: EdgeId): void {
    const e = this.edge(id);
    this.unindexEdge(id);
    this.edgesById.delete(id);
    this.vertex(e.a).edges.delete(id);
    this.vertex(e.b).edges.delete(id);
  }

  /** 深拷贝（含 id 计数器——preview 影子副本的 id 分配与真身逐一致）。 */
  clone(): PlanarGraph {
    const g = new PlanarGraph();
    g.nextV = this.nextV;
    g.nextE = this.nextE;
    for (const [id, v] of this.vertsById) g.vertsById.set(id, { id: v.id, x: v.x, y: v.y, z: v.z, edges: new Set(v.edges) });
    for (const [id, e] of this.edgesById) g.edgesById.set(id, { id: e.id, a: e.a, b: e.b, faceLinks: [...e.faceLinks] });
    for (const [k, vid] of this.vertByKey) g.vertByKey.set(k, vid);
    for (const [k, set] of this.grid) g.grid.set(k, new Set(set));
    for (const [id, keys] of this.edgeCells) g.edgeCells.set(id, [...keys]);
    return g;
  }
}
