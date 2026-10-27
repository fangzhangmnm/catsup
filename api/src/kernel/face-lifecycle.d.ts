import { type Pt } from "./geom.ts";
import { type EdgeId, type FaceId, type VertexId, PlanarGraph } from "./topology.ts";
import { type Region, type Ring } from "./facefind.ts";
import { type PlaneId, PlaneRegistry, type CoplanarScope } from "./planes.ts";
import type { ChangeLog } from "./change-log.ts";
export type FaceEvent = {
    type: "BIRTH";
    face: FaceId;
} | {
    type: "DIVIDE";
    from: FaceId;
    into: FaceId[];
} | {
    type: "MERGE";
    from: FaceId[];
    into: FaceId;
} | {
    type: "ABSORB";
    from: FaceId;
    into: FaceId;
} | {
    type: "BURST";
    face: FaceId;
} | {
    type: "STRETCH";
    faces: FaceId[];
} | {
    type: "FACE_ERASED";
    face: FaceId;
};
export interface Face {
    readonly id: FaceId;
    readonly planeId: PlaneId;
    outer: Ring;
    holes: Ring[];
    /** 外环 2D 包围盒（平面基下；入库时算一次）——结算机「膜入选」的粗筛，不用逐膜 pointInRing（2026-10-23）。 */
    readonly bbox: {
        x0: number;
        y0: number;
        x1: number;
        y1: number;
    };
}
export declare function bboxOfRing(r: Ring): {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
};
/** erase 前的裁决快照（删边前算好；loop 身份以批开始时的状态为准，删除顺序无关）。 */
export interface EraseVerdicts {
    burst: Set<FaceId>;
    mergePairs: [FaceId, FaceId][];
    heal: Set<FaceId>;
}
/** 每平面的 region 提取结果。 */
export type RegionsByPlane = Map<PlaneId, Region[]>;
export declare class FaceStore {
    /** 改动日志（Kernel 接上；DT96）：膜表是带记账的 Map（put / drop 都记）；原地改环的地方调 touch。 */
    log: ChangeLog | null;
    private byId;
    /** 原地改了这张膜的环（溶解 splice / 顶点并掉后改写环上的编号）：记一笔。 */
    touch(id: FaceId): void;
    /** 平面 → 膜 id（单主人：只在 put / drop 里维护；结算机按被碰平面取膜，不扫全表。2026-10-23） */
    private byPlane;
    private nextId;
    private put;
    /** 删过的膜（id 从不复用）：Kernel.emit 只拿它们去清面层（2026-10-26 Claude Opus 5.5，纪元账本 DT93）。 */
    private removedF;
    drainRemovedFaces(): FaceId[];
    private drop;
    faces(): Face[];
    face(id: FaceId): Face | undefined;
    faceCount(): number;
    planeIds(): Set<PlaneId>;
    /** 这张平面上的膜（索引，O(该平面膜数)）。 */
    facesOnPlane(pid: PlaneId): Face[];
    /** p 须为该 face 平面 canonical 基下的 2D 坐标。 */
    faceContains(f: Face, p: Pt): boolean;
    private occurrences;
    /** coplanarity 分组 + 每平面跑 findRegions（canonical 基投影）。scope = 局部结算的影响域（planes.ts CoplanarScope）；不给 = 全局。 */
    regionsByPlane(g: PlanarGraph, reg: PlaneRegistry, tol: number, scope?: CoplanarScope): RegionsByPlane;
    /**
     * 删边**前**按 loop 身份裁决。radial：命中面先按平面分组，各平面独立裁决。
     * 局部化（2026-10-27 Claude Fable 5.1，家族周账 F-97 ① / Fable 账单 T2）：候选面 = 这条边的 faceLinks（边 → 膜的权威索引），不再扫全部膜
     * ——以前每条被擦的边都 O(全部膜)（坦克 800 条 4.6 s）。faceLinks 按 id 升序，裁决顺序确定。
     */
    snapshotEraseVerdicts(g: PlanarGraph, edgeIds: readonly EdgeId[]): EraseVerdicts;
    /**
     * 擦边后的整理。局部化（2026-10-27 Claude Fable 5.1，家族周账 F-97 ① / Fable 账单 T2；证明留档 ai-docs/proofs/20261027-erase-localization.md）：
     * 胞腔只在**被碰到的平面**上算（并组成员 / 整理膜所在的平面；每张平面取 τ 内的全部边——含裸线，和全局同一份输入），别的平面一条胞腔都不切；
     * faceLinks 增量维护（relinkFaces），不全量重建。opts.global = 老路（全平面全膜，差分 oracle：结果必须逐字相同）。
     * 以前每擦一次都把全部平面重新切胞腔：全合并坦克（3.2 万面 / 1.35 万平面）擦 50 条软边 97 s、和擦几条几乎无关。
     */
    reconcileErase(g: PlanarGraph, reg: PlaneRegistry, tol: number, v: EraseVerdicts, opts?: {
        global?: boolean;
    }): FaceEvent[];
    /** 静默出库（结算机 / 删膜用；叙事由调用方负责）。 */
    deleteSilently(id: FaceId): boolean;
    eraseFaces(g: PlanarGraph, ids: readonly FaceId[]): FaceEvent[];
    /** 顶点 id 环快照（搬迁前拍；经合并映射 + 新坐标读出 = 像）。只拍给定的膜（moveVertices 只要被牵连的）；不给 = 全部。 */
    captureSnaps(_g: PlanarGraph, ids?: Iterable<FaceId>): Map<FaceId, {
        outer: VertexId[];
        holes: VertexId[][];
    }>;
    /**
     * 持久化装载：从顶点环**复原**一张存储态的膜（不是构造——不跑 face-finding、不发事件；A4「膜涌现且被存储」
     * 的存储态由文件带回）。环 = 顶点 id 序列（A3：两点至多一边，边由 edgeBetween 唯一恢复）；pts 按平面基重算。
     * 只给 Kernel.fromBrep 用，调用方负责校验。created 2026-09-20 by Claude Fable 5.1
     */
    restoreFace(g: PlanarGraph, reg: PlaneRegistry, planeId: PlaneId, outer: readonly VertexId[], holes: readonly (readonly VertexId[])[]): Face;
    /** 深拷贝（含 id 计数器；preview 影子副本用）。 */
    /** 倒带（O1）：这几张膜恢复成 base 里的样子（深拷环）；base 没有的删；计数器 / 删过的膜表照 base。put / drop 走表的记账钩子 = 渲染缓存知道它们又变了。 */
    restoreFrom(base: FaceStore, fids: ReadonlySet<FaceId>): void;
    clone(): FaceStore;
    /** 铸新膜。 */
    mint(planeId: PlaneId, r: Region): Face;
    /** 以给定 id 落一张膜（一对一承继：保 id，换平面亦跟随）。 */
    setFace(id: FaceId, planeId: PlaneId, r: Region): Face;
    /** faceLinks 权威重建（全量；装载 / 擦边用）：per 出现（桥边同面双现 → 同 id 两次；radial：多平面各挂一次）。 */
    rebuildFaceLinks(g: PlanarGraph): void;
    /**
     * faceLinks 增量维护（结算机用，O(变了的膜的环)，2026-10-23）：changed = 本次出库 / 入库 / 换环的膜 id；oldRings = 它们改动前的环边
     * （出库 / 换环前记下）。先把 id 从旧环边上摘干净，再按现在的环逐次挂回（per 出现）。没变的膜与边一个不碰。
     * 前提（fuzz 守着）：膜环边的 faceLinks 含它；切边时子边继承父边的 faceLinks（topology.splitEdge / replaceEdgeWithChain）。
     */
    relinkFaces(g: PlanarGraph, changed: Iterable<FaceId>, oldRings: ReadonlyMap<FaceId, readonly EdgeId[]>): void;
}
/** 膜现在的全部环边 id（外环 + 洞），给 relinkFaces 记旧环用。 */
export declare function ringEdgeIds(f: Face): EdgeId[];
/** 容错环顶点提取（共享：移动快照 / 壳层手中集）——环边可能已被本批切割移除：缺失边的起点=前一条边的终点。 */
export declare function ringVidsTolerant(g: {
    hasEdge(id: EdgeId): boolean;
    edge(id: EdgeId): {
        a: VertexId;
        b: VertexId;
    };
}, r: Ring): VertexId[];
