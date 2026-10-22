import { type PlaneParams, type Pt3 } from "./geom.ts";
import { type VertexId, type EdgeId, PlanarGraph } from "./topology.ts";
export type PlaneId = number;
export interface PlaneRec {
    readonly id: PlaneId;
    readonly plane: PlaneParams;
    readonly basis: {
        u: Pt3;
        v: Pt3;
    };
}
export declare class PlaneRegistry {
    private recs;
    private nextId;
    all(): PlaneRec[];
    rec(id: PlaneId): PlaneRec;
    /** 容差匹配既有平面（法向同或反 + |Δd|≤τ，同一张几何平面只准一条记录）；没有则注册。 */
    ensure(pl: PlaneParams, tol: number): PlaneRec;
    /**
     * 持久化装载：按存储参数**精确**注册（不做容差匹配——文件里的记录本来就是 τ 合并后的产物；
     * 装载顺序 = 文件顺序，id 从当前计数器起）。只给 Kernel.fromBrep 用。created 2026-09-20 by Claude Fable 5.1
     */
    restore(pl: PlaneParams): PlaneRec;
    /** 清理无人引用的平面（keep = 当前有边组或有存储 face 的平面）。 */
    prune(keep: ReadonlySet<PlaneId>): void;
    clone(): PlaneRegistry;
}
/**
 * 平面分组：候选平面 = 每顶点处两两 incident 边张成的平面（经 registry 容差合并）；
 * 归属 = 两端点都在 τ 内的边。keepPlanes = 存储 face 的平面（防被 prune）。
 * 返回 planeId → 边集（≥3 条才可能围面；少于 3 条的组丢弃）。
 */
/**
 * 局部性接缝（2026-10-21 #14）：scope.only = 只给这些平面归属边（结算机算出的「被碰到的平面」）；scope.seedVertices = 只从这些顶点
 * 的邻边对里长新候选平面（新平面只会出现在新几何周围）。新长出来的平面 id **就地加进 scope.only**（调用方拿回去当 touched）。
 * 不给 scope = 全局（旧行为）。
 */
export interface CoplanarScope {
    only: Set<PlaneId>;
    seedVertices: Iterable<VertexId>;
    /** 本次新来 / 动过的边：它们的平面归属要重算，其余边的归属照缓存。 */
    dirtyEdges?: Iterable<EdgeId>;
    /** 面内邻域：平面 → 只用这些边找胞腔（挨着脏边的膜的环 + 连着的裸线）；没给的平面用全部成员。 */
    subset?: ReadonlyMap<PlaneId, ReadonlySet<EdgeId>>;
}
/** 平面 → 边归属缓存（#14 第二轮）：边的归属只在它自己动了时变；新平面首次出现时全扫一次。 */
export declare class PlaneMembership {
    readonly planeEdges: Map<number, Set<number>>;
    clone(): PlaneMembership;
}
export declare function groupCoplanar(g: PlanarGraph, reg: PlaneRegistry, tol: number, keepPlanes: ReadonlySet<PlaneId>, scope?: CoplanarScope, cache?: PlaneMembership): Map<PlaneId, EdgeId[]>;
