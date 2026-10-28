// 手感表守卫（2026-10-28 Claude Fable 5.1；账本 UX16）：三种指针的点按规矩同一组键；桌面 / VR 容差集都齐；每个量是有限正数；手感表零运行时 import（无头守卫在 stance.test.ts）。
import { describe, it, assert, eq } from "./runner.mjs";
import * as feel from "../src/controller/feel.ts";

describe("手感表：连续量集中一处、按设备分列", () => {
  it("鼠标 / 笔 / 手指的点按规矩同一组键、都是正数", () => {
    const keys = Object.keys(feel.TAP_RULES.mouse).sort().join();
    for (const d of ["mouse", "pen", "touch"] as const) { eq(Object.keys(feel.TAP_RULES[d]).sort().join(), keys, d); for (const v of Object.values(feel.TAP_RULES[d])) assert(Number.isFinite(v) && v > 0, `${d} ${v}`); }
    assert(feel.TAP_RULES.pen.followSlop > feel.TAP_RULES.mouse.followSlop, "笔的跟进一下比鼠标松（user 10-28）");
  });
  it("VR 容差集九个键齐、桌面 ε 四个键齐", () => {
    eq(Object.keys(feel.EPS_VR_DEG).sort().join(), ["point", "edge", "line", "combo", "hit", "snap", "planeNear", "tap", "drag"].sort().join());
    eq(Object.keys(feel.EPS).sort().join(), ["point", "edge", "line", "combo"].sort().join());
  });
  it("表里每个导出的数都是有限正数", () => {
    for (const [k, v] of Object.entries(feel)) if (typeof v === "number") assert(Number.isFinite(v) && v > 0, k);
  });
});
