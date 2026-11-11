import type { Pt3 } from "../../kernel/geom.ts";
/**
 * 只沿 axis（单位长）以 pivot 为中心缩放 f 倍：p + axis·((p − pivot)·axis·(f − 1))。
 * f = 0 = 压到「过 pivot、垂直 axis」的平面上（Blender S X 0）；f = −1 = 沿这根轴翻过来。
 * 缩放手势（tools/mesh-transform.ts 锁轴那一档）和「压平」（editor/mesh-edits）共用这一段。
 */
export declare function scaleAlong(p: Pt3, pivot: Pt3, axis: Pt3, f: number): Pt3;
/**
 * 一圈点自己的朝向 = 最贴合它们的那个平面的法向（最小二乘：协方差矩阵最小特征值那个方向）。
 * 解法：协方差矩阵的伴随阵 adj(C) 和 C 同一组特征向量、特征值是另两个的乘积，所以 C 最小的那个在 adj(C) 里最大——
 * 拿 adj(C) 行列式最大的那一行当起点（点几乎共面时它已经就是答案），再用 adj(C) 乘、每遍归一（= 反幂迭代，不用求逆），收敛为止、最多 FIT_ITERS 遍。
 * adj(C) 半正定，乘的过程中方向不会来回翻。两个最小的特征值几乎一样大时（点云不扁）收敛慢、本来也没有唯一的面，用到上限那一遍。
 * 不用周围面的法向平均：套在胳膊上的一圈点，周围的面朝四面八方，平均下来几乎是零；最贴合平面的法向正好是胳膊的方向。
 * 少于 3 个点 / 几乎共线（贴合平面不唯一）= null。方向的正负不管（压平和正负无关）。
 * （白模 W-5 补丁，2026-11-10：以前只取那一行、没有迭代——点不在一个平面上时会偏，Fable 审出来的。）
 */
export declare const FIT_ITERS = 64;
export declare function bestFitNormal(pts: readonly Pt3[]): Pt3 | null;
/** 压平：每个点沿 axis 压到过 pivot 的平面上（= scaleAlong 缩到 0）。只回会动的点（正好在那个平面上的不动；差一点点的也压——镜像面要正好是零）。 */
export declare function flattenMoves(pts: ReadonlyMap<number, Pt3>, pivot: Pt3, axis: Pt3): {
    v: number;
    to: Pt3;
}[];
