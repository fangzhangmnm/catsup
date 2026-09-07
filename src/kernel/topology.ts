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

export class PlanarGraph {
  private vertsById = new Map<VertexId, Vertex>();
  private edgesById = new Map<EdgeId, Edge>();
  private vertByKey = new Map<string, VertexId>();
  private nextV = 1;
  private nextE = 1;

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
    return id;
  }

  /** 删边；孤立顶点顺带回收（无边的顶点不是一等实体——SU 的 stray vertex 不存在）。 */
  removeEdge(id: EdgeId): void {
    const e = this.edge(id);
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
    // 重合即同一：切点落进既有顶点的格、而该顶点已与某端相连 → 那半边就是既有边（retrace），不新建也不 throw
    const e1 = this.edgeBetween(a, v) ?? this.addEdge(a, v);
    const e2 = this.edgeBetween(v, b) ?? this.addEdge(v, b);
    this.edge(e1).faceLinks = [...links];
    this.edge(e2).faceLinks = [...links];
    return { v, e1, e2 };
  }

  /**
   * 批量顶点搬迁（planarize 协议第 1 步的底层写：全部先摘 key、再改坐标、再上 key——
   * 中途无「一半已动」的 key 冲突瞬态）。调用方保证终态无 key 碰撞（碰撞=合并，须先在
   * kernel 层做完顶点合并再来）。added by Claude Fable 5 2026-09-01
   */
  relocateVertices(batch: readonly { id: VertexId; to: Pt3 }[]): void {
    for (const { id } of batch) {
      const v = this.vertex(id);
      this.vertByKey.delete(ptKey3({ x: v.x, y: v.y, z: v.z }));
    }
    for (const { id, to } of batch) {
      const v = this.vertex(id);
      const k = ptKey3(to);
      if (this.vertByKey.has(k)) throw new Error("relocateVertices 终态 key 碰撞——合并该在调用方先做");
      v.x = to.x; v.y = to.y; v.z = to.z;
      this.vertByKey.set(k, id);
    }
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
    v.x = p.x; v.y = p.y; v.z = p.z;
    this.vertByKey.set(ptKey3(p), id);
  }

  private removeEdgeKeepVerts(id: EdgeId): void {
    const e = this.edge(id);
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
    return g;
  }
}
