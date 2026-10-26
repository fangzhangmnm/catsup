// DT15 圆心 + 选中的组 / 组件的轴原点（透视）吸附（user 2026-10-25「选不到轮子的圆心。这个最要命……如果component在轴被埋在几何里面，如何拾取」）。
// created 2026-10-25 by Claude Opus 5.5
import { describe, it, eq, assert } from "./runner.mjs";
import type { Pt3 } from "../src/kernel/kernel.ts";
import { Kernel } from "../src/kernel/kernel.ts";
import { Scene, ROOT_CONTEXT } from "../src/scene/scene.ts";
import { WorldView } from "../src/scene/world-view.ts";
import { applyOp, faceKey, edgeKey } from "../src/editor/ops.ts";
import { translation } from "../src/scene/xform.ts";
import { OrbitCamera } from "../src/editor/camera.ts";
import { RANK, buildConstraints, solvePoint } from "../src/editor/solver.ts";
import { GROUND } from "../src/editor/pick.ts";
import { sceneCylinder } from "./format-scenes.ts";

const P = (x: number, y: number, z = 0): Pt3 => ({ x, y, z });
const has = (ps: readonly Pt3[], q: Pt3): boolean => ps.some((p) => Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z) < 1e-9);
const VP = { w: 1000, h: 800 };
const topCam = (): OrbitCamera => { const c = new OrbitCamera(); c.yaw = -Math.PI / 2; c.pitch = 1.5707; c.halfH = 10; return c; };

describe("DT15 圆心", () => {
  it("圆柱（圆 → 推拉）：底圆和顶帽的圆心都在世界视图里", () => {
    const view = new WorldView(new Scene(sceneCylinder()), ROOT_CONTEXT);
    const cs = view.centers();
    assert(has(cs, P(1, 1, 0)), `底圆圆心 (1,1,0)：${JSON.stringify(cs)}`);
    assert(has(cs, P(1, 1, 1.5)), `顶帽圆心 (1,1,1.5)：${JSON.stringify(cs)}`);
  });
  it("做成组件、放第二份：第二份的圆心按实例变换到世界", () => {
    let s = new Scene(sceneCylinder());
    const k = s.kernelOf({ def: s.root, group: null });
    s = applyOp(s, { op: "makeComponent", at: { def: s.root, group: null }, faces: k.faces().map((f) => faceKey(k, f.id)), edges: k.edges().map((e) => edgeKey(k, e.id)), name: "轮子" }).scene;
    const defId = [...s.defs.keys()].find((id) => id !== s.root)!;
    s = applyOp(s, { op: "placeInstance", at: { def: s.root, group: null }, definition: defId, xform: translation(P(5, 0, 0)) }).scene;
    const cs = new WorldView(s, ROOT_CONTEXT).centers();
    eq(cs.length, 4, `两份 × 两个圆心：${JSON.stringify(cs)}`);
    assert(has(cs, P(1, 1, 1.5)) && has(cs, P(6, 1, 1.5)), `两份顶帽圆心：${JSON.stringify(cs)}`);
  });
  it("老文件（圆的身份已丢、只剩一圈普通边）：正 24 边形盖面的中心也算圆心——做成组件后照样有", () => {
    const k = new Kernel(), N = 24, pts: Pt3[] = [];
    for (let i = 0; i < N; i++) { const t = (2 * Math.PI * i) / N; pts.push(P(3 + Math.cos(t), 2 + Math.sin(t), 0)); }
    k.addEdges(pts.map((p, i) => [p, pts[(i + 1) % N]] as [Pt3, Pt3]));   // 不带 curve：模拟 v0.14.1 之前做成组件丢掉圆身份的样子
    k.pushPull(k.faces()[0].id, 0.5);
    eq(k.curves().length, 0, "确实没有曲线实体");
    let s = new Scene(k);
    const rk = s.kernelOf({ def: s.root, group: null });
    s = applyOp(s, { op: "makeComponent", at: { def: s.root, group: null }, faces: rk.faces().map((f) => faceKey(rk, f.id)), edges: rk.edges().map((e) => edgeKey(rk, e.id)), name: "旧轮子" }).scene;
    const cs = new WorldView(s, ROOT_CONTEXT).centers();
    assert(has(cs, P(3, 2, 0)) && has(cs, P(3, 2, 0.5)), `两个盖面的中心：${JSON.stringify(cs)}`);
    assert(!cs.some((c) => Math.abs(c.z - 0.25) < 1e-6), "侧面的长方形不算");
  });
  it("吸附约束里有「圆心」（秩同中点）", () => {
    const view = new WorldView(new Scene(sceneCylinder()), ROOT_CONTEXT);
    const C = buildConstraints({ k: view, plane: GROUND.plane });
    const cc = C.filter((c) => c.tag.kind === "center");
    eq(cc.length, 2);
    assert(cc.every((c) => c.rank === RANK.center && RANK.center === RANK.midpoint), "秩同中点");
  });
});

describe("DT15 透视点（选中的组 / 组件的轴原点）", () => {
  it("全被挡住时：透视点照样吸得到，普通圆心吸不到", () => {
    const c = topCam(), q = P(2, 3, 0);
    const scr = c.project(q, VP)!;
    const C = buildConstraints({ k: new Kernel(), plane: GROUND.plane, xrayPoints: [q] });
    assert(C.some((x) => x.tag.kind === "poolOrigin" && x.xray === true), "透视点登记成 xray 约束");
    const allHidden = (): boolean => true;
    const sol = solvePoint({ pf: c, vp: VP }, scr, C, { hidden: allHidden });
    assert(sol !== null && sol.used[0].tag.kind === "poolOrigin", `被挡也吸到：${JSON.stringify(sol?.used[0]?.tag)}`);
    // 对照：同一个点当圆心（判遮挡）→ 被挡就没有
    const C2 = C.map((x) => (x.tag.kind === "poolOrigin" ? { ...x, xray: false, tag: { kind: "center" as const } } : x));
    const sol2 = solvePoint({ pf: c, vp: VP }, scr, C2, { hidden: allHidden });
    assert(!sol2 || sol2.used[0].tag.kind !== "center", "普通点被挡就不算");
  });
});
