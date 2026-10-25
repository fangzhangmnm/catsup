import { type Pt } from "./geom.ts";
import { type EdgeId, type VertexId, PlanarGraph } from "./topology.ts";
/** 区域提取的作用域：edges = 参与的边子集（默认全图）；project = 顶点投影到 2D
 *  （默认取 x,y——2D 场景/俯视）。M3 起每个平面组传自己的边集 + canonical 基投影。 */
export interface FindScope {
    edges?: Iterable<EdgeId>;
    project?: (vid: VertexId) => Pt;
    bounds?: Bounds;
}
/** 有向边：瞬态值对象（不存半边实体）。forward = 沿 edge.a→edge.b 方向。 */
export interface DirEdge {
    readonly edge: EdgeId;
    readonly forward: boolean;
}
export interface Ring {
    edges: DirEdge[];
    pts: Pt[];
    vids: VertexId[];
}
export interface Region {
    outer: Ring;
    holes: Ring[];
    area: number;
}
/** M3 局部性接缝的形参占位（M1 忽略）。 */
export interface Bounds {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
}
/** 调试钩子（期 3 角序对照；默认 null 零开销）。 */
export declare const FF_DEBUG: {
    log: ((line: string) => void) | null;
};
export declare function findRegions(g: PlanarGraph, scope?: FindScope): Region[];
/** 取 region（或存储态 face——同形状）内部一个代表点（face-lifecycle 的 anchor 匹配用）。
 *  扫描线法：过洞外的中高线取奇偶区间中点；顶点 y 撞线时微调。 */
export declare function representativePoint(r: {
    outer: Ring;
    holes: Ring[];
}): Pt;
/** 点是否在 region 内（外环内且不在任何洞内）。边界上结果未定义。 */
export declare function regionContains(r: Region, p: Pt): boolean;
