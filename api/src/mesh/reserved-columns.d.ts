import type { FaceColumn, MeshKernel } from "./mesh-kernel.ts";
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
