// controller/hard-press.ts —— 重按：从笔的压感里判「短时间里压力猛地变重」（笔的设计稿 ai-docs/20261113-freeform-pen-grammar.md 第二节第 5、6 条，第七节第 2 步）。
// created 2026-11-13 by Claude Opus 5.5
//
// 判法（user 10-24「压感分层要detect 本来已经轻按一会，然后短时间突然变重…要考虑到压感慢慢滑。所以机械阈值不行」；11-13「落笔那一下就很重也算」）：
//   ① 落笔那一段（落笔后 downMs 以内）：压力到了 downHeavy = 重按，点 = 落笔那一点。这一段里别的都不判——落笔时压力从 0 往上冲，那不是「猛地变重」。
//   ② 之后：看最近 riseMs 以内的样本（落笔那一段的不算），底 = 其中（现在这个之前）最小的压力；现在比底高出 riseMin + riseRel × 底 = 重按。
//      要高出多少跟着底走（本来按得越重，要多按越多），不是一个固定的压力门槛；慢慢加重摊在 riseMs 里涨不够，不算。
//   ③ 点在哪 = 压力开始猛升之前那一刻笔在的地方：窗口里最后一个压力还不到「底 + startFrac × 涨幅」的样本。重按那一下手抖出来的位移不算。
//   ④ 一次重按只出一个点：判到之后不再判，直到压力退回「底 + rearmFrac × (峰 − 底)」以下（峰 = 判到之后到过的最大压力）才认下一次。按着当中压力上下晃不算第二下。
//   ⑤ 样本报 0（或不是数）= 这一下没带压感，用上一个（和画画的一笔 stroke-clock.ts 同一个规矩）。
//      这一下压力一个数都没变过（不报压感的笔恒报 0.5）→ varied 一直是假；它判不出重按，用的人自己定怎么办（设计稿第二节第 7 条：点一下算点击）。
// 纯函数：状态进、新状态出（不改传进来的状态），不读设备、不认识 DOM、编辑器、内核（src/controller/ 的规矩）。
// 单位：时间 ms（事件时间，PointerEvent.timeStamp），压力 0..1（PointerEvent.pressure），位置随调用方（画布本地 px），这里只原样带出去。
// 数值住 feel.ts HARD_PRESS（初值照 Apple Pencil 的常识定，没在 user 的设备上量过）。谁该把笔的压力喂进来：只有输入层（app/gestures.ts）；工具不读压力。
import { HARD_PRESS } from "./feel.ts";

/** 一个样本：事件时间（ms）、压力（0..1）、位置。 */
export interface PressSample { readonly t: number; readonly p: number; readonly x: number; readonly y: number; }
/**
 * 判到的一次重按。x / y / t = 点下在哪、那一刻是什么时候（落笔判到的 = 落笔那一点；涨起来判到的 = 开始猛升之前那一刻）。
 * base / p = 底和判到时的压力；after = 落笔之后多少毫秒判到的（调判法看的，进调试日志：落笔后压力爬得慢被 ② 多判一次，看 how = rise 且 after 刚过 downMs 就认得出）。
 */
export interface PressHit { readonly x: number; readonly y: number; readonly t: number; readonly how: "down" | "rise"; readonly base: number; readonly p: number; readonly after: number; }
/** 判法的几个数（= feel.ts HARD_PRESS 的形状；测试换着试）。 */
export type HardPressFeel = { readonly [K in keyof typeof HARD_PRESS]: number };

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
export interface PressStep { readonly state: PressState; readonly hit: PressHit | null; }

/** 压力差小于它算「没变」（⑤；浮点噪声那么小，不是手感量，不进手感表）。 */
const SAME_P = 1e-4;

const clampP = (p: number, prev: number): number => (Number.isFinite(p) && p > 0 ? Math.min(1, p) : prev);
const fire = (st: PressState, at: PressSample, how: PressHit["how"], base: number, p: number, now: number): PressStep =>
  ({ state: { ...st, armed: false, base, peak: p }, hit: { x: at.x, y: at.y, t: at.t, how, base, p, after: now - st.first.t } });

/** 落笔。落笔那一下就够重（① ）= 当场判到。 */
export function pressDown(s: PressSample, f: HardPressFeel = HARD_PRESS): PressStep {
  const first: PressSample = { t: s.t, p: clampP(s.p, 0), x: s.x, y: s.y };
  const st: PressState = { first, hist: [first], lastP: first.p, armed: true, base: 0, peak: 0, varied: false };
  return first.p >= f.downHeavy ? fire(st, first, "down", 0, first.p, first.t) : { state: st, hit: null };
}

/** 按着又来了一个样本（滑动或压力变了）。 */
export function pressMove(st: PressState, raw: PressSample, f: HardPressFeel = HARD_PRESS): PressStep {
  const p = clampP(raw.p, st.lastP), s: PressSample = { t: raw.t, p, x: raw.x, y: raw.y };
  const hist = st.hist.filter((h) => h.t >= s.t - f.riseMs); hist.push(s);
  const next: PressState = { ...st, hist, lastP: p, varied: st.varied || Math.abs(p - st.first.p) > SAME_P };
  if (!st.armed) {   // ④ 判到过：等压力退下去
    const peak = Math.max(st.peak, p);
    return { state: { ...next, peak, armed: p <= st.base + f.rearmFrac * (peak - st.base) }, hit: null };
  }
  const downEnd = st.first.t + f.downMs;
  if (s.t < downEnd) return p >= f.downHeavy ? fire(next, st.first, "down", 0, p, s.t) : { state: next, hit: null };   // ① 落笔那一段
  let base = Infinity;   // ② 底 = 窗口里（落笔那一段除外、现在这个之前）最小的压力
  for (let i = 0; i < hist.length - 1; i++) if (hist[i].t >= downEnd) base = Math.min(base, hist[i].p);
  if (base === Infinity || p - base < f.riseMin + f.riseRel * base) return { state: next, hit: null };
  const startBelow = base + f.startFrac * (p - base);   // ③ 开始猛升之前那一刻
  let at = s;
  for (let i = hist.length - 2; i >= 0; i--) if (hist[i].t >= downEnd && hist[i].p <= startBelow) { at = hist[i]; break; }
  return fire(next, at, "rise", base, p, s.t);
}
