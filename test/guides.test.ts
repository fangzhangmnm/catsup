// 参考几何 + 上下文帧（0.11 尺规纪元 ①②，2026-10-24 Claude Fable 5.1；设计稿 ai-docs/20261024-ruler-compass-design.md）。
// 场景层 ops / 克隆 / 搬运；世界视图的帧与参考几何；求解器把帧当原点与三轴、把参考线 / 参考点当目标；线 × 线交点由合成器涌现。
import { describe, it, eq, assert } from "./runner.mjs";
import { Kernel } from "../src/kernel/kernel.ts";
import type { Pt3 } from "../src/kernel/kernel.ts";
import { Scene } from "../src/scene/scene.ts";
import { WorldView, type GeomView } from "../src/scene/world-view.ts";
import { applyOp, faceKey } from "../src/editor/ops.ts";
import { OrbitCamera } from "../src/editor/camera.ts";
import { RANK, buildConstraints, snapPoint } from "../src/editor/solver.ts";
import { GROUND, NO_HAND } from "../src/editor/pick.ts";
import { translation, WORLD_FRAME, type Frame } from "../src/scene/xform.ts";
import { sceneGrouped } from "./format-scenes.ts";

const P = (x: number, y: number, z = 0): Pt3 => ({ x, y, z });
const near = (a: Pt3, b: Pt3, tol = 1e-9): boolean => Math.abs(a.x - b.x) < tol && Math.abs(a.y - b.y) < tol && Math.abs(a.z - b.z) < tol;
const VP = { w: 1000, h: 800 };
const topCam = (): OrbitCamera => { const c = new OrbitCamera(); c.yaw = -Math.PI / 2; c.pitch = 1.5707; c.halfH = 50; return c; };
const box = (): Scene => { const k = new Kernel(); k.addEdges([[P(0, 0), P(2, 0)], [P(2, 0), P(2, 2)], [P(2, 2), P(0, 2)], [P(0, 2), P(0, 0)]]); k.pushPull(k.faces()[0].id, 1); return new Scene(k); };
const ROOT = (s: Scene) => ({ def: s.root, group: null });
/** 裸 Kernel 当世界 + 帧 / 参考几何（solver 只认 GeomView 的可选 frame / guides）。 */
const viewOf = (k: Kernel, frame: Frame, guides: { lines: { id: number; p: Pt3; dir: Pt3 }[]; points: { id: number; p: Pt3 }[] }): GeomView => Object.assign(k, { frame: () => frame, guides: () => guides }) as unknown as GeomView;

describe("guides: 场景层 ops", () => {
  it("加线 / 加点 / 删一个 / 清空；id 线点同一空间；克隆是深拷贝", () => {
    let s = box();
    s = applyOp(s, { op: "addGuide", at: ROOT(s), line: { p: P(0.5, 0, 0), dir: P(0, 2, 0) } }).scene;
    s = applyOp(s, { op: "addGuide", at: ROOT(s), point: P(1, 1, 0) }).scene;
    s = applyOp(s, { op: "addGuide", at: ROOT(s), line: { p: P(0, 0.5, 0), dir: P(1, 0, 0) } }).scene;
    const g = s.guidesOf(ROOT(s));
    eq(g.lines.length, 2); eq(g.points.length, 1);
    eq(g.lines.map((l) => l.id).join(","), "1,3"); eq(g.points[0].id, 2, "线点同一 id 空间");
    assert(near(g.lines[0].dir, P(0, 1, 0)), "方向归一化");
    const c = s.clone();
    s = applyOp(s, { op: "eraseGuides", at: ROOT(s), ids: [2, 3] }).scene;
    eq(s.guidesOf(ROOT(s)).lines.length, 1); eq(s.guidesOf(ROOT(s)).points.length, 0);
    eq(c.guidesOf(ROOT(c)).lines.length, 2, "克隆不受原件改动影响"); eq(c.guidesOf(ROOT(c)).points.length, 1);
    s = applyOp(s, { op: "clearGuides", at: ROOT(s) }).scene;
    eq(s.guidesOf(ROOT(s)).lines.length + s.guidesOf(ROOT(s)).points.length, 0);
  });
  it("setAxes：根 = 绘图轴（世界坐标）；group = 组的轴、几何不动；克隆带轴", () => {
    let s = box();
    const F: Frame = { origin: P(1, 2, 0), x: P(0, 1, 0), y: P(-1, 0, 0), z: P(0, 0, 1) };
    s = applyOp(s, { op: "setAxes", at: ROOT(s), frame: F }).scene;
    assert(near(s.axes.origin, P(1, 2, 0)) && near(s.axes.x, P(0, 1, 0)), "绘图轴换了");
    const k = s.kernelOf(ROOT(s));
    const top = k.faces().find((f) => k.faceRings3(f.id)!.outer.every((p) => Math.abs(p.z - 1) < 1e-9))!;
    s = applyOp(s, { op: "makeGroup", at: ROOT(s), faces: [faceKey(k, top.id)], edges: [] }).scene;
    const gid = [...s.brep(s.root).groups.keys()][0];
    const before = s.group({ def: s.root, group: gid }).kernel.toBrep().vertices.length;
    s = applyOp(s, { op: "setAxes", at: { def: s.root, group: gid }, frame: { ...WORLD_FRAME, origin: P(9, 9, 9) } }).scene;
    assert(near(s.group({ def: s.root, group: gid }).axes.origin, P(9, 9, 9)), "组的轴换了");
    eq(s.group({ def: s.root, group: gid }).kernel.toBrep().vertices.length, before, "几何不动");
    assert(near(s.clone().axes.origin, P(1, 2, 0)), "克隆带绘图轴");
  });
  it("transformPool 搬池 = 参考几何跟着走；copyGroup 复制一份参考几何", () => {
    let s = box();
    const k = s.kernelOf(ROOT(s));
    const top = k.faces().find((f) => k.faceRings3(f.id)!.outer.every((p) => Math.abs(p.z - 1) < 1e-9))!;
    s = applyOp(s, { op: "makeGroup", at: ROOT(s), faces: [faceKey(k, top.id)], edges: [] }).scene;
    const gid = [...s.brep(s.root).groups.keys()][0];
    const G = { def: s.root, group: gid };
    s = applyOp(s, { op: "addGuide", at: G, line: { p: P(0, 0, 1), dir: P(1, 0, 0) } }).scene;
    s = applyOp(s, { op: "addGuide", at: G, point: P(1, 1, 1) }).scene;
    s = applyOp(s, { op: "transformPool", at: G, xform: translation(P(10, 0, 0)) }).scene;
    assert(near(s.guidesOf(G).lines[0].p, P(10, 0, 1)) && near(s.guidesOf(G).points[0].p, P(11, 1, 1)), "跟着池平移");
    s = applyOp(s, { op: "copyGroup", at: ROOT(s), group: gid, xform: translation(P(0, 5, 0)) }).scene;
    const gid2 = [...s.brep(s.root).groups.keys()].find((id) => id !== gid)!;
    assert(near(s.guidesOf({ def: s.root, group: gid2 }).points[0].p, P(11, 6, 1)), "副本的参考点随副本平移");
    eq(s.guidesOf(G).points[0].p.y, 1, "原件不动");
  });
});

describe("guides: 世界视图的帧与参考几何", () => {
  it("根 = 绘图轴；进组 = 组的轴；组件实例里 = 实例变换 × 单位帧；参考几何按活动池、换到世界坐标", () => {
    let s = sceneGrouped();
    const F: Frame = { origin: P(1, 2, 0), x: P(0, 1, 0), y: P(-1, 0, 0), z: P(0, 0, 1) };
    s = applyOp(s, { op: "setAxes", at: ROOT(s), frame: F }).scene;
    assert(near(new WorldView(s, { chain: [], group: null }).frame().origin, P(1, 2, 0)), "根 = 绘图轴");
    const gid = [...s.brep(s.root).groups.keys()][0];
    const gf = new WorldView(s, { chain: [], group: gid }).frame();
    assert(near(gf.origin, s.group({ def: s.root, group: gid }).axes.origin), "进组 = 组的轴（链上无实例变换）");
    const inst = [...s.def(s.root).instances.values()][0];
    const ctx = { chain: [inst.id], group: null };
    const f2 = new WorldView(s, ctx).frame();
    assert(near(f2.origin, P(inst.xform[3], inst.xform[7], inst.xform[11])), "组件实例里：原点 = 实例平移");
    s = applyOp(s, { op: "addGuide", at: { def: inst.def, group: null }, line: { p: P(0, 0, 0), dir: P(0, 0, 1) } }).scene;
    const gw = new WorldView(s, ctx).guides();
    eq(gw.lines.length, 1);
    assert(near(gw.lines[0].p, P(inst.xform[3], inst.xform[7], inst.xform[11])), "参考线换到世界坐标");
    eq(new WorldView(s, { chain: [], group: null }).guides().lines.length, 0, "根池看不到组件里的参考线（按池）");
  });
});

describe("guides: 求解器把帧当纸的边、把参考几何当目标", () => {
  const c45 = Math.SQRT1_2;
  const F45: Frame = { origin: P(5, 5, 0), x: P(c45, c45, 0), y: P(-c45, c45, 0), z: P(0, 0, 1) };
  it("上下文帧：原点目标在帧原点；轴线沿帧的 x / y；「X 轴」= 帧的 x", () => {
    const k = new Kernel(); k.addEdges([[P(-20, -20), P(-19, -20)]]);
    const view = viewOf(k, F45, { lines: [], points: [] });
    const C = buildConstraints({ k: view, plane: GROUND.plane, anchor: P(5, 5, 0) });
    assert(C.some((c) => c.tag.kind === "origin" && c.locus.dim === 0 && near(c.locus.p, P(5, 5, 0))), "原点 = 帧原点");
    assert(C.some((c) => c.tag.kind === "axis" && c.tag.axis === "x" && c.locus.dim === 1 && near(c.locus.dir, F45.x)), "x 轴线沿帧的 x");
    const cam = topCam();
    const target = P(5 + 3 * c45 + 0.2 * -c45, 5 + 3 * c45 + 0.2 * c45, 0);   // 沿帧 x 走 3 m，再横挪 0.2 m（1.6 px）
    const sp = cam.angularPx(target, VP);
    const sn = snapPoint(view, cam, VP, sp.x, sp.y, 8, { plane: GROUND, anchor: P(5, 5, 0), hand: NO_HAND });
    eq(sn.kind, "axis-x", "吸到帧的 x 轴线");
    assert(near(sn.p, P(5 + 3 * c45, 5 + 3 * c45, 0), 1e-6), "落在帧 x 轴线上");
    const so = cam.angularPx(P(5.1, 5, 0), VP);
    eq(snapPoint(view, cam, VP, so.x, so.y, 8, { plane: GROUND, hand: NO_HAND }).kind, "origin", "帧原点 = 原点目标");
  });
  it("参考线上 / 参考点 / 参考线交点（线 × 线由合成器涌现，先于「线上」）", () => {
    const k = new Kernel(); k.addEdges([[P(-20, -20), P(-19, -20)]]);
    const G = { lines: [{ id: 1, p: P(2, 0, 0), dir: P(0, 1, 0) }, { id: 2, p: P(0, 7, 0), dir: P(1, 0, 0) }], points: [{ id: 3, p: P(-3, -3, 0) }] };
    const view = viewOf(k, WORLD_FRAME, G);
    const cam = topCam();
    const s1 = cam.angularPx(P(2.2, 12, 0), VP);
    const a = snapPoint(view, cam, VP, s1.x, s1.y, 8, { plane: GROUND, hand: NO_HAND, lines: false });
    eq(a.kind, "on-guide"); assert(Math.abs(a.p.x - 2) < 1e-9 && Math.abs(a.p.y - 12) < 0.3, "落到参考线上");
    const s2 = cam.angularPx(P(2.3, 7.2, 0), VP);
    const b = snapPoint(view, cam, VP, s2.x, s2.y, 8, { plane: GROUND, hand: NO_HAND, lines: false });
    eq(b.kind, "guide-cross"); assert(near(b.p, P(2, 7, 0), 1e-6), "两条参考线的交点涌现为 0-D");
    const s3 = cam.angularPx(P(-2.6, -3.2, 0), VP);
    const d = snapPoint(view, cam, VP, s3.x, s3.y, 8, { plane: GROUND, hand: NO_HAND, lines: false });
    eq(d.kind, "guide-point"); assert(near(d.p, P(-3, -3, 0)), "参考点");
    assert(RANK.guidePoint > RANK.midpoint && RANK.guidePoint < RANK.endpoint && RANK.guide === RANK.edge, "秩：端点 > 参考点 > 中点；参考线 = 线上");
  });
});
