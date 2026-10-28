import { MeshKernel } from "./mesh-kernel.ts";
import type { Pt3 } from "../kernel/kernel.ts";
export type MirrorAxis = 0 | 1 | 2;
/** 镜像编辑（找得到对面的点一起改）/ 强行对称（每一步删掉另一半、照这一半镜回来）。 */
export type MirrorMode = "edit" | "force";
export interface MirrorSetting {
    readonly mode: MirrorMode;
    readonly axis: MirrorAxis;
}
/** 镜像编辑找对面的点的容差、算「在中缝上」的容差（米；调参纪律：物理长度单独定）。 */
export declare const MIRROR_TOL = 0.001;
export declare const coordOf: (p: Pt3, a: MirrorAxis) => number;
export declare const withCoord: (p: Pt3, a: MirrorAxis, c: number) => Pt3;
export declare const mirrorPt: (p: Pt3, a: MirrorAxis) => Pt3;
/** 每个点对面的点（中缝上的 = 自己；对面在容差里找不到 = -1）。空间散列，O(点数)。 */
export declare function mirrorPairs(m: MeshKernel, axis: MirrorAxis, tol?: number): Map<number, number>;
export interface MirrorMovesResult {
    moves: {
        v: number;
        to: Pt3;
    }[];
    /** 落到中缝上的点并成一个（keep 留；drop = 它的孪生点 + 落点处本来就有的中缝点，一起并进去；at = 并到哪）。两种模式都有，调用方提交 meshMerge。 */
    merges: {
        keep: number;
        drop: number[];
        at: Pt3;
    }[];
    mirrored: number;
    unpaired: number;
    pinned: number;
    /** 想穿过镜像面被夹住的点数（R3）。 */
    clamped: number;
}
/**
 * 挪点在镜像下的纪律（设计稿 `ai-docs/20261028-mirror-redo-design.md` §1，user 10-28「中间的点往外拖不应该变成两个点，而是被吸附在中线上」「往中线拖也是collapse到中线，不要有double point，不要拖到对面去」）：
 * R1 钉：中缝上的点只在面内滑；R3 不穿：跑到对面的点夹在镜像面上；R2 并：落到中缝的点和孪生点并成一个（孪生点自己的目标作废）；
 * 镜像编辑另外补上对面的点（镜过去），两边都被挪了的一对：动得多的那一边说了算（哪边动了哪边为准）；强行对称只管住这一边，另一半事后由对称化重建。
 * m = 挪之前的内核（分边、配对都按挪之前的位置）。输出按点 id 升序（确定性）。
 */
export declare function mirrorMoves(m: MeshKernel, moves: readonly {
    v: number;
    to: Pt3;
}[], axis: MirrorAxis, mode?: MirrorMode, tol?: number): MirrorMovesResult;
/** 这一步动了哪一边（新长出来的点按 1、挪过的点按挪的距离投票；挪到中缝上的点按它来的那一边算）：+1 / -1；看不出来 = 0。 */
export declare function sideOfChange(before: MeshKernel, after: MeshKernel, axis: MirrorAxis, tol?: number): -1 | 0 | 1;
/** 已经对称了吗：每个点都找得到对面、每条边的镜像也是一条边（强行对称每步先查，对称的就不重建另一半 = 另一半的 id 不乱换）。 */
export declare function isSymmetric(m: MeshKernel, axis: MirrorAxis, tol?: number): boolean;
/** 跨过镜像面的面（两侧都有点）有几张：强行对称做不了这种（先在中缝上切一刀）。 */
export declare function straddlingFaces(m: MeshKernel, axis: MirrorAxis, tol?: number): number;
export interface BisectResult {
    cutEdges: number;
    splitFaces: number;
    left: number;
}
/**
 * 沿镜像面切开（Blender Symmetrize / 镜像修改器的 Bisect 同款；user 10-28「镜像你忘了做切割」）：两端在两侧的边在镜像面上劈开（新点钉在面上），
 * 再把跨过镜像面的面沿中缝上的两个点劈成两半。一张面里中缝上的点不止两个（凹多边形被镜像面切成好几段）= 劈不了，数进 left。
 */
export declare function bisectPlane(m: MeshKernel, axis: MirrorAxis, tol?: number): BisectResult;
export interface SymmetrizeResult {
    removedFaces: number;
    removedVerts: number;
    added: number;
    pinned: number;
    cutEdges: number;
    walls: number;
}
/**
 * 强行对称：先沿镜像面切开（bisectPlane）；中缝上的点钉回镜像面；删掉 side 的另一边全部面和点；把 side 这边的面镜过去
 * （绕向反过来 = 朝向一致，中缝上的点两边共用 = 焊上）。切开以后还有跨过镜像面的面（凹多边形劈不开）= 抛（调用方在副本上先试，说出来）。边的标记跟着镜过去。
 * 最后 R4：整张躺在镜像面上、镜完变成夹层的面（每条边都夹在 ≥ 3 张面之间）清掉（user 10-28「degenerate和中线上的面也许应该清」，读成「只清会变成夹层的」）。
 */
export declare function symmetrize(m: MeshKernel, axis: MirrorAxis, side: -1 | 1, tol?: number): SymmetrizeResult;
/** R4：整张躺在镜像面上、而且每条边都已经夹在 ≥ 3 张面之间的面（镜完变成两半中间的夹层）删掉；孤零零躺在镜像面上的平面（没有两侧）不碰。返回删了几张。 */
export declare function removeSeamWalls(m: MeshKernel, axis: MirrorAxis, tol?: number): number;
export type SnapSide = "auto" | "flip" | "average";
export interface SnapResult {
    pairs: number;
    pinned: number;
    unpaired: number;
}
/**
 * 对称对齐（只对选区；Blender Snap to Symmetry）：选中的点在容差里找对面的点，对齐成严格的镜像；中缝附近的点钉到镜像面。
 * 以哪边为准：auto = 选区重心在哪边就以哪边为准（user「8同意」）/ flip = 另一边 / average = 两边取平均。对面找不到的不动、数出来。
 */
export declare function snapToSymmetry(m: MeshKernel, verts: readonly number[], axis: MirrorAxis, tol: number, mode?: SnapSide): SnapResult;
