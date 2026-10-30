// 材质色在文件边界换算（2026-10-30 Opus；user「文件边界换算 同意」）：写 = sRGB → 线性（glTF 规定）、读回 = 原来的色号；老文件（没拍子 / 1.0）原样读。
import { describe, it, assert, eq } from "./runner.mjs";
import { srgbToLinear, linearToSrgb } from "../src/format/color-space.ts";
import { materialColorFromFile } from "../src/format/migrate/material.ts";

describe("材质色：文件里线性、app 里 sRGB", () => {
  it("所有 8 位色号往返回到同一个色号；误差远小于一档", () => {
    let worst = 0;
    for (let i = 0; i <= 255; i++) { const s = i / 255, back = linearToSrgb(srgbToLinear(s)); worst = Math.max(worst, Math.abs(back - s)); eq(Math.round(back * 255), i, `色号 ${i}`); }
    assert(worst < 1e-12, `最大误差 ${worst}`);
  });
  it("拍子 1.1 起按线性读；没拍子 / 1.0 = 老文件，原样当 sRGB", () => {
    const lin = srgbToLinear(0.5);
    const now = materialColorFromFile([lin, lin, lin], { version: 1, minor: 1 });
    assert(Math.abs(now[0] - 0.5) < 1e-12, `新文件读回 0.5：${now[0]}`);
    eq(materialColorFromFile([0.5, 0.5, 0.5], null)[0], 0.5, "纯色老材质（没挂拍子）原样");
    eq(materialColorFromFile([0.5, 0.5, 0.5], { version: 1 })[0], 0.5, "1.0 原样");
  });
});
