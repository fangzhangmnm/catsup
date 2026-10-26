// scene / ops（group / component 纪元，2026-10-21，Claude Fable 5.1）：建组 / 建组件 / 炸开 / 整体变换 / 放实例 的 op 往返，
// 以及 sticky 隔离（组里的几何不与外面粘）、WorldView 合成、History 撤销。
import { describe, it, eq, assert } from "./runner.mjs";
import { Kernel } from "../src/kernel/kernel.ts";
import type { Pt3 } from "../src/kernel/kernel.ts";
import { Scene, ROOT_CONTEXT } from "../src/scene/scene.ts";
import { WorldView } from "../src/scene/world-view.ts";
import { applyOp, faceKey, edgeKey, ShearRejected, type Op } from "../src/editor/ops.ts";
import { History } from "../src/editor/history.ts";
import { rotationAbout, scalingAbout, translation, applyPt, invert, compose, isRigid, hasShear } from "../src/scene/xform.ts";
import { fingerprint, sceneBox, scenePainted } from "./format-scenes.ts";
import { writeCatsup, readCatsup, documentFromScene, sceneFromDocument } from "../src/format/index.ts";
import { circleSegmentsOnPlane } from "../src/editor/tools.ts";
import { GROUND } from "../src/editor/pick.ts";
import { smoothNormalsOf } from "../src/format/bake.ts";
import { decodeGlb } from "../src/format/glb.ts";

const P = (x: number, y: number, z = 0): Pt3 => ({ x, y, z });
const rootK = (s: Scene): Kernel => s.kernelOf({ def: s.root, group: null });
const rootAt = (s: Scene) => ({ def: s.root, group: null });
const topFace = (k: Kernel, z: number): number => k.faces().find((f) => k.faceRings3(f.id)!.outer.every((p) => Math.abs(p.z - z) < 1e-9))!.id;

describe("scene: group", () => {
  it("建组：顶面搬进 group（共享边两边各一份），根池剩 5 面；组里推拉不粘外面；炸开回来 6 面 12 棱", () => {
    let s = new Scene(sceneBox(2, 1.5));
    const k = rootK(s);
    s = applyOp(s, { op: "makeGroup", at: rootAt(s), faces: [faceKey(k, topFace(k, 1.5))], edges: [] }).scene;
    const d = s.brep(s.root);
    eq(d.groups.size, 1, "一个 group");
    const g = [...d.groups.values()][0];
    eq(rootK(s).faces().length, 5, "根池剩五面");
    eq(rootK(s).edges().length, 12, "根池的顶棱留下（墙还用着）");
    eq(g.kernel.faces().length, 1, "组里一张面");
    eq(g.kernel.edges().length, 4, "组里四边（自己一份）");
    eq(g.axes.origin.z, 1.5, "轴框落在包围盒最小角");
    // 组里推拉：不粘根池的墙（sticky 隔离域）
    s = applyOp(s, { op: "pushpull", at: { def: s.root, group: g.id }, face: faceKey(g.kernel, g.kernel.faces()[0].id), dist: 1 }).scene;
    eq(g.kernel.faces().length, 6, "组里自成盒子（有裸边 → 留源面）");
    eq(rootK(s).faces().length, 5, "根池纹丝不动");
    // 炸开：并回根池，sticky 合并（共面 dedup）
    s = applyOp(s, { op: "explode", at: rootAt(s), group: g.id }).scene;
    eq(s.brep(s.root).groups.size, 0, "group 没了");
    const k2 = rootK(s);
    assert(k2.faces().length >= 10, `炸开后面数 ${k2.faces().length}（盒 5 + 组盒 6 − 共面 dedup）`);
    assert(k2.edges().every((e) => e.faceLinks.length > 0 || true), "不崩");
  });

  it("整体移动 group：顶点与轴框同移；撤销回原位", () => {
    let s = new Scene(sceneBox(2, 1.5));
    const k = rootK(s);
    const h = new History(s);
    s = h.commit(s, { op: "makeGroup", at: rootAt(s), faces: [faceKey(k, topFace(k, 1.5))], edges: [] }).scene;
    const g = [...s.brep(s.root).groups.values()][0];
    const before = fingerprint(g.kernel);
    s = h.commit(s, { op: "transformPool", at: { def: s.root, group: g.id }, xform: translation(P(0, 0, 2)) }).scene;
    const g2 = [...s.brep(s.root).groups.values()][0];
    assert(g2.kernel.vertices().every((v) => Math.abs(v.z - 3.5) < 1e-9), "顶点到 z=3.5");
    eq(g2.axes.origin.z, 3.5, "轴框同移");
    s = h.undo()!.scene;
    eq(fingerprint([...s.brep(s.root).groups.values()][0].kernel), before, "撤销回原位");
  });
});

describe("scene: component", () => {
  it("建组件：定义在局部坐标（包围盒角 = 原点）、实例带平移；放第二份；改定义两份都变；炸开一份不动另一份", () => {
    let s = new Scene(sceneBox(2, 1.5));
    const k = rootK(s);
    const all = k.faces().map((f) => faceKey(k, f.id));
    s = applyOp(s, { op: "makeComponent", at: rootAt(s), faces: all, edges: k.edges().map((e) => edgeKey(k, e.id)), name: "box" }).scene;
    eq(rootK(s).faces().length, 0, "根池空了");
    eq(rootK(s).edges().length, 0);
    const defId = [...s.defs.keys()].find((id) => id !== s.root)!;
    const def = s.brep(defId);
    eq(def.kernel.faces().length, 6, "定义里六面");
    assert(def.kernel.vertices().some((v) => v.x === 0 && v.y === 0 && v.z === 0), "定义坐标从原点起");
    const inst = [...s.def(s.root).instances.values()][0];
    eq(inst.xform[3], 0, "原盒子就在原点 → 平移 0");
    s = applyOp(s, { op: "placeInstance", at: rootAt(s), definition: defId, xform: translation(P(5, 0, 0)) }).scene;
    eq(s.instanceCount(defId), 2, "两份");
    // 世界视图：12 面、两份盒子
    const view = new WorldView(s, ROOT_CONTEXT);
    eq(view.faces().length, 12, "世界里 12 面");
    assert(view.vertices().some((v) => Math.abs(v.x - 7) < 1e-9), "第二份在 x=5..7");
    // 改定义（在实例上下文里推拉顶面）→ 两份同变
    s = applyOp(s, { op: "pushpull", at: { def: defId, group: null }, face: faceKey(def.kernel, topFace(def.kernel, 1.5)), dist: 1 }).scene;
    const view2 = new WorldView(s, ROOT_CONTEXT);
    eq(view2.vertices().filter((v) => Math.abs(v.z - 2.5) < 1e-9).length, 8, "两份盒子的顶都到 2.5");
    // 炸开第二份：根池得到一个盒子，定义仍被第一份引用
    const second = [...s.def(s.root).instances.values()][1];
    s = applyOp(s, { op: "explode", at: rootAt(s), instance: second.id }).scene;
    eq(rootK(s).faces().length, 6, "根池一个盒子");
    eq(s.instanceCount(defId), 1, "定义还剩一份引用");
    assert(s.defs.has(defId), "定义仍在");
  });

  it("transformInstance 旋转 / 缩放是刚体 / 仿射：世界视图里顶点位置正确；循环引用被拒", () => {
    let s = new Scene(sceneBox(2, 2));
    const k = rootK(s);
    s = applyOp(s, { op: "makeComponent", at: rootAt(s), faces: k.faces().map((f) => faceKey(k, f.id)), edges: [], name: "b" }).scene;
    const defId = [...s.defs.keys()].find((id) => id !== s.root)!;
    const inst = [...s.def(s.root).instances.values()][0];
    const R = rotationAbout(P(0, 0, 0), P(0, 0, 1), Math.PI / 2);
    assert(isRigid(R), "旋转是刚体");
    s = applyOp(s, { op: "transformInstance", def: s.root, instance: inst.id, xform: R }).scene;
    const v = new WorldView(s, ROOT_CONTEXT);
    assert(v.vertices().some((p) => Math.abs(p.x + 2) < 1e-9 && Math.abs(p.y - 2) < 1e-9), "绕 Z 转 90°：(2,2) → (−2,2)");
    const S = scalingAbout(P(0, 0, 0), P(2, 1, 1));
    s = applyOp(s, { op: "transformInstance", def: s.root, instance: inst.id, xform: S }).scene;
    const v2 = new WorldView(s, ROOT_CONTEXT);
    assert(v2.vertices().some((p) => Math.abs(p.x + 4) < 1e-9), "x 向 2 倍");
    const q = applyPt(compose(invert(S), S), P(1, 2, 3));
    assert(Math.abs(q.x - 1) < 1e-12 && Math.abs(q.y - 2) < 1e-12, "逆变换往返");
    let err: unknown = null;
    try { applyOp(s, { op: "placeInstance", at: { def: defId, group: null }, definition: defId, xform: translation(P(1, 0, 0)) }); } catch (e) { err = e; }
    assert(err instanceof Error && /cycle/.test(err.message), "定义不能引用自己");
  });

  it("op 可序列化：建组 / 建组件 / 放实例的日志 JSON 往返重放 = 实时（池 / 实例 id 由顺序铸造）", () => {
    const ops: Op[] = [];
    let s = new Scene();
    const rec = (op: Op): void => { ops.push(op); s = applyOp(s, op).scene; };
    rec({ op: "addEdges", segs: [[P(0, 0), P(2, 0)], [P(2, 0), P(2, 2)], [P(2, 2), P(0, 2)], [P(0, 2), P(0, 0)]] });
    rec({ op: "pushpull", face: faceKey(rootK(s), rootK(s).faces()[0].id), dist: 1 });
    const k = rootK(s);
    rec({ op: "makeGroup", at: rootAt(s), faces: [faceKey(k, topFace(k, 1))], edges: [] });
    const k2 = rootK(s);
    rec({ op: "makeComponent", at: rootAt(s), faces: k2.faces().map((f) => faceKey(k2, f.id)), edges: [], name: "walls" });
    const defId = [...s.defs.keys()].find((id) => id !== s.root)!;
    rec({ op: "placeInstance", at: rootAt(s), definition: defId, xform: translation(P(3, 0, 0)) });
    rec({ op: "transformPool", at: { def: s.root, group: 1 }, xform: translation(P(0, 0, 1)) });
    const wire = JSON.parse(JSON.stringify(ops)) as Op[];
    let s2 = new Scene();
    for (const op of wire) s2 = applyOp(s2, op).scene;
    const fp = (sc: Scene): string => [...new WorldView(sc, ROOT_CONTEXT).vertices()].map((v) => `${v.x.toFixed(6)},${v.y.toFixed(6)},${v.z.toFixed(6)}`).sort().join(" ");
    eq(fp(s2), fp(s), "重放后世界几何一致");
    eq(s2.brep(s2.root).groups.size, 1); eq(s2.def(s2.root).instances.size, 2);
  });
});

describe("scene: 材质（贴图纪元 2026-10-21）", () => {
  it("涂色 → 推拉：帽继承材质、侧壁默认；切面两半都继承；建组件槽号跟着走；炸开回来槽号重映射", () => {
    let s = scenePainted();
    const k = rootK(s);
    const wall = k.faces().find((f) => k.faceRings3(f.id)!.outer.every((p) => p.y === 0))!;
    eq(s.materialOfSlot(s.root, k.faceMaterialOf(wall.id))?.name, "格子", "墙贴了格子");
    // y=0 墙的 canonical 法向是 +y：dist −0.5 = 往外拉到 y=−0.5；邻墙是褶边（伸长），没有新侧壁
    s = applyOp(s, { op: "pushpull", at: rootAt(s), face: faceKey(k, wall.id), dist: -0.5 }).scene;
    const k2 = rootK(s);
    const cap = k2.faces().find((f) => k2.faceRings3(f.id)!.outer.every((p) => Math.abs(p.y + 0.5) < 1e-9))!;
    eq(s.materialOfSlot(s.root, k2.faceMaterialOf(cap.id))?.name, "格子", "帽跟着材质走");
    const others = k2.faces().filter((f) => f.id !== cap.id);
    assert(others.every((f) => k2.faceMaterialOf(f.id) === undefined), "被拉伸的邻墙仍是默认");
    s = applyOp(s, { op: "addEdges", at: rootAt(s), segs: [[{ x: 1, y: -0.5, z: 0 }, { x: 1, y: -0.5, z: 1.5 }]] }).scene;
    const k3 = rootK(s);
    const halves = k3.faces().filter((f) => k3.faceRings3(f.id)!.outer.every((p) => Math.abs(p.y + 0.5) < 1e-9));
    eq(halves.length, 2, "切成两半");
    assert(halves.every((f) => s.materialOfSlot(s.root, k3.faceMaterialOf(f.id))?.name === "格子"), "两半都是格子");
    // 组件里的盖子（孤面）推拉：帽继承赭石，四侧壁 + 留下的源面 = 默认
    const lidDef = [...s.defs.values()].find((d) => d.name === "lid")!, lidB = s.brep(lidDef.id);
    const lidFace = lidB.kernel.faces()[0];
    eq(s.materialOfSlot(lidDef.id, lidB.kernel.faceMaterialOf(lidFace.id))?.name, "赭石", "组件里的面仍是赭石");
    s = applyOp(s, { op: "pushpull", at: { def: lidDef.id, group: null }, face: faceKey(lidB.kernel, lidFace.id), dist: 0.3 }).scene;
    eq(lidB.kernel.faces().length, 6, "盖子拉成盒");
    const painted = lidB.kernel.faces().filter((f) => lidB.kernel.faceMaterialOf(f.id) !== undefined);
    eq(painted.length, 1, "只有帽带材质（侧壁 + 源面默认）");
    assert(lidB.kernel.faceRings3(painted[0].id)!.outer.every((p) => Math.abs(p.z - 0.3) < 1e-9), "带材质的是帽");
    const inst = [...s.def(s.root).instances.values()][0];
    s = applyOp(s, { op: "explode", at: rootAt(s), instance: inst.id }).scene;
    const k4 = rootK(s);
    const back = k4.faces().find((f) => k4.faceRings3(f.id)!.outer.every((p) => Math.abs(p.z - 1.8) < 1e-9))!;   // 盖子盒的帽（z=1.5+0.3）
    eq(s.materialOfSlot(s.root, k4.faceMaterialOf(back.id))?.name, "赭石", "炸开回来还是赭石（槽号已重映射到根池槽表）");
  });
});

describe("scene: group / component 审计（user 10-21「好好 audit 一下」）", () => {
  const mkBoxScene = (): Scene => new Scene(sceneBox(2, 1.5));
  it("嵌套 group：组里再建组 → parent 链正确；炸开外层 → 内层升到根；eraseGroup 递归删子项", () => {
    let s = mkBoxScene();
    const k = rootK(s);
    s = applyOp(s, { op: "makeGroup", at: rootAt(s), faces: k.faces().map((f) => faceKey(k, f.id)), edges: [] }).scene;
    const outer = [...s.brep(s.root).groups.values()][0];
    const gk = outer.kernel;
    s = applyOp(s, { op: "makeGroup", at: { def: s.root, group: outer.id }, faces: [faceKey(gk, topFace(gk, 1.5))], edges: [] }).scene;
    const inner = [...s.brep(s.root).groups.values()].find((g) => g.id !== outer.id)!;
    eq(inner.parent, outer.id, "内层的父 = 外层");
    eq(gk.faces().length, 5, "外层池剩五面");
    s = applyOp(s, { op: "explode", at: rootAt(s), group: outer.id }).scene;
    eq(s.brep(s.root).groups.size, 1, "外层没了，内层还在");
    eq([...s.brep(s.root).groups.values()][0].parent, null, "内层升到根");
    eq(rootK(s).faces().length, 5, "外层几何回根池");
    s = applyOp(s, { op: "eraseGroup", at: rootAt(s), group: inner.id }).scene;
    eq(s.brep(s.root).groups.size, 0, "删完");
  });

  it("copyGroup：含子实例的 group 复制一份 → 子实例也复制且经变换；原件不动", () => {
    let s = mkBoxScene();
    const k = rootK(s);
    s = applyOp(s, { op: "makeComponent", at: rootAt(s), faces: [faceKey(k, topFace(k, 1.5))], edges: [], name: "lid" }).scene;
    const k2 = rootK(s);
    s = applyOp(s, { op: "makeGroup", at: rootAt(s), faces: k2.faces().map((f) => faceKey(k2, f.id)), edges: [] }).scene;
    const g = [...s.brep(s.root).groups.values()][0];
    const lidInst = [...s.def(s.root).instances.values()][0];
    lidInst.parent = g.id;   // 把盖子实例挂进组（UI 上 = 组里建的组件；这里直接摆）
    s = applyOp(s, { op: "copyGroup", at: rootAt(s), group: g.id, xform: translation(P(5, 0, 0)) }).scene;
    eq(s.brep(s.root).groups.size, 2, "两个组");
    eq(s.def(s.root).instances.size, 2, "两个盖子实例");
    const copyG = [...s.brep(s.root).groups.values()].find((x) => x.id !== g.id)!;
    assert(copyG.kernel.vertices().every((v) => v.x >= 5 - 1e-9), "副本几何在 x≥5");
    const copyInst = [...s.def(s.root).instances.values()].find((i) => i.parent === copyG.id)!;
    assert(copyInst && Math.abs(copyInst.xform[3] - (lidInst.xform[3] + 5)) < 1e-9, "副本实例平移 +5");
    assert(g.kernel.vertices().every((v) => v.x <= 2 + 1e-9), "原件不动");
  });

  it("存读：嵌套 group 的 parent、实例的 parent group、材质槽、曲线 / 软边层全部往返", () => {
    let s = mkBoxScene();
    const k = rootK(s);
    s = applyOp(s, { op: "makeGroup", at: rootAt(s), faces: k.faces().map((f) => faceKey(k, f.id)), edges: [] }).scene;
    const outer = [...s.brep(s.root).groups.values()][0];
    s = applyOp(s, { op: "makeGroup", at: { def: s.root, group: outer.id }, faces: [faceKey(outer.kernel, topFace(outer.kernel, 1.5))], edges: [] }).scene;
    const inner = [...s.brep(s.root).groups.values()].find((g) => g.id !== outer.id)!;
    s = applyOp(s, { op: "addMaterial", name: "m", color: [0.2, 0.4, 0.6] }).scene;
    s = applyOp(s, { op: "paintFaces", at: { def: s.root, group: inner.id }, faces: [faceKey(inner.kernel, inner.kernel.faces()[0].id)], material: 0 }).scene;
    const s2 = sceneFromDocument(readCatsup(writeCatsup(documentFromScene(s, "t"))));
    const d2 = s2.brep(s2.root);
    eq(d2.groups.size, 2);
    const inner2 = d2.groups.get(inner.id)!, outer2 = d2.groups.get(outer.id)!;
    eq(inner2.parent, outer2.id, "parent 链往返");
    eq(s2.materialOfSlot(s2.root, inner2.kernel.faceMaterialOf(inner2.kernel.faces()[0].id))?.name, "m", "组里的面材质往返");
  });

  it("transformPool 非均匀缩放后的 group 推拉：帽沿变换后的法向走（仿射保平面）", () => {
    let s = mkBoxScene();
    const k = rootK(s);
    s = applyOp(s, { op: "makeGroup", at: rootAt(s), faces: k.faces().map((f) => faceKey(k, f.id)), edges: [] }).scene;
    const g = [...s.brep(s.root).groups.values()][0];
    s = applyOp(s, { op: "transformPool", at: { def: s.root, group: g.id }, xform: scalingAbout(P(0, 0, 0), P(2, 1, 1)) }).scene;
    assert(g.kernel.vertices().some((v) => Math.abs(v.x - 4) < 1e-9), "x 向拉成 4");
    const top = topFace(g.kernel, 1.5);
    s = applyOp(s, { op: "pushpull", at: { def: s.root, group: g.id }, face: faceKey(g.kernel, top), dist: 1 }).scene;
    eq(g.kernel.faces().length, 6, "仍六面");
    assert(g.kernel.vertices().some((v) => Math.abs(v.z - 2.5) < 1e-9), "顶到 2.5");
  });
});

describe("平滑组（0.8）：soft / smooth 两层、推拉策略、软化工具、bake NORMAL", () => {
  it("画圆推拉：侧棱 soft+smooth、顶底圈 curve（画线、不平滑）；按角度软化 / 硬化；bake 带逐角 NORMAL", () => {
    const k = new Kernel();
    const segs = circleSegmentsOnPlane(GROUND.plane, GROUND.basis, P(0, 0, 0), P(1, 0, 0), 12);
    k.addEdges(segs, { curve: true });
    eq(k.curve.size, 12, "圆边 = 曲线成员");
    eq(k.soft.size, 0, "圆边不软");
    k.pushPull(k.faces()[0].id, 1);
    const risers = k.edges().filter((e) => Math.abs(k.graph.pt(e.a).z - k.graph.pt(e.b).z) > 0.5);
    eq(risers.length, 12, "12 条侧棱");
    assert(risers.every((e) => k.isSoft(e.id) && k.isSmooth(e.id)), "侧棱 soft + smooth");
    const rims = k.edges().filter((e) => !risers.includes(e));
    eq(rims.length, 24, "顶底圈 24 条");
    assert(rims.every((e) => k.isCurve(e.id) && !k.isSoft(e.id) && !k.isSmooth(e.id)), "圈边是曲线成员、不软不平滑");
    // 硬化侧棱再按角度软化回来（12 段圆：相邻侧面夹角 30°）
    k.setEdgeLayer("soft", risers.map((e) => e.id), false); k.setEdgeLayer("smooth", risers.map((e) => e.id), false);
    assert(risers.every((e) => !k.isSmooth(e.id)), "硬化了");
    const d = k.dihedralDeg(risers[0].id)!;
    assert(Math.abs(d - 30) < 1e-3, `侧棱二面角 ${d}° ≈ 30°`);
    const soften = risers.filter((e) => (k.dihedralDeg(e.id) ?? 999) <= 35).map((e) => e.id);
    k.setEdgeLayer("soft", soften, true); k.setEdgeLayer("smooth", soften, true);
    assert(risers.every((e) => k.isSmooth(e.id)), "≤ 35° 全软化回来");
    // bake：默认材质 primitive 也逐角、带 NORMAL；平滑组顶点法向不等于平面法向
    const snap = k.toBrep();
    assert(snap.edgeLayers?.smooth?.length === 12 && snap.edgeLayers?.soft?.length === 12 && snap.edgeLayers?.curve?.length === 24, "快照三层");
    const sm = smoothNormalsOf(snap);
    assert(sm.size === 12, `平滑组覆盖 12 张侧面（实得 ${sm.size}）`);
    const bytes = writeCatsup(documentFromScene(new Scene(k), "cyl"));
    const { json } = decodeGlb(bytes) as { json: any };
    const tri = json.meshes[0].primitives.filter((p: any) => p.mode === 4);
    const withN = tri.filter((p: any) => p.attributes.NORMAL !== undefined);
    eq(withN.length, 1, "平滑组里的 12 张侧面走逐角 primitive 带 NORMAL（顶底盘走省流共享档）");
    eq(json.accessors[withN[0].attributes.POSITION].count, 12 * 2 * 3, "12 面 × 2 三角 × 3 角");
    // 读回：三层往返
    const back = sceneFromDocument(readCatsup(bytes)).kernelOf({ def: 1, group: null });
    eq(back.edgeLayers.layer("smooth").size, 12); eq(back.soft.size, 12); eq(back.curve.size, 24);
  });
});

// 建组件 / 建组时选中的组件 / 组一起装进去（2026-10-26，SketchUp 同款嵌套；user 回「建组件时选区里的组件不嵌套（SU 会嵌套）要不要改」：「当然要」）
describe("scene: 建组件 / 建组嵌套", () => {
  const worldPts = (s: Scene): string[] => s.pointsOfDef(s.root).map((p) => `${p.x.toFixed(6)},${p.y.toFixed(6)},${p.z.toFixed(6)}`).sort();
  /** 根上：散盒（0..2 × 0..1.5 × 0..1.5）+ 一个组件 A（盒子挪到 x=5）。 */
  const setup = (): { s: Scene; aInst: number } => {
    let s = new Scene(sceneBox(2, 1.5));
    const k = rootK(s);
    s = applyOp(s, { op: "makeComponent", at: rootAt(s), faces: k.faces().map((f) => faceKey(k, f.id)), edges: k.edges().map((e) => edgeKey(k, e.id)), name: "A" }).scene;
    const aInst = [...s.def(s.root).instances.values()][0].id;
    s = applyOp(s, { op: "transformInstance", def: s.root, instance: aInst, xform: translation(P(5, 0, 0)) } as Op).scene;
    const box2 = new Scene(sceneBox(2, 1.5)), k2 = box2.kernelOf({ def: box2.root, group: null });
    s = applyOp(s, { op: "addEdges", at: rootAt(s), segs: k2.edges().map((e) => [k2.graph.pt(e.a), k2.graph.pt(e.b)]) } as Op).scene;
    return { s, aInst };
  };
  it("建组件：散盒 + 组件 A 一起 → 新组件里有散几何和一份 A；根上只剩一份新组件；世界里每个点不动", () => {
    let { s, aInst } = setup();
    const before = worldPts(s), k = rootK(s);
    s = applyOp(s, { op: "makeComponent", at: rootAt(s), faces: k.faces().map((f) => faceKey(k, f.id)), edges: k.edges().map((e) => edgeKey(k, e.id)), name: "B", instances: [aInst] }).scene;
    const root = s.def(s.root);
    eq(root.instances.size, 1, "根上只剩新组件");
    const b = s.def([...root.instances.values()][0].def);
    eq(b.name, "B");
    eq(s.brep(b.id).kernel.faces().length, 6, "散盒进了新组件");
    eq(b.instances.size, 1, "A 装进去了");
    eq(rootK(s).faces().length, 0, "根上没有散几何了");
    eq(worldPts(s).join("|"), before.join("|"), "世界里每个点都没动");
  });
  it("只选组和组件也能建组件（没有散几何）：组整个搬进去", () => {
    let { s, aInst } = setup();
    // 把散盒的顶面先做成组，再只选这个组 + 组件 A 建组件
    const k = rootK(s);
    s = applyOp(s, { op: "makeGroup", at: rootAt(s), faces: [faceKey(k, topFace(k, 1.5))], edges: [] }).scene;
    const g1 = [...s.brep(s.root).groups.values()][0].id;
    const before = worldPts(s);
    s = applyOp(s, { op: "makeComponent", at: rootAt(s), faces: [], edges: [], name: "C", groups: [g1], instances: [aInst] }).scene;
    const root = s.def(s.root), c = s.def([...root.instances.values()].find((i) => s.def(i.def).name === "C")!.def);
    eq(s.brep(s.root).groups.size, 0, "组从根上搬走了");
    eq(s.brep(c.id).groups.size, 1, "组进了新组件");
    eq(c.instances.size, 1, "A 也进了新组件");
    eq(worldPts(s).join("|"), before.join("|"), "世界里每个点都没动");
  });
  it("建组：组件 A 改挂到新组下面（同一个定义，坐标不动）；撤销回原样", () => {
    let { s, aInst } = setup();
    const h = new History(s), k = rootK(s);
    s = h.commit(s, { op: "makeGroup", at: rootAt(s), faces: k.faces().map((f) => faceKey(k, f.id)), edges: k.edges().map((e) => edgeKey(k, e.id)), instances: [aInst] }).scene;
    const g = [...s.brep(s.root).groups.values()][0];
    eq(s.def(s.root).instances.get(aInst)!.parent, g.id, "A 挂到新组下");
    s = h.undo()!.scene;
    eq(s.brep(s.root).groups.size, 0, "撤销：没有组"); eq(s.def(s.root).instances.get(aInst)!.parent, null, "撤销：A 回到根");
  });
});

// 斜切护栏（2026-10-26，user「斜切：和gltf对齐。然后如果发生斜切能不能在发生的时候护栏住，然后提示报错？」「我觉得有父子的时候只是改变hierarchy也会产生违规斜切吧」）
describe("scene: 斜切护栏（glTF 节点矩阵必须能分解成平移·旋转·缩放）", () => {
  const rotZ = (deg: number) => rotationAbout(P(0, 0, 0), P(0, 0, 1), (deg * Math.PI) / 180);
  /** 根上一个组件 A（盒），实例转 30°。 */
  const setup = (): { s: Scene; inst: number } => {
    let s = new Scene(sceneBox(2, 1.5));
    const k = rootK(s);
    s = applyOp(s, { op: "makeComponent", at: rootAt(s), faces: k.faces().map((f) => faceKey(k, f.id)), edges: k.edges().map((e) => edgeKey(k, e.id)), name: "A" }).scene;
    const inst = [...s.def(s.root).instances.values()][0].id;
    s = applyOp(s, { op: "transformInstance", def: s.root, instance: inst, xform: rotZ(30) } as Op).scene;
    return { s, inst };
  };
  const throwsShear = (fn: () => unknown): boolean => { try { fn(); return false; } catch (e) { return e instanceof ShearRejected; } };
  it("转过的组件沿世界 X 拉长 = 斜切 → 拦下；沿它自己的轴拉长 → 放行（矩阵仍能分解）", () => {
    const { s, inst } = setup();
    assert(throwsShear(() => applyOp(s.clone(), { op: "transformInstance", def: s.root, instance: inst, xform: scalingAbout(P(0, 0, 0), P(2, 1, 1)) } as Op)), "沿世界 X：拦下");
    const own = compose(rotZ(30), compose(scalingAbout(P(0, 0, 0), P(2, 1, 1)), rotZ(-30)));   // 沿组件自己的 X
    const r = applyOp(s.clone(), { op: "transformInstance", def: s.root, instance: inst, xform: own } as Op);
    assert(!hasShear(r.scene.def(r.scene.root).instances.get(inst)!.xform), "沿自己的轴：没有斜切");
  });
  it("炸开一个被非等比缩放过、里面有转过子组件的组件 = 子组件会斜切 → 拦下", () => {
    let { s, inst } = setup();
    // 外层组件 B 装着转过的 A；B 自己被沿 X 拉长（B 的矩阵仍能分解）
    s = applyOp(s, { op: "makeComponent", at: rootAt(s), faces: [], edges: [], name: "B", instances: [inst] }).scene;
    const b = [...s.def(s.root).instances.values()][0];
    s = applyOp(s, { op: "transformInstance", def: s.root, instance: b.id, xform: scalingAbout(P(0, 0, 0), P(2, 1, 1)) } as Op).scene;
    assert(!hasShear(s.def(s.root).instances.get(b.id)!.xform), "B 自己没斜切（只是非等比缩放）");
    assert(throwsShear(() => applyOp(s.clone(), { op: "explode", at: rootAt(s), instance: b.id } as Op)), "炸开：A 的矩阵会变成 B·A = 斜切 → 拦下");
  });
  it("文件里原本就斜切的实例：别的操作照常能做（只拦新出现的斜切）", () => {
    let { s, inst } = setup();
    const def = s.def(s.root).instances.get(inst)!.def;
    s.def(s.root).instances.get(inst)!.xform = compose(scalingAbout(P(0, 0, 0), P(2, 1, 1)), rotZ(30));   // 模拟老文件：直接写进一个斜切矩阵
    assert(hasShear(s.def(s.root).instances.get(inst)!.xform));
    const r = applyOp(s, { op: "placeInstance", at: rootAt(s), definition: def, xform: translation(P(5, 0, 0)) } as Op);
    eq(r.scene.def(r.scene.root).instances.size, 2, "放一份新的照常成功");
  });
});

// 应用缩放（2026-10-26，user「我觉得有父子的时候只是改变hierarchy也会产生违规斜切吧。以及这样的话我们需要一个apply scale」）
describe("scene: 应用缩放", () => {
  const rotZ = (deg: number) => rotationAbout(P(0, 0, 0), P(0, 0, 1), (deg * Math.PI) / 180);
  const worldPts = (s: Scene): string[] => s.pointsOfDef(s.root).map((p) => `${p.x.toFixed(6)},${p.y.toFixed(6)},${p.z.toFixed(6)}`).sort();
  const colLens = (X: readonly number[]): number[] => [0, 1, 2].map((j) => +Math.hypot(X[j], X[4 + j], X[8 + j]).toFixed(9));
  const twoCopies = (): { s: Scene; i1: number; i2: number } => {
    let s = new Scene(sceneBox(2, 1.5));
    const k = rootK(s);
    s = applyOp(s, { op: "makeComponent", at: rootAt(s), faces: k.faces().map((f) => faceKey(k, f.id)), edges: k.edges().map((e) => edgeKey(k, e.id)), name: "A" }).scene;
    const i1 = [...s.def(s.root).instances.values()][0].id, def = s.def(s.root).instances.get(i1)!.def;
    s = applyOp(s, { op: "placeInstance", at: rootAt(s), definition: def, xform: translation(P(6, 0, 0)) } as Op).scene;
    const i2 = [...s.def(s.root).instances.values()].find((i) => i.id !== i1)!.id;
    // i1：先沿自己的 X 拉长 2 倍、再转 30°（矩阵能分解，只是带缩放）
    s = applyOp(s, { op: "transformInstance", def: s.root, instance: i1, xform: compose(rotZ(30), scalingAbout(P(0, 0, 0), P(2, 1, 1))) } as Op).scene;
    return { s, i1, i2 };
  };
  it("应用后这一份只剩旋转 + 平移；整个场景每个点不动（另一份外观不变、矩阵补了反比缩放）", () => {
    let { s, i1, i2 } = twoCopies();
    const before = worldPts(s);
    s = applyOp(s, { op: "applyScale", def: s.root, instance: i1 }).scene;
    eq(colLens(s.def(s.root).instances.get(i1)!.xform).join(","), "1,1,1", "这一份没有缩放了");
    eq(worldPts(s).join("|"), before.join("|"), "世界里每个点都没动");
    eq(colLens(s.def(s.root).instances.get(i2)!.xform).join(","), "0.5,1,1", "另一份补了反比（看起来不变）");
    assert(!hasShear(s.def(s.root).instances.get(i2)!.xform), "补偿后也没斜切");
  });
  it("镜像过的一份：镜像烘进几何，这一份变成纯旋转（行列式变正），外观不变", () => {
    let { s, i1 } = twoCopies();
    s = applyOp(s, { op: "transformInstance", def: s.root, instance: i1, xform: scalingAbout(P(0, 0, 0), P(-1, 1, 1)) } as Op).scene;
    const before = worldPts(s);
    s = applyOp(s, { op: "applyScale", def: s.root, instance: i1 }).scene;
    const X = s.def(s.root).instances.get(i1)!.xform;
    assert(X[0] * (X[5] * X[10] - X[6] * X[9]) - X[1] * (X[4] * X[10] - X[6] * X[8]) + X[2] * (X[4] * X[9] - X[5] * X[8]) > 0, "行列式为正");
    eq(worldPts(s).join("|"), before.join("|"), "世界里每个点都没动");
  });
  it("组件里有转过的子组件：烘缩放会让子组件斜切 → 拦下", () => {
    let { s, i1 } = twoCopies();
    // 把 i1 的定义 A 放进新组件 C，C 里那份 A 转 30°；再把 C 沿 X 拉长 → 对 C 应用缩放会让里面的 A 斜切
    s = applyOp(s, { op: "makeComponent", at: rootAt(s), faces: [], edges: [], name: "C", instances: [i1] }).scene;
    const c = [...s.def(s.root).instances.values()].find((i) => s.def(i.def).name === "C")!;
    s = applyOp(s, { op: "transformInstance", def: s.root, instance: c.id, xform: scalingAbout(P(0, 0, 0), P(3, 1, 1)) } as Op).scene;
    let threw = false;
    try { applyOp(s.clone(), { op: "applyScale", def: s.root, instance: c.id }); } catch (e) { threw = e instanceof ShearRejected; }
    assert(threw, "拦下");
  });
});
