import { type Pt3 } from "./geom.ts";
import type { ChangeLog } from "./change-log.ts";
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
    /** 改动日志（Kernel 接上；DT96）：顶点表 / 边表是带记账的表；原地改坐标 / 改端点的几处另外显式记。
     *  表是按 id 下标的数组（id-table.ts，O3 数组制度）：遍历按 id 升序、和增删历史无关；顶点的星（edges）也是有序集。 */
    log: ChangeLog | null;
    private vertsById;
    private edgesById;
    private vertByKey;
    private nextV;
    private nextE;
    private levels;
    private edgeCells;
    /** 删过的边（id 从不复用）：Kernel.emit 只拿它们去清边层 / 曲线，不再全量扫（2026-10-26 Claude Opus 5.5，纪元账本 DT93）。 */
    private removedE;
    drainRemovedEdges(): EdgeId[];
    /** 上次 drain 以来删过的边（只看不清：结算机尾声用，emit 再 drain）。 */
    removedSinceDrain(): readonly EdgeId[];
    private indexEdge;
    private unindexEdge;
    /** 边 id 的包围盒与 [lo, hi] 外扩 m 相交？ */
    private boxHit;
    private collect;
    /** 离线段 ab 不远的边（超集；a = b = 点查）。 */
    edgesNear(a: Pt3, b: Pt3): Edge[];
    /**
     * 包围盒 [min, max] 里（碰到即算）的边（超集；调用方照旧做几何判定）。影响域定理的第四项用它：
     * 新膜包围盒里不连通的旧闭环 = 它的洞，不走顶点传递也得进边集。某级格太多（盒比这级的边还多）就这级全扫 + 包围盒相交测试。
     * added 2026-10-23 by Claude Fable 5.1
     */
    edgesInBox(min: Pt3, max: Pt3): Edge[];
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
    /** 下一个会分配的 id（单调递增）——结算机用它划「本次操作前就存在」的旧 / 新界线（τ-flatten 的参照物选择）。 */
    get nextVertexId(): number;
    get nextEdgeId(): number;
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
    /**
     * 把顶点 from 并进 to（身份分辨率：两点 ≤ r 就是一个点；planarize 的合并原语，2026-10-24 D11）。
     * 尽量**保边 id**：from 的边改接到 to（曲线 / 层登记的 id 不变）；坍缩边（另一端就是 to）删；与 to 已有边平行重合的删（faceLinks 并进既有边）。from 随之消亡。
     */
    mergeVertex(from: VertexId, to: VertexId): void;
    private removeEdgeKeepVerts;
    /**
     * 倒带（拖动预演「拷一次 + 每帧退回」，O1）：把这几个顶点 / 边恢复成 base（真身，预演期间一个字节没动）里的样子——base 有的照 base 深拷回来、base 没有的删掉；
     * 派生索引（格点键、空间网格）只对这几条重算；计数器 / 删过的边表照 base。调用方（Kernel.rewindTo）负责把触碰集按邻接扩全。
     */
    restoreFrom(base: PlanarGraph, vids: ReadonlySet<VertexId>, eids: ReadonlySet<EdgeId>): void;
    /** 顶点 / 边是否在表里（倒带扩触碰集用）；星 / 端点的只读访问走 vertex / edge。 */
    vertexOrNull(id: VertexId): Vertex | undefined;
    edgeOrNull(id: EdgeId): Edge | undefined;
    /** 深拷贝（含 id 计数器——preview 影子副本的 id 分配与真身逐一致）。 */
    clone(): PlanarGraph;
}
