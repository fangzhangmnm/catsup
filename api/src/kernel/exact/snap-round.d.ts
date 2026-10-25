import type { IPt2 } from "./lattice.ts";
export interface ISeg {
    readonly a: IPt2;
    readonly b: IPt2;
}
export interface SnapRoundResult {
    /** 输出顶点（像素代表点，格点整数）。 */
    vertices: IPt2[];
    /** 输出边（顶点下标对，a < b 规范化，无重复、无零长）。 */
    edges: [number, number][];
    /** 第 i 条输入段 → 它的折线（顶点下标序列，≥ 1 个；退化段 = 1 个）。 */
    chains: number[][];
    /** 迭代轮数（1 = 一轮就稳定）。 */
    rounds: number;
}
/** 像素代表点：左下角 + ⌊P/2⌋（P 偶数就是中心；P 奇数偏半格，Hausdorff 界相应放宽）。 */
export declare const cellRep: (c: IPt2, P: number) => IPt2;
/** 线段是否「经过」闭像素（不只是碰一个角）：端点在像素里，或直线穿过像素内部且线段够到像素，或与像素某条边共线重叠。 */
export declare function segPassesCell(a: IPt2, b: IPt2, cell: IPt2, P: number): boolean;
/**
 * 迭代 snap rounding：直到一轮下来 hot pixel 集不再变化（= 分离性成立）。maxRounds 守卫（Halperin–Packer 证明有限步收敛）。
 */
export declare function snapRound(input: readonly ISeg[], P: number, maxRounds?: number): SnapRoundResult;
/** 校验（测试 / 调试）：PSLG 不变量——边两两不真交、不重叠、相触只在公共端点；顶点不骑在非邻接边内部。返回问题列表（空 = 好）。 */
export declare function pslgProblems(r: SnapRoundResult): string[];
