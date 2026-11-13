import type { Pt3 } from "../kernel/geom.ts";
/** 一列（内核里的）：data 和 loopVert 平行，长度 ≥ 角的槽数 × arity。 */
export interface CornerColumn {
    readonly guid: string;
    readonly arity: number;
    readonly kind: string;
    readonly extra?: unknown;
    data: Float32Array;
}
/** 一列的样子（搬到别的内核时按它补列）。 */
/** kind = 这一列是什么：「uv」= 贴图坐标（arity 2；GUID = 场景排法表里那一行的号；单位 = 格，值一律是 1/UV_Q 格的整数倍）；别的种类原样带着走（施工单十八 3.2）。 */
export interface ColumnDef {
    readonly guid: string;
    readonly arity: number;
    readonly kind: string; /** 文件里这一列不认识的键（不透明，内核不看；读写文件的门口原样带回）。 */
    readonly extra?: unknown;
}
/** 贴图坐标的量化：1/UV_Q 格（施工单十八第四节：凡是产出贴图坐标的地方，最后一步量化到它；存成整数再读回来逐位相同）。
 *  和归属表取样点的量化（texel-table.ts SAMPLE_Q）是同一个数：两边都从这里来。 */
export declare const UV_Q = 1024;
/** 一个贴图坐标量化到 1/UV_Q 格（四舍五入；不往整格上凑）。 */
export declare const quantizeUv: (x: number) => number;
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
