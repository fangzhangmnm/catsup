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
}
export declare function groupCoplanar(g: PlanarGraph, reg: PlaneRegistry, tol: number, keepPlanes: ReadonlySet<PlaneId>, scope?: CoplanarScope): Map<PlaneId, EdgeId[]>;
