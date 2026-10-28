// 锁看得见（controller/lock-guide.ts；created 2026-10-28 by Claude Opus 5.5）：user 10-28 晚「轴锁的时候能不能看到小轴线」「这个是深模块吧就是所有的轴锁都这样，你好好想一下轴放哪里」。
import { describe, it, eq, assert } from "./runner.mjs";
import { lockLines, lockThrough, type LockFrame } from "../src/controller/lock-guide.ts";

const c = Math.cos(0.6), s = Math.sin(0.6);
const F: LockFrame = { x: { x: 2 * c, y: 2 * s, z: 0 }, y: { x: -s, y: c, z: 0 }, z: { x: 0, y: 0, z: 3 } };   // 转过、带缩放的组件坐标架
const A = { x: 5, y: 3, z: 2 }, PV = { x: 1, y: 1, z: 1 };
const unit = (v: { x: number; y: number; z: number }) => Math.abs(Math.hypot(v.x, v.y, v.z) - 1) < 1e-12;
const dot = (a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }) => a.x * b.x + a.y * b.y + a.z * b.z;

describe("锁看得见（lock-guide.ts）", () => {
  it("过哪一点：手势中 = 锚点（没锚点退到变换中心）；没在手势里 = 变换中心；都没有 = 不画", () => {
    eq(lockThrough(true, A, PV), A); eq(lockThrough(true, null, PV), PV); eq(lockThrough(false, A, PV), PV); eq(lockThrough(false, A, null), null);
    eq(lockLines({ axis: "x", plane: null, planeN: null }, F, null).length, 0);
  });
  it("锁轴 = 一根线，方向 = 上下文坐标架那根轴（归一，跟着组件转）、颜色 = 那根轴", () => {
    const l = lockLines({ axis: "x", plane: null, planeN: null }, F, A);
    eq(l.length, 1); eq(l[0].color, "x"); eq(l[0].through, A); assert(unit(l[0].dir) && Math.abs(l[0].dir.x - c) < 1e-12 && Math.abs(l[0].dir.y - s) < 1e-12);
  });
  it("锁面 XY（法向 Z）= 面里的 X、Y 两根；锁 YZ = Y、Z 两根", () => {
    eq(lockLines({ axis: null, plane: "z", planeN: { x: 0, y: 0, z: 1 } }, F, A).map((l) => l.color).join(""), "xy");
    eq(lockLines({ axis: null, plane: "x", planeN: { x: c, y: s, z: 0 } }, F, A).map((l) => l.color).join(""), "yz");
  });
  it("锁按下那张斜面 = 面里两根互相垂直的中性线", () => {
    const n = { x: 0.3, y: -0.4, z: 0.866 }, l = lockLines({ axis: null, plane: "face", planeN: n }, F, A);
    eq(l.length, 2); assert(l.every((x) => x.color === "n" && unit(x.dir)));
    const nn = Math.hypot(n.x, n.y, n.z); assert(Math.abs(dot(l[0].dir, n) / nn) < 1e-12 && Math.abs(dot(l[1].dir, n) / nn) < 1e-12 && Math.abs(dot(l[0].dir, l[1].dir)) < 1e-12);
  });
  it("只有一处画：编辑器的 viewState 从 lockGuide 拿线，工具里不许各画各的", async () => {
    const fs = (await import("node:fs" as string)) as { readFileSync(p: URL, enc: string): string, readdirSync(p: URL): string[] };
    const ed = fs.readFileSync(new URL("../src/editor/editor.ts", import.meta.url), "utf8");
    assert(/lockLines: this\.lockGuide\(\)/.test(ed), "editor.ts viewState 不再从 lockGuide 拿线");
    for (const f of fs.readdirSync(new URL("../src/editor/tools/", import.meta.url))) if (f.endsWith(".ts")) assert(!/lockLines/.test(fs.readFileSync(new URL(`../src/editor/tools/${f}`, import.meta.url), "utf8")), `tools/${f} 自己画锁线`);
  });
});
