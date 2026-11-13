import type { Pt3 } from "../kernel/geom.ts";
import type { FaceShape } from "./columns.ts";
/** 合并到哪：排在第一的那个点，或一组权重（和 verts 一一对应、非负、和 > 0）。 */
export type MergeTo = "first" | {
    readonly weights: readonly number[];
};
export interface MergeGroup {
    readonly verts: readonly number[];
    readonly to: MergeTo;
}
/** 规划要读的内核（MeshKernel 满足）。 */
export interface MergeMesh {
    hasV(v: number): boolean;
    pt(v: number): Pt3;
    vEdges(v: number): ArrayLike<number>;
    eFaces(e: number): ArrayLike<number>;
    faceVerts(f: number): number[];
    shapeOf(f: number): FaceShape;
    readonly edgeA: ArrayLike<number>;
    readonly edgeB: ArrayLike<number>;
    isWire(e: number): boolean;
}
/** 挤过之后环上的一个角：落在哪个点、由原环里哪几个角挤成（原环的角号，连续一段）。 */
export interface MergeCorner {
    readonly v: number;
    readonly src: readonly number[];
}
export interface MergeFacePlan {
    readonly f: number;
    /** 合并之前的样子（环、各列的值、身上的标记）。 */
    readonly shape: FaceShape;
    /** 挤过之后的环（剪圈之前）。 */
    readonly corners: readonly MergeCorner[];
    /** 剪出来的几圈（每圈 = corners 的下标）：够三个角的成面；两个角的是刺。塌了 = 空。 */
    readonly loops: readonly (readonly number[])[];
    /** 原来的编号给哪一圈（loops 的下标）；塌了 = −1（不同的点不到三个；或剪完没有一圈够三个角——这时 loops 里的刺照样留成线）。 */
    readonly main: number;
}
export interface MergeEdgePlan {
    readonly keep: number;
    readonly a: number;
    readonly b: number; /** 并掉的里面有一条是裸线 = 留下的是裸线（结构位）。边上的列在内核里按各自的 merge 并（absorbIntoEdge）。 */
    readonly wire: boolean;
    readonly drop: readonly number[];
}
export interface MergePlan {
    /** 点 → 它合并到的幸存点（不在任何组里的点不在表里）。 */
    readonly rep: ReadonlyMap<number, number>;
    /** 组里每个点的权重（同一组里归一；合并到第一个点 = 第一个 1、别的 0）。 */
    readonly weight: ReadonlyMap<number, number>;
    /** 幸存点 → 最后的位置。 */
    readonly pos: ReadonlyMap<number, Pt3>;
    /** 被合并掉的点（编号从小到大）。 */
    readonly gone: readonly number[];
    /** 受影响的面（编号从小到大）。 */
    readonly faces: readonly MergeFacePlan[];
    /** 两头合并成同一个点的边（删）。 */
    readonly collapsed: readonly number[];
    /** 要留的边（改端点 / 并标记）和跟它并掉的边。 */
    readonly edges: readonly MergeEdgePlan[];
    /** 每组的幸存点（照传进来的组的先后）。 */
    readonly survivors: readonly number[];
}
/** 一圈点的身份（同向或反向算同一圈）：从最小的点起转，两个方向里取字典序小的。 */
export declare function ringKey(ring: readonly number[]): string;
export declare function planMerge(k: MergeMesh, groups: readonly MergeGroup[]): MergePlan;
