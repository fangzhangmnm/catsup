import { MeshKernel } from "./mesh-kernel.ts";
export interface TriSoup {
    positions: Float32Array;
    indices: Uint32Array;
    triMaterial?: Uint16Array;
}
/** 每个三角形一张面（退化的——两个下标一样 / 越界——跳过并计数，调用方披露）。 */
export declare function meshFromTriangles(t: TriSoup): {
    kernel: MeshKernel;
    skipped: number;
};
/** 外来文件的三角：顶点为了法线 / UV 劈开过（同一位置几个下标）；normals 可缺（缺的分量 = NaN）。 */
export interface SplitTriangles {
    positions: Float32Array;
    normals?: Float32Array | null;
    indices: Uint32Array;
}
export interface SplitCastReport {
    skipped: number;
    faces: number;
    quads: number;
    soft: number;
    hard: number;
    usedNormals: boolean;
}
/**
 * 外来文件的三角 → 网格体（2026-10-29 Claude Opus 5.5；user 10-29「导入的时候要respect平滑组……软边的话应该是软边，然后应该keep quad。当然我知道gltf没法保quad」
 * 「如果你是一个平滑的模型，导入进来不应该有一堆硬边」）。三步：
 *  ① **焊**：同一位置的顶点并成一个——文件为了法线 / UV 把顶点劈开，不焊 = 网格在接缝处是裂的（裂开的边只挨一张面 = 棱，一拉就撕开）。
 *  ② **拼回四边形**：glTF 只存三角；Blender 导出时一个多边形的三角是连着写的。前后两个三角共用两个**顶点下标**（同法线同 UV 的对角线）、
 *     绕向一致、拼起来是凸的、折得不厉害 → 原来是一个四边形，拼回去。全三角的模型里碰巧连着的一对也会被拼（形状照旧、只是面少了）。
 *  ③ **软硬边看文件的法线**（glTF 的平滑组就是这么存的）：一条边两侧在两个端点用的是同一个法线 = 平滑，劈开了 = 棱。
 *     「默认平滑」取多数（平滑边多 → smooth、把棱手标 sharp；反之 hard、把平滑边手标 smooth），以后在上面新长出来的边跟多数走。
 *     文件没法线（或某条边端点缺法线）→ 那些边按角度（softDeg，和以前一样）。
 */
export declare function meshFromSplitTriangles(t: SplitTriangles, softDeg: number): {
    kernel: MeshKernel;
    report: SplitCastReport;
};
/** 内核 → 三角汤（顶点紧凑重编；每三角记面的材质槽）。 */
export declare function meshToTriangles(m: MeshKernel): TriSoup;
