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
 * 候选平面发现：seeds 处两两 incident 边张成的平面经 registry 容差合并（sticky 身份）；返回这些平面的 id。
 * 新平面只会出现在新几何周围，所以局部结算只从脏顶点长；全局模式从全部顶点长。
 */
export declare function discoverPlanes(g: PlanarGraph, reg: PlaneRegistry, tol: number, seeds: Iterable<VertexId>): Set<PlaneId>;
/**
 * 局部结算的作用域（影响域定理，2026-10-23，Claude Fable 5.1；立宪页 §3「局部性定理」）：
 *   only  = 被碰到的平面；
 *   edges = 每张被碰平面上**这次要用的边集**，由结算机按影响域算出（脏边 ∪ 受影响膜的环边 ∪ 从脏顶点沿裸线可达的边 ∪ 影响域包围盒内落在该平面上的边）。
 * 这里不再维护「平面 → 全部成员边」的缓存（10-21 的 PlaneMembership 在溶解步之后过期且永不自愈 → 总账 #26）：
 * 边属于哪张平面是一个几何谓词，不是状态；要用时按影响域现算。不给 scope = 全局（擦边路径 / 差分 oracle）。
 */
export interface CoplanarScope {
    only: ReadonlySet<PlaneId>;
    edges: ReadonlyMap<PlaneId, ReadonlySet<EdgeId>>;
}
/**
 * 平面分组 → planeId → 边集（≥3 条才可能围面；少于 3 条的组丢弃）。keepPlanes = 存储 face 的平面（防被 prune）。
 * 全局：候选平面从全部顶点长，归属 = 两端点都在 τ 内的边，全扫（cover：一条边可进多组）。
 * 局部：只按 scope.edges 分发（成员边由调用方按影响域给出，已在平面上），没检查过的平面一律留着。
 */
export declare function groupCoplanar(g: PlanarGraph, reg: PlaneRegistry, tol: number, keepPlanes: ReadonlySet<PlaneId>, scope?: CoplanarScope): Map<PlaneId, EdgeId[]>;
