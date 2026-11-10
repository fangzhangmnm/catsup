// 笔设置 draft 补缺测试（UI 深化 candidate 1）。
import { describe, it, eq, assert } from "./runner.mjs";
import { ensureBrushConfigDefaults } from "../src/common/current-brush-config.ts";

describe("ensureBrushConfigDefaults", () => {
  it("空 draft 补齐全部字段（模板可无脑 v-model）", () => {
    const b = ensureBrushConfigDefaults({});
    eq(b.shape.kind, "round");
    eq(b.shape.hardness, 0.75);   // v415：与 DEFAULT_CONFIG / resolveBrush / makeBrush 统一
    eq(b.size.base, 12);
    eq(b.size.max, 200);
    eq(b.sizeCoeff, 0.6);
    eq(b.compositeMode, "wash");
    eq(b.blendMode, "source-over");
    eq(b.pixelMode, false);
    eq(b.smooth.streamline, 0.15);
    // taperFloor 必须被补齐：brush-config-view 的滑块直接 `draft.taperFloor.toFixed(2)`，
    //   缺了会在模板求值时炸（v415 给它补上 UI 之后这条才有牙）。
    eq(b.taperFloor, 0.4);
    eq(b.taper.in, 0);
    eq(b.spacing, 0.06, "spacing 缺省 fraction");
  });

  it("不覆盖既有值（幂等 + 保真）", () => {
    const b = ensureBrushConfigDefaults({
      shape: { kind: "ellipse", hardness: 0.3 }, size: { base: 40, max: 500 },
      sizeCoeff: -0.5, pixelMode: true,
    });
    eq(b.shape.kind, "ellipse");
    eq(b.shape.hardness, 0.3);
    eq(b.shape.aspect, 1.0, "缺的补，在的不动");
    eq(b.size.base, 40);
    eq(b.sizeCoeff, -0.5);
    eq(b.pixelMode, true);
  });

  it("spacing 归一：{value} → number", () => {
    eq(ensureBrushConfigDefaults({ spacing: { value: 0.12 } }).spacing, 0.12);
    eq(ensureBrushConfigDefaults({ spacing: 0.2 }).spacing, 0.2);
  });

  it("第二次调用幂等", () => {
    const once = ensureBrushConfigDefaults({ sizeCoeff: 0.1 });
    const twice = ensureBrushConfigDefaults(once);
    eq(twice.sizeCoeff, 0.1);
    eq(twice.shape.kind, "round");
    assert(once === twice, "原地返回同一对象");
  });
});
