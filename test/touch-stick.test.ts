// 触屏虚拟摇杆的数学（src/player/touch-stick.ts；2026-10-28 Claude Opus 5.5；纪元账本 FM142）。
import { describe, it, eq, assert } from "./runner.mjs";
import { STICK, stickOutput, followBase, placeBase } from "../src/player/touch-stick.ts";

const near = (a: number, b: number): boolean => Math.abs(a - b) < 1e-9;

describe("虚拟摇杆", () => {
  it("死区里 = 不动；刚过死区 = 模拟器死区那一档（最慢的走，不出现「推了不动」）；推满 = 1；屏幕往上推 = 往前", () => {
    const r = STICK.radius;
    eq(JSON.stringify(stickOutput(0, -r * STICK.deadzone * 0.9)), JSON.stringify({ walkX: 0, walkY: 0, dash: false }));
    const slow = stickOutput(0, -r * (STICK.deadzone + 1e-6));
    assert(near(slow.walkY, STICK.simDeadzone) || Math.abs(slow.walkY - STICK.simDeadzone) < 1e-4, `刚过死区 ${slow.walkY}`);
    const full = stickOutput(0, -r);
    assert(near(full.walkY, 1) && near(full.walkX, 0) && !full.dash, `推满 ${JSON.stringify(full)}`);
    const right = stickOutput(r, 0);
    assert(near(right.walkX, 1) && near(right.walkY, 0), "往右推 = 往右走");
  });
  it("超过底座边缘不再加速（封顶 1）；推过 dashAt 倍 = 冲刺", () => {
    const r = STICK.radius, a = stickOutput(0, -r * 1.2), b = stickOutput(0, -r * (STICK.dashAt + 0.01));
    assert(near(Math.hypot(a.walkX, a.walkY), 1) && !a.dash, "过边缘没到冲刺线 = 全速走");
    assert(b.dash && near(Math.hypot(b.walkX, b.walkY), 1), "过冲刺线 = 冲刺");
  });
  it("斜推：方向保持、幅值一样（不是方块形的摇杆）", () => {
    const r = STICK.radius, s = stickOutput(r / Math.SQRT2, -r / Math.SQRT2);
    assert(near(s.walkX, s.walkY) && near(Math.hypot(s.walkX, s.walkY), 1), JSON.stringify(s));
  });
  it("浮动底座：手指没走远 = 底座不动；拖出 followAt 倍 = 底座跟到正好 followAt 倍远、方向不变", () => {
    const b = { x: 100, y: 500 }, max = STICK.followAt * STICK.radius;
    eq(followBase(b, { x: 100, y: 500 - max + 1 }), b);
    const nb = followBase(b, { x: 100, y: 500 - max - 40 });
    assert(near(nb.x, 100) && near(nb.y, 460), JSON.stringify(nb));
  });
  it("底座出现的位置：贴边按下 = 底座往里挪到整个露出来", () => {
    const z = { x: 0, y: 200, w: 372, h: 800 };
    eq(JSON.stringify(placeBase({ x: 5, y: 995 }, z)), JSON.stringify({ x: STICK.radius, y: 1000 - STICK.radius }));
    eq(JSON.stringify(placeBase({ x: 150, y: 600 }, z)), JSON.stringify({ x: 150, y: 600 }));
  });
});
