// sRGB 传递函数 LUT 层 1（created 2026-09-06 by Claude Fable 5.1；议程 §H）：fast 版对精确版误差 < 1/255，端点精确。
import { describe, it, assert, eq } from "./runner.mjs";
import { srgbToLinear, linearToSrgb, srgbToLinearFast, linearToSrgbFast, mixPremultInto } from "../src/backend/algorithms/color-mix.ts";

describe("color-mix · LUT 层 1", () => {
  it("fast 版全程误差 < 1/255（1e-3），端点 0/1 精确", () => {
    let m1 = 0, m2 = 0;
    for (let i = 0; i <= 10000; i++) { const c = i / 10000; m1 = Math.max(m1, Math.abs(srgbToLinearFast(c) - srgbToLinear(c))); m2 = Math.max(m2, Math.abs(linearToSrgbFast(c) - linearToSrgb(c))); }
    assert(m1 < 1e-3 && m2 < 1e-3, `max err ${m1} / ${m2}`);
    eq(srgbToLinearFast(0), 0); eq(srgbToLinearFast(1), 1); eq(linearToSrgbFast(0), 0); eq(linearToSrgbFast(1), 1);
    eq(srgbToLinearFast(-1), 0); eq(linearToSrgbFast(2), 1);
  });
  it("mixPremultInto（oklab / spectral）端点回归原色仍成立", () => {
    const a = new Float32Array([0.8, 0.2, 0.1, 1]), b = new Float32Array([0.1, 0.3, 0.9, 1]), o = new Float32Array(4);
    for (const sp of ["oklab", "spectral"]) {
      mixPremultInto(o, 0, a, 0, b, 0, 0, sp); for (let c = 0; c < 3; c++) assert(Math.abs(o[c] - a[c]) < 2e-3, `${sp} t=0 ch${c}: ${o[c]} vs ${a[c]}`);
      mixPremultInto(o, 0, a, 0, b, 0, 1, sp); for (let c = 0; c < 3; c++) assert(Math.abs(o[c] - b[c]) < 2e-3, `${sp} t=1 ch${c}: ${o[c]} vs ${b[c]}`);
    }
  });
});
