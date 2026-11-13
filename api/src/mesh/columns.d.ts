import type { Pt3 } from "../kernel/geom.ts";
/** 列挂在哪一类东西上（规程第三节的五类）。这一刀只实现 corner、face。 */
export type Domain = "vertex" | "edge" | "face" | "corner" | "faceEdge";
/** 每个东西上几个什么数：floats = 几个 32 位浮点；int = 一个 32 位整数。 */
export type ColumnType = {
    readonly floats: number;
} | "int";
/** 并成时怎么取。 */
export type MergeRule = "first" | "firstNonDefault" | "defaultIfMixed";
/** 一列的声明（规程第七½节 E）。内核只把 id 当名字；kind / extra 不透明。 */
export interface ColumnDef {
    readonly id: string;
    readonly on: Domain;
    readonly type: ColumnType;
    /** 连续 = 「之间」按权重混；离散 = 取权重最大的来源。int 一定离散。 */
    readonly continuous: boolean;
    /** 缺省值（floats 每个分量同一个数）。 */
    readonly fill: number;
    /** 格子多细（只对连续的 floats）：值是 1/quantum 的整数倍，插出来的数取整到这一格（MeshKernel.check M7½）。 */
    readonly quantum?: number;
    /** 新长的跟不跟旁边（grown 带 neighbor 时照抄它）。 */
    readonly followNeighbor?: boolean;
    readonly merge: MergeRule;
    readonly kind?: string;
    readonly extra?: unknown;
}
/** 角上的一列（内核里的）：data 和 loopVert 平行，长度 ≥ 角的槽数 × arity。 */
export interface CornerColumn {
    readonly def: ColumnDef;
    readonly id: string;
    readonly arity: number;
    data: Float32Array;
}
/** 面上的一列（内核里的）：data[面编号]，长度 ≥ 面的槽数。 */
export interface FaceColumn {
    readonly def: ColumnDef;
    readonly id: string;
    data: Int32Array;
}
/** 一份声明这一刀做不做得了、合不合规矩：不合 = 抛（人话里带 id）；做得了 = 角上的返回每角几个数，面上的返回 0。 */
export declare function checkColumnDef(d: ColumnDef): number;
/** 两份声明是不是同一列（逐项；extra 不透明，按引用比）。 */
export declare function sameColumnDef(a: ColumnDef, b: ColumnDef): boolean;
/** 角上的列这一次对不上的样子：mixed = 并成时来源之间不一样；missing = 取不到（哪张来源都没有这个点 / 旧面切不出三角形）。两样都有记 missing。 */
export type CornerOdd = "mixed" | "missing";
/** 一张面在一次来历里「对不上」的列：面上的列 → 各个来源的值（来源的先后 = 来历里的先后）；角上的列 → 对不上 / 取不到。 */
export interface OddFace {
    readonly face: ReadonlyMap<string, readonly number[]>;
    readonly corner: ReadonlyMap<string, CornerOdd>;
}
/** 内核的报告：这段时间里新面 / 改过的面当中「有列对不上」的那些（面编号 → 哪几列）。面已经不在了的不报。 */
export interface FaceReport {
    readonly odd: ReadonlyMap<number, OddFace>;
}
/** 面的旧样子。没有列的内核：ring / pts / corner / face 都是 null（只记材质，几乎不花时间）。 */
export interface FaceShape {
    readonly mat: number;
    readonly ring: readonly number[] | null;
    /** 环上各点当时的位置（x y z × 角）。 */
    readonly pts: Float64Array | null;
    /** 角上的每一列在各角上的值（id → 角数 × arity）。 */
    readonly corner: ReadonlyMap<string, Float32Array> | null;
    /** 面上的每一列的值（id → 值）。 */
    readonly face: ReadonlyMap<string, number> | null;
    /** 它身上还没交出去的「对不上」（跟着来历传给新面）。 */
    readonly odd?: OddFace;
    /** 显示时用的那套三角形（懒算、记在这里，一张旧面只算一次）。 */
    tris?: [number, number, number][];
}
/** 取样处：原来第几个角（照抄）/ 一个位置（在旧样子的三角形上取）/ 空着（默认规矩）。 */
export type SampleAt = number | Pt3 | undefined;
export type FaceOrigin = {
    readonly kind: "piece";
    readonly of: FaceShape;
    readonly from?: readonly SampleAt[];
} | {
    readonly kind: "copy";
    readonly of: FaceShape;
    readonly corners: readonly number[];
} | {
    readonly kind: "grown";
    readonly neighbor?: number;
} | {
    readonly kind: "joined";
    readonly of: readonly FaceShape[];
} | {
    readonly kind: "fresh";
    readonly corner?: ReadonlyMap<string, Float32Array>;
    readonly face?: ReadonlyMap<string, number>;
};
export declare const GROWN: FaceOrigin;
export declare const FRESH: FaceOrigin;
/** 内核那边给这一段代码看的窄接口（不让这里认识整个内核）。 */
export interface ColumnHost {
    readonly cornerCols: readonly CornerColumn[];
    readonly faceCols: readonly FaceColumn[];
    pt(v: number): Pt3;
    hasF(f: number): boolean;
}
/**
 * 算一张新面 / 新环上的数：面上的列写进 data[f]，角上的列写进 data[slot × arity …]（slot = 这个环在 loopVert 里的起点）。
 * 返回这张面「对不上」的列（没有 = null）。调用方（MeshKernel.addFace / setFaceRing）保证数组已经长到能装下。
 */
export declare function writeColumns(h: ColumnHost, origin: FaceOrigin, f: number, ring: readonly number[], slot: number): OddFace | null;
