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
    /** 这张面在排法 uvSet 上的坐标；不在 = null（scene/uv.ts uvMesh；施工单十八第 1½ 刀起不直接问内核）。 */
    uvAt(f: number, uvSet: string): Float32Array | null;
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
/** 取样点偏移的量化：1/SAMPLE_Q 格（1-4c）。和贴图坐标的量化是同一个数（施工单十八第四节：收成一个常量，从网格体的列模块来）。 */
export declare const SAMPLE_Q = 1024;
/** 取样点离格子中心最多几格（每格的表里偏移是 16 位、加 32768 存：−32768 … 32767 份）。取样点离中心不超过间隔的一半，所以 gap 最多 MAX_GAP。 */
export declare const MAX_GAP = 63;
/**
 * 建表。gap = 铺的时候块之间留的格数（没人要的界线 = 它的一半；最多 MAX_GAP，超了 = 抛）。
 * others = 同一套排法上别的物件的面（施工单十八第 2 刀 b：每格归谁按排法看所有物件）：只拿多边形（贴图坐标）参加「每格归最近的那块」，
 *   归了它们的格在这张表里 = −1（这一笔碰不到）；和这张表自己的面贴图坐标完全相同的那块 = 自己的那块（共用一张画）。不进 polys / polyFaces / faces，
 *   所以表的形状不变；没有 others = 和以前逐格一样。一样近：自己的块编号小、先来，留着。
 */
export declare function buildTexelTable(width: number, height: number, faces: readonly PaintFace[], gap?: number, others?: readonly ArrayLike<number>[]): TexelTable;
/**
 * 每块画布多边形有哪些格（归属表 owner 的另一种排法，油漆桶用；2026-11-13 Claude Opus 5.5，统筹「按『哪块多边形有哪些格』记一次、表变了再重算」）：
 * runs[p] = 这块的行段 [x, y, 长度, x, y, 长度…]（按行、行内从左到右），cells[p] = 格数。和 owner 逐格相同（守卫 test/paint-bucket.test.ts）。
 * 记一次 = 扫整张 owner 一遍（2048² 四百万格，十来毫秒）；缓存在表对象上（WeakMap），表重建了（准备过期重建 = 新对象）自然重算，不另记版本号。
 */
export interface PolyRuns {
    readonly runs: readonly Int32Array[];
    readonly cells: readonly number[];
}
export declare function polyRunsOf(t: TexelTable): PolyRuns;
/** 一格的取样点离格子中心的偏移（②，量化过的）：以 1/SAMPLE_Q 格为单位的两个整数。中心在它那块多边形里（含边上）= [0, 0]；在外面 = 多边形上离中心最近的那一点，四舍五入到份。没人要的格子 = null。 */
export declare function sampleOffset(t: TexelTable, x: number, y: number): [number, number] | null;
/** 一格的取样点（②）：中心 + 量化过的偏移。中心在多边形里 = 中心；在外面 = 离多边形上最近那一点不到 1/2048 格（每个轴）。没人要的格子 = null。 */
export declare function samplePoint(t: TexelTable, x: number, y: number): [number, number] | null;
/** 画布上一点 (sx, sy) 在某张面上的空间位置（③）：这张面自己的三角形里贴图坐标上离它最近的那个（一样近取编号小的），用它的公式算。面不走这张画 = null。 */
export declare function positionOnFace(t: TexelTable, face: number, sx: number, sy: number): {
    pos: Pt3;
    tri: number;
} | null;
/** 一格在某张面上的空间位置：取样点（②）→ 这张面上的位置（③）。这张面不在这一格那块画布多边形里（或者这格没人要）= null。 */
export declare function cellPosition(t: TexelTable, face: number, x: number, y: number): Pt3 | null;
