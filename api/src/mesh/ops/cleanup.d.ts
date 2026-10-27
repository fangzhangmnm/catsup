import { MeshKernel } from "../mesh-kernel.ts";
/** 两面法向夹角 ≤ deg 的内部边（恰两张不同面）并掉；然后把变成二度共线（夹角 ≤ deg）的点溶掉。返回并掉的边数 / 点数。 */
export declare function limitedDissolve(k: MeshKernel, deg?: number): {
    edges: number;
    verts: number;
};
/** 去重点：相距 ≤ dist 的顶点并成一个（到中心）。格子桶，O(n)。返回并掉的点数。 */
export declare function removeDoubles(k: MeshKernel, dist?: number): number;
