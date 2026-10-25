// 卷尺（0.11 尺规纪元 ③，2026-10-24 Claude Fable 5.1）：起点身份决定产物（边 / 参考线 → 平行参考线；点类 → 参考点；其余只量）；
// 产物几何是纯函数；落到场景 = addGuide op（池本地坐标）。
import { describe, it, eq, assert } from "./runner.mjs";
import type { Pt3 } from "../src/kernel/kernel.ts";
import { classifyStart, tapeResult } from "../src/editor/tape-geom.ts";
import { applyOp } from "../src/editor/ops.ts";
import { WorldView } from "../src/scene/world-view.ts";
import { sceneGrouped } from "./format-scenes.ts";

const P = (x: number, y: number, z = 0): Pt3 => ({ x, y, z });
const near = (a: Pt3, b: Pt3, tol = 1e-9): boolean => Math.abs(a.x - b.x) < tol && Math.abs(a.y - b.y) < tol && Math.abs(a.z - b.z) < tol;

describe("tape: 起点身份 → 产物", () => {
  it("边上起步 → 平行参考线：过第二点、沿边方向、距离 = 垂距（沿边分量被扔掉）", () => {
    const r = tapeResult({ kind: "line", p: P(0, 0, 0), dir: P(1, 0, 0) }, P(3, 1.5, 0));
    assert(r.make === "line");
    if (r.make === "line") { assert(near(r.p, P(0, 1.5, 0)), "过 (0,1.5)：沿边的 3 不算"); assert(near(r.dir, P(1, 0, 0))); eq(r.d, 1.5); }
    const r2 = tapeResult({ kind: "line", p: P(0, 0, 0), dir: P(1, 0, 0) }, P(3, 0, 0));
    eq(r2.make, "measure", "第二点落在线上 = 没偏移，不造参考线");
  });
  it("端点起步 → 参考点落在第二点，距离 = 两点距；太近不造", () => {
    const r = tapeResult({ kind: "point", p: P(1, 1, 0) }, P(1, 4, 0));
    assert(r.make === "point"); if (r.make === "point") { assert(near(r.p, P(1, 4, 0))); eq(r.d, 3); }
    eq(tapeResult({ kind: "point", p: P(1, 1, 0) }, P(1, 1.0001, 0)).make, "measure");
  });
  it("面上 / 空处起步 → 只量", () => {
    const r = tapeResult({ kind: "measure", p: P(0, 0, 0) }, P(3, 4, 0));
    eq(r.make, "measure"); eq(r.d, 5);
  });
  it("从参考点起手 = 过两点的参考线（参考点留着，user 10-25「好，不删点」）；模型端点起手照旧打点", () => {
    eq(classifyStart({ p: P(1, 1, 0), kind: "guide-point" }, null).kind, "through");
    eq(classifyStart({ p: P(1, 1, 0), kind: "endpoint" }, null).kind, "point");
    const r = tapeResult({ kind: "through", p: P(1, 1, 0) }, P(1, 3, 0));
    assert(r.make === "through" && Math.abs(r.dir.y - 1) < 1e-12 && r.p.x === 1 && r.p.y === 1, JSON.stringify(r));
    eq(tapeResult({ kind: "through", p: P(1, 1, 0) }, P(1, 1.001, 0)).make, "measure");
  });
  it("classifyStart：栅格把「边上」改写成格点时，调用方给了方向就仍按边起手出平行线；没给方向 = 只量（D23）", () => {
    eq(classifyStart({ p: P(1, 0, 0), kind: "grid-point" }, P(1, 0, 0)).kind, "line");
    eq(classifyStart({ p: P(1, 0, 0), kind: "increment" }, P(1, 0, 0)).kind, "line");
    eq(classifyStart({ p: P(1, 0.3, 0), kind: "grid-point" }, null).kind, "measure");
  });
  it("classifyStart：吸附种类分四类（2026-10-25 加「参考点起手 = 过两点」）；边类没拿到方向就退成只量", () => {
    eq(classifyStart({ p: P(0, 0, 0), kind: "on-edge" }, P(0, 1, 0)).kind, "line");
    eq(classifyStart({ p: P(0, 0, 0), kind: "on-guide" }, P(1, 0, 0)).kind, "line");
    eq(classifyStart({ p: P(0, 0, 0), kind: "on-edge" }, null).kind, "measure", "没方向 = 只量");
    for (const k of ["endpoint", "midpoint", "intersection", "origin", "guide-cross"] as const) eq(classifyStart({ p: P(0, 0, 0), kind: k }, null).kind, "point", k);
    eq(classifyStart({ p: P(0, 0, 0), kind: "guide-point" }, null).kind, "through", "参考点起手 = 过两点的线（2026-10-25 起）");
    eq(classifyStart({ p: P(0, 0, 0), kind: "on-face" }, null).kind, "measure");
    eq(classifyStart({ p: P(0, 0, 0), kind: null }, null).kind, "measure");
  });
});

describe("tape: 产物进场景（addGuide op，池本地坐标）", () => {
  it("组件实例上下文里造的参考线：存进 definition 的池（本地坐标），世界视图里按实例变换出现；根池看不到", () => {
    let s = sceneGrouped();
    const inst = [...s.def(s.root).instances.values()][0];
    s = applyOp(s, { op: "addGuide", at: { def: inst.def, group: null }, line: { p: P(0.5, 0, 0), dir: P(0, 1, 0) } }).scene;
    const w = new WorldView(s, { chain: [inst.id], group: null }).guides();
    eq(w.lines.length, 1);
    assert(near(w.lines[0].p, P(0.5 + inst.xform[3], inst.xform[7], inst.xform[11])), "世界坐标 = 实例变换后");
    eq(new WorldView(s, { chain: [], group: null }).guides().lines.length, 0, "根池看不到");
  });
});

describe("tape D25：从边的中点 / 端点起手按拖的方向定（user「卷尺当从线和snap开始拉，还是没有出线，出了点。这样不对」）", () => {
  const X = { x: 1, y: 0, z: 0 }, Y = { x: 0, y: 1, z: 0 };
  it("中点（只在一条边上）：垂直拖开 = 平行线，顺着边拖 = 点", () => {
    const s = classifyStart({ p: { x: 1.5, y: 0, z: 0 }, kind: "midpoint" }, null, [X]);
    const up = tapeResult(s, { x: 1.6, y: 0.8, z: 0 });
    eq(up.make, "line"); if (up.make === "line") { eq(Math.abs(up.dir.x), 1); eq(+up.p.y.toFixed(9), 0.8); }
    eq(tapeResult(s, { x: 2.3, y: 0.1, z: 0 }).make, "point");
  });
  it("端点（拐角两条边）：垂直某一条边拖 = 那条边的平行线；沿对角线拖 = 点（分不清）", () => {
    const s = classifyStart({ p: { x: 3, y: 0, z: 0 }, kind: "endpoint" }, null, [X, Y]);
    const r1 = tapeResult(s, { x: 3.05, y: 0.7, z: 0 });
    eq(r1.make, "line"); if (r1.make === "line") eq(Math.abs(r1.dir.x), 1);
    const r2 = tapeResult(s, { x: 2.3, y: 0.04, z: 0 });
    eq(r2.make, "line"); if (r2.make === "line") eq(Math.abs(r2.dir.y), 1);
    eq(tapeResult(s, { x: 3.5, y: 0.5, z: 0 }).make, "point");
  });
  it("不在边上的点（没给 lines）照旧出点", () => {
    eq(tapeResult(classifyStart({ p: { x: 0, y: 0, z: 0 }, kind: "origin" }, null), { x: 0, y: 1, z: 0 }).make, "point");
  });
});
