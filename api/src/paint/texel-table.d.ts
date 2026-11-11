import type { Pt3 } from "../kernel/geom.ts";
/** 一个三角形：tri = 这张面的第几个三角形（MeshKernel.faceTriangles 的先后；落点 surface-pick.ts 返回同一个号）、三个角的贴图坐标（格）和空间位置。 */
export interface PaintTri {
    readonly face: number;
    readonly tri: number;
    readonly uv: readonly [number, number, number, number, number, number];
    readonly pos: readonly [Pt3, Pt3, Pt3];
}
/** 一张走这一列贴图坐标的面：环上各角的贴图坐标（环的先后）+ 显示用的那套三角形。 */
export interface PaintFace {
    readonly face: number;
    readonly ring: Float64Array;
    readonly tris: readonly PaintTri[];
}
/** 位置公式：画布上的位置 (x, y) → 空间位置 o + du·x + dv·y。 */
export interface Formula {
    readonly o: Pt3;
    readonly du: Pt3;
    readonly dv: Pt3;
}
export interface FacePaint {
    readonly face: number;
    readonly poly: number;
    readonly tris: readonly (PaintTri & {
        readonly uvf: Float64Array;
        readonly formula: Formula;
    })[];
}
export interface TexelTable {
    readonly width: number;
    readonly height: number;
    readonly gap: number;
    /** 画布多边形（并过的）：环上各角的贴图坐标 [x0, y0, x1, y1…]（第一次出现的那张面的环序）。 */
    readonly polys: readonly Float64Array[];
    /** 每块画布多边形是哪几张面的（镜像两半、复制出来的面在同一块里）。 */
    readonly polyFaces: readonly (readonly number[])[];
    /** 每一格（行 × 宽 + 列）归哪块画布多边形；−1 = 没人要。 */
    readonly owner: Int32Array;
    /** 每张面：它在哪块画布多边形里 + 它的三角形和公式。 */
    readonly faces: ReadonlyMap<number, FacePaint>;
    /** 被两块以上画布多边形盖住（中心严格在它们里面，压在边上不算）的格数：第一段的铺法不会有；以后手动拖贴图坐标的工具用它提示。 */
    readonly overlapCells: number;
}
/** 网格体那一点（MeshKernel 满足）。 */
export interface PaintMesh {
    faces(): number[];
    faceVerts(f: number): number[];
    pt(v: number): Pt3;
    faceTriangles(f: number): readonly (readonly [number, number, number])[];
    cornerValues(f: number, guid: string): Float32Array | null;
}
/** 这个网格体走 guid 这一列的所有面（角上没有值的面不算），按面的编号。三角形 = 第一节那一套（MeshKernel.faceTriangles）。 */
export declare function paintFaces(m: PaintMesh, guid: string): PaintFace[];
/** 三角形三个角的贴图坐标和空间位置 → 位置公式。贴图坐标退化（面积是零）= 常数公式（三个角的平均）。 */
export declare function formulaOf(uv: ArrayLike<number>, pos: readonly [Pt3, Pt3, Pt3]): Formula;
export declare const positionAt: (f: Formula, x: number, y: number) => Pt3;
/** 点和多边形：2 = 压在边上，1 = 里面，0 = 外面（奇偶规则，环朝哪边都行）。压在边上 = 和某条边叉积为零且在它的范围里（不分配，建表时每格都要问）。 */
export declare function polyWhere(r: ArrayLike<number>, px: number, py: number): 0 | 1 | 2;
/** 点在不在多边形里（含边上）。 */
export declare const inPoly: (r: ArrayLike<number>, px: number, py: number) => boolean;
/** 多边形边界上离点最近的那一点。 */
export declare function nearestOnPoly(r: ArrayLike<number>, px: number, py: number): [number, number];
/** 点到多边形的距离（在里面 / 边上 = 0）。 */
export declare function distToPoly(r: ArrayLike<number>, px: number, py: number): number;
/** 点到三角形的距离（在里面 / 边上 = 0）。 */
export declare const distToTri: (t: ArrayLike<number>, px: number, py: number) => number;
/** 建表。gap = 铺的时候块之间留的格数（没人要的界线 = 它的一半）。 */
export declare function buildTexelTable(width: number, height: number, faces: readonly PaintFace[], gap?: number): TexelTable;
/** 一格的取样点（②）：中心在它那块多边形里（含边上）= 中心；在外面 = 多边形上离中心最近的那一点。没人要的格子 = null。 */
export declare function samplePoint(t: TexelTable, x: number, y: number): [number, number] | null;
/** 画布上一点 (sx, sy) 在某张面上的空间位置（③）：这张面自己的三角形里贴图坐标上离它最近的那个（一样近取编号小的），用它的公式算。面不走这张画 = null。 */
export declare function positionOnFace(t: TexelTable, face: number, sx: number, sy: number): {
    pos: Pt3;
    tri: number;
} | null;
/** 一格在某张面上的空间位置：取样点（②）→ 这张面上的位置（③）。这张面不在这一格那块画布多边形里（或者这格没人要）= null。 */
export declare function cellPosition(t: TexelTable, face: number, x: number, y: number): Pt3 | null;
