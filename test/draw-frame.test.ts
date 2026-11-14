// 坐标架 / 组件原点拆开（纪元账本 DT86，2026-10-26 Claude Opus 5.5）：
// 坐标架（画图用）三种上下文各一份、改它不挪任何几何；组件原点 = 定义坐标系，改它挪几何、每份实例补（世界不动），另摆的坐标架在世界里原地不动。
import { describe, it, assert } from "./runner.mjs";
import { applyOp } from "../src/editor/ops.ts";
import { History } from "../src/editor/history.ts";
import { sceneGrouped } from "./format-scenes.ts";
import { Scene } from "../src/scene/scene.ts";
import type { Pt3 } from "../src/kernel/kernel.ts";
import { type Frame, WORLD_FRAME, applyPt, transformFrame } from "../src/scene/xform.ts";

const near = (a: Pt3, b: Pt3, e = 1e-9): boolean => Math.abs(a.x - b.x) <= e && Math.abs(a.y - b.y) <= e && Math.abs(a.z - b.z) <= e;
const sameFrame = (a: Frame, b: Frame): boolean => near(a.origin, b.origin) && near(a.x, b.x) && near(a.y, b.y) && near(a.z, b.z);
const c = Math.cos(0.4), s = Math.sin(0.4);
const TILT: Frame = { origin: { x: 0.3, y: 0.2, z: 0.1 }, x: { x: c, y: s, z: 0 }, y: { x: -s, y: c, z: 0 }, z: { x: 0, y: 0, z: 1 } };
/** 世界里全部顶点（根池 + 每份实例的定义顶点经变换）。 */
function worldPts(sc: Scene): Pt3[] {
  const out: Pt3[] = [];
  const walk = (def: number, m: number[] | null, depth: number): void => {
    if (depth > 8) return;
    const d = sc.def(def); if (d.body.kind !== "brep") return;
    for (const k of [d.body.kernel, ...[...d.body.groups.values()].map((g) => g.kernel)]) for (const v of k.vertices()) out.push(m ? applyPt(m as never, v) : { x: v.x, y: v.y, z: v.z });
    for (const i of d.instances.values()) walk(i.def, m ? (composeX(m, i.xform as unknown as number[])) : (i.xform as unknown as number[]), depth + 1);
  };
  walk(sc.root, null, 0);
  return out;
}
/** 两组点一一配对在 tol 内（改组件原点带转角时几何落回 1 µm 格点，世界坐标差在 µm 以内 = user 接受的「低频承诺」）。 */
function samePts(a: Pt3[], b: Pt3[], tol: number): boolean {
  if (a.length !== b.length) return false;
  const used = new Array(b.length).fill(false);
  for (const p of a) { const j = b.findIndex((q, k) => !used[k] && near(p, q, tol)); if (j < 0) return false; used[j] = true; }
  return true;
}
const worldPoints = worldPts;
function composeX(a: number[], b: number[]): number[] {   // 3×4 行主序
  const r = new Array(12).fill(0);
  for (let i = 0; i < 3; i++) { for (let j = 0; j < 3; j++) r[i * 4 + j] = a[i * 4] * b[j] + a[i * 4 + 1] * b[4 + j] + a[i * 4 + 2] * b[8 + j]; r[i * 4 + 3] = a[i * 4] * b[3] + a[i * 4 + 1] * b[7] + a[i * 4 + 2] * b[11] + a[i * 4 + 3]; }
  return r;
}

describe("坐标架 / 组件原点（DT86）", () => {
  it("组件里搬坐标架：进组件的坐标架变了，组件原点 / 几何 / 实例矩阵都不动；重置 = 回到组件原点", () => {
    let sc = sceneGrouped();
    const inst = [...sc.def(sc.root).instances.values()][0], def = inst.def, ctx = { chain: [inst.id], group: null };
    const before = worldPoints(sc), xf0 = [...inst.xform];   // 先复制：applyOp 原地改场景
    assert(sameFrame(sc.frameOfContext(ctx), sc.originOfChain([inst.id])), "没摆过 = 跟组件原点");
    sc = applyOp(sc, { op: "setDrawFrame", at: { def, group: null }, frame: TILT }).scene;
    const inst1 = sc.def(sc.root).instances.get(inst.id)!;
    assert(sameFrame(sc.frameOfContext(ctx), transformFrame(inst1.xform, TILT)), "进组件 = 摆的那份（经实例变换到世界）");
    assert(sameFrame(sc.originOfChain([inst.id]), transformFrame(inst1.xform, WORLD_FRAME)), "组件原点不动");
    assert(samePts(worldPoints(sc), before, 0) && inst1.xform.every((v, i) => v === xf0[i]), "几何 / 实例矩阵一点没动");
    sc = applyOp(sc, { op: "setDrawFrame", at: { def, group: null }, frame: null }).scene;
    assert(sc.def(def).frame === undefined && sameFrame(sc.frameOfContext(ctx), sc.originOfChain([inst.id])), "重置 = 回到组件原点");
  });
  it("改组件原点（setAxes）：挪几何、每份实例补，世界不动；另摆的坐标架在世界里原地不动", () => {
    let sc = sceneGrouped();
    const inst = [...sc.def(sc.root).instances.values()][0], def = inst.def, ctx = { chain: [inst.id], group: null };
    sc = applyOp(sc, { op: "setDrawFrame", at: { def, group: null }, frame: TILT }).scene;
    const before = worldPoints(sc), dfWorld = sc.frameOfContext(ctx), xf0 = [...inst.xform] as typeof inst.xform;
    const newOrigin: Frame = { origin: { x: 0.5, y: 0.5, z: 0 }, x: { x: 0, y: 1, z: 0 }, y: { x: -1, y: 0, z: 0 }, z: { x: 0, y: 0, z: 1 } };
    sc = applyOp(sc, { op: "setAxes", at: { def, group: null }, frame: newOrigin }).scene;
    assert(samePts(worldPoints(sc), before, 3e-6), "世界里不动（90° 转角：格点落回格点）");
    const inst1 = sc.def(sc.root).instances.get(inst.id)!;
    assert(near(applyPt(inst1.xform, { x: 0, y: 0, z: 0 }), applyPt(xf0, newOrigin.origin)), "组件原点到了新位置");
    assert(sameFrame(sc.frameOfContext(ctx), dfWorld, ), "另摆的坐标架原地不动（跟着定义坐标反变换）");
  });
  it("改组件原点能撤销：几何和实例矩阵一起回去、世界不动（v0.15.15 起它按骨架记、内核共享 → 撤销后组件在世界里错位；10-27 改成整份记）", () => {
    const sc = sceneGrouped(), inst = [...sc.def(sc.root).instances.values()][0], h = new History(sc);
    const before = worldPoints(sc);
    const after = h.commit(sc, { op: "setAxes", at: { def: inst.def, group: null }, frame: { origin: { x: 0.5, y: 0.5, z: 0 }, x: { x: 1, y: 0, z: 0 }, y: { x: 0, y: 1, z: 0 }, z: { x: 0, y: 0, z: 1 } } }).scene;
    assert(samePts(worldPoints(after), before, 1e-9), "做完世界不动");
    const back = h.undo()!.scene;
    assert(samePts(worldPoints(back), before, 1e-9), "撤销后世界也不动");
    const redo = h.redo(back)!.scene;
    assert(samePts(worldPoints(redo), before, 1e-9), "重做后世界也不动");
  });
  it("「设为组件原点」那两步：原点 = 坐标架，之后坐标架回到跟原点、世界不动", () => {
    let sc = sceneGrouped();
    const inst = [...sc.def(sc.root).instances.values()][0], def = inst.def, ctx = { chain: [inst.id], group: null };
    sc = applyOp(sc, { op: "setDrawFrame", at: { def, group: null }, frame: TILT }).scene;
    const before = worldPoints(sc), dfWorld = sc.frameOfContext(ctx);
    sc = applyOp(sc, { op: "setAxes", at: { def, group: null }, frame: sc.def(def).frame! }).scene;
    sc = applyOp(sc, { op: "setDrawFrame", at: { def, group: null }, frame: null }).scene;
    assert(samePts(worldPoints(sc), before, 3e-6), "世界不动（0.4 rad 转角：几何落回 1 µm 格点，差 ≤ 几 µm）");
    assert(sameFrame(sc.originOfChain([inst.id]), dfWorld) && sameFrame(sc.frameOfContext(ctx), dfWorld), "组件原点 = 刚才的坐标架，坐标架跟着它");
  });
  it("组里：坐标架 = 组的那份；重置 = 回到它所在那层的坐标架；根：重置 = 世界", () => {
    let sc = sceneGrouped();
    const g = [...sc.brep(sc.root).groups.values()][0];
    assert(!!g, "样本里有组");
    sc = applyOp(sc, { op: "setDrawFrame", at: { def: sc.root, group: null }, frame: TILT }).scene;
    sc = applyOp(sc, { op: "setDrawFrame", at: { def: sc.root, group: g.id }, frame: { ...WORLD_FRAME, origin: { x: 9, y: 9, z: 9 } } }).scene;
    assert(near(sc.frameOfContext({ chain: [], group: g.id }).origin, { x: 9, y: 9, z: 9 }), "组的坐标架");
    sc = applyOp(sc, { op: "setDrawFrame", at: { def: sc.root, group: g.id }, frame: null }).scene;
    assert(sameFrame(sc.frameOfContext({ chain: [], group: g.id }), TILT), "组重置 = 外面那层（根的坐标架）");
    sc = applyOp(sc, { op: "setDrawFrame", at: { def: sc.root, group: null }, frame: null }).scene;
    assert(sameFrame(sc.frameOf(sc.root), WORLD_FRAME), "根重置 = 世界");
  });
  it("撤销用的场景拷贝带着组件的坐标架", () => {
    let sc = sceneGrouped();
    const def = [...sc.def(sc.root).instances.values()][0].def;
    sc = applyOp(sc, { op: "setDrawFrame", at: { def, group: null }, frame: TILT }).scene;
    assert(sameFrame(sc.clone().def(def).frame!, TILT), "clone 保留 drawFrame");
  });
});

// 给根包一层定稿第 2 条 a（第 1 版第七节；统筹 11-13 夜）：坐标架住在定义的头上，三个种类都能有、都读都写（文件里 = 头上的 drawFrame；根的 = document.axes），转种类照带。
describe("坐标架在定义的头上：三个种类都有、转种类照带、存了读得回", () => {
  const fileOf = async () => await import("../src/format/index.ts");
  const meshComp = (): { sc: Scene; def: number } => {
    let sc = sceneGrouped(); const def = [...sc.def(sc.root).instances.values()][0].def;
    sc = applyOp(sc, { op: "setDrawFrame", at: { def, group: null }, frame: TILT }).scene;
    return { sc, def };
  };
  it("硬表面体 → 网格体 → 硬表面体：另摆的坐标架一直带着（不在载荷里，不算丢）", () => {
    let { sc, def } = meshComp();
    sc = applyOp(sc, { op: "castDefinition", def, to: "mesh" }).scene;
    assert(sc.kindOf(def) === "mesh" && sameFrame(sc.frameOf(def), TILT), "转成网格体：坐标架还在");
    sc = applyOp(sc, { op: "castDefinition", def, to: "brep" }).scene;
    assert(sc.kindOf(def) === "brep" && sameFrame(sc.frameOf(def), TILT), "转回来：还在");
  });
  it("网格体、空物体上的坐标架存了再读回来一样；根的走 document.axes", async () => {
    const { writeCatsup, readCatsup, documentFromScene, sceneFromDocument } = await fileOf();
    let { sc, def } = meshComp();
    sc = applyOp(sc, { op: "castDefinition", def, to: "mesh" }).scene;
    const E = sc.mintDef("E", new (await import("../src/kernel/kernel.ts")).Kernel()); E.body = { kind: "empty", materialSlots: [] }; E.frame = TILT;
    sc.mintInstance(sc.root, null, E.id, [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0]);
    const ROOT: Frame = { ...TILT, origin: { x: 5, y: 6, z: 7 } };
    sc = applyOp(sc, { op: "setDrawFrame", at: { def: sc.root, group: null }, frame: ROOT }).scene;
    const doc = documentFromScene(sc, "t");
    assert(sameFrame(doc.axes, ROOT), "根的那一份 = document.axes");
    assert(!("drawFrame" in doc.definitions[doc.rootIndex]), "根不另写 drawFrame");
    const back = sceneFromDocument(readCatsup(writeCatsup(doc)));
    const byName = (n: string): number => [...back.defs.values()].find((d) => d.name === n)!.id;
    assert(back.kindOf(byName(sc.def(def).name)) === "mesh" && sameFrame(back.frameOf(byName(sc.def(def).name)), TILT), "网格体的坐标架读回来了");
    assert(back.kindOf(byName("E")) === "empty" && sameFrame(back.frameOf(byName("E")), TILT), "空物体的坐标架读回来了");
    assert(sameFrame(back.frameOf(back.root), ROOT), "根的读回来了");
  });
  it("网格体、空物体都能设 / 重置坐标架（指令不再只认硬表面体）", async () => {
    let { sc, def } = meshComp();
    sc = applyOp(sc, { op: "castDefinition", def, to: "mesh" }).scene;
    sc = applyOp(sc, { op: "setDrawFrame", at: { def, group: null }, frame: null }).scene;
    assert(sc.def(def).frame === undefined, "网格体重置 = 回到定义原点");
    sc = applyOp(sc, { op: "setDrawFrame", at: { def, group: null }, frame: TILT }).scene;
    assert(sameFrame(sc.frameOf(def), TILT), "网格体能设");
  });
});

// 统筹 11-13 夜审查 a 第 1 条：恒等的坐标架一律存成「缺」——不然「缺」和「明写的世界帧」读着一样、换原点时不一样，隔一次存盘重开结果就不同。
describe("恒等的坐标架 = 缺：隔一次存盘重开，换原点的结果一样", () => {
  it("根：另摆 → 重置 → （存 → 读）→ 换原点，存没存盘结果一样；新建的根、读到世界帧的根都是缺", async () => {
    const { writeCatsup, readCatsup, documentFromScene, sceneFromDocument } = await import("../src/format/index.ts");
    const F: Frame = { origin: { x: 1, y: 2, z: 0 }, x: { x: 0, y: 1, z: 0 }, y: { x: -1, y: 0, z: 0 }, z: { x: 0, y: 0, z: 1 } };
    let a = sceneGrouped();
    assert(a.def(a.root).frame === undefined, "新建的根不写");
    a = applyOp(a, { op: "setDrawFrame", at: { def: a.root, group: null }, frame: TILT }).scene;
    a = applyOp(a, { op: "setDrawFrame", at: { def: a.root, group: null }, frame: null }).scene;
    assert(a.def(a.root).frame === undefined, "重置 = 缺");
    let b = sceneFromDocument(readCatsup(writeCatsup(documentFromScene(a.clone(), "t"))));
    assert(b.def(b.root).frame === undefined, "读到世界帧 = 不放到根身上");
    a = applyOp(a, { op: "setAxes", at: { def: a.root, group: null }, frame: F }).scene;
    b = applyOp(b, { op: "setAxes", at: { def: b.root, group: null }, frame: F }).scene;
    assert(sameFrame(a.frameOf(a.root), b.frameOf(b.root)), "换原点之后根的坐标架一样");
  });
  it("设到恒等 = 删；换原点之后正好成了恒等 = 删", () => {
    let sc = sceneGrouped(); const def = [...sc.def(sc.root).instances.values()][0].def;
    sc = applyOp(sc, { op: "setDrawFrame", at: { def, group: null }, frame: WORLD_FRAME }).scene;
    assert(sc.def(def).frame === undefined, "设到恒等 = 缺");
    sc = applyOp(sc, { op: "setDrawFrame", at: { def, group: null }, frame: TILT }).scene;
    sc = applyOp(sc, { op: "setAxes", at: { def, group: null }, frame: TILT }).scene;
    assert(sc.def(def).frame === undefined, "原点换到坐标架上 = 坐标架成了恒等 = 缺");
  });
});
