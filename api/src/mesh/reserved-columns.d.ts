import type { EdgeColumn, FaceColumn, MeshKernel } from "./mesh-kernel.ts";
import type { ColumnDef } from "./columns.ts";
/** 面上的隐藏：不画、不吸、点不中、导出不出。都藏才藏（并面一藏一不藏 = 看得见，统筹 11-13）；新长的不跟旁边。 */
export declare const HIDE_POLY: ColumnDef;
/**
 * 面用网格体材质槽表（MeshBody.materialSlots）的第几个：缺省 −1 = 没有槽 = 缺省材质（我们的物体可以一个槽都没有，−1 是一个真的状态，不照 Blender 的 0）；
 * 并面留排在最前的那张的；新长的跟旁边（挤出的侧面、倒角的补片照抄被挤 / 被倒的那张面）。
 */
export declare const MATERIAL_INDEX: ColumnDef;
/** 这一步的保留名（属性页、守卫用）。 */
export declare const RESERVED_FACE: readonly ColumnDef[];
/** 面上的隐藏这一列（拿在手里读；没有 = null = 全都看得见）。 */
export declare const hiddenColumn: (k: MeshKernel) => FaceColumn | null;
/** 材质槽号这一列（拿在手里读；没有 = null = 全是 −1）。 */
export declare const materialColumn: (k: MeshKernel) => FaceColumn | null;
/** 这张面藏着吗。 */
export declare function faceHidden(k: MeshKernel, f: number): boolean;
/** 这张面用第几个材质槽（−1 = 没有槽）。 */
export declare function faceMaterial(k: MeshKernel, f: number): number;
/** 写一张面藏不藏（第一次写「藏」才建这一列；没有这一列时写「不藏」= 什么都不做）。 */
export declare function setFaceHidden(k: MeshKernel, f: number, on: boolean): void;
/** 写一张面的材质槽号（第一次写非 −1 才建这一列）。 */
export declare function setFaceMaterial(k: MeshKernel, f: number, slot: number): void;
/**
 * 凭空来的面（装载、基本体、导入、粘贴）给定的材质 / 隐藏：要写非缺省值的列先建好，返回交给 fresh 来历的面上的值（base 里别的列原样带上）。
 * 来历本身由调用方写（「凭空来的」只许出现在白名单里的文件，守卫 test/corner-columns.test.ts）。
 */
export declare function givenFaceValues(k: MeshKernel, o: {
    material?: number;
    hidden?: boolean;
}, base?: ReadonlyMap<string, number>): Map<string, number>;
/** 强制是棱（手标的棱）：明暗断开；画不画线由 soft 推（edge-smooth.ts）。Blender 的 sharp_edge。 */
export declare const SHARP_EDGE: ColumnDef;
/** 平滑：明暗跨过这条边连续——压过物体的「默认平滑」的覆盖（SketchUp 的 smooth 是全部真相，硬表面归一时定，规程第九½节）。 */
export declare const SMOOTH: ColumnDef;
/** 柔边：不画线。SketchUp 的 soft 还有「两边的面算一整块」那一半，网格体的工具现在只读不画线那一半（选面连带一片按明暗判，归一时两个引擎定成一样）。 */
export declare const SOFT: ColumnDef;
/** 展开的接缝（自动标接缝写、展开在这里剪开、画成红线）。Blender 的 uv_seam。 */
export declare const UV_SEAM: ColumnDef;
/** 边上的隐藏：不画、不导出成线、点不中、扩选跳过；读的人按这一列单独判，不从面推（规程第九½节）。名字照 Blender 把类别写进去。 */
export declare const HIDE_EDGE: ColumnDef;
export declare const RESERVED_EDGE: readonly ColumnDef[];
/** 边上的一列（拿在手里读；没有 = null = 全是 0）。 */
export declare const edgeColumn: (k: MeshKernel, d: ColumnDef) => EdgeColumn | null;
/** 这条边有这个标记吗（没有这一列 = 没有）。 */
export declare function edgeMark(k: MeshKernel, e: number, d: ColumnDef): boolean;
/** 写一条边的标记（操作本意 / 指令点名写的；第一次写「有」才建这一列，没有这一列时写「没有」= 什么都不做）。 */
export declare function setEdgeMark(k: MeshKernel, e: number, d: ColumnDef, on: boolean): void;
/** 字节里每一位是哪一列（edge-bits.ts 的位）；F_WIRE 是结构位（内核自己记），64 / 128 没有定义。 */
export declare const EDGE_BYTE_BITS: readonly (readonly [ColumnDef, number])[];
/** 字节里定义了的位（五列 + 裸线）；别的位 = 这一版不认识（读的门口去掉、记一笔）。 */
export declare const EDGE_BYTE_KNOWN: number;
/** 一条边打包成那个字节。 */
export declare function packEdgeByte(k: MeshKernel, e: number): number;
/** 那个字节拆回一条已经在的边（列第一次有值才建；裸线位 = 结构位）。字节里不认识的位调用的地方先去掉（读的门口）。 */
export declare function unpackEdgeByte(k: MeshKernel, e: number, b: number): void;
