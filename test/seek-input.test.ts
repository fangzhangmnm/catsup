// 「要先找位置的」工具的输入翻译（editor/seek-input.ts；笔的设计稿第七节第 3 步）：按下 / 移动 / 松开 + press / lift → 找位置 / 下点 / 抬笔。created 2026-11-13 by Claude Opus 5.5
import { describe, it, eq } from "./runner.mjs";
import { SeekInput } from "../src/editor/seek-input.ts";
import { pressDown, pressMove, pressureKnown } from "../src/controller/hard-press.ts";
import type { ToolCtx } from "../src/editor/tool-handler.ts";
import type { ToolPointer } from "../src/editor/editor.ts";
import type { PressHit } from "../src/controller/hard-press.ts";

const ctx = { eps: () => ({ tap: 4 }) } as unknown as ToolCtx;
const P = (x: number, y: number, more: Partial<ToolPointer> = {}): ToolPointer => ({ x, y, clientX: x, clientY: y, pointerType: "pen", shiftKey: false, ...more });
const hit = (x: number, y: number): PressHit => ({ x, y, t: 0, how: "rise", base: 0.15, p: 0.6, after: 300 });
/** 记下工具收到的每个动词：seek 带位置，place / lift 不带。 */
function rig(): { input: SeekInput; log: string[] } {
  const log: string[] = [], at = { x: 0, y: 0 };
  const input = new SeekInput({ seek: (_c, s) => { at.x = s.x; at.y = s.y; log.push(`seek ${s.x},${s.y}`); }, place: () => log.push(`place @${at.x},${at.y}`), lift: () => log.push("lift") });
  return { input, log };
}
const verbs = (log: string[]): string[] => log.filter((l) => !l.startsWith("seek"));

describe("找位置 / 下点 / 抬笔：输入怎么翻", () => {
  it("鼠标点一下 = 在按下时找到的地方下一点", () => {
    const { input, log } = rig(); input.down(ctx, P(10, 10, { pointerType: "mouse" })); input.move(ctx, { x: 11, y: 10 }); input.up(ctx, P(11, 10, { pointerType: "mouse" }));
    eq(verbs(log).join("|"), "place @11,10");
  });
  it("鼠标按着拖完松开 = 不下点", () => {
    const { input, log } = rig(); input.down(ctx, P(10, 10, { pointerType: "mouse" })); input.move(ctx, { x: 40, y: 10 }); input.up(ctx, P(40, 10, { pointerType: "mouse" }));
    eq(verbs(log).join("|"), "");
  });
  it("报压感的笔：轻按着滑 = 只找；重按 = 在猛升之前那一点下点，然后回到笔现在的位置接着找；抬笔 = 抬笔、不再下点", () => {
    const { input, log } = rig();
    input.down(ctx, P(10, 10)); input.move(ctx, { x: 30, y: 10 }, P(30, 10)); input.move(ctx, { x: 36, y: 10 }, P(36, 10, { press: hit(30, 10) })); input.move(ctx, { x: 60, y: 10 }, P(60, 10));
    input.up(ctx, P(60, 10, { lift: true }));
    eq(verbs(log).join("|"), "place @30,10|lift");
    eq(log[log.indexOf("place @30,10") + 1], "seek 36,10", "下完点回到笔现在的位置");
  });
  it("报压感的笔轻轻点一下 = 抬笔，不下点（设计稿：轻轻点一下不下点）", () => {
    const { input, log } = rig(); input.down(ctx, P(10, 10)); input.up(ctx, P(10, 10, { lift: true }));
    eq(verbs(log).join("|"), "lift");
  });
  it("落笔就很重 = 落笔那一点下点；抬笔照旧是抬笔", () => {
    const { input, log } = rig(); input.down(ctx, P(10, 10, { press: { ...hit(10, 10), how: "down" } })); input.up(ctx, P(10, 10, { lift: true }));
    eq(verbs(log).join("|"), "place @10,10|lift");
  });
  it("不报压感的笔（恒 0.5）在刀上点一下 = 下了一个点（统筹审后 b；设计稿第二节第 7 条）", () => {
    // 输入层：这一下压力一个数都没变过、落笔是 0.5 → 不认得它报压感 → 松开不带 lift
    let st = pressDown({ t: 0, p: 0.5, x: 10, y: 10 }).state; st = pressMove(st, { t: 16, p: 0.5, x: 10, y: 10 }).state;
    eq(pressureKnown(st), false, "恒 0.5 = 不认得");
    const { input, log } = rig(); input.down(ctx, P(10, 10)); input.up(ctx, P(10, 10, { lift: pressureKnown(st) || undefined }));
    eq(verbs(log).join("|"), "place @10,10");
  });
  it("真的笔：压力变过 / 落笔不是 0、0.5、1 = 认得它报压感", () => {
    eq(pressureKnown(pressDown({ t: 0, p: 0.23, x: 0, y: 0 }).state), true);
    eq(pressureKnown(pressMove(pressDown({ t: 0, p: 0.5, x: 0, y: 0 }).state, { t: 8, p: 0.52, x: 0, y: 0 }).state), true);
    eq(pressureKnown(pressDown({ t: 0, p: 1, x: 0, y: 0 }).state), false, "落笔 1、没变过");
  });
  it("cancel 之后松开不下点", () => {
    const { input, log } = rig(); input.down(ctx, P(10, 10, { pointerType: "mouse" })); input.cancel(); input.up(ctx, P(10, 10, { pointerType: "mouse" }));
    eq(verbs(log).join("|"), "");
  });
});
