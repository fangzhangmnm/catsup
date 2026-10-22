import { type Pt3 } from "./geom.ts";
export type VertexId = number;
export type EdgeId = number;
/** face 实体住在 face-lifecycle.ts；本层只把 FaceId 当不透明号码挂在 faceLinks 上。 */
export type FaceId = number;
export interface Vertex {
    readonly id: VertexId;
    x: number;
    y: number;
    z: number;
    readonly edges: Set<EdgeId>;
}
export interface Edge {
    readonly id: EdgeId;
    a: VertexId;
    b: VertexId;
    faceLinks: FaceId[];
}
export declare class PlanarGraph {
    private vertsById;
    private edgesById;
    private vertByKey;
    private nextV;
    private nextE;
    private grid;
    private edgeCells;
    /** 线段 ab 穿过的格（去重）。 */
    private cellsAlong;
    private indexEdge;
    private unindexEdge;
    /** 离线段 ab 不远的边（超集；含 a / b 落在一格里 = 点查）。 */
    edgesNear(a: Pt3, b: Pt3): Edge[];
    /** 离线段 ab 不远的顶点（= 近边的端点；孤立顶点不存在，所以这就是全集的超集）。 */
    verticesNear(a: Pt3, b: Pt3): Vertex[];
    vertices(): Vertex[];
    edges(): Edge[];
    vertexCount(): number;
    edgeCount(): number;
    vertex(id: VertexId): Vertex;
    edge(id: EdgeId): Edge;
    hasEdge(id: EdgeId): boolean;
    hasVertex(id: VertexId): boolean;
    pt(id: VertexId): Pt3;
    otherEnd(e: Edge, v: VertexId): VertexId;
    /** p 须已量化。 */
    vertexAt(p: Pt3): VertexId | undefined;
    /** 重合即同一：同格点返回既有 vertex。p 须已量化。 */
    ensureVertex(p: Pt3): VertexId;
    /** 直线世界里两点间至多一条边。 */
    edgeBetween(v1: VertexId, v2: VertexId): EdgeId | undefined;
    /** 调用方负责先查 edgeBetween（重合即同一）；自环拒绝。 */
    addEdge(v1: VertexId, v2: VertexId): EdgeId;
    /** 删边；孤立顶点顺带回收（无边的顶点不是一等实体——SU 的 stray vertex 不存在）。 */
    removeEdge(id: EdgeId): void;
    /**
     * 在 p（须已量化、落在边内部）把边切成两半。faceLinks 复制给两半
     * （几何上两半仍贴着同一批面；权威值由 face-lifecycle 重建）。
     */
    splitEdge(id: EdgeId, p: Pt3): {
        v: VertexId;
        e1: EdgeId;
        e2: EdgeId;
    };
    /**
     * 批量顶点搬迁（planarize 协议第 1 步的底层写：全部先摘 key、再改坐标、再上 key——
     * 中途无「一半已动」的 key 冲突瞬态）。调用方保证终态无 key 碰撞（碰撞=合并，须先在
     * kernel 层做完顶点合并再来）。added by Claude Fable 5 2026-09-01
     */
    relocateVertices(batch: readonly {
        id: VertexId;
        to: Pt3;
    }[]): void;
    /**
     * 把边替换为沿 a→b 的顶点链（planarize 的切割原语；splitEdge 的批量+去重容忍版）：
     * 链段若与既有边重合 → 复用既有边（重合即同一，公理 3）；顶点全程保留（不 GC 端点）。
     * pts 须已量化、按 a→b 参数序、不含 a/b 本身。返回沿 a→b 的有向子边序列。
     * added by Claude Fable 5 2026-09-01
     */
    replaceEdgeWithChain(id: EdgeId, pts: readonly Pt3[]): {
        edge: EdgeId;
        fwd: boolean;
    }[];
    /** 顶点移动的底层写（sticky 语义在 kernel 层编排；这里只改坐标 + 换 key）。 */
    relocateVertex(id: VertexId, p: Pt3): void;
    private removeEdgeKeepVerts;
    /** 深拷贝（含 id 计数器——preview 影子副本的 id 分配与真身逐一致）。 */
    clone(): PlanarGraph;
}
