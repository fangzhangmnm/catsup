// 层级窗的物件树（editor/object-tree.ts；0.18 物品栏纪元 I1）。created 2026-10-30 by Claude Opus 5.5
// user 10-30「hierarchy就是有小三角有小眼睛的」「没有赋予名字的全用四位hash这种……然后可以淡化」；10-24「组永远不进hierarchy，是brep的内部矛盾」。
import { describe, it, eq, assert } from "./runner.mjs";
import { Scene } from "../src/scene/scene.ts";
import { applyOp, faceKey } from "../src/editor/ops.ts";
import { Kernel } from "../src/kernel/kernel.ts";
import { sceneBox } from "./format-scenes.ts";
import { translation } from "../src/scene/xform.ts";
import { contextPath, hierarchyTree, isHex4, pathKey, setHiddenOp } from "../src/editor/object-tree.ts";

const rootAt = (s: Scene) => ({ def: s.root, group: null });
const topFace = (k: Kernel, z: number): number => k.faces().find((f) => k.faceRings3(f.id)!.outer.every((p) => Math.abs(p.z - z) < 1e-9))!.id;
/** 根：一个组（盒子顶面）+ 物件 A（没起名，a3f2）+ 放在组里的物件 B（椅子）；A 的定义里还有一份椅子。 */
function scene(): { s: Scene; a: number; b: number; c: number; group: number; defA: number } {
  let s = new Scene(sceneBox(2, 1.5));
  const k = s.brep(s.root).kernel;
  s = applyOp(s, { op: "makeGroup", at: rootAt(s), faces: [faceKey(k, topFace(k, 1.5))], edges: [] }).scene;
  const group = [...s.brep(s.root).groups.values()][0].id;
  const defA = s.mintDef("a3f2", sceneBox(1, 1)), chair = s.mintDef("椅子", sceneBox(0.5, 0.5));
  const a = s.mintInstance(s.root, null, defA.id, translation({ x: 5, y: 0, z: 0 })).id;
  const b = s.mintInstance(s.root, group, chair.id, translation({ x: 0, y: 5, z: 0 })).id;
  const c = s.mintInstance(defA.id, null, chair.id, translation({ x: 0, y: 0, z: 1 })).id;
  return { s, a, b, c, group, defA: defA.id };
}

describe("层级窗的物件树（object-tree.ts）", () => {
  it("只有物件进树、组不进（user 10-24「组永远不进hierarchy」）；放在组里的物件直接挂在它所在的物件下，路径里带上途经的组", () => {
    const { s, a, b, c, group } = scene();
    const t = hierarchyTree(s);
    eq(t.kind, "root");
    eq(t.children.map((n) => n.label).join(","), "a3f2,椅子");
    assert(t.children.every((n) => n.kind === "instance"), "树里只有物件");
    const nb = t.children[1];
    eq(JSON.stringify(nb.path), JSON.stringify([{ kind: "group", group }, { kind: "instance", instance: b }]), "B 的路径 = 先进组再选它");
    eq(nb.key, `i${b}`, "键里不带组（挪进挪出组展开状态不丢）");
    const na = t.children[0];
    eq(na.children.length, 1); eq(na.children[0].key, `i${a}/i${c}`, "A 里那份椅子");
  });
  it("没起名 = 名字正好是四位十六进制码 → 淡色；实例没自己的名字就用组件名", () => {
    const { s } = scene();
    const t = hierarchyTree(s);
    assert(t.children[0].unnamed && !t.children[1].unnamed);
    assert(isHex4("a3f2") && !isHex4("A3F2") && !isHex4("组件 3") && !isHex4("a3f2b"));
  });
  it("你现在在哪一层 → 路径（实例链前面补上它挂的组）", () => {
    const { s, a, b, group } = scene();
    eq(pathKey(contextPath(s, { chain: [a], group: null })), `i${a}`);
    eq(JSON.stringify(contextPath(s, { chain: [b], group: null })), JSON.stringify([{ kind: "group", group }, { kind: "instance", instance: b }]));
    eq(contextPath(s, { chain: [], group: null }).length, 0);
  });
  it("小眼睛：藏 / 显 = 一条指令（实例的藏标记，打在它挂的那个组上）；已经是这样了 = 没指令", () => {
    const { s, b, group } = scene();
    const nb = hierarchyTree(s).children[1];
    const op = setHiddenOp(s, nb, true)!;
    eq(op.op, "setHidden"); eq(JSON.stringify((op as { at: unknown }).at), JSON.stringify({ def: s.root, group }));
    const s2 = applyOp(s, op).scene;
    assert(s2.instance(s2.root, b).hidden === true && hierarchyTree(s2).children[1].hidden, "藏上了");
    eq(setHiddenOp(s2, hierarchyTree(s2).children[1], true), null, "再藏 = 没事可做");
    const s3 = applyOp(s2, setHiddenOp(s2, hierarchyTree(s2).children[1], false)!).scene;
    assert(!s3.instance(s3.root, b).hidden, "显回来");
    eq(setHiddenOp(s, hierarchyTree(s), true), null, "最外层没有小眼睛");
  });
  it("改名（I4）：改组件名 = 摆了几份都跟着变；改这一份自己的名字 = 只它；清空这一份 = 回到显示组件名；组件名不许空", () => {
    const { s, a, b, c, defA } = scene();
    const s1 = applyOp(s, { op: "rename", at: { def: s.root, group: null }, def: defA, name: "小红帽的家" }).scene;
    eq(hierarchyTree(s1).children[0].label, "小红帽的家"); assert(!hierarchyTree(s1).children[0].unnamed, "起了名 = 不淡");
    const chairNode = hierarchyTree(s1).children[0].children[0];
    eq(chairNode.label, "椅子");
    const s2 = applyOp(s1, { op: "rename", at: { def: defA, group: null }, instance: c, name: "那把歪的" }).scene;
    eq(hierarchyTree(s2).children[0].children[0].label, "那把歪的", "这一份自己的名字");
    eq(hierarchyTree(s2).children[1].label, "椅子", "别的那份椅子不动");
    const s3 = applyOp(s2, { op: "rename", at: { def: defA, group: null }, instance: c, name: null }).scene;
    eq(hierarchyTree(s3).children[0].children[0].label, "椅子", "清空 = 回到组件名");
    let threw = false; try { applyOp(s3, { op: "rename", at: { def: s.root, group: null }, def: defA, name: "" }); } catch { threw = true; }
    assert(threw, "组件名不许空");
    void a; void b;
  });
});
