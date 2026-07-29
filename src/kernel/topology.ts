// topology.ts —— PlanarGraph：vertex/edge 的原始增删（拓扑 ⊥ 几何：本层只管谁连谁 + 顶点坐标）。
// 公理 2（非流形连接）预留：Edge.faceLinks 是**变长列表**不是左/右两指针——
// 升维（M3 多平面）后一条边可挂 N 张面，这根 radial cycle 的位置现在就留好。
// 公理 3（重合即同一）：顶点身份 = 量化格点 Map；两点落同格 = 同一个 vertex。

import { type Pt, ptKey } from "./geom.ts";

export type VertexId = number;
export type EdgeId = number;
/** face 实体住在 face-lifecycle.ts；本层只把 FaceId 当不透明号码挂在 faceLinks 上。 */
export type FaceId = number;

export interface Vertex { readonly id: VertexId; x: number; y: number; readonly edges: Set<EdgeId>; }
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
  pt(id: VertexId): Pt { const v = this.vertex(id); return { x: v.x, y: v.y }; }
  otherEnd(e: Edge, v: VertexId): VertexId { return e.a === v ? e.b : e.a; }

  /** p 须已量化。 */
  vertexAt(p: Pt): VertexId | undefined { return this.vertByKey.get(ptKey(p)); }

  /** 重合即同一：同格点返回既有 vertex。p 须已量化。 */
  ensureVertex(p: Pt): VertexId {
    const k = ptKey(p);
    const existing = this.vertByKey.get(k);
    if (existing !== undefined) return existing;
    const id = this.nextV++;
    this.vertsById.set(id, { id, x: p.x, y: p.y, edges: new Set() });
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
        this.vertByKey.delete(ptKey({ x: v.x, y: v.y }));
      }
    }
  }

  /**
   * 在 p（须已量化、落在边内部）把边切成两半。faceLinks 复制给两半
   * （几何上两半仍贴着同一批面；权威值由 face-lifecycle 重建）。
   */
  splitEdge(id: EdgeId, p: Pt): { v: VertexId; e1: EdgeId; e2: EdgeId } {
    const e = this.edge(id);
    const links = [...e.faceLinks];
    const a = e.a, b = e.b;
    this.removeEdgeKeepVerts(id);
    const v = this.ensureVertex(p);
    const e1 = this.addEdge(a, v);
    const e2 = this.addEdge(v, b);
    this.edge(e1).faceLinks = [...links];
    this.edge(e2).faceLinks = [...links];
    return { v, e1, e2 };
  }

  /** 顶点移动的底层写（sticky 语义在 kernel 层编排；这里只改坐标 + 换 key）。 */
  relocateVertex(id: VertexId, p: Pt): void {
    const v = this.vertex(id);
    const oldKey = ptKey({ x: v.x, y: v.y });
    if (this.vertByKey.get(ptKey(p)) !== undefined && this.vertByKey.get(ptKey(p)) !== id) {
      throw new Error("relocateVertex 目标格点已被占用——sticky 合并该在调用方先做");
    }
    this.vertByKey.delete(oldKey);
    v.x = p.x; v.y = p.y;
    this.vertByKey.set(ptKey(p), id);
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
    for (const [id, v] of this.vertsById) g.vertsById.set(id, { id: v.id, x: v.x, y: v.y, edges: new Set(v.edges) });
    for (const [id, e] of this.edgesById) g.edgesById.set(id, { id: e.id, a: e.a, b: e.b, faceLinks: [...e.faceLinks] });
    for (const [k, vid] of this.vertByKey) g.vertByKey.set(k, vid);
    return g;
  }
}
