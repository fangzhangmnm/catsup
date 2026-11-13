import type { Pt3 } from "../kernel/geom.ts";
export interface PickMesh {
    faces(): number[];
    faceVerts(f: number): number[];
    pt(v: number): Pt3;
    faceTriangles(f: number): readonly (readonly [number, number, number])[];
    /** 这张面在排法 uvSet 上的坐标；不在 = null（scene/uv.ts uvMesh；施工单十八第 1½ 刀起不直接问内核）。 */
    uvAt(f: number, uvSet: string): Float32Array | null;
    isFaceHidden?(f: number): boolean;
}
/** 均匀格子：所有（没藏起来的）三角形的角（每个 9 个数）、属于哪张面、是那张面的第几个三角形、角在环上的位置，加上格子到三角形的登记表。 */
export interface TriGrid {
    readonly pos: Float64Array;
    readonly face: Int32Array;
    readonly triInFace: Int32Array;
    readonly corner: Int32Array;
    readonly min: Pt3;
    readonly cell: number;
    readonly nx: number;
    readonly ny: number;
    readonly nz: number;
    readonly start: Int32Array;
    readonly list: Int32Array;
}
export type PickResult = null | {
    readonly face: number;
    readonly inPaint: false;
    readonly pos: Pt3;
    readonly t: number;
} | {
    readonly face: number;
    readonly inPaint: true;
    readonly tri: number;
    readonly bary: readonly [number, number, number];
    readonly pos: Pt3;
    readonly t: number;
    readonly uv: readonly [number, number];
    readonly cell: readonly [number, number];
};
/** 建格子（模型改了就重建；O(三角形数)）。 */
export declare function buildTriGrid(m: PickMesh): TriGrid;
/** Möller–Trumbore（两面都算）：射线和格子里第 t 个三角形，命中的 t 和重心坐标 (u, v)（相对角 0）；没中 = null。全仓射线求交只有这一份（castRay 和空间里的笔少打射线都用它；守卫 paint-space-guard ①）。 */
export declare function rayTriangle(g: TriGrid, t: number, o: Pt3, d: Pt3): {
    t: number;
    u: number;
    v: number;
} | null;
/** 射线最先打中的三角形（格子里的编号）+ t + 重心；没中 = null。 */
export declare function castRay(g: TriGrid, o: Pt3, d: Pt3): {
    tri: number;
    t: number;
    u: number;
    v: number;
} | null;
/** 落点。guid = 那一列贴图坐标；cell = 贴图坐标往下取整（和显示时最近邻取样取到的那一格相同）。 */
export declare function pickSurface(m: PickMesh, g: TriGrid, guid: string, o: Pt3, d: Pt3): PickResult;
