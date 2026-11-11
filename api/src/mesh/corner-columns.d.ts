import type { Pt3 } from "../kernel/geom.ts";
/** 一列（内核里的）：data 和 loopVert 平行，长度 ≥ 角的槽数 × arity。 */
export interface CornerColumn {
    readonly guid: string;
    readonly arity: number;
    data: Float32Array;
}
/** 一列的样子（搬到别的内核时按它补列）。 */
export interface ColumnDef {
    readonly guid: string;
    readonly arity: number;
}
/** 面的旧样子。没有列的内核：ring / pts / vals 都是 null（只记材质，几乎不花时间）。 */
export interface FaceShape {
    readonly mat: number;
    readonly ring: readonly number[] | null;
    /** 环上各点当时的位置（x y z × 角）。 */
    readonly pts: Float64Array | null;
    /** 每一列在各角上的值（GUID → 角数 × arity）；这张面在这一列上没有值 = 不在表里。 */
    readonly vals: ReadonlyMap<string, Float32Array> | null;
    /** 显示时用的那套三角形（懒算、记在这里，一张旧面只算一次）。 */
    tris?: [number, number, number][];
}
/** 取样处：原来第几个角（照抄）/ 一个位置（在旧样子的三角形上插值）/ 空着（默认规矩）。 */
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
} | {
    readonly kind: "joined";
    readonly of: readonly FaceShape[];
} | {
    readonly kind: "fresh";
    readonly values?: ReadonlyMap<string, Float32Array>;
};
export declare const GROWN: FaceOrigin;
export declare const FRESH: FaceOrigin;
/** 内核那边给这一段代码看的窄接口（不让这里认识整个内核）。 */
export interface CornerHost {
    readonly columns: readonly CornerColumn[];
    pt(v: number): Pt3;
}
/**
 * 算一个新环的角上的数，写进每一列的 data[slot × arity …]（slot = 这个环在 loopVert 里的起点）。返回「这一步里丢了值」吗（joined 才可能）。
 * 调用方（MeshKernel.addFace / setFaceRing）保证列的数组已经长到能装下这个环。
 */
export declare function writeCorners(h: CornerHost, origin: FaceOrigin, ring: readonly number[], slot: number): boolean;
