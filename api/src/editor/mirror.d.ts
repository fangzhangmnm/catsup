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
    /** 消中缝（默认 true）：缝上共面的边擦掉、夹在中间的面删掉、共线断口焊掉。 */
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
 * 对池内核 k 上选中的面 / 线（本地 id）做镜像。返回全部面事件。有 BURST → 抛 MirrorRejected（调用方转 OpTargetError，History 回滚）。
 */
export declare function mirrorGeometry(k: Kernel, faces: readonly FaceId[], edges: readonly EdgeId[], plane: MirrorPlane, opts?: MirrorOptions): FaceEvent[];
