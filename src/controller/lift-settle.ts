// controller/lift-settle.ts —— 抬笔结算（A21）：松手那一下用哪一个事件的位置当落点。created 2026-11-11 by Claude Opus 5.5（统筹 11-11；算法原样从 editor.ts settledSample 搬来，只换时钟）
// 输入 = 这一下手势的指针事件序列，每个带屏幕位置、被处理的时刻 t（performance.now()）和它自己发生的时间 at（PointerEvent.timeStamp，可能没有）；输出 = 用第几个当落点。
// A21 的意思（user 2026-09-19「松笔的一瞬间会突然 unsnap，因为人类肌肉抖动」）：样本按「同一处」（HOLD_PX 内）分成一段段停留。松开处停留 ≥ FINAL_HOLD_MS → 有意，用松开那一下；
//   否则回看 RELEASE_WINDOW_MS 内结束的停留，取最长的那段（≥ MIN_DWELL_MS 且比松开处停得久）= 人对齐时停住的地方，离松开处不超过 DWELL_SLIP_PX 才顶替（只杀抬手的小滑，不改人的最后决定）。
// 时钟（2026-11-11 改）：停了多久用事件自己的时间算。以前用处理时刻，机器一慢（一帧超过 40 ms）两个事件之间隔一整帧 = 人没停也算「停过」，落点被换成前一步（probe-snap-base 偶发红）。
//   事件时间和处理时刻不保证同一个起点（老实现给纪元毫秒、合成的事件可能是 0），所以一笔里只用一种：每个样本的事件时间都像样才整笔用它，有一个不像样就整笔退回处理时刻。
// 无头（src/controller/ 的规矩）：不认识 DOM、编辑器、内核。
import { RELEASE_WINDOW_MS, FINAL_HOLD_MS, MIN_DWELL_MS, HOLD_PX, DWELL_SLIP_PX } from "./feel.ts";

export interface LiftSample {
  /** 屏幕位置（CSS px）。 */
  readonly sx: number; readonly sy: number;
  /** 被处理的时刻（ms，performance.now()）。 */
  readonly t: number;
  /** 事件自己发生的时间（ms，PointerEvent.timeStamp）；键盘起手 / 程序造的没有。 */
  readonly at?: number;
}
export type LiftClock = "event" | "handled";

/** 事件时间像不像样：和同一个样本的处理时刻相差这么多以内（ms）。不是手感量，是「同一个起点」的判据：纪元毫秒差几十年、0 差开页以来的全部时间。 */
const SAME_ORIGIN_MS = 10_000;

/** 这一笔用哪种时钟：每个样本的事件时间都像样 = event；有一个不像样 = 整笔 handled（不混着减）。 */
export function liftClock(samples: readonly LiftSample[]): LiftClock {
  for (const s of samples) if (s.at === undefined || !Number.isFinite(s.at) || s.at <= 0 || Math.abs(s.t - s.at) > SAME_ORIGIN_MS) return "handled";
  return samples.length ? "event" : "handled";
}

/**
 * 落点 = 第几个样本（没有样本 = null）。holdScale = 画面高 / 800（HOLD_PX、DWELL_SLIP_PX 按 800 高的画面定的）。
 * clock 只给检查用（缺 = liftClock 按样本自己判）。
 */
export function settleLift(samples: readonly LiftSample[], holdScale: number, clock: LiftClock = liftClock(samples)): number | null {
  const n = samples.length;
  if (!n) return null;
  const time = clock === "event" ? (i: number): number => samples[i].at! : (i: number): number => samples[i].t;
  const runs: { first: number; lastIdx: number; dur: number }[] = [];
  for (let i = 0; i < n; i++) {
    const r = runs[runs.length - 1];
    if (r && Math.hypot(samples[i].sx - samples[r.first].sx, samples[i].sy - samples[r.first].sy) <= HOLD_PX * holdScale) { r.lastIdx = i; continue; }
    if (r) r.dur = time(i) - time(r.first);
    runs.push({ first: i, lastIdx: i, dur: 0 });
  }
  const fin = runs[runs.length - 1];
  fin.dur = time(n - 1) - time(fin.first);
  if (fin.dur >= FINAL_HOLD_MS) return n - 1;
  let dwell: typeof fin | null = null;
  for (let k = runs.length - 2; k >= 0; k--) {
    const r = runs[k];
    if (time(n - 1) - time(r.lastIdx) > RELEASE_WINDOW_MS) break;
    if (r.dur >= MIN_DWELL_MS && r.dur > fin.dur && (!dwell || r.dur > dwell.dur)) dwell = r;
  }
  if (dwell) { const d = samples[dwell.lastIdx], last = samples[n - 1]; if (Math.hypot(last.sx - d.sx, last.sy - d.sy) <= DWELL_SLIP_PX * holdScale) return dwell.lastIdx; }
  return n - 1;
}
