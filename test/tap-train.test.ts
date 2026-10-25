// 点按族深模块（tap-train.ts）：笔快速点一下之后、连击窗口里落在附近的下一下偏向点；鼠标照旧；拖断连击。created 2026-10-25 by Claude Opus 5.5
import { describe, it, eq } from "./runner.mjs";
import { TapTrain, TAP_RULES, frameTapRule } from "../src/editor/tap-train.ts";

type P = { x: number; y: number };
const d = (a: P, b: P): number => Math.hypot(a.x - b.x, a.y - b.y);
/** 一下：t 时按在 at，按 dur ms，按着时滑了 slide（本帧度量），返回 up 的结果。 */
function tap(T: TapTrain<P>, kind: string, t: number, at: P, dur = 80, slide = 0): number {
  T.down(t, at, TAP_RULES[kind] ?? frameTapRule(4), (prev) => d(at, prev));
  return T.up(t + dur, slide);
}

describe("tap-train 点按族", () => {
  it("笔：双击第二下滑 8 → 仍是第 2 下（偏向点）", () => {
    const T = new TapTrain<P>();
    eq(tap(T, "pen", 0, { x: 100, y: 100 }), 1);
    eq(tap(T, "pen", 200, { x: 103, y: 102 }, 80, 8), 2);
  });
  it("笔：三击每下都滑一点 → 1 / 2 / 3", () => {
    const T = new TapTrain<P>();
    eq(tap(T, "pen", 0, { x: 100, y: 100 }, 70, 3), 1);
    eq(tap(T, "pen", 220, { x: 106, y: 98 }, 70, 9), 2);
    eq(tap(T, "pen", 430, { x: 104, y: 105 }, 70, 10), 3);
  });
  it("笔：单独一下滑 8 = 拖（第一下不偏向）", () => {
    const T = new TapTrain<P>();
    eq(tap(T, "pen", 0, { x: 100, y: 100 }, 80, 8), 0);
  });
  it("笔：跟进的那一下拖得够远（> 12）仍是拖，连击断", () => {
    const T = new TapTrain<P>();
    eq(tap(T, "pen", 0, { x: 100, y: 100 }), 1);
    eq(tap(T, "pen", 200, { x: 101, y: 100 }, 150, 30), 0);
    eq(tap(T, "pen", 400, { x: 101, y: 100 }), 1);
  });
  it("笔：第一下按太久（不是快速点）→ 下一下不偏向，但还算连击", () => {
    const T = new TapTrain<P>();
    eq(tap(T, "pen", 0, { x: 100, y: 100 }, 400), 1);
    eq(tap(T, "pen", 600, { x: 101, y: 100 }, 80, 8), 0);   // 不偏向：滑 8 = 拖
    const U = new TapTrain<P>();
    eq(tap(U, "pen", 0, { x: 100, y: 100 }, 400), 1);
    eq(tap(U, "pen", 600, { x: 101, y: 100 }, 80, 2), 2);   // 没滑：照样是第 2 下
  });
  it("笔：超出窗口 / 离得远 → 重新数", () => {
    const T = new TapTrain<P>();
    eq(tap(T, "pen", 0, { x: 100, y: 100 }), 1);
    eq(tap(T, "pen", 80 + 351, { x: 100, y: 100 }), 1);
    eq(tap(T, "pen", 600, { x: 130, y: 100 }), 1);
  });
  it("鼠标照旧：第二下滑 5 = 拖；离上一下 7 = 重新数", () => {
    const T = new TapTrain<P>();
    eq(tap(T, "mouse", 0, { x: 100, y: 100 }), 1);
    eq(tap(T, "mouse", 200, { x: 100, y: 100 }, 80, 5), 0);
    const U = new TapTrain<P>();
    eq(tap(U, "mouse", 0, { x: 100, y: 100 }), 1);
    eq(tap(U, "mouse", 200, { x: 107, y: 100 }), 1);
  });
  it("不认识的指针 = 本帧 tap 容差，不偏向（VR 行为不变）", () => {
    const T = new TapTrain<P>();
    eq(tap(T, "xr", 0, { x: 0, y: 0 }), 1);
    eq(tap(T, "xr", 200, { x: 0, y: 0 }, 80, 5), 0);
    eq(frameTapRule(0.4).followSlop, 0.4);
  });
  it("slop() 跟着这一下走；cancel 断连击；同一下抬两次只算一次", () => {
    const T = new TapTrain<P>();
    tap(T, "pen", 0, { x: 0, y: 0 });
    T.down(200, { x: 0, y: 0 }, TAP_RULES.pen, (p) => d({ x: 0, y: 0 }, p));
    eq(T.slop(), 12);
    eq(T.up(260, 0), 2);
    eq(T.up(270, 0), 0);
    T.cancel();
    eq(tap(T, "pen", 300, { x: 0, y: 0 }), 1);
  });
});
