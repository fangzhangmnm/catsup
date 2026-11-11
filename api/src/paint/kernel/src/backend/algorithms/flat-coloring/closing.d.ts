import type { Keypoint } from "./border.ts";
export interface ClosingParams {
    /** 端点配对最大距离（px）；≤0 = 关闭样条配对 */
    dmax: number;
    /** 法线对置容差角 α（度），∈(0,90]；式 6 第三项 */
    alphaDeg: number;
    /** 样条切线长度系数 ρ ∈ [0,2] */
    rho: number;
    /** 闭合后允许的最小背景区面积（px）；防过碎 */
    amin: number;
    /** 直线段最大长度（px）；≤0 = 关闭补段 */
    smax: number;
    /** 单个端点最多发出的闭合笔画数 */
    cmax: number;
}
/** 数字化 Hermite 样条：端点 s/t + 各自朝断口的法线为切向。返回 8-连通去重像素路径（packed index）。 */
export declare function digitizeSpline(s: Keypoint, t: Keypoint, rho: number, w: number, h: number): number[];
/** τ(C, J)：路径相邻像素间 0/1 过渡数（Def 6）。 */
export declare function transitionCount(path: number[], img: Uint8Array): number;
/** 面积守卫：候选 T 已画进 base（= Ib∪T）后，检查其毗邻的 4-连通背景区没有 5 ≤ |R| < amin 的。
 *
 *  有界 flood + 早退防污染（v0.7.6 修真机指尖误毙）：每个探测点数到 amin 即"判大早退"，
 *  但早退会留下部分标记——同一候选的下一个探测点若从**同一个大区**的未标记部分起 flood，
 *  会把残留标记当墙、只数到一小片余量（5..amin-1 就误毙，且余量大小随 amin 抖动）。
 *  解法：每个探测点用自己的 probe 序号标记；flood 撞到「本候选内、更早 probe」的标记，
 *  说明撞上了早退的大区（数满的区才会留残标；数完没满的区是封闭的、别的 probe 进不来）
 *  → 同一连通区 → 直接判大。genState.v 全局单调，跨候选的旧标记（≤ candStart）视同未访问。
 *  测试直连（lineart-partition.test.mjs 有毒化回归），导出仅供测试。 */
export declare function areaGuardOk(base: Uint8Array, w: number, h: number, newPx: number[], amin: number, visited: Int32Array, genState: {
    v: number;
}, stack: number[]): boolean;
/** 调试记录：一条候选闭合笔画的像素路径 + 是否被采纳（false 时给守卫原因）。
 *  ω=0 被结构性排除的配对（如 U 型平行开口）不产生记录——画面上「有端点无桥」即是它。 */
export interface BridgeDebug {
    px: number[];
    ok: boolean;
    reason?: "tau" | "amin";
}
/** 主入口：Ib + 端点 → 闭合后的 Ic（不改 Ib）+ 桥调试记录（v0.7.4 调试视图）。 */
export declare function closeStrokes(Ib: Uint8Array, w: number, h: number, kps: Keypoint[], params: ClosingParams): {
    Ic: Uint8Array;
    bridges: BridgeDebug[];
};
