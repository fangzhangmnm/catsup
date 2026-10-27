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
/** 内核 → 三角汤（顶点紧凑重编；每三角记面的材质槽）。 */
export declare function meshToTriangles(m: MeshKernel): TriSoup;
