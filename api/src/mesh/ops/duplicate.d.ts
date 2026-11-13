import type { MeshKernel } from "../mesh-kernel.ts";
import type { Pt3 } from "../../kernel/geom.ts";
export interface MeshSel {
    readonly faces?: readonly number[];
    readonly edges?: readonly number[];
    readonly verts?: readonly number[];
}
/** 复制：选中的面（连它们的点）、选中的边、选中的点各来一份新的，叠在原处；面带材质槽。返回新的点 / 边 / 面（顺序跟原件的 id 升序）。 */
export declare function duplicateGeometry(k: MeshKernel, sel: MeshSel): {
    verts: number[];
    edges: number[];
    faces: number[];
};
/** 选中的边（或只选了点时：选中点之间的开口边）连成的圈。每个点在圈里恰好连两条 = 合格；不合格 = 人话错误。 */
export declare function edgeLoops(k: MeshKernel, sel: MeshSel): number[][] | string;
/** 让这一圈的方向和旁边已有的面一致：填出来的面过共享边要和邻面反向（单面网格的正面 = 环的绕向）。旁边没有面 = 原样。 */
export declare function orientAsHole(k: MeshKernel, ring: number[]): number[];
/** 补洞 / 桥接：选中的边是一圈 = 补一张面；两圈点数一样 = 中间连一圈四边形（错位按距离挑最近的对齐）。返回新面；不合格 = 人话错误。 */
export declare function fillOrBridge(k: MeshKernel, sel: MeshSel): {
    kind: "fill" | "bridge";
    faces: number[];
} | string;
/** 环的 Newell 法向（长度 = 面积的两倍）。造面（make-face.ts）也用。 */
export declare function ringNewell(k: MeshKernel, ring: readonly number[]): Pt3;
/** 造这张面会坏的情况（人话）；没有 = null。计划和指令各核一遍。 */
/**
 * 一组点（不看点序）的平面：形心 c、离形心最远那个点的方向 u、和 u 张成面积最大的那个点定法向 n、w = n × u。蝴蝶结这种点序反着绕的也给得出平面（Newell 法会抵消成零）。
 * 全在一条线上（最大的那块面积 ≤ 1e-9 × 点距²）= null。造面排点（make-face.ts）和验点序（faceBlocker）共用。
 */
export declare function looseFrame(P: readonly Pt3[]): {
    c: Pt3;
    u: Pt3;
    w: Pt3;
    n: Pt3;
} | null;
export declare function faceBlocker(k: MeshKernel, ring: readonly number[]): string | null;
/** 已经有一张面正好是这组点（不看顺序）。补洞和造面共用。 */
export declare function faceExists(k: MeshKernel, ring: readonly number[]): boolean;
/** 指令 meshMakeFace 的本体：按点序造一张面（两点 = 一条裸线）。返回新面 / 新边；会坏 = 人话错误（什么都没动）。 */
export declare function makeFaceRing(k: MeshKernel, ring: readonly number[]): {
    face: number;
} | {
    edge: number;
} | string;
