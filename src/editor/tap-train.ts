// tap-train.ts —— 点按族深模块：一次按下是「点」还是「拖」、连着点了几下（单 / 双 / 三击）。全编辑器一份，工具只问结果。
// user 2026-10-25「笔的时候双击三击的防抖太严厉了，稍微滑一点也不行」「建议是做一个笔手势的深模块。第一下快速点的时候后面双击阈值内会对滑动还是点击的判断有偏向」：
//   第一下是快速的一点 → 连击窗口里、落在上一下附近的下一下，「点 / 拖」的门槛放宽（偏向点）；别的按下照常。
// 之前两份各写各的（tools/select.ts 与 surface-assign.ts 各一个 350 ms 连击计数，门槛都是死的 4 / 6）——收归这里。
// 纯模块：时间、距离由调用方量好递进来（距离 = 本帧度量：桌面 = fovY 的 1/800，VR = 度），不碰 performance.now / DOM。
// created 2026-10-25 by Claude Opus 5.5

import { TAP_RULES, FRAME_TAP_RULE, type TapRule } from "../controller/feel.ts";   // 规矩的数值住手感表（2026-10-28）；这里转出给老调用方
export { TAP_RULES, type TapRule };

/** 不认识的指针（VR 手柄等）：本帧自己的 tap 容差，不偏向（= 改造前的行为）。 */
export function frameTapRule(tap: number): TapRule {
  return { windowMs: FRAME_TAP_RULE.windowMs, quickMs: FRAME_TAP_RULE.quickMs, slop: tap, followSlop: tap, reach: FRAME_TAP_RULE.reachK * tap };
}

interface Press<P> { t: number; at: P; rule: TapRule; follow: boolean; n: number; done: boolean }
interface Last<P> { t: number; at: P; quick: boolean; n: number }

export class TapTrain<P> {
  private press: Press<P> | null = null;
  private last: Last<P> | null = null;
  private result = 0;

  /**
   * 按下。at = 这一下的位置（调用方自己的点类型，原样存着）；from(prev) = 这一下离上一下多远（本帧度量）。
   * rule = 这个指针的规矩（TAP_RULES[kind] ?? frameTapRule(eps.tap)）。
   */
  down(t: number, at: P, rule: TapRule, from: (prev: P) => number): void {
    const L = this.last;
    const inTrain = !!L && t - L.t <= rule.windowMs && from(L.at) <= rule.reach;
    this.press = { t, at, rule, follow: inTrain && L!.quick, n: inTrain ? L!.n + 1 : 1, done: false };
    this.result = 0;
  }

  /** 这一下（正按着的，或刚抬起的）的点按容差：走了比它远 = 拖。 */
  slop(): number {
    const p = this.press;
    return p ? (p.follow ? p.rule.followSlop : p.rule.slop) : 4;
  }

  /** 这一下按在哪（调用方自己的点）。 */
  pressAt(): P | null { return this.press?.at ?? null; }
  /** 按着（按下了、还没抬起）。 */
  pressing(): boolean { return !!this.press && !this.press.done; }

  /** 抬起。moved = 按下到抬起走了多远（本帧度量）。返回 0 = 拖；n ≥ 1 = 连着的第 n 下点击。 */
  up(t: number, moved: number): number {
    const p = this.press;
    if (!p || p.done) return (this.result = 0);   // 没按下过 / 这一下已经抬起过
    p.done = true;
    if (moved > this.slop()) { this.last = null; this.result = 0; return 0; }   // 拖：连击断
    this.last = { t, at: p.at, quick: t - p.t <= p.rule.quickMs, n: p.n };
    return (this.result = p.n);
  }

  /** 最近一次抬起的结果（0 = 拖或还没抬起；n = 第 n 下点击）。 */
  clicks(): number { return this.result; }

  /** 手势被取消（换工具 / 双指接管 / Esc）：这一下不算，连击断。 */
  cancel(): void { this.press = null; this.last = null; this.result = 0; }
}
