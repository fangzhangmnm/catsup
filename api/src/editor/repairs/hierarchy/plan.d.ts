import type { BrepSnapshot, EdgeId, FaceId, Kernel } from "../../../kernel/kernel.ts";
import { type Xform } from "../../../scene/xform.ts";
export interface Piece {
    faces: FaceId[];
    edges: EdgeId[];
}
/** 含面的连通块；按块里最小的面 id 排（确定）。scope 有 = 只要碰到这些面 / 边的块。 */
export declare function piecesOf(k: Kernel, scope?: {
    faces: readonly FaceId[];
    edges: readonly EdgeId[];
} | null): Piece[];
/** 比对的容差（米）：内核坐标量化 1 µm，复制 / 旋转出来的件差几 µm；大件按尺寸放宽。 */
export declare function congruenceTol(snap: BrepSnapshot): number;
/** 便宜的指纹：点 / 边 / 面数 + 各面外环边数的分布。指纹不同 = 一定不一样。 */
export declare function shapeKey(s: BrepSnapshot): string;
/**
 * 把 a 摆成 b 的刚体变换（旋转 + 平移；mirror = 也试带镜像的，先试不带的）；对不上 = null。
 * 做法：点的重心对重心；a 里挑两个「离重心的距离最少撞车」的点 p、q（不和重心共线），b 里找离重心一样远、彼此一样远的 p′、q′，
 * 两组点各张一个右手架 → 旋转；每个候选都整件验一遍（sameAfter）。
 */
export declare function congruentXform(a: BrepSnapshot, b: BrepSnapshot, opt?: {
    mirror?: boolean;
    tol?: number; /** 试满上限还没比完（太对称）时叫一声——不静默当成「不一样」。 */
    onGiveUp?: () => void; /** 试的上限（缺 = MAX_TRIES；测试用）。 */
    maxTries?: number;
}): Xform | null;
/**
 * 分门别类：形状一样的归一类。classes[c] = 这一类的成员下标（第一个 = 模板）；xf[i] = 模板 → 第 i 个的刚体变换（模板自己 = 单位）。
 * 贪心：按顺序，每个先和同指纹的各类模板比，对上就进那类，都对不上就自己开一类。
 */
export declare function classifyShapes(snaps: readonly BrepSnapshot[], opt?: {
    mirror?: boolean;
}): {
    classes: number[][];
    xf: Xform[];
    gaveUp: number;
};
