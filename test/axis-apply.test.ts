// 轴键的约束落到工具上（controller/axis-apply.ts；锁的一轮第二步，created 2026-11-13 by Claude Opus 5.5）：设计稿 2.3 那张表逐格钉住。
import { describe, it, eq } from "./runner.mjs";
import { moveLock, rotateLock, scaleLock } from "../src/controller/axis-apply.ts";
import type { AxisConstraint } from "../src/controller/axis-constraint.ts";

const N = { x: 0, y: 0, z: 1 }, D = { x: 1, y: 0, z: 0 };
const C: Readonly<Record<AxisConstraint["kind"], AxisConstraint>> = { free: { kind: "free" }, line: { kind: "line", dir: D }, plane: { kind: "plane", normal: N }, planeDir: { kind: "planeDir", normal: N, dir: D } };
const show = (r: { axis: unknown; plane: unknown }): string => (r.axis === D ? "沿方向" : r.axis === N ? "绕法线" : r.plane === N ? "在面里" : r.axis || r.plane ? "?" : "不限制");

describe("轴键约束 → 工具认的那一对（设计稿 2.3 表）", () => {
  it("一维（移动 / 挤出）：线 = 沿线；面 = 在面里；面里一个方向 = 沿那个方向", () => {
    eq((["free", "line", "plane", "planeDir"] as const).map((k) => show(moveLock(C[k]))).join(" / "), "不限制 / 沿方向 / 在面里 / 沿方向");
  });
  it("旋转：线 = 绕这条线；面 / 面里一个方向 = 绕面的法线", () => {
    const r = (["free", "line", "plane", "planeDir"] as const).map((k) => rotateLock(C[k]));
    eq(r.map((x) => (x.axis === D ? "绕线" : x.axis === N ? "绕法线" : x.plane ? "?" : "不限制")).join(" / "), "不限制 / 绕线 / 绕法线 / 绕法线");
  });
  it("缩放：线 = 只沿这条线；面 / 面里一个方向 = 只在面里", () => {
    eq((["free", "line", "plane", "planeDir"] as const).map((k) => show(scaleLock(C[k]))).join(" / "), "不限制 / 沿方向 / 在面里 / 在面里");
  });
  it("两个最多有一个", () => {
    for (const f of [moveLock, rotateLock, scaleLock]) for (const c of Object.values(C)) { const r = f(c); eq(!!(r.axis && r.plane), false); }
  });
});
