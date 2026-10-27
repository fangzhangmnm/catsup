// kernel/delta.ts —— 内核差量（撤销设计稿 ai-docs/20261027-undo-delta-design.md §2.2；Fable 账单 A3）。created 2026-10-27 by Claude Fable 5.1
// 一份差量 = 触碰集里每条记录「某一刻的样子」（null = 那一刻不存在）+ 牵连的平面 / 曲线 / 层 + 计数器 + 事件日志长度。纯数据、可估字节。
// 自反：Kernel.applyDelta(d) 把内核写成 d 的样子，返回同一组 id 的反向差量（写之前抽的现值）——撤销 / 重做 = 同一个函数（WeebPaint swapRecord 同款）。
// 差量怎么来：提交 = 影子换真身，旧真身里触碰集的记录就是「之前」（Kernel.deltaAgainst）；没有旧值日志、不用每个动词写逆。
// 各表的 restoreFrom 读的是「来源」接口（topology / face-lifecycle / planes / curves / layers 各一个）：真身内核满足它、差量也满足它（DeltaSource），倒带和撤销走同一条路。
import type { Vertex, Edge, VertexId, EdgeId, FaceId } from "./topology.ts";
import type { Face } from "./face-lifecycle.ts";
import type { PlaneRec, PlaneId } from "./planes.ts";
import type { Curve, CurveId } from "./curves.ts";

export interface TouchedIds { readonly V: Set<VertexId>; readonly E: Set<EdgeId>; readonly F: Set<FaceId>; readonly P: Set<PlaneId>; readonly C: Set<CurveId>; }

export interface KernelDelta {
  readonly ids: TouchedIds;
  readonly verts: Map<VertexId, Vertex | null>;
  readonly edges: Map<EdgeId, Edge | null>;
  readonly faces: Map<FaceId, Face | null>;
  readonly planes: Map<PlaneId, PlaneRec | null>;
  readonly curves: Map<CurveId, Curve | null>;
  readonly curveOfEdge: Map<EdgeId, CurveId | null>;
  readonly edgeLayers: Map<string, Map<EdgeId, boolean>>;
  readonly faceLayers: Map<string, Map<FaceId, number | null>>;
  readonly nextVertexId: number; readonly nextEdgeId: number; readonly nextFaceId: number; readonly nextPlaneId: number; readonly nextCurveId: number;
  readonly removedEdges: readonly EdgeId[]; readonly removedFaces: readonly FaceId[];
  readonly planeBucketWidth: number; readonly planePending: readonly PlaneRec[];
  /** 事件日志长度（撤销 / 倒带截回）。 */
  readonly events: number;
}

/** 字节估计（配额用；量纲：字节；常数是对象图的量级，不求准）。 */
export function deltaBytes(d: KernelDelta): number {
  let n = 0;
  for (const v of d.verts.values()) n += v ? 64 + v.edges.size * 8 : 16;
  for (const e of d.edges.values()) n += e ? 48 + e.faceLinks.length * 8 : 16;
  for (const f of d.faces.values()) n += f ? 64 + (f.outer.vids.length + f.holes.reduce((s, h) => s + h.vids.length, 0)) * 40 : 16;
  n += d.planes.size * 80 + d.curves.size * 64 + d.curveOfEdge.size * 16;
  for (const m of d.edgeLayers.values()) n += m.size * 12;
  for (const m of d.faceLayers.values()) n += m.size * 16;
  return n + 128;
}

/** 让差量长成各表 restoreFrom 要的「来源」样子。 */
export class DeltaSource {
  readonly d: KernelDelta;
  constructor(d: KernelDelta) { this.d = d; }
  vertexOrNull(id: VertexId): Vertex | null { return this.d.verts.get(id) ?? null; }
  edgeOrNull(id: EdgeId): Edge | null { return this.d.edges.get(id) ?? null; }
  get nextVertexId(): number { return this.d.nextVertexId; }
  get nextEdgeId(): number { return this.d.nextEdgeId; }
  removedEdges(): readonly EdgeId[] { return this.d.removedEdges; }
  face(id: FaceId): Face | null { return this.d.faces.get(id) ?? null; }
  get nextFaceId(): number { return this.d.nextFaceId; }
  removedFaces(): readonly FaceId[] { return this.d.removedFaces; }
  planeOrNull(id: PlaneId): PlaneRec | null { return this.d.planes.get(id) ?? null; }
  get nextPlaneId(): number { return this.d.nextPlaneId; }
  get bucketWidth(): number { return this.d.planeBucketWidth; }
  pendingRecs(): readonly PlaneRec[] { return this.d.planePending; }
  curve(id: CurveId): Curve | null { return this.d.curves.get(id) ?? null; }
  curveOf(e: EdgeId): CurveId | undefined { const c = this.d.curveOfEdge.get(e); return c === null || c === undefined ? undefined : c; }
  get nextCurveId(): number { return this.d.nextCurveId; }
  edgeLayerNames(): string[] { return [...this.d.edgeLayers.keys()]; }
  hasEdgeLayer(name: string, id: EdgeId): boolean { return this.d.edgeLayers.get(name)?.get(id) === true; }
  faceLayerNames(): string[] { return [...this.d.faceLayers.keys()]; }
  getFaceLayer(name: string, id: FaceId): number | undefined { const v = this.d.faceLayers.get(name)?.get(id); return v === null || v === undefined ? undefined : v; }
}
