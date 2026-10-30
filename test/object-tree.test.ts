// 层级窗的物件树（editor/object-tree.ts；0.18 物品栏纪元 I1）。created 2026-10-30 by Claude Opus 5.5
// user 10-30「hierarchy就是有小三角有小眼睛的」「没有赋予名字的全用四位hash这种……然后可以淡化」；10-24「组永远不进hierarchy，是brep的内部矛盾」。
import { describe, it, eq, assert } from "./runner.mjs";
import { Scene } from "../src/scene/scene.ts";
import { applyOp, faceKey } from "../src/editor/ops.ts";
import { Kernel } from "../src/kernel/kernel.ts";
import { sceneBox } from "./format-scenes.ts";
import { compose, rotationAbout, scalingAbout, translation, type Xform } from "../src/scene/xform.ts";
import { contextPath, hierarchyTree, isHex4, pathKey, reparentOp, setHiddenOp, worldOfPath } from "../src/editor/object-tree.ts";

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
  it("根 = 普通组件（I13，user 10-30「我们要和godot一样根和其他节点一视同仁……可以改名」）：显示根组件的名字；程序占位的 model 按没起名；改名 = 同一条 rename", () => {
    const { s } = scene();
    const t = hierarchyTree(s);
    eq(t.label, "model"); assert(t.unnamed, "老文件的根叫 model（程序占位）= 没起名，淡色");
    const s2 = applyOp(s.clone(), { op: "rename", at: { def: s.root, group: null }, def: s.root, name: "小红帽的家" }).scene;
    const t2 = hierarchyTree(s2);
    eq(t2.label, "小红帽的家"); assert(!t2.unnamed, "起了名 = 不淡");
    assert(hierarchyTree(applyOp(s.clone(), { op: "rename", at: { def: s.root, group: null }, def: s.root, name: "0a1b" }).scene).unnamed, "四位码 = 没起名");
  });
  it("拖一行换父亲（I3）：一条 batch（删原处 + 原位贴进去），世界位置不变；放进自己里面 / 原地 / 锁着 / 会斜切 / 根 = 不动并说为什么", () => {
    const { s, a, defA, c } = scene();
    const t = hierarchyTree(s), A = t.children[0], B = t.children[1], C = A.children[0];
    const w0 = worldOfPath(s, B.path);
    const r = reparentOp(s, B, A);
    assert(!!r && "op" in r, `该给指令：${JSON.stringify(r)}`);
    if (!r || !("op" in r)) return;
    const s2 = applyOp(s.clone(), r.op).scene;
    eq(s2.def(s2.root).instances.size, 1, "根里只剩 A");
    const moved = [...s2.def(defA).instances.values()].find((i) => i.id !== c)!;
    const w1 = compose(s2.instance(s2.root, a).xform, moved.xform);
    assert(w1.every((v, i) => Math.abs(v - w0[i]) < 1e-9), `世界位置不变：${w0} → ${w1}`);
    assert(moved.parent === null, "挂在 A 组件的最外层（不进它里面的组）");
    const why = (x: ReturnType<typeof reparentOp>) => (x && "why" in x ? x.why : "");
    assert(/自己/.test(why(reparentOp(s, A, C))), "A 放进它里面的椅子 = 死循环，拒绝");
    eq(reparentOp(s, C, A), null, "已经在 A 底下 = 不动");
    assert(/根/.test(why(reparentOp(s, t, A))), "根不能挪");
    const sl = s.clone(); sl.instance(sl.root, a).locked = true;
    assert(/锁/.test(why(reparentOp(sl, hierarchyTree(sl).children[1], hierarchyTree(sl).children[0]))), "目标锁着");
    const ss = s.clone();
    (ss.instance(ss.root, a) as { xform: Xform }).xform = scalingAbout({ x: 0, y: 0, z: 0 }, { x: 2, y: 1, z: 1 });
    const bb = [...ss.def(ss.root).instances.values()].find((i) => i.id !== a)!;
    (bb as { xform: Xform }).xform = rotationAbout({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 1 }, Math.PI / 4);
    assert(/斜切/.test(why(reparentOp(ss, hierarchyTree(ss).children[1], hierarchyTree(ss).children[0]))), "放进不等比缩放过的 + 自己转过 = 会斜切，拒绝");
  });
  it("同一组件的几份合成一行「×N」（user 10-30「hierarchy显示的时候应该collapse同实例变成 x几，可以开这个开关」）：开关关 = 一份一行；合成行小眼睛 = 几份一起藏一步撤销；拖不进合成行；每行带种类", () => {
    const { s, b } = scene();
    const chair = s.instance(s.root, b).def;
    s.mintInstance(s.root, null, chair, translation({ x: 9, y: 0, z: 0 }));   // 根里再摆一份椅子（第一份在组里）
    const plain = hierarchyTree(s), merged = hierarchyTree(s, { mergeCopies: true });
    eq(plain.children.map((n) => n.label).join(","), "a3f2,椅子,椅子");
    eq(merged.children.map((n) => `${n.label}${n.kind === "copies" ? "×" + n.count : ""}`).join(","), "a3f2,椅子×2");
    const cp = merged.children[1];
    eq(cp.children.length, 2); eq(cp.body, "brep"); eq(merged.body, "brep");
    const op = setHiddenOp(s, cp, true);
    assert(!!op && op.op === "batch" && op.ops.length === 2, `两份一起藏 = 一条 batch：${JSON.stringify(op)?.slice(0, 80)}`);
    const s2 = applyOp(s.clone(), op!).scene;
    assert(hierarchyTree(s2, { mergeCopies: true }).children[1].hidden, "两份都藏了 = 合成行也是藏着");
    const why = reparentOp(s, merged.children[0], cp);
    assert(!!why && "why" in why && /展开/.test(why.why), "拖到合成行上 = 先展开");
  });
});
