// tap-train.ts —— 点按族深模块：一次按下是「点」还是「拖」、连着点了几下（单 / 双 / 三击）。全编辑器一份，工具只问结果。
// user 2026-10-25「笔的时候双击三击的防抖太严厉了，稍微滑一点也不行」「建议是做一个笔手势的深模块。第一下快速点的时候后面双击阈值内会对滑动还是点击的判断有偏向」：
//   第一下是快速的一点 → 连击窗口里、落在上一下附近的下一下，「点 / 拖」的门槛放宽（偏向点）；别的按下照常。
// 之前两份各写各的（tools/select.ts 与 surface-assign.ts 各一个 350 ms 连击计数，门槛都是死的 4 / 6）——收归这里。
// 纯模块：时间、距离由调用方量好递进来（距离 = 本帧度量：桌面 = fovY 的 1/800，VR = 度），不碰 performance.now / DOM。
// created 2026-10-25 by Claude Opus 5.5

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

/** 桌面帧的规矩（按指针类型）。鼠标 = 原样（4 / 6，和改造前一样）；笔 = 跟进的那一下放宽到 12（iPad mini 竖屏 ≈ 17 css px ≈ 2.8 mm）。 */
export const TAP_RULES: Readonly<Record<string, TapRule>> = {
  mouse: { windowMs: 350, quickMs: 250, slop: 4, followSlop: 4, reach: 6 },
  pen: { windowMs: 350, quickMs: 250, slop: 4, followSlop: 12, reach: 12 },
  touch: { windowMs: 350, quickMs: 250, slop: 4, followSlop: 16, reach: 16 },
};

/** 不认识的指针（VR 手柄等）：本帧自己的 tap 容差，不偏向（= 改造前的行为）。 */
export function frameTapRule(tap: number): TapRule {
  return { windowMs: 350, quickMs: 250, slop: tap, followSlop: tap, reach: 1.5 * tap };
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
