// 屏幕区域（marquee.ts areaTest；套索 = 账本 UX5，2026-10-28 Claude Opus 5.5）：框含边界；套索 = 奇偶规则，凹的也对，不到三个点 = 空。
import { describe, it, assert } from "./runner.mjs";
import { areaTest } from "../src/editor/marquee.ts";

describe("屏幕区域（框 / 套索）", () => {
  it("框：含边界", () => { const t = areaTest({ minX: 0, minY: 0, maxX: 10, maxY: 5 }); assert(t({ x: 0, y: 0 }) && t({ x: 10, y: 5 }) && t({ x: 5, y: 2 }) && !t({ x: 11, y: 2 })); });
  it("套索：凹的 L 形——拐角里面不算、两条臂上算；包围盒外直接不算", () => {
    const L = areaTest({ pts: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 3 }, { x: 3, y: 3 }, { x: 3, y: 10 }, { x: 0, y: 10 }] });
    assert(L({ x: 1, y: 1 }) && L({ x: 8, y: 1 }) && L({ x: 1, y: 8 }), "两条臂上");
    assert(!L({ x: 6, y: 6 }), "拐角里面（凹进去那块）");
    assert(!L({ x: 20, y: 1 }) && !L({ x: -1, y: 1 }), "外面");
  });
  it("套索不到三个点 = 什么都不圈", () => { const t = areaTest({ pts: [{ x: 0, y: 0 }, { x: 10, y: 10 }] }); assert(!t({ x: 5, y: 5 })); });
});
