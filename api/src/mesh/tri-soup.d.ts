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
/** 外来文件的多边形（OBJ）：每个多边形 = 一圈原始下标（绕向 = 朝向）；smoothGroups = 每个多边形的平滑组（OBJ 的 s；0 = 关），没法线时按它判软硬。 */
export interface SplitPolygons {
    positions: Float32Array;
    normals?: Float32Array | null;
    polys: readonly (readonly number[])[];
    smoothGroups?: readonly number[] | null;
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
 *  ① **焊**（weldPositions）。
 *  ② **拼回四边形**：glTF 只存三角；Blender 导出时一个多边形的三角是连着写的。前后两个三角共用两个**顶点下标**（同法线同 UV 的对角线）、
 *     绕向一致、拼起来是凸的、折得不厉害 → 原来是一个四边形，拼回去。全三角的模型里碰巧连着的一对也会被拼（形状照旧、只是面少了）。
 *  ③ **软硬边**（finishPolys：看文件的法线；glTF 的平滑组就是这么存的）。
 */
export declare function meshFromSplitTriangles(t: SplitTriangles, softDeg: number): {
    kernel: MeshKernel;
    report: SplitCastReport;
};
/** 外来文件的多边形（OBJ：四边形 / n 边形原样）→ 网格体：焊 + 软硬边（看每个角的法线；没法线看平滑组；都没有按角度）。 */
export declare function meshFromSplitPolygons(t: SplitPolygons, softDeg: number): {
    kernel: MeshKernel;
    report: SplitCastReport;
};
/** 内核 → 三角汤（顶点紧凑重编；每三角记面的材质槽）。 */
export declare function meshToTriangles(m: MeshKernel): TriSoup;
