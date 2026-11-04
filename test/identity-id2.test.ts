// 身份地基 ID-2（计划书 ai-docs/20261104-identity-foundation-plan.md §3 / §8）：运行时搬家保身份、同级顺序、清理材质、粘贴的材质对照表。created 2026-11-04 by Claude Opus 5.5
// user 10-30「改文件格式，为什么不是有序表？」「生死按引用」；11-04 计划书 §8 ①②。
import { describe, it, eq, assert } from "./runner.mjs";
const { readdirSync, readFileSync, statSync } = (await import("node:fs" as string)) as { readdirSync(p: string): string[]; readFileSync(p: string, enc: string): string; statSync(p: string): { isDirectory(): boolean } };
const join = (...p: string[]): string => p.join("/");
import { documentFromScene, readCatsup, sceneFromDocument, writeCatsup } from "../src/format/index.ts";
import { Scene } from "../src/scene/scene.ts";
import { applyOp, faceKey, type Op } from "../src/editor/ops.ts";
import { History } from "../src/editor/history.ts";
import { census, unusedMaterials } from "../src/scene/resources.ts";
import { extract, localize } from "../src/editor/transfer.ts";
import { hierarchyTree, moveRowOp } from "../src/editor/object-tree.ts";
import { sceneBox } from "./format-scenes.ts";
import { IDENTITY, translation } from "../src/scene/xform.ts";
import { ROOT_CONTEXT } from "../src/scene/scene.ts";

const rootAt = (s: Scene) => ({ def: s.root, group: null });
const reopen = (s: Scene): Scene => sceneFromDocument(readCatsup(writeCatsup(documentFromScene(s, "t"))));
/** 根里摆三份（甲乙丙），各是自己的组件；丁是甲定义里的一份。 */
function world() {
  const s = new Scene(sceneBox(1, 1));
  const a = s.mintDef("甲", sceneBox(1, 1)), b = s.mintDef("乙", sceneBox(1, 1)), c = s.mintDef("丙", sceneBox(1, 1)), d = s.mintDef("丁", sceneBox(1, 1));
  const ia = s.mintInstance(s.root, null, a.id, translation({ x: 5, y: 0, z: 0 })), ib = s.mintInstance(s.root, null, b.id, translation({ x: 0, y: 5, z: 0 })), ic = s.mintInstance(s.root, null, c.id, translation({ x: 0, y: 0, z: 5 }));
  const id = s.mintInstance(a.id, null, d.id, IDENTITY);
  return { s, a: a.id, b: b.id, c: c.id, d: d.id, ia, ib, ic, id };
}
const order = (s: Scene, def: number): string => [...s.def(def).instances.values()].map((i) => s.def(i.def).name).join("");
/** 全场景每个条目的身份（撤销不重铸的核对用）。 */
const guids = (s: Scene): string => JSON.stringify([[...s.defs.values()].map((d) => [d.guid, [...d.instances.values()].map((i) => i.guid), d.body.kind === "brep" ? [...d.body.groups.values()].map((g) => g.guid) : []]), s.materials.map((m) => m.guid), s.layers.map((l) => l.guid)]);

describe("换父亲 / 同级排序（moveInstance）", () => {
  it("跨定义：GUID、名字、藏、层都跟着走，在目标定义里拿新句柄；不改定义", () => {
    const w = world(), guid = w.ib.guid;
    w.ib.name = "那个乙"; w.ib.hidden = true;
    const s = applyOp(w.s, { op: "moveInstance", from: { def: w.s.root, inst: w.ib.id }, into: { def: w.a, parent: null }, xform: translation({ x: 1, y: 1, z: 1 }) }).scene;
    eq(order(s, s.root), "甲丙", "原处没了");
    eq(order(s, w.a), "丁乙", "目标里排最后");
    const moved = [...s.def(w.a).instances.values()].at(-1)!;
    eq(moved.guid, guid, "同一个条目"); eq(moved.name, "那个乙"); eq(moved.hidden, true); eq(moved.def, w.b);
    eq(moved.xform[3], 1, "新变换");
  });
  it("同定义 index = 排到第几；句柄、GUID 都不变；存盘再开顺序还在", () => {
    const w = world();
    const s = applyOp(w.s, { op: "moveInstance", from: { def: w.s.root, inst: w.ic.id }, into: { def: w.s.root, parent: null }, index: 0 }).scene;
    eq(order(s, s.root), "丙甲乙");
    eq(s.instance(s.root, w.ic.id).guid, w.ic.guid);
    const s2 = reopen(s);
    eq(order(s2, s2.root), "丙甲乙", "文件里的顺序有意义（计划书 §2.3）");
    eq(JSON.stringify([...s2.def(s2.root).instances.values()].map((i) => i.guid)), JSON.stringify([...s.def(s.root).instances.values()].map((i) => i.guid)), "存盘不重铸");
  });
  it("跨定义 + index；index 越界夹到两头", () => {
    const w = world();
    const s = applyOp(w.s, { op: "moveInstance", from: { def: w.s.root, inst: w.ib.id }, into: { def: w.a, parent: null }, index: 0 }).scene;
    eq(order(s, w.a), "乙丁");
    const s2 = applyOp(s, { op: "moveInstance", from: { def: s.root, inst: w.ic.id }, into: { def: s.root, parent: null }, index: 99 }).scene;
    eq(order(s2, s2.root), "甲丙");
  });
  it("拒绝：放进自己里面（成环）/ 目标组不存在 / 实例不存在；什么都不变", () => {
    const w = world();
    const threw = (op: Op): boolean => { try { applyOp(w.s, op); return false; } catch { return true; } };
    assert(threw({ op: "moveInstance", from: { def: w.s.root, inst: w.ia.id }, into: { def: w.d, parent: null } }), "甲放进甲里面的丁 = 成环");
    assert(threw({ op: "moveInstance", from: { def: w.s.root, inst: w.ia.id }, into: { def: w.b, parent: 7 } }), "组不存在");
    assert(threw({ op: "moveInstance", from: { def: w.s.root, inst: 999 }, into: { def: w.b, parent: null } }), "实例不存在");
    eq(order(w.s, w.s.root), "甲乙丙");
  });
  it("撤销 / 重做：骨架级；顺序和 GUID 逐字回来，重做不重铸", () => {
    const w = world(), h = new History<null>(w.s);
    const g0 = guids(w.s);
    let s = h.commit(w.s, { op: "moveInstance", from: { def: w.s.root, inst: w.ic.id }, into: { def: w.s.root, parent: null }, index: 0 }).scene;
    s = h.commit(s, { op: "moveInstance", from: { def: s.root, inst: w.ib.id }, into: { def: w.a, parent: null }, xform: IDENTITY }).scene;
    const g1 = guids(s), o1 = order(s, s.root) + "/" + order(s, w.a);
    s = h.undo()!.scene; s = h.undo()!.scene;
    eq(order(s, s.root), "甲乙丙", "撤到头"); eq(guids(s), g0, "身份逐字回来");
    s = h.redo(s)!.scene; s = h.redo(s)!.scene;
    eq(order(s, s.root) + "/" + order(s, w.a), o1, "重做回来"); eq(guids(s), g1, "重做不重铸");
  });
  it("层级窗一行 → 指令：缝里排序（同定义）/ 放进去（跨定义）/ 原地 = 没指令；同一组件合成的那行按它第一份算", () => {
    const w = world(), s = w.s;
    s.mintInstance(s.root, null, w.c, translation({ x: 9, y: 9, z: 9 }));   // 丙摆两份
    const t = hierarchyTree(s), [A, B, C1, C2] = t.children;
    const r = moveRowOp(s, C1, t, A)!;
    assert("op" in r && r.index === 0, `排到甲前面：${JSON.stringify(r)}`);
    eq(moveRowOp(s, B, t, C1), null, "乙本来就在第一份丙前面");
    eq(moveRowOp(s, B, t), null, "拖到自己父亲那行中间 = 不动");
    const into = moveRowOp(s, B, A);
    assert(!!into && "op" in into && into.index === undefined && into.into === w.a && into.guid === w.ib.guid, `放进甲：${JSON.stringify(into)}`);
    const beforeInA = moveRowOp(s, B, A, A.children[0]);
    assert(!!beforeInA && "op" in beforeInA, "跨定义 + 排到丁前面");
    if (beforeInA && "op" in beforeInA) eq(order(applyOp(s.clone(), beforeInA.op).scene, w.a), "乙丁");
    const merged = hierarchyTree(s, { mergeCopies: true }), cp = merged.children[2];
    eq(cp.kind, "copies");
    const r2 = moveRowOp(s, merged.children[1], merged, cp);
    eq(r2, null, "乙已经在合成行（第一份丙）前面");
    const r3 = moveRowOp(s, merged.children[0], merged, null);
    assert(!!r3 && "op" in r3, "甲排到最后");
    if (r3 && "op" in r3) eq(order(applyOp(s.clone(), r3.op).scene, s.root), "乙丙丙甲");
    void C2;
  });
  it("别的搬家也保身份（§4 守卫 2）：建组件 / 建组 / 转种类 / 做成唯一", () => {
    let s = new Scene(sceneBox(1, 1));
    const chair = s.mintDef("椅", sceneBox(1, 1)), inst = s.mintInstance(s.root, null, chair.id, translation({ x: 3, y: 0, z: 0 }));
    const k = s.brep(s.root).kernel;
    s = applyOp(s, { op: "makeGroup", at: rootAt(s), faces: [faceKey(k, k.faces()[0].id)], edges: [], instances: [inst.id] }).scene;
    const g = [...s.brep(s.root).groups.values()][0];
    eq(s.instance(s.root, inst.id).guid, inst.guid, "建组：实例身份不变");
    s = applyOp(s, { op: "makeComponent", at: rootAt(s), faces: [], edges: [], name: "包", groups: [g.id] }).scene;
    const wrap = [...s.def(s.root).instances.values()][0], wrapped = s.def(wrap.def);
    eq([...wrapped.instances.values()][0].guid, inst.guid, "建组件：搬进去的实例身份不变");
    eq([...s.brep(wrap.def).groups.values()][0].guid, g.guid, "建组件：搬进去的组身份不变");
    const wg = wrap.guid, dg = wrapped.guid;
    s = applyOp(s, { op: "castDefinition", def: wrap.def, to: "mesh" }).scene;
    eq(s.def(wrap.def).guid, dg, "转种类：定义身份不变");
    s = applyOp(s, { op: "makeUnique", def: s.root, instance: wrap.id }).scene;
    const after = s.instance(s.root, wrap.id);
    eq(after.guid, wg, "做成唯一：这一份的身份不变"); assert(s.def(after.def).guid !== dg, "新定义新身份");
  });
});

describe("清理没人用的材质（purgeMaterials）", () => {
  /** 根上面涂红、孤儿组件的面涂蓝；绿没人用、白收在架子上。 */
  function painted() {
    const s = new Scene(sceneBox(1, 1));
    const green = s.addMaterial({ name: "绿", color: [0, 1, 0] }), red = s.addMaterial({ name: "红", color: [1, 0, 0] }), blue = s.addMaterial({ name: "蓝", color: [0, 0, 1] }), white = s.addMaterial({ name: "白", color: [1, 1, 1] });
    s.shelf.items.push({ guid: "00000000-0000-4000-8000-0000000000aa", kind: "material", ref: s.materials[white].guid, folder: null });
    const k = s.brep(s.root).kernel, f = k.faces()[0].id;
    k.setFaceMaterial([f], s.slotFor(s.root, red));
    const orphan = s.mintDef("孤儿", sceneBox(1, 1)), ok = s.brep(orphan.id).kernel;
    ok.setFaceMaterial([ok.faces()[0].id], s.slotFor(orphan.id, blue));
    s.brep(s.root).materialSlots.push(green);   // 槽表里指着绿，但没有面用它
    return { s, green, red, blue, white, face: f, orphan: orphan.id };
  }
  it("清点：活着的 / 只在孤儿里 / 架子上 / 没人用 分得开；能清的只有没人用的", () => {
    const w = painted(), c = census(w.s), by = (n: string) => c.materials.find((m) => m.name === n)!;
    eq(by("红").faces, 2, "默认两侧都涂"); eq(by("蓝").faces, 0); eq(by("蓝").orphanFaces, 2); eq(by("白").shelved, true);
    eq(unusedMaterials(c).join(","), String(w.green));
  });
  it("删掉后别的材质身份不变、面的颜色不变；槽表同一步对上，指着它的槽落到默认", () => {
    const w = painted(), guidRed = w.s.materials[w.red].guid;
    const s = applyOp(w.s, { op: "purgeMaterials", materials: [w.green] }).scene;
    eq(s.materials.map((m) => m.name).join(""), "红蓝白");
    const k = s.brep(s.root).kernel, m = s.materialOfSlot(s.root, k.faceMaterialOf(w.face, 0));
    eq(m?.name, "红", "下标全挪了，面还是红的"); eq(m?.guid, guidRed);
    eq(s.materialOfSlot(w.orphan, s.brep(w.orphan).kernel.faceMaterialOf(s.brep(w.orphan).kernel.faces()[0].id, 0))?.name, "蓝", "孤儿的也对");
    eq(s.brep(s.root).materialSlots.at(-1), -1, "指着绿的槽没人用了，落到默认");
    const s2 = reopen(s);
    eq(s2.materials.map((x) => x.name).join(""), "红蓝白", "存盘再开");
    eq(s2.materialOfSlot(s2.root, s2.brep(s2.root).kernel.faces().map((f) => s2.brep(s2.root).kernel.faceMaterialOf(f.id, 0)).find((x) => x !== undefined))?.name, "红");
  });
  it("单子里有一个还有人用（活着 / 孤儿 / 架子）= 整条拒绝、一个不删", () => {
    for (const pick of ["red", "blue", "white"] as const) {
      const w = painted(); let err: unknown = null;
      try { applyOp(w.s, { op: "purgeMaterials", materials: [w.green, w[pick]] }); } catch (e) { err = e; }
      assert(!!err, `${pick} 还有人用，该拒绝`); eq(w.s.materials.length, 4, "一个不删");
    }
  });
  it("撤销一步：材质表、槽表、面的颜色都回来；重做再删一次不重铸", () => {
    const w = painted(), h = new History<null>(w.s), g0 = guids(w.s), slots0 = JSON.stringify(w.s.brep(w.s.root).materialSlots);
    let s = h.commit(w.s, { op: "purgeMaterials", materials: [w.green] }).scene;
    const g1 = guids(s);
    s = h.undo()!.scene;
    eq(guids(s), g0); eq(JSON.stringify(s.brep(s.root).materialSlots), slots0, "槽表回来");
    eq(s.materialOfSlot(s.root, s.brep(s.root).kernel.faceMaterialOf(w.face, 0))?.name, "红");
    s = h.redo(s)!.scene;
    eq(guids(s), g1); eq(s.materialOfSlot(s.root, s.brep(s.root).kernel.faceMaterialOf(w.face, 0))?.name, "红");
  });
  it("结构守卫（§4 守卫 3）：src 里删材质只有清理指令一处；purgeDefs 那一处守卫不变", () => {
    const hits: string[] = [];
    const walk = (d: string): void => { for (const n of readdirSync(d)) { if (n === "vendor") continue; const p = join(d, n); if (statSync(p).isDirectory()) walk(p); else if (/\.ts$/.test(n)) for (const line of readFileSync(p, "utf8").split("\n")) if (/materials\.(splice|pop|shift|length\s*=)/.test(line)) hits.push(`${p}: ${line.trim().slice(0, 60)}`); } };
    walk("src");
    eq(hits.length, 1, `只许一处：${hits.join(" | ")}`);
    assert(hits[0].startsWith(join("src", "editor", "ops.ts")) && hits[0].includes("kill"), hits[0]);
  });
});

describe("粘贴的材质对照表（家规「编号只当对照表的代号」）", () => {
  function copyPainted() {
    const s = new Scene(sceneBox(1, 1));
    s.addMaterial({ name: "占位", color: [0.5, 0.5, 0.5] });
    const red = s.addMaterial({ name: "红", color: [1, 0, 0] }), k = s.brep(s.root).kernel, f = k.faces()[0].id;
    k.setFaceMaterial([f], s.slotFor(s.root, red));
    const p = extract(s, ROOT_CONTEXT, { faces: [f], edges: [] }, [])!;
    return { s, p, red, guidRed: s.materials[red].guid };
  }
  const pasteOp = (s: Scene, p: ReturnType<typeof copyPainted>["p"]): Op => { const l = localize(p, IDENTITY); return { op: "paste", at: rootAt(s), ...(l.brep ? { brep: l.brep } : {}), ...(l.materials ? { materials: l.materials } : {}) }; };
  const paintedNames = (s: Scene): string[] => { const k = s.brep(s.root).kernel; return k.faces().map((f) => s.materialOfSlot(s.root, k.faceMaterialOf(f.id, 0))?.name).filter((n): n is string => !!n); };
  it("载荷面上是对照表的编号，不是文档下标", () => {
    const { p } = copyPainted();
    eq(p.materials?.length, 1); eq(p.materials?.[0].name, "红");
    assert(p.brep!.faceLayers!.material!.every((v) => v === 0 || v === -1), `编号 = 表的下标：${p.brep!.faceLayers!.material}`);
  });
  it("拷贝 → 清理材质（下标全挪）→ 粘贴：还是红的", () => {
    const { s, p } = copyPainted();
    const k = s.brep(s.root).kernel;
    k.eraseFaces(k.faces().map((f) => f.id));   // 面删了，「占位」本来就没人用；红还在
    const s1 = applyOp(s, { op: "purgeMaterials", materials: [0] }).scene;
    eq(s1.materials.map((m) => m.name).join(""), "红", "占位删了，红挪到 0");
    const s2 = applyOp(s1, pasteOp(s1, p)).scene;
    eq(paintedNames(s2).join(), "红", "贴回来是红的"); eq(s2.materials.length, 1, "没多造一条");
  });
  it("拷贝 → 撤销过头（红没了）→ 新建蓝（拿到同一个下标）→ 粘贴：红带着原身份回来，不串成蓝（清点 §4 A）", () => {
    const { s, p, red, guidRed } = copyPainted();
    const k = s.brep(s.root).kernel;
    k.eraseFaces(k.faces().map((f) => f.id));
    s.materials.length = red;   // 等于撤销到红新建之前
    s.brep(s.root).materialSlots.length = 0;
    const blue = s.addMaterial({ name: "蓝", color: [0, 0, 1] });
    eq(blue, red, "蓝拿到了红原来的下标");
    const s2 = applyOp(s, pasteOp(s, p)).scene;
    eq(paintedNames(s2).join(), "红", "不是蓝"); eq(s2.materials.find((m) => m.name === "红")?.guid, guidRed, "原身份");
  });
  it("老复现包的 paste 没有对照表：编号照旧当文档下标", () => {
    const { s, p, red } = copyPainted();
    const raw = { ...p.brep!, faceLayers: { material: p.brep!.faceLayers!.material!.map((v) => (v >= 0 ? red : -1)) } };
    const s2 = applyOp(s, { op: "paste", at: rootAt(s), brep: raw }).scene;
    assert(paintedNames(s2).includes("红"));
  });
});
