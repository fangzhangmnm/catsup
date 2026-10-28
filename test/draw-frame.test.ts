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
    assert(sc.brep(def).drawFrame === undefined && sameFrame(sc.frameOfContext(ctx), sc.originOfChain([inst.id])), "重置 = 回到组件原点");
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
    sc = applyOp(sc, { op: "setAxes", at: { def, group: null }, frame: sc.brep(def).drawFrame! }).scene;
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
    assert(sameFrame(sc.axes, WORLD_FRAME), "根重置 = 世界");
  });
  it("撤销用的场景拷贝带着组件的坐标架", () => {
    let sc = sceneGrouped();
    const def = [...sc.def(sc.root).instances.values()][0].def;
    sc = applyOp(sc, { op: "setDrawFrame", at: { def, group: null }, frame: TILT }).scene;
    assert(sameFrame(sc.clone().brep(def).drawFrame!, TILT), "clone 保留 drawFrame");
  });
});
