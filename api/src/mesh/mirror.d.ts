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
    mirrored: number;
    unpaired: number;
    pinned: number;
}
/**
 * 镜像编辑：一组挪点 → 补上对面的点（镜过去）、中缝上的点钉回镜像面。两边都被挪了的一对：动得多的那一边说了算（哪边动了哪边为准）。
 * m = 挪之前的内核（配对按挪之前的位置找）。输出按点 id 升序（确定性）。
 */
export declare function mirrorMoves(m: MeshKernel, moves: readonly {
    v: number;
    to: Pt3;
}[], axis: MirrorAxis, tol?: number): MirrorMovesResult;
/** 这一步动了哪一边（新长出来的点按 1、挪过的点按挪的距离投票）：+1 / -1；看不出来 = 0。 */
export declare function sideOfChange(before: MeshKernel, after: MeshKernel, axis: MirrorAxis, tol?: number): -1 | 0 | 1;
/** 已经对称了吗：每个点都找得到对面、每条边的镜像也是一条边（强行对称每步先查，对称的就不重建另一半 = 另一半的 id 不乱换）。 */
export declare function isSymmetric(m: MeshKernel, axis: MirrorAxis, tol?: number): boolean;
/** 跨过镜像面的面（两侧都有点）有几张：强行对称做不了这种（先在中缝上切一刀）。 */
export declare function straddlingFaces(m: MeshKernel, axis: MirrorAxis, tol?: number): number;
export interface SymmetrizeResult {
    removedFaces: number;
    removedVerts: number;
    added: number;
    pinned: number;
}
/**
 * 强行对称：中缝上的点钉回镜像面；删掉 side 的另一边全部面和点；把 side 这边的面镜过去（绕向反过来 = 朝向一致，中缝上的点两边共用 = 焊上）。
 * 跨过镜像面的面 = 抛（调用方先用 straddlingFaces 查，跳过并说出来）。边的标记跟着镜过去。
 */
export declare function symmetrize(m: MeshKernel, axis: MirrorAxis, side: -1 | 1, tol?: number): SymmetrizeResult;
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
