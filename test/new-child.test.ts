// 新建子物体（第 1 版第五节第 5 条；created 2026-11-13 by Claude Opus 5.5）：指令 addChild + 落点 / 朝向（editor/objects/new-child.ts）。
// 规矩：在这一层铸一个空的子物体（种类当场选），不碰这一层已有的任何东西；两个 GUID 写在指令里；落点 = 右键打到的那一点，否则这一层的原点；朝向 = 这一层的轴。
import { describe, it, eq, assert } from "./runner.mjs";
import { BODY_KINDS, Scene, type Body } from "../src/scene/scene.ts";
import { Kernel } from "../src/kernel/kernel.ts";
import { applyOp, OpTargetError } from "../src/editor/ops.ts";
import { NEW_CHILD_KINDS, newChildOp } from "../src/editor/objects/new-child.ts";
import { translation, frameToXform, type Frame } from "../src/scene/xform.ts";
import { sceneBox, sceneGrouped } from "./format-scenes.ts";

const near = (a: readonly number[], b: readonly number[]): boolean => a.length === b.length && a.every((v, i) => Math.abs(v - b[i]) < 1e-9);

describe("新建子物体：指令 addChild", () => {
  it("菜单列的种类 = 全部身体种类（加一种身体 = NEW_CHILD_KINDS 加一个）", () => { eq([...NEW_CHILD_KINDS].sort().join(","), [...BODY_KINDS].sort().join(",")); });
  for (const kind of NEW_CHILD_KINDS) it(`根上建一个${kind}：新定义是空的、种类对、身份 = 指令里的；这一层原来的东西一样不少`, () => {
    const s = new Scene(sceneBox(1, 1)), rootBody = s.def(s.root).body, defs = s.defs.size, faces = s.kernelOf({ def: s.root, group: null }).faces().length;
    const op = newChildOp(s, { chain: [], group: null }, { def: s.root, group: null }, null, kind, "ab12");
    applyOp(s, op);
    eq(s.defs.size, defs + 1);
    const d = s.defByGuid(op.def)!, inst = [...s.def(s.root).instances.values()].find((i) => i.guid === op.inst)!;
    assert(d && inst, "两个身份都在");
    eq(d.body.kind, kind); eq(d.name, "ab12"); eq(inst.def, d.id); eq(inst.parent, null);
    assert(s.isBare(d.id) || kind !== "empty", "空物体没装东西");
    assert(d.body.kind === "empty" || (d.body.kind === "brep" ? d.body.kernel.faces().length === 0 : d.body.kernel.faceCount() === 0), "没有几何");
    assert(s.def(s.root).body === rootBody, "这一层的身体没换"); eq(s.kernelOf({ def: s.root, group: null }).faces().length, faces, "这一层的面一张不少");
  });
  it("在组里建：实例挂在那个组上（组没有自己的变换）", () => {
    const s = sceneGrouped(), b = s.def(s.root).body as Extract<Body, { kind: "brep" }>, g = [...b.groups.keys()][0];
    const op = newChildOp(s, { chain: [], group: g }, { def: s.root, group: g }, null, "mesh", "cd34");
    applyOp(s, op);
    eq([...s.def(s.root).instances.values()].find((i) => i.guid === op.inst)!.parent, g);
  });
  it("拒：组不在 / 身份已被占（不另铸）", () => {
    const s = new Scene(sceneBox(1, 1)), at = { def: s.root, group: null };
    let e: unknown = null; try { applyOp(s, { ...newChildOp(s, { chain: [], group: null }, { def: s.root, group: 99 }, null, "brep", "x") }); } catch (x) { e = x; }
    assert(e instanceof OpTargetError, "组不在");
    const op = newChildOp(s, { chain: [], group: null }, at, null, "brep", "x"); applyOp(s, op);
    e = null; try { applyOp(s, { ...newChildOp(s, { chain: [], group: null }, at, null, "brep", "y"), def: op.def }); } catch (x) { e = x; }
    assert(e instanceof OpTargetError, "定义的身份占了");
    e = null; try { applyOp(s, { ...newChildOp(s, { chain: [], group: null }, at, null, "brep", "y"), inst: op.inst }); } catch (x) { e = x; }
    assert(e instanceof OpTargetError, "实例的身份占了");
  });
});

describe("新建子物体：落点和朝向", () => {
  it("别处进来：根上 = 绘图轴（搬过、转过的也照它）", () => {
    const s = new Scene(sceneBox(1, 1)), F: Frame = { origin: { x: 2, y: 0, z: 1 }, x: { x: 0, y: 1, z: 0 }, y: { x: -1, y: 0, z: 0 }, z: { x: 0, y: 0, z: 1 } };
    s.def(s.root).frame = F;
    assert(near(newChildOp(s, { chain: [], group: null }, { def: s.root, group: null }, null, "empty", "x").xform, frameToXform(F)), "摆放 = 绘图轴");
  });
  it("组件里：右键打到的那一点（世界）换成这一层自己的坐标；没打到 = 这一层的原点", () => {
    const s = new Scene(sceneBox(1, 1)), P = s.mintDef("P", new Kernel()), inst = s.mintInstance(s.root, null, P.id, translation({ x: 1, y: 2, z: 3 }));
    const ctx = { chain: [inst.id], group: null }, at = { def: P.id, group: null };
    assert(near(newChildOp(s, ctx, at, { x: 1.5, y: 2, z: 3 }, "mesh", "x").xform, translation({ x: 0.5, y: 0, z: 0 })), "打到的点 → 本层坐标");
    assert(near(newChildOp(s, ctx, at, null, "mesh", "x").xform, translation({ x: 0, y: 0, z: 0 })), "没打到 = 组件原点");
  });
  it("每次铸的两个身份都是新的", () => {
    const s = new Scene(sceneBox(1, 1)), a = newChildOp(s, { chain: [], group: null }, { def: s.root, group: null }, null, "brep", "x"), b = newChildOp(s, { chain: [], group: null }, { def: s.root, group: null }, null, "brep", "x");
    assert(a.def !== b.def && a.inst !== b.inst && a.def !== a.inst, "不重");
  });
});
