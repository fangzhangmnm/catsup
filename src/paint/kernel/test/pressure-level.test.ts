// pressure-level 契约测（created 2026-09-05 by Claude Fable 5.1）：四档语义 + 进程级当前档 + 非法值回默认。
import { describe, it, eq, assert } from "./runner.mjs";
import { applyPressureLevel, setPressureLevel, getPressureLevel, shapePressure, isPressureLevel } from "../src/common/pressure-level.ts";

describe("pressure-level · applyPressureLevel", () => {
  it("none → 恒 1（含鼠标 0.5）", () => {
    eq(applyPressureLevel(0.5, "none"), 1);
    eq(applyPressureLevel(0.05, "none"), 1);
  });
  it("mid → 原样（默认档零行为变化）", () => {
    eq(applyPressureLevel(0.3, "mid"), 0.3);
    eq(applyPressureLevel(1, "mid"), 1);
  });
  it("weak 抬高 / strong 压低 中段压感；端点 0/1 不动", () => {
    assert(applyPressureLevel(0.3, "weak") > 0.3, "weak: 0.3 → 更粗");
    assert(applyPressureLevel(0.3, "strong") < 0.3, "strong: 0.3 → 更细");
    eq(applyPressureLevel(1, "weak"), 1); eq(applyPressureLevel(1, "strong"), 1);
    eq(applyPressureLevel(0, "weak"), 0); eq(applyPressureLevel(0, "strong"), 0);
  });
  it("越界 / NaN 输入被夹住", () => {
    eq(applyPressureLevel(1.7, "mid"), 1);
    eq(applyPressureLevel(-1, "strong"), 0);
    eq(applyPressureLevel(NaN, "mid"), 1);
  });
});

describe("pressure-level · 当前档", () => {
  it("set/get 往返；非法值回默认 mid；shapePressure 跟当前档", () => {
    setPressureLevel("strong"); eq(getPressureLevel(), "strong");
    assert(shapePressure(0.5) < 0.5, "strong 档 shape 压低");
    setPressureLevel("bogus"); eq(getPressureLevel(), "mid");
    eq(shapePressure(0.5), 0.5);
    assert(isPressureLevel("weak") && !isPressureLevel("x") && !isPressureLevel(3), "isPressureLevel 守卫");
  });
});
