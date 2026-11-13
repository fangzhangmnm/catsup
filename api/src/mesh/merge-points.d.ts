import type { Pt3 } from "../kernel/geom.ts";
import { type FaceShape, type MergeRule } from "./columns.ts";
/** 合并到哪：排在第一的那个点，或一组权重（和 verts 一一对应、非负、和 > 0）。 */
export type MergeTo = "first" | {
    readonly weights: readonly number[];
};
export interface MergeGroup {
    readonly verts: readonly number[];
    readonly to: MergeTo;
}
/**
 * 边的标记怎么并（几条边合并成同一对点时；第七¾节第 2 条）：「标记 → 规则名」的纯数据（user 11-13：「抽象成规则，而不是让引擎通过语义来判断」），
 * 规则名就是列的那三个（columns.ts MergeRule），缺省值都是 0（没这个标记）。合并的代码只按规则名办（mergeScalar），不认识哪一位是什么意思。
 *   defaultIfMixed = 都一样才留、不一样回 0 = 都有才留：手标的棱、平滑、不画线、隐藏（一条藏一条看得见 = 看得见的赢，统筹 11-13，和硬表面 kernel/layers.ts 第④条一致）；
 *   firstNonDefault = 有一个不是 0 就取它 = 有一个就留：接缝、裸线（裸线是「这条边可以不挂面」的结构位，不是属性）。
 * 和 edge-mark-rules.ts 的 JOIN 表必须一致（both ↔ defaultIfMixed、either ↔ firstNonDefault、structural ↔ firstNonDefault；那张 import 内核、这里不能 import 它），由 test/edge-mark-rules.test.ts 守。
 * 第三步边的标记搬上属性表之后，这张表换成每一列自己的声明。
 */
export declare const EDGE_FLAG_RULES: Readonly<Record<number, MergeRule>>;
export declare const mergeEdgeFlags: (flags: readonly number[]) => number;
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
    readonly edgeFlags: ArrayLike<number>;
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
    readonly b: number;
    readonly flags: number;
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
