import type { EdgeId, FaceEvent, FaceId, Pt3 } from "../kernel/kernel.ts";
import { Kernel } from "../kernel/kernel.ts";
import type { Xform } from "../scene/xform.ts";
export interface MirrorPlane {
    origin: Pt3;
    normal: Pt3;
}
export interface MirrorOptions {
    /** 删掉对面（默认 true）；false = 原件留着、对面多一份。 */
    deleteOpposite: boolean;
    /** 缝上自愈（默认 true）：缝上共面的边擦掉、夹在中间的面删掉、共线断口焊掉、正中切开的同一个圆焊回圆。 */
    mergeSeam: boolean;
    /** 融合阈值（米，默认 0）：留下这侧离镜像面这么近的点先吸到面上。 */
    weld: number;
}
export declare const MIRROR_DEFAULTS: MirrorOptions;
/** 关于平面的镜像变换（3×4 行优先）：x' = x − 2((x−o)·n)n。 */
export declare function reflectionXform(pl: MirrorPlane): Xform;
export declare class MirrorRejected extends Error {
}
/**
 * 防碎护栏（米；user 2026-10-25「切到点不要出零长度的线，然后非常近的点也有护栏」）：
 *   切点离边的端点这么近 = 就用端点；短于它的切段不要；选区里离镜像面这么近（但又不在面上）的点先吸到镜像面上（报数，不悄悄改）。
 * 尺子分工（2026-10-25 AI 建议、待 user 定）：3 µm = 同一个点（内核铁律）；10 µm = 在同一张面上（内核共面容差，判「点在不在镜像面上」用它）；
 * 本常量 = 防碎；融合阈值（user 选项，默认 0）= 额外的主动合并。
 */
export declare const CUT_SNAP = 0.0001;
/** 镜像这一步的回执（给提示行 / 参数小窗报数）。 */
export interface MirrorReport {
    snappedToPlane: number;
}
/**
 * 对池内核 k 上选中的面 / 线（本地 id）做镜像。返回全部面事件。有 BURST → 抛 MirrorRejected（调用方转 OpTargetError，History 回滚）。
 */
export declare function mirrorGeometry(k: Kernel, faces: readonly FaceId[], edges: readonly EdgeId[], plane: MirrorPlane, opts?: MirrorOptions, report?: MirrorReport): FaceEvent[];
