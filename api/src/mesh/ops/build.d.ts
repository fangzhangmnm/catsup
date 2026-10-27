import type { Pt3 } from "../../kernel/geom.ts";
import { MeshKernel } from "../mesh-kernel.ts";
/** 空处建多边形：新点 + 一张面。 */
export declare function addPolygon(k: MeshKernel, pts: readonly Pt3[], mat?: number): {
    face: number;
    verts: number[];
};
/** 既有顶点围成一张面（填洞）。 */
export declare function fillLoop(k: MeshKernel, verts: readonly number[], mat?: number): number;
/** 盒子（min, max 对角）：8 点 6 面，面朝外。 */
export declare function addBox(k: MeshKernel, min: Pt3, max: Pt3, mat?: number): {
    verts: number[];
    faces: number[];
};
