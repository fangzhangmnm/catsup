/** 一种指针的点按规矩。距离一律本帧度量（桌面 fovY 的 1/800 ≈ 800 px 高视口里的 px）。 */
export interface TapRule {
    /** 连击窗口：上一下抬起 → 这一下按下 ≤ 这么久 (ms) */
    windowMs: number;
    /** 「快速的一点」：按下到抬起 ≤ 这么久 (ms)；只有快速的一点才让下一下偏向点 */
    quickMs: number;
    /** 单独一下的点按容差：按下到抬起走了这么远以内 = 点 */
    slop: number;
    /** 偏向点的那一下的容差（快速点之后、窗口里、落在上一下附近） */
    followSlop: number;
    /** 连击「同一处」：这一下按下的地方离上一下按下的地方这么近以内 */
    reach: number;
}
/**
 * 桌面帧的规矩（按指针类型）。鼠标 = 原样（4 / 6，和改造前一样）。
 * 笔（2026-10-28 再放宽；user「平板笔的双击三击太严了。判定改松一点。鼠标手感没问题」）：笔要抬起再落下，比鼠标慢、落点也散——
 * 窗口 350 → 500 ms、快速一点 250 → 350 ms、单独一下 4 → 6、跟进那一下 12 → 20（iPad mini 竖屏 ≈ 28 css px ≈ 4.7 mm）、同一处 12 → 24。
 */
export declare const TAP_RULES: Readonly<Record<string, TapRule>>;
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
