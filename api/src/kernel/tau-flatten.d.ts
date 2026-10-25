import { type Pt3 } from "./geom.ts";
import { type EdgeId, type VertexId, PlanarGraph } from "./topology.ts";
export interface FlattenPlane {
    basis: {
        u: Pt3;
        v: Pt3;
    };
    edges: ReadonlySet<EdgeId>;
}
export interface FlattenCtx {
    /** 身份分辨率（米）。 */
    r: number;
    /** 本次操作前就存在的顶点 → 参照物（新几何让位）。 */
    isOldVertex: (v: VertexId) => boolean;
    isOldEdge: (e: EdgeId) => boolean;
    /** 本次新来 / 动过的边（只配这些；本机维护：合并后 to 的边入脏，死边出脏）。 */
    dirty: Set<EdgeId>;
    onSplit?: (parent: EdgeId, children: readonly EdgeId[]) => void;
    /** 顶点合并回调，**在合并之前**调用（图里 from 还在，可沿 from 的边找到引用它的膜环改写 vids）。 */
    onMerge?: (from: VertexId, to: VertexId) => void;
}
/** 调试钩子（默认 null 零开销）。 */
export declare const FLATTEN_DEBUG: {
    log: ((line: string) => void) | null;
};
/** 对一批平面做一轮 τ-flatten；返回是否改了图。一轮只做一类（合并 > 切割），改了就该让调用方重跑 planarize 再来。 */
export declare function flattenPlanes(g: PlanarGraph, planes: Iterable<FlattenPlane>, ctx: FlattenCtx): boolean;
