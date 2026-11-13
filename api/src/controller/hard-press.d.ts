import { HARD_PRESS } from "./feel.ts";
/** 一个样本：事件时间（ms）、压力（0..1）、位置。 */
export interface PressSample {
    readonly t: number;
    readonly p: number;
    readonly x: number;
    readonly y: number;
}
/**
 * 判到的一次重按。x / y / t = 点下在哪、那一刻是什么时候（落笔判到的 = 落笔那一点；涨起来判到的 = 开始猛升之前那一刻）。
 * base / p = 底和判到时的压力；after = 落笔之后多少毫秒判到的（调判法看的，进调试日志：落笔后压力爬得慢被 ② 多判一次，看 how = rise 且 after 刚过 downMs 就认得出）。
 */
export interface PressHit {
    readonly x: number;
    readonly y: number;
    readonly t: number;
    readonly how: "down" | "rise";
    readonly base: number;
    readonly p: number;
    readonly after: number;
}
/** 判法的几个数（= feel.ts HARD_PRESS 的形状；测试换着试）。 */
export type HardPressFeel = {
    readonly [K in keyof typeof HARD_PRESS]: number;
};
/** 这一下（落笔到抬笔）的状态。只经 pressDown / pressMove 造；调用方当它是不透明的，只读 varied。 */
export interface PressState {
    /** 落笔那个样本（压力已按 ⑤ 处理）。 */
    readonly first: PressSample;
    /** 最近 riseMs 以内的样本（按时间先后，含刚喂的这个）。 */
    readonly hist: readonly PressSample[];
    /** 上一个用上的压力（⑤：报 0 时用它）。 */
    readonly lastP: number;
    /** 能不能判下一次（④）。 */
    readonly armed: boolean;
    /** 上一次判到时的底 / 判到之后到过的最大压力（④ 重新上膛用）。 */
    readonly base: number;
    readonly peak: number;
    /** 这一下压力变过没有（⑤）：一直没变 = 这支笔多半不报压感。 */
    readonly varied: boolean;
}
export interface PressStep {
    readonly state: PressState;
    readonly hit: PressHit | null;
}
/** 落笔。落笔那一下就够重（① ）= 当场判到。 */
export declare function pressDown(s: PressSample, f?: HardPressFeel): PressStep;
/** 按着又来了一个样本（滑动或压力变了）。 */
export declare function pressMove(st: PressState, raw: PressSample, f?: HardPressFeel): PressStep;
