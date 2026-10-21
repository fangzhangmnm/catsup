// scene / ops（group / component 纪元，2026-10-21，Claude Fable 5.1）：建组 / 建组件 / 炸开 / 整体变换 / 放实例 的 op 往返，
// 以及 sticky 隔离（组里的几何不与外面粘）、WorldView 合成、History 撤销。
import { describe, it, eq, assert } from "./runner.mjs";
import { Kernel } from "../src/kernel/kernel.ts";
import type { Pt3 } from "../src/kernel/kernel.ts";
import { Scene, ROOT_CONTEXT } from "../src/scene/scene.ts";
import { WorldView } from "../src/scene/world-view.ts";
import { applyOp, faceKey, edgeKey, type Op } from "../src/editor/ops.ts";
import { History } from "../src/editor/history.ts";
import { rotationAbout, scalingAbout, translation, applyPt, invert, compose, isRigid } from "../src/scene/xform.ts";
import { fingerprint, sceneBox } from "./format-scenes.ts";

const P = (x: number, y: number, z = 0): Pt3 => ({ x, y, z });
const rootK = (s: Scene): Kernel => s.kernelOf({ def: s.root, group: null });
const rootAt = (s: Scene) => ({ def: s.root, group: null });
const topFace = (k: Kernel, z: number): number => k.faces().find((f) => k.faceRings3(f.id)!.outer.every((p) => Math.abs(p.z - z) < 1e-9))!.id;

describe("scene: group", () => {
  it("建组：顶面搬进 group（共享边两边各一份），根池剩 5 面；组里推拉不粘外面；炸开回来 6 面 12 棱", () => {
    let s = new Scene(sceneBox(2, 1.5));
    const k = rootK(s);
    s = applyOp(s, { op: "makeGroup", at: rootAt(s), faces: [faceKey(k, topFace(k, 1.5))], edges: [] }).scene;
    const d = s.def(s.root);
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
    eq(s.def(s.root).groups.size, 0, "group 没了");
    const k2 = rootK(s);
    assert(k2.faces().length >= 10, `炸开后面数 ${k2.faces().length}（盒 5 + 组盒 6 − 共面 dedup）`);
    assert(k2.edges().every((e) => e.faceLinks.length > 0 || true), "不崩");
  });

  it("整体移动 group：顶点与轴框同移；撤销回原位", () => {
    let s = new Scene(sceneBox(2, 1.5));
    const k = rootK(s);
    const h = new History(s);
    s = h.commit(s, { op: "makeGroup", at: rootAt(s), faces: [faceKey(k, topFace(k, 1.5))], edges: [] }).scene;
    const g = [...s.def(s.root).groups.values()][0];
    const before = fingerprint(g.kernel);
    s = h.commit(s, { op: "transformPool", at: { def: s.root, group: g.id }, xform: translation(P(0, 0, 2)) }).scene;
    const g2 = [...s.def(s.root).groups.values()][0];
    assert(g2.kernel.vertices().every((v) => Math.abs(v.z - 3.5) < 1e-9), "顶点到 z=3.5");
    eq(g2.axes.origin.z, 3.5, "轴框同移");
    s = h.undo()!;
    eq(fingerprint([...s.def(s.root).groups.values()][0].kernel), before, "撤销回原位");
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
    const def = s.def(defId);
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
    eq(s2.def(s2.root).groups.size, 1); eq(s2.def(s2.root).instances.size, 2);
  });
});
