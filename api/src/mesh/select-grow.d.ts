import type { MeshKernel } from "./mesh-kernel.ts";
export interface SelSets {
    verts: Set<number>;
    edges: Set<number>;
    faces: Set<number>;
}
/** 扩一圈。 */
export declare function growSelection(m: MeshKernel, s: SelSets): SelSets;
/** 缩一圈：挨着没选的那一圈去掉。 */
export declare function shrinkSelection(m: MeshKernel, s: SelSets): SelSets;
/** 从 base 走 steps 圈（正 = 扩、负 = 缩）。 */
export declare function stepSelection(m: MeshKernel, base: SelSets, steps: number): SelSets;
