import type { Pt3 } from "../kernel/geom.ts";
import { type Xform } from "../scene/xform.ts";
import { type PickMesh, type TriGrid } from "./surface-pick.ts";
import { type PaintMesh, type TexelTable } from "./texel-table.ts";
/** 目标的网格体（MeshKernel 满足）。rev = 修改号（任何改动都换一个从没用过的新值；画画的准备按它判过期，space-prep.ts）。 */
export interface TargetMesh extends PickMesh, PaintMesh {
    readonly rev: number;
    /** 身份：缓存按它认（施工单十八第 1½ 刀：目标是 scene/uv.ts 的 uvMesh 视图，视图每次组名单都是新的，背后的内核才是同一个）。 */
    readonly kernel: object;
}
/** 名单里的一项。 */
export interface PaintTarget {
    /** 名单里的身份（摆放 + 画）。 */
    readonly id: string;
    readonly mesh: TargetMesh;
    /** 这份摆放：定义坐标 → 世界（3 × 4，可以带缩放）。 */
    readonly xform: Xform;
    /** 哪一套贴图坐标（内核里那一列的 GUID）。 */
    readonly uvSet: string;
    /** 那一套的密度：定义坐标里每米几格。 */
    readonly pxPerM: number;
    /** 画布的格数。 */
    readonly canvas: {
        readonly width: number;
        readonly height: number;
    };
    /** 铺的时候块之间留的格数（1-3a 默认 4）：归属表往块外延 gap / 2 格。 */
    readonly gap?: number;
    /** 这张面走不走这张画（场景那一层的问法；这里不认识材质）。 */
    walks(face: number): boolean;
}
/** 一项目标算好的东西。三角形的编号 = 1-3a 格子里的编号（castRay 返回的那个）。 */
export interface TargetGeo {
    readonly target: PaintTarget;
    readonly grid: TriGrid;
    readonly table: TexelTable;
    readonly inv: Xform;
    /** 每个三角形三个角的世界位置（9 个数）。 */
    readonly wpos: Float64Array;
    /** 每个三角形的世界法向（单位长，3 个数；退化 = 0）。 */
    readonly wnorm: Float64Array;
    /** 格长：根号下（世界里的面积 ÷ 画布上的面积）；这张面在这一列上没有值 / 画布上退化 = 0。 */
    readonly texelLen: Float64Array;
    /** 每个三角形三个角的网格体点编号。 */
    readonly vids: Int32Array;
    /** 相邻（CSR）：第 t 个三角形的邻居 = adj[adjStart[t] .. adjStart[t + 1])。有一条公共的边（两个公共点，按点编号认）就算，同一张面切出来的也算。 */
    readonly adjStart: Int32Array;
    readonly adj: Int32Array;
}
/** 这份摆放的名义缩放（三个轴缩放的几何平均 = 线性部分行列式绝对值的立方根）。 */
export declare function xformScale(x: Xform): number;
/** 路的单位（1-4a 第一节第 7 条）：名单里最密的那一项的名义值 = 那份摆放的缩放 ÷ 那一套坐标的密度（世界里一格多大）。落笔时就知道。 */
export declare const pathUnit: (targets: readonly PaintTarget[]) => number;
/** 建一项（O(三角形数)）。 */
export declare function buildTargetGeo(target: PaintTarget): TargetGeo;
/** 一条射线打中了什么：目标（哪一项、哪个三角形、世界里的位置）/ 打中了但不是目标（挡住了，或者那张面不走画）/ 什么都没打中。 */
export type Hit = {
    readonly kind: "target";
    readonly ti: number;
    readonly tri: number;
    readonly pos: Pt3;
    readonly t: number;
} | {
    readonly kind: "other";
    readonly t: number;
} | null;
/**
 * 世界里的射线 o + t·d（d 不必是单位长）打中名单里哪一项的哪个三角形。眼睛看到的第一张面才算：名单里各项取最近的；
 * 那张面不走这张画 = 「打中了但不是目标」；名单之外的东西挡在前面（occluded(t) = 真）= 「打中了但不是目标」。
 */
/**
 * 世界里的射线只和第 ti 项的第 tri 个三角形求交（少打射线，1-4d 第 7 条）：和 rayHit 同样换进定义坐标、同一个求交（rayTriangle），所以打中时 t、落点和 rayHit 打中这个三角形时逐位相同。
 * 没中 = null。不查别的三角形、不查名单之外挡着的（调用的人只在两头都打中这个三角形、屏幕上很近时用）。
 */
export declare function rayHitTri(geos: readonly TargetGeo[], ti: number, tri: number, o: Pt3, d: Pt3): Hit | null;
export declare function rayHit(geos: readonly TargetGeo[], o: Pt3, d: Pt3, occluded?: (t: number) => boolean): Hit;
