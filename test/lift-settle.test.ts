// 抬笔结算（A21）的时钟：停了多久按事件自己的时间算，帧慢不算人停（统筹 11-11，v0.19.50）。created 2026-11-11 by Claude Opus 5.5
// 模拟时钟：每个样本两个时间——at = 事件发生的时刻（人的手），t = 被处理的时刻（机器）。帧拖到 100 ms = t 每步隔 100 ms，at 还是人手的节奏。
import { describe, it, eq } from "./runner.mjs";
import { settleLift, liftClock, type LiftSample } from "../src/controller/lift-settle.ts";
const fs = (await import("node:fs" as string)) as { readFileSync(p: string, enc: string): string };

/** 鼠标快拖：8 步、每步 12 px、手每 16 ms 一步；机器每帧 frameMs 才处理一个；最后一步一到马上松（抬起和最后一步挨着处理，相隔 2 ms）。 */
function fastDrag(frameMs: number): LiftSample[] {
  const s: LiftSample[] = [];
  for (let i = 0; i <= 8; i++) s.push({ sx: 100 + 12 * i, sy: 200, at: 1000 + 16 * i, t: 1003 + frameMs * i });
  const last = s[s.length - 1];
  s.push({ sx: last.sx, sy: last.sy, at: last.at! + 1, t: last.t + 2 });   // 松开那一下
  return s;
}
/** 笔对齐：快到 P、在 P 停 60 ms、抬笔时滑了 6 px 和 12 px、马上抬起。 */
function penPause(frameMs: number): { s: LiftSample[]; pIdx: number } {
  const s: LiftSample[] = []; let at = 1000, k = 0;
  const push = (x: number): void => { s.push({ sx: x, sy: 300, at, t: 1003 + frameMs * k++ }); };
  for (let i = 0; i < 5; i++) { push(100 + 12 * i); at += 16; }
  const P = 100 + 12 * 5;
  for (let i = 0; i <= 4; i++) { push(P); if (i < 4) at += 15; }   // 在 P 停 60 ms
  const pIdx = s.length - 1;
  at += 4; push(P + 6); at += 4; push(P + 12); at += 2; push(P + 12);   // 抬笔小滑 + 抬起
  return { s, pIdx };
}

describe("抬笔结算（A21）：停了多久按事件自己的时间", () => {
  it("帧拖到 100 ms、鼠标移动后立刻松手 → 落点是最后那一步（以前按处理时刻 = 换成了前一步）", () => {
    const s = fastDrag(100);
    eq(liftClock(s), "event");
    eq(settleLift(s, 1), s.length - 1, "按事件时间");
    eq(settleLift(s, 1, "handled"), s.length - 3, "按处理时刻（旧的算法照原样）= 前一步：这就是 probe-snap-base 偶发红的那个");
  });
  it("帧正常（16 ms）时两种时钟一样：都是最后那一步", () => {
    const s = fastDrag(16);
    eq(settleLift(s, 1), s.length - 1); eq(settleLift(s, 1, "handled"), s.length - 1);
  });
  it("笔停 60 ms 再抬（抬起时滑了 12 px）→ 落点是停住的位置；帧快帧慢都一样", () => {
    for (const frameMs of [5, 16, 100]) { const { s, pIdx } = penPause(frameMs); eq(settleLift(s, 1), pIdx, `帧 ${frameMs} ms`); }
  });
  it("松开处停够 100 ms → 用松开那一下（A21 原意不变）", () => {
    const s: LiftSample[] = [{ sx: 0, sy: 0, at: 1000, t: 1001 }, { sx: 30, sy: 0, at: 1060, t: 1061 }, { sx: 30, sy: 0, at: 1100, t: 1101 }, { sx: 31, sy: 0, at: 1170, t: 1171 }];
    eq(settleLift(s, 1), 3);
  });
  it("滑出 24 px 之外 = 人又挪了地方，按松开那一下", () => {
    const { s } = penPause(16), last = s[s.length - 1];
    const far = s.map((x, i) => (i >= s.length - 2 ? { ...x, sx: last.sx + 20 } : x));   // 最后两下离 P 32 px
    eq(settleLift(far, 1), far.length - 1);
  });
});

describe("抬笔结算：一笔里只用一种时钟（事件时间不像样就整笔退回处理时刻，不混着减）", () => {
  const swap = (s: LiftSample[], i: number, at: number | undefined): LiftSample[] => s.map((x, k) => (k === i ? { ...x, at } : x));
  it("有一个事件时间是 0（合成的事件）→ 整笔按处理时刻", () => {
    const s = swap(fastDrag(100), 4, 0);
    eq(liftClock(s), "handled"); eq(settleLift(s, 1), settleLift(s, 1, "handled"));
  });
  it("有一个事件时间大得像纪元毫秒 → 整笔按处理时刻", () => {
    const s = swap(fastDrag(100), 4, 1.7e12);
    eq(liftClock(s), "handled"); eq(settleLift(s, 1), settleLift(s, 1, "handled"));
  });
  it("最后一下没有事件时间（键盘落定 / 程序造的）→ 整笔按处理时刻", () => {
    const s = fastDrag(100); const t = swap(s, s.length - 1, undefined);
    eq(liftClock(t), "handled"); eq(settleLift(t, 1), settleLift(t, 1, "handled"));
  });
  it("没有样本 = null", () => { eq(settleLift([], 1), null); });
});

describe("抬笔结算：接线（事件时间真的一路带进样本）", () => {
  it("gestures.ts 造工具指针时带上 ev.timeStamp；编辑器记样本带 at、结算只经 lift-settle.ts", () => {
    const g = fs.readFileSync("src/app/gestures.ts", "utf8"), e = fs.readFileSync("src/editor/editor.ts", "utf8");
    eq(/at: ev\.timeStamp/.test(g), true, "gestures.ts tp()");
    eq(/this\.samples\.push\(\{ t, at: s\.at,/.test(e), true, "editor.ts recordSample");
    eq(/settleLift\(this\.samples/.test(e), true, "editor.ts settledSample");
    eq(/RELEASE_WINDOW_MS|FINAL_HOLD_MS|MIN_DWELL_MS/.test(e), false, "结算的算法只住 lift-settle.ts 一处");
  });
});
