// created 2026-09-02 by Claude Fable 5.1
// 压感取值纯函数（src/common/effective-pressure.ts）语义钉子：mouse 恒 0.5 / 0 → lastP / 起手 0.2 / clamp / EMA，
// 以及 2026-09-02 新增的 fallback——coalesced 样本不带 pressure 时回退派发事件的 pressure，整笔不再冻在落笔值。
import { test, eq, assert } from "./runner.mjs";
import { effectivePressure, type PressureRec } from "../src/common/effective-pressure.ts";

const A1 = 1;   // α=1 → smP 恒等于 raw（浮点上仍有 1e-16 级累计误差，故用 near）
const near = (a: number, b: number, msg?: string) => assert(Math.abs(a - b) < 1e-9, msg || `期望 ${b}，实得 ${a}`);
const nearAll = (as: number[], bs: number[]) => { eq(as.length, bs.length); as.forEach((a, i) => near(a, bs[i], `第 ${i} 项：期望 ${bs[i]}，实得 ${a}`)); };

test("effective-pressure: mouse 恒 0.5（没有传感器，不是开关）", () => {
  const rec: PressureRec = {};
  eq(effectivePressure(rec, "mouse", 0.9, 0.3, A1), 0.5);
  eq(rec.lastP, undefined);
});

test("effective-pressure: pen 正常值 clamp 到 [0.05,1] 并记 lastP", () => {
  const rec: PressureRec = {};
  eq(effectivePressure(rec, "pen", 0.42, undefined, A1), 0.42);
  eq(rec.lastP, 0.42);
  near(effectivePressure(rec, "pen", 7, undefined, A1), 1);
  near(effectivePressure(rec, "pen", 0.001, undefined, A1), 0.05);
  eq(rec.lastP, 0.05);
});

test("effective-pressure: 样本 0 + 派发事件有压 → 用派发事件 pressure（fallback）", () => {
  const rec: PressureRec = { lastP: 0.9, smP: -1 };
  eq(effectivePressure(rec, "pen", 0, 0.3, A1), 0.3);
  eq(rec.lastP, 0.3);
  const rec2: PressureRec = { smP: -1 };
  eq(effectivePressure(rec2, "pen", undefined, 0.6, A1), 0.6);
  eq(effectivePressure(rec2, "pen", NaN, 0.7, A1), 0.7);
});

test("effective-pressure: 样本 0 且 fallback 也 0/缺失 → lastP；起手无 lastP → 0.2", () => {
  const rec: PressureRec = { lastP: 0.8, smP: -1 };
  eq(effectivePressure(rec, "pen", 0, 0, A1), 0.8);
  eq(effectivePressure(rec, "pen", 0, undefined, A1), 0.8);
  const fresh: PressureRec = { smP: -1 };
  eq(effectivePressure(fresh, "pen", 0, undefined, A1), 0.2);
  eq(fresh.lastP, undefined);
});

test("effective-pressure: 整笔 coalesced 全 0 的浏览器——有 fallback 则跟随派发事件变化，不冻在落笔值", () => {
  const rec: PressureRec = { smP: -1 };
  effectivePressure(rec, "pen", 0.3, undefined, A1);            // pointerdown：真值 0.3
  const parents = [0.4, 0.6, 0.9, 0.5];
  const seen = parents.map((p) => effectivePressure(rec, "pen", 0, p, A1));
  nearAll(seen, parents);
  // 对照：没有 fallback 时整笔冻在 0.3（= 修前症状）
  const old: PressureRec = { smP: -1 };
  effectivePressure(old, "pen", 0.3, undefined, A1);
  const frozen = parents.map(() => effectivePressure(old, "pen", 0, undefined, A1));
  nearAll(frozen, [0.3, 0.3, 0.3, 0.3]);
});

test("effective-pressure: EMA α 生效；smP 未初始化/NaN/负哨兵 → 首颗用 raw", () => {
  const rec: PressureRec = {};
  eq(effectivePressure(rec, "pen", 1, undefined, 0.5), 1);        // 未初始化 → raw
  near(effectivePressure(rec, "pen", 0.5, undefined, 0.5), 0.75);   // 1 + 0.5*(0.5-1)
  rec.smP = NaN;
  eq(effectivePressure(rec, "pen", 0.2, undefined, 0.5), 0.2);
  rec.smP = -1;
  eq(effectivePressure(rec, "pen", 0.6, undefined, 0.5), 0.6);
  assert(Number.isFinite(rec.smP!), "smP 永远有限");
});
