import type { Vertex, Edge, VertexId, EdgeId, FaceId } from "./topology.ts";
import type { Face } from "./face-lifecycle.ts";
import type { PlaneRec, PlaneId } from "./planes.ts";
import type { Curve, CurveId } from "./curves.ts";
export interface TouchedIds {
    readonly V: Set<VertexId>;
    readonly E: Set<EdgeId>;
    readonly F: Set<FaceId>;
    readonly P: Set<PlaneId>;
    readonly C: Set<CurveId>;
}
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
    readonly nextVertexId: number;
    readonly nextEdgeId: number;
    readonly nextFaceId: number;
    readonly nextPlaneId: number;
    readonly nextCurveId: number;
    readonly removedEdges: readonly EdgeId[];
    readonly removedFaces: readonly FaceId[];
    readonly planeBucketWidth: number;
    readonly planePending: readonly PlaneRec[];
    /** 事件日志长度（撤销 / 倒带截回）。 */
    readonly events: number;
}
/** 字节估计（配额用；量纲：字节；常数是对象图的量级，不求准）。 */
export declare function deltaBytes(d: KernelDelta): number;
/** 让差量长成各表 restoreFrom 要的「来源」样子。 */
export declare class DeltaSource {
    readonly d: KernelDelta;
    constructor(d: KernelDelta);
    vertexOrNull(id: VertexId): Vertex | null;
    edgeOrNull(id: EdgeId): Edge | null;
    get nextVertexId(): number;
    get nextEdgeId(): number;
    removedEdges(): readonly EdgeId[];
    face(id: FaceId): Face | null;
    get nextFaceId(): number;
    removedFaces(): readonly FaceId[];
    planeOrNull(id: PlaneId): PlaneRec | null;
    get nextPlaneId(): number;
    get bucketWidth(): number;
    pendingRecs(): readonly PlaneRec[];
    curve(id: CurveId): Curve | null;
    curveOf(e: EdgeId): CurveId | undefined;
    get nextCurveId(): number;
    edgeLayerNames(): string[];
    hasEdgeLayer(name: string, id: EdgeId): boolean;
    faceLayerNames(): string[];
    getFaceLayer(name: string, id: FaceId): number | undefined;
}
