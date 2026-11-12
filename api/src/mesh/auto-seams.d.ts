import type { MeshKernel } from "./mesh-kernel.ts";
/** 读到的那点网格体（MeshKernel 满足）。 */
export type AutoSeamMesh = Pick<MeshKernel, "faces" | "faceVerts" | "edgeOf" | "eFaces" | "edgeA" | "edgeB" | "edgeFlags" | "pt" | "faceNormal" | "hasF">;
export interface AutoSeamOptions {
    /** 折痕：两张面法向夹角 ≥ 这么多度的边切。 */
    readonly angleDeg: number;
}
export interface AutoSeamResult {
    /** 要新标成接缝的边（升序；不含已经是接缝的）。 */
    readonly add: number[];
    /** 补的理由各几条（一条边只算第一个理由）：非流形 / 折痕 / 为了摊平（几个开口之间连线、把手）/ 封闭的壳切一刀。 */
    readonly why: {
        readonly nonManifold: number;
        readonly crease: number;
        readonly flatten: number;
        readonly closed: number;
    };
    /** 补完以后分成几片。 */
    readonly charts: number;
    /** 补之前（只算 user 的接缝 + ①②）有几片不是盘。 */
    readonly notDisk: number;
}
/**
 * 按「切口」cut（边 → 是不是切开）把范围里的面分片，并算每片切开后的欧拉数。
 * 片 = 隔着「挨两张范围里的面、没切」的边连得上的面。返回每片的面（升序）和 χ。
 */
export declare function chartTopology(m: AutoSeamMesh, faces: readonly number[], cut: (e: number) => boolean): {
    faces: number[];
    chi: number;
}[];
/**
 * 自动标接缝。faces = 范围（null = 整个网格体）；范围外的面不碰，范围的外沿当片的边界（不补接缝）。
 */
export declare function autoSeams(m: AutoSeamMesh, faces: readonly number[] | null, opts: AutoSeamOptions): AutoSeamResult;
