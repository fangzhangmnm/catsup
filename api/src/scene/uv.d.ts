import type { MeshKernel, ColumnDef, FaceReport } from "../mesh/mesh-kernel.ts";
import type { Guid } from "../format/guid.ts";
import type { UvDoc } from "../format/document.ts";
import type { Pt3 } from "../kernel/geom.ts";
/** 贴图坐标的格子：1/1024 格（施工单十八第四节）。 */
export declare const UV_Q = 1024;
/** 取整到 1/UV_Q 格（铺法输出、读文件时用；内核插值靠 UV_AT_COL.quantum 自己取整）。 */
export declare const quantizeUv: (x: number) => number;
/** 面上那一列：这张面在哪套排法上（速查表下标；−1 = 没有位置）。并成时来源不一致 = 引擎自己回 −1（属性规程第七½节 E）。 */
export declare const UV_SET_COL: ColumnDef;
/** 角上那一列：每角两个数，格（1/1024 格的整数倍）；没有位置的面 = 0。并成时取最前的；对不上由收尾把代号改成 −1（uvLosses）。 */
export declare const UV_AT_COL: ColumnDef;
/** 这两列的 id（读写文件的门口跳过它们、另按 uv 通道写）。 */
export declare const UV_COLUMN_IDS: ReadonlySet<string>;
/** 内核上有没有贴图坐标那两列。 */
export declare const hasUvColumns: (k: MeshKernel) => boolean;
/** 没有就加上（原有的面：代号 −1、坐标 0）。 */
export declare function ensureUvColumns(k: MeshKernel): void;
/** 这张面的代号（−1 = 没有位置；没有那两列 / 面不在 = −1）。 */
export declare function uvCodeOf(k: MeshKernel, f: number): number;
/** 这张面在哪套排法上（GUID）；没有位置 = null。 */
export declare function uvSetOfFace(k: MeshKernel, slots: readonly Guid[], f: number): Guid | null;
/** 这张面在排法 uvSet 上的坐标（角数 × 2，格，拷一份）；不在这一套上 = null。 */
export declare function uvAt(k: MeshKernel, slots: readonly Guid[], f: number, uvSet: Guid): Float32Array | null;
/** 在排法 uvSet 上有位置的每张活面的包围盒，摊平成 [横小, 纵小, 横大, 纵大, …]（补面时「画布上哪里被占着」）。 */
export declare function uvBoxes(k: MeshKernel, slots: readonly Guid[], uvSet: Guid): Float64Array;
/** 这个网格体在不在排法 uvSet 上（速查表里有没有它；第 3 刀拿掉这个信号）。 */
export declare const onUvSet: (slots: readonly Guid[], uvSet: Guid) => boolean;
/**
 * 唯一的写口：把面 f 放到排法 uvSet 上，角上的坐标 at（角数 × 2，格）。uvSet 不在速查表里就追加；内核上没有那两列就加上。
 * 返回它原来在哪套上——原来在别的套上 = 那个位置被盖掉了（调用方数出来、说一句；施工单十八 3.2½，第 2 刀起记进 freed）；没有位置 / 同一套 = null。
 */
export declare function placeFace(k: MeshKernel, slots: Guid[], f: number, uvSet: Guid, at: ArrayLike<number>): Guid | null;
/** 拿掉面 f 的位置（代号 −1、坐标清成 0）。返回原来在哪套上（没有 = null）。 */
export declare function unplaceFace(k: MeshKernel, slots: readonly Guid[], f: number): Guid | null;
/** 面从 source 搬到 target 时（并物件 / 炸开，照材质槽那几行）：把 source 的速查表并进 target（没有的追加），返回代号换号的函数（−1 → −1）。 */
export declare function mergeUvSlots(target: Guid[], source: readonly Guid[]): (code: number) => number;
/** 整张面搬到别的内核时交给 fresh 的值里，贴图坐标的代号换成目标那边的（mergeUvSlots 给的函数）。 */
export declare function remapUvCode(face: Map<string, number>, remap: (code: number) => number): void;
/**
 * 读内核报告（每一步的收尾调，editor/paint-upkeep.ts）：这一步里新面 / 改过的面贴图坐标对不上的——
 *   面上的代号来源之间不一样：引擎照声明（defaultIfMixed）已经给了 −1，这里只数；
 *   代号一样、角上的坐标对不上 / 取不到：坐标照「取最前的」，这里判成没有位置（drop）。
 * drop = 现在还有位置、要拿掉的面；lost = 来源里有位置、收尾之后没有位置的面数（数出来、提示行说一句；不许悄悄丢）。
 */
export declare function uvLosses(k: MeshKernel, report: FaceReport): {
    drop: number[];
    lost: number;
};
/** 读坐标的那几块（铺法、每格的表、笔的目标、拾取、画布小窗的线）看到的网格体：几何照内核，贴图坐标按排法问。 */
export interface UvMesh {
    readonly kernel: MeshKernel;
    readonly rev: number;
    faces(): number[];
    faceVerts(f: number): number[];
    facePts(f: number): Pt3[];
    faceNormal(f: number): Pt3;
    pt(v: number): Pt3;
    hasF(f: number): boolean;
    isFaceHidden(f: number): boolean;
    faceTriangles(f: number): readonly (readonly [number, number, number])[];
    /** 这张面在排法 uvSet 上的坐标；不在 = null。 */
    uvAt(f: number, uvSet: Guid): Float32Array | null;
    /** 在排法 uvSet 上有位置的面的包围盒（摊平）。 */
    uvBoxes(uvSet: Guid): Float64Array;
    /** 这个网格体的速查表（短代号 → 排法 GUID）。 */
    uvSets(): readonly Guid[];
}
/** 内核 + 它那张速查表 → 视图（预演的影子内核也一样：传影子内核和场景里那张表）。 */
export declare function uvMesh(k: MeshKernel, slots: readonly Guid[]): UvMesh;
/**
 * 内存 → 载荷：速查表原样（先后在写文件时按 GUID 排、换号，format/mesh-payload.ts）；每张面一个代号、每角两个数，面和角的先后照 meshDocFromKernel（k.faces() 的先后、各面 faceVerts 的先后）。
 * 网格体不在任何排法上（速查表空）= 没有（不写 uv 通道，和以前一样）。没有位置的面：代号 −1、坐标 0。
 */
export declare function uvDocOf(k: MeshKernel, slots: readonly Guid[]): UvDoc | undefined;
/**
 * 载荷 → 内存（读文件，kernelFromMeshDoc 刚建好的内核：第 i 张面 = 载荷第 i 张面）：速查表接上 uv.sets，代号、坐标原样写进那两列。
 * 载荷在门口已经收过口（format/mesh-payload.ts、format/paint-read.ts：坏的面代号已是 −1、坐标 0）。
 */
export declare function applyUvDoc(k: MeshKernel, slots: Guid[], uv: UvDoc): void;
