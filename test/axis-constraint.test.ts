// 轴键的约束——对照表（锁的一轮第一步；设计稿 ai-docs/20261113-axis-constraint-module-design.md 第四节）。created 2026-11-13 by Claude Opus 5.5
// 这张表就是规矩：改规矩 = 改这张表（和 src/controller/axis-constraint.ts）。一行 = 这把工具要几个方向（wants）+ 按键顺序 → 现在被限制成什么。
// 记号：x / y / z / n甲 / n乙 / t = 单按；^x ^y ^z ^n甲 ^n乙 ^t = 加 Shift。X / Y / Z = 坐标架的三根轴；n甲、n乙 = 两张斜面的法线（不平行）；t = 一条躺在面甲里的边的方向。
// 比较时线的方向、面的法向不计正负号（规矩不管朝哪头）；数到 1e-6。
import { describe, it, eq } from "./runner.mjs";
import { axisBegin, axisConstraint, axisDescribe, axisPress, type AxisConstraint, type AxisKey, type Vec3 } from "../src/controller/axis-constraint.ts";

const V = (x: number, y: number, z: number): Vec3 => ({ x, y, z });
const X = V(1, 0, 0), Y = V(0, 1, 0), Z = V(0, 0, 1);
const N甲 = V(0, -0.6, 0.8), N乙 = V(0.6, 0, 0.8), T = V(0.6, 0.64, 0.48);   // T ⟂ N甲（躺在面甲里）
const unit = (a: Vec3): Vec3 => { const l = Math.hypot(a.x, a.y, a.z); return V(a.x / l, a.y / l, a.z / l); };
const cross = (a: Vec3, b: Vec3): Vec3 => unit(V(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x));
const proj = (d: Vec3, n: Vec3): Vec3 => { const k = d.x * n.x + d.y * n.y + d.z * n.z; return unit(V(d.x - n.x * k, d.y - n.y * k, d.z - n.z * k)); };   // d 投到法向 n 的面里

const TOKENS: Record<string, { key: AxisKey; dir: Vec3; ref: string }> = {
  x: { key: "x", dir: X, ref: "axis:x" }, y: { key: "y", dir: Y, ref: "axis:y" }, z: { key: "z", dir: Z, ref: "axis:z" },
  n甲: { key: "n", dir: N甲, ref: "face:甲" }, n乙: { key: "n", dir: N乙, ref: "face:乙" }, t: { key: "t", dir: T, ref: "edge:1" },
};
const run = (wants: 1 | 2, seq: readonly string[]) => {
  let s = axisBegin(wants);
  for (const tok of seq) { const shift = tok.startsWith("^"), t = TOKENS[shift ? tok.slice(1) : tok]; s = axisPress(s, { key: t.key, shift, dir: t.dir, ref: t.ref }); }
  return s;
};
/** 比较用的写法：方向归一、正负号定成「第一个不是 0 的分量为正」、数到 1e-6。 */
const canon = (v: Vec3): string => { const u = unit(v), c = [u.x, u.y, u.z], i = c.findIndex((q) => Math.abs(q) > 1e-9), sg = i >= 0 && c[i] < 0 ? -1 : 1; return c.map((q) => (q * sg).toFixed(6).replace("-0.000000", "0.000000")).join(","); };
const show = (c: AxisConstraint): string => c.kind === "free" ? "free" : c.kind === "line" ? `line(${canon(c.dir)})` : c.kind === "plane" ? `plane(${canon(c.normal)})` : `planeDir(n=${canon(c.normal)} d=${canon(c.dir)})`;
const line = (d: Vec3): AxisConstraint => ({ kind: "line", dir: d });
const plane = (n: Vec3): AxisConstraint => ({ kind: "plane", normal: n });
const planeDir = (n: Vec3, d: Vec3): AxisConstraint => ({ kind: "planeDir", normal: n, dir: d });
const FREE: AxisConstraint = { kind: "free" };

/** 对照表：[这一行在说什么, wants, 按键顺序, 应该是]。 */
const TABLE: readonly [string, 1 | 2, readonly string[], AxisConstraint][] = [
  // 一个方向的工具（画线、移动、挤出、旋转、缩放）
  ["X = 沿 X", 1, ["x"], line(X)],
  ["X、Y = 沿 Y（换）", 1, ["x", "y"], line(Y)],
  ["X、X = 不限制（取消）", 1, ["x", "x"], FREE],
  ["N（面甲）、X = 沿 X（换）", 1, ["n甲", "x"], line(X)],
  ["N（面甲）、N（面乙）= 沿面乙的法线（换；第二次按到的是另一张面 = 新的一条）", 1, ["n甲", "n乙"], line(N乙)],
  ["N（面甲）两次 = 不限制（同一张面 = 取消）", 1, ["n甲", "n甲"], FREE],
  // 两个方向的工具（矩形、圆）
  ["X、Y = 水平面、方向 X", 2, ["x", "y"], planeDir(Z, X)],
  ["N（面甲）、X = 立在面上：面由法线和 X 撑出、方向 = 法线（user 的例子）", 2, ["n甲", "x"], planeDir(cross(N甲, X), N甲)],
  ["X、Y、Z = 丢掉 X，Y 和 Z 撑出的面（方向 Y）", 2, ["x", "y", "z"], planeDir(X, Y)],
  ["X、X = 不限制", 2, ["x", "x"], FREE],
  ["N（面甲）、N（面乙）= 两条法线撑出的面", 2, ["n甲", "n乙"], planeDir(cross(N甲, N乙), N甲)],
  ["Shift+N、X、Y = 贴着面、方向 = Y 投到面里（面不变，单按换掉）", 2, ["^n甲", "x", "y"], planeDir(N甲, proj(Y, N甲))],
  ["Shift+Z 之后单按只记一个：Shift+Z、X、Y = 水平面、方向 Y", 2, ["^z", "x", "y"], planeDir(Z, Y)],
  // 加 Shift（两种工具一样）
  ["Shift+Z = 水平面", 1, ["^z"], plane(Z)],
  ["Shift+Z、Z = 沿 Z（后按的单按盖掉投不进去的面）", 1, ["^z", "z"], line(Z)],
  ["Shift+X、Shift+Y = 沿 Z（两个面的交线）", 1, ["^x", "^y"], line(Z)],
  ["Shift+N、X = 贴着面、方向 = X 投到面里（user 的例子）", 2, ["^n甲", "x"], planeDir(N甲, proj(X, N甲))],
  ["Shift+N、X（一个方向的工具也一样）", 1, ["^n甲", "x"], planeDir(N甲, proj(X, N甲))],
  ["Shift+N、Shift+Z = 这张面里的水平线", 1, ["^n甲", "^z"], line(cross(N甲, Z))],
  ["Shift+N（面甲）、Shift+N（面乙）= 两张面的交线", 1, ["^n甲", "^n乙"], line(cross(N甲, N乙))],
  ["Shift+N（面甲）两次 = 不限制", 1, ["^n甲", "^n甲"], FREE],
  ["Shift+N、Shift+T = 面里垂直于这条边的方向", 1, ["^n甲", "^t"], line(cross(N甲, T))],
  ["Shift+X、Shift+Y、Shift+Z = 丢掉最早的，剩 Y、Z 两个面 → 沿 X", 1, ["^x", "^y", "^z"], line(X)],
  // 组合不成立时，后按的盖掉先按的
  ["Shift+X、Shift+Y、X = X 不沿 Z（交线）→ 丢早的 Shift+X；X 投进 XZ 面 → XZ 面里沿 X", 1, ["^x", "^y", "x"], planeDir(Y, X)],
  ["Shift+X、Shift+Y、Z = Z 沿着交线 → 还是沿 Z", 1, ["^x", "^y", "z"], line(Z)],
  ["Z、Shift+Z = 后按的 Shift 盖掉投不进去的单按 → 水平面", 1, ["z", "^z"], plane(Z)],
  ["X、Shift+Z = 水平面里沿 X", 1, ["x", "^z"], planeDir(Z, X)],
  ["X、Y（两个方向）、Shift+Z = 单按只留最近的 Y → 水平面里沿 Y", 2, ["x", "y", "^z"], planeDir(Z, Y)],
  ["Shift+Z、X、X = 取消单按 → 回到水平面", 1, ["^z", "x", "x"], plane(Z)],
];

describe("轴键的约束：对照表（按键顺序 → 结果）", () => {
  for (const [what, wants, seq, want] of TABLE) it(`(${wants}) ${seq.join("、")}：${what}`, () => eq(show(axisConstraint(run(wants, seq))), show(want)));
});

describe("轴键的约束：边角", () => {
  it("没按 = 不限制；开头给的 wants 只影响单按能记几条", () => { eq(show(axisConstraint(axisBegin(1))), "free"); eq(show(axisConstraint(axisBegin(2))), "free"); });
  it("平行用 1 度的门槛：和 X 差 0.5° 的方向算平行（两个方向的工具里不撑出面，只留新的）；差 2° 的不算", () => {
    const a = (deg: number): Vec3 => V(Math.cos((deg * Math.PI) / 180), Math.sin((deg * Math.PI) / 180), 0);
    let s = axisPress(axisBegin(2), { key: "x", shift: false, dir: X, ref: "axis:x" });
    s = axisPress(s, { key: "t", shift: false, dir: a(0.5), ref: "edge:9" });
    eq(axisConstraint(s).kind, "line", "差 0.5° = 平行 = 换掉，还是一条线");
    let s2 = axisPress(axisBegin(2), { key: "x", shift: false, dir: X, ref: "axis:x" });
    s2 = axisPress(s2, { key: "t", shift: false, dir: a(2), ref: "edge:9" });
    eq(axisConstraint(s2).kind, "planeDir", "差 2° = 不平行 = 两根撑出面");
  });
  it("方向不用传单位长（这里归一）", () => eq(show(axisConstraint(axisPress(axisBegin(1), { key: "z", shift: false, dir: V(0, 0, 5), ref: "axis:z" }))), show(line(Z))));
  it("状态不改原来那份（每按一下给新的；外面拿旧的再按 = 从旧的那一步接着）", () => {
    const s0 = run(1, ["x"]), s1 = axisPress(s0, { key: "y", shift: false, dir: Y, ref: "axis:y" });
    eq(show(axisConstraint(s0)), show(line(X))); eq(show(axisConstraint(s1)), show(line(Y)));
  });
  it("给人看的：亮的键按先后、带不带 Shift；一句话", () => {
    const d = axisDescribe(run(2, ["^n甲", "x"]));
    eq(JSON.stringify(d.keys), JSON.stringify([{ key: "n", shift: true }, { key: "x", shift: false }]));
    eq(d.say, "在光标下那张面里，沿 X（投到面里）");
    eq(axisDescribe(run(1, ["^x", "^y"])).say, "沿YZ 面和XZ 面的交线");
    eq(axisDescribe(run(1, ["z"])).say, "沿 Z");
    eq(axisDescribe(run(2, ["n甲", "x"])).say, "在 法线 和 X 撑出的面里，一条边沿 法线");
    eq(axisDescribe(axisBegin(1)).say, ""); eq(axisDescribe(axisBegin(1)).keys.length, 0);
  });
});
