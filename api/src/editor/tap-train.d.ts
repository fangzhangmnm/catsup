import { TAP_RULES, type TapRule } from "../controller/feel.ts";
export { TAP_RULES, type TapRule };
/** 不认识的指针（VR 手柄等）：本帧自己的 tap 容差，不偏向（= 改造前的行为）。 */
export declare function frameTapRule(tap: number): TapRule;
export declare class TapTrain<P> {
    private press;
    private last;
    private result;
    /**
     * 按下。at = 这一下的位置（调用方自己的点类型，原样存着）；from(prev) = 这一下离上一下多远（本帧度量）。
     * rule = 这个指针的规矩（TAP_RULES[kind] ?? frameTapRule(eps.tap)）。
     */
    down(t: number, at: P, rule: TapRule, from: (prev: P) => number): void;
    /** 这一下（正按着的，或刚抬起的）的点按容差：走了比它远 = 拖。 */
    slop(): number;
    /** 这一下按在哪（调用方自己的点）。 */
    pressAt(): P | null;
    /** 按着（按下了、还没抬起）。 */
    pressing(): boolean;
    /** 抬起。moved = 按下到抬起走了多远（本帧度量）。返回 0 = 拖；n ≥ 1 = 连着的第 n 下点击。 */
    up(t: number, moved: number): number;
    /** 最近一次抬起的结果（0 = 拖或还没抬起；n = 第 n 下点击）。 */
    clicks(): number;
    /** 手势被取消（换工具 / 双指接管 / Esc）：这一下不算，连击断。 */
    cancel(): void;
}
