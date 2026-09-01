// lab 预置冒烟测试 —— 仪器不许骗人：每个预置摆完的面数钉死。
// created by Claude Fable 5, 2026-09-01
import { describe, it, eq } from "./runner.mjs";
import { Kernel } from "../src/kernel/kernel.ts";
import { PRESETS, applyPreset } from "../src/lab/presets.ts";

describe("lab: 场景预置", () => {
  for (const preset of PRESETS) {
    it(`${preset.name} → ${preset.expectFaces} 膜`, () => {
      const k = new Kernel();
      applyPreset(k, preset);
      eq(k.faces().length, preset.expectFaces, preset.note);
    });
  }
  it("日字第二笔是 DIVIDE（中缝切两格）", () => {
    const k = new Kernel();
    const events = applyPreset(k, PRESETS.find((p) => p.name === "日字")!);
    eq(events[1].some((e) => e.type === "DIVIDE"), true, "中缝落下应分割");
  });
});
