// 粘贴 / 导入撞上「同一个条目、两边内容不一样」（ID-4b，设计书 ai-docs/20261104-identity-layer-design.md §6–§9）：比内容、更新、留这里的、断开。created 2026-11-04 by Claude Opus 5.5
// user 11-04：「拷贝的语义是更新或者覆盖吧……你可以把一个组件拷出去，修，然后拷回来，其他的实例都跟上」「也许需要做一个break link的选项」；深夜拍「2弹窗 3 跟，可开关 4 用」。
import { describe, it, eq, assert } from "./runner.mjs";
const { readFileSync } = (await import("node:fs" as string)) as { readFileSync(p: URL, e: string): string };
import { documentFromScene, readCatsup, sceneFromDocument, writeCatsup, mintGuid } from "../src/format/index.ts";
import { ROOT_CONTEXT, Scene, type Instance } from "../src/scene/scene.ts";
import { applyOp, OpRejected, type Op } from "../src/editor/ops.ts";
import { History } from "../src/editor/history.ts";
import { census, orphanDefs } from "../src/scene/resources.ts";
import { extract, localize, type TransferPayload } from "../src/editor/transfer.ts";
import { conflictRows, pasteBefore, pasteBlocked, pasteConflict, pasteReport, pasteSay, pasteWouldCycle, planPaste, payloadBundle, shelfImportOp, trimClosure } from "../src/editor/paste-plan.ts";
import { conflictLine } from "../src/app/paste-actions.ts";
import { canonDefinition } from "../src/format/entry-canon.ts";
import { DEFINITION, MATERIAL, defRef, layerGuidOfTable, materialRef } from "../src/format/entry-kinds.ts";
import { definitionToDoc } from "../src/format/scene-doc.ts";
import { sceneStore } from "../src/format/scene-store.ts";
import { canonEqual, frontier, KEEP, plan, type Decision } from "../src/identity/graph.ts";
import { KINDS, registerKind, type Ref } from "../src/identity/kinds.ts";
import { tableStore } from "../src/identity/store.ts";
import { DEFAULT_LAYER_GUID, type Guid } from "../src/identity/guid.ts";
import { IDENTITY, translation } from "../src/scene/xform.ts";
import { SCENE_DOCS, sceneBox } from "./format-scenes.ts";

const reopen = (s: Scene): Scene => sceneFromDocument(readCatsup(writeCatsup(documentFromScene(s, "t"))));
const rootAt = (s: Scene) => ({ def: s.root, group: null });
const UPDATE: Decision = { entries: "update" }, DETACH: Decision = { entries: "detach" };
const pasteOp = (s: Scene, p: TransferPayload, d: Decision = KEEP): Op => { const l = trimClosure(s, localize(p, IDENTITY), d); return { op: "paste", at: rootAt(s), ...(l.instances ? { instances: l.instances } : {}), ...(l.materials ? { materials: l.materials } : {}), ...(l.closure ? { closure: l.closure } : {}), ...(d.entries !== "keep" ? { merge: d } : {}) }; };
const copyInst = (s: Scene, inst: Instance): TransferPayload => extract(s, ROOT_CONTEXT, { faces: [], edges: [] }, [{ kind: "instance", instance: inst.id }])!;
const threw = (fn: () => unknown): boolean => { try { fn(); return false; } catch { return true; } };
const rootInsts = (s: Scene): Instance[] => [...s.def(s.root).instances.values()];
const xsOf = (s: Scene, g: Guid): number[] => { const b = s.defByGuid(g)!.body; return b.kind === "brep" ? b.kernel.toBrep().vertices.map((v) => v.x).sort((p, q) => p - q) : []; };
const faces = (s: Scene, g: Guid): number => { const d = s.defByGuid(g)!; return d.body.kind === "mesh" ? d.body.kernel.faceCount() : d.body.kernel.faces().length; };
/** 文档内全部 GUID 不重复（定义、组、实例分别按它们各自的范围：组 / 实例文档内唯一）。 */
function uniqueGuids(s: Scene): void {
  const all: string[] = [];
  for (const d of s.defs.values()) { all.push(d.guid, ...[...d.instances.values()].map((i) => i.guid)); if (d.body.kind === "brep") all.push(...[...d.body.groups.values()].map((g) => g.guid)); }
  eq(new Set(all).size, all.length, "文档内没有重复 GUID");
}

/** 椅子里摆椅腿（归「结构」层、用木头）；椅腿里摆螺丝（用金属）。源 s 拷一份贴到 t，再改源的椅腿 = 分叉。 */
function chair() {
  const s = new Scene(sceneBox(1, 1));
  const wood = s.addMaterial({ name: "木头", color: [0.6, 0.4, 0.2] }), metal = s.addMaterial({ name: "金属", color: [0.7, 0.7, 0.7] });
  const seat = s.mintDef("椅子", sceneBox(1, 1)), leg = s.mintDef("椅腿", sceneBox(1, 1)), screw = s.mintDef("螺丝", sceneBox(1, 1));
  const kl = s.brep(leg.id).kernel; kl.setFaceMaterial([kl.faces()[0].id], s.slotFor(leg.id, wood));
  const ks = s.brep(screw.id).kernel; ks.setFaceMaterial([ks.faces()[0].id], s.slotFor(screw.id, metal));
  s.layers.push({ id: s.nextLayer++, guid: mintGuid(), name: "结构", visible: true });
  const iseat = s.mintInstance(s.root, null, seat.id, translation({ x: 5, y: 0, z: 0 }));
  const ileg = s.mintInstance(seat.id, null, leg.id, IDENTITY); ileg.layer = 1;
  s.mintInstance(leg.id, null, screw.id, IDENTITY);
  return { s, seat, leg, screw, iseat, wood, metal };
}
/** 目标：先贴一份；可选再多摆几份。 */
function target(w: ReturnType<typeof chair>, extraCopies = 0) {
  const t = new Scene(sceneBox(3, 3)), p0 = copyInst(w.s, w.iseat);
  applyOp(t, pasteOp(t, p0));
  const at = t.defByGuid(w.seat.guid)!;
  for (let i = 0; i < extraCopies; i++) t.mintInstance(t.root, null, at.id, translation({ x: 9 + i, y: 0, z: 0 }));
  return t;
}
/** 在源里改椅腿（多一张面的办法：换个更大的身体），椅子本身一字不差。 */
function editLeg(w: ReturnType<typeof chair>): void { w.s.brep(w.leg.id).kernel = sceneBox(2, 2); }

describe("§7 比内容：规范形（漏字段 → 判不一样）", () => {
  const entry = (s: Scene, id: number) => ({ def: definitionToDoc(s, id), layerGuid: layerGuidOfTable(s.layers) });
  const k = () => KINDS.get(DEFINITION)!;
  const same = (a: unknown, b: unknown): boolean => canonEqual(k(), a, b);
  it("一笔没改：语料里每个场景存盘重开三次都相等（§9-5）", () => {
    for (const [name, make] of Object.entries(SCENE_DOCS)) {
      const s0 = make();
      let s1 = s0;
      for (let n = 1; n <= 3; n++) {
        s1 = reopen(s1);
        for (const d of s0.defs.values()) { if (d.id === s0.root) continue; assert(same(entry(s0, d.id), entry(s1, s1.defByGuid(d.guid)!.id)), `${name} 第 ${n} 次：${d.name}`); }
      }
    }
  });
  it("改一笔：名字 / 形状 / 面的材质 / 摆放 / 层 / 藏 / 软边 / 参考几何，都判不一样", () => {
    const w = chair(), id = w.leg.id, a = () => entry(w.s, id);
    const base = a();
    const changed = (fn: () => void, undo: () => void, what: string) => { fn(); assert(!same(base, a()), what); undo(); assert(same(base, a()), `${what}：改回来又一样`); };
    changed(() => { w.leg.name = "别的名字"; }, () => { w.leg.name = "椅腿"; }, "改名");
    const k0 = w.s.brep(id).kernel; changed(() => { w.s.brep(id).kernel = sceneBox(2, 2); }, () => { w.s.brep(id).kernel = k0; }, "改形状");
    const f = k0.faces()[1].id; changed(() => k0.setFaceMaterial([f], w.s.slotFor(id, w.metal)), () => k0.setFaceMaterial([f], null), "涂了另一个面");
    const inst = [...w.leg.instances.values()][0];
    changed(() => { inst.hidden = true; }, () => { delete inst.hidden; }, "藏");
    changed(() => { inst.layer = 1; }, () => { delete inst.layer; }, "归层");
    const g = w.s.brep(id).guides; changed(() => g.points.push({ id: 99, p: { x: 1, y: 2, z: 3 } }), () => g.points.pop(), "参考几何");
    changed(() => { w.s.mintInstance(id, null, w.screw.id, IDENTITY); }, () => { const last = [...w.leg.instances.keys()].at(-1)!; w.leg.instances.delete(last); }, "多摆一份");
  });
  it("代号不算内容：层表编号不同、槽表顺序不同，内容一样就是一样", () => {
    const w = chair(), e0 = entry(w.s, w.seat.id), doc = e0.def;
    const inst = doc.instances[0], guid = w.s.layers[1].guid;
    assert(inst.layer === 1);
    const otherNumbering = { def: { ...doc, instances: doc.instances.map((i) => ({ ...i, layer: 7 })) }, layerGuid: (c: number) => (c === 7 ? guid : undefined) };
    assert(same(e0, otherNumbering), "层代号不同、GUID 相同");
    const e1 = entry(w.s, w.leg.id), d1 = e1.def, mat = w.s.materials[w.wood].guid;
    const shuffled = { ...e1, def: { ...d1, materialSlots: [mintGuid(), ...d1.materialSlots], brep: { ...d1.brep, faceLayers: { material: d1.brep.faceLayers!.material.map((v) => (v >= 0 ? v + 1 : v)), materialBack: d1.brep.faceLayers!.materialBack?.map((v) => (v >= 0 ? v + 1 : v)) ?? [] } } } };
    assert(same(e1, shuffled), `槽号挪了位、材质还是 ${mat}`);
  });
  it("漏字段（§9-5）：将来加的字段没人规范化 = 判不一样（每一层都试：定义 / 快照 / 组 / 实例 / 网格体）", () => {
    const s = new Scene(sceneBox(1, 1)), d = s.mintDef("甲", sceneBox(1, 1)), m = s.mintDef("网", sceneBox(1, 1));
    const frame = { origin: { x: 0, y: 0, z: 0 }, x: { x: 1, y: 0, z: 0 }, y: { x: 0, y: 1, z: 0 }, z: { x: 0, y: 0, z: 1 } };
    s.mintGroup(d.id, null, sceneBox(1, 1), frame); s.mintInstance(d.id, null, m.id, IDENTITY);
    applyOp(s, { op: "castDefinition", def: m.id, to: "mesh" });
    const e = entry(s, d.id), doc = e.def as unknown as Record<string, any>;
    const plus = (o: object): Record<string, unknown> => ({ ...o, 将来的字段: 1 });
    for (const [what, def] of [["定义", plus(doc)], ["快照", { ...doc, brep: plus(doc.brep) }], ["组", { ...doc, groups: [plus(doc.groups[0])] }], ["组的快照", { ...doc, groups: [{ ...doc.groups[0], brep: plus(doc.groups[0].brep) }] }], ["实例", { ...doc, instances: [plus(doc.instances[0])] }], ["参考几何", { ...doc, guides: plus(doc.guides) }]] as const)
      assert(!same(e, { ...e, def }), `${what}多一个字段`);
    const me = entry(s, m.id), md = me.def as unknown as Record<string, any>;
    assert(!same(me, { ...me, def: { ...md, mesh: plus(md.mesh) } }), "网格体多一个字段");
    assert(same(me, me));
  });
  it("网格体：重合的点不焊 ≠ 焊了（点的下标是数据，不按坐标认）", () => {
    const s = new Scene(sceneBox(1, 1)), m = s.mintDef("网", sceneBox(1, 1));
    applyOp(s, { op: "castDefinition", def: m.id, to: "mesh" });
    const a = canonDefinition(definitionToDoc(s, m.id), () => undefined) as { mesh: { faces: { ring: number[] }[] } };
    assert(a.mesh.faces.every((f) => f.ring[0] === Math.min(...f.ring)), "环从最小下标起转");
  });
  it("材质：名字 / 颜色 / 贴图字节都比；相同就相同", () => {
    const k = KINDS.get(MATERIAL)!, tex = { mimeType: "image/png", bytes: new Uint8Array([1, 2, 3]), sizeM: [1, 1] as [number, number] }, g = mintGuid(), m = { guid: g, name: "红", color: [1, 0, 0] as [number, number, number], texture: tex };
    assert(canonEqual(k, m, { ...m, texture: { ...tex, bytes: new Uint8Array([1, 2, 3]) } }));
    assert(!canonEqual(k, m, { ...m, name: "别的" }));
    assert(!canonEqual(k, m, { ...m, color: [1, 0, 0.5] }));
    assert(!canonEqual(k, m, { ...m, texture: { ...tex, bytes: new Uint8Array([1, 2, 4]) } }));
    assert(!canonEqual(k, m, { guid: g, name: "红", color: [1, 0, 0] }), "一边没贴图");
  });
});

describe("前沿：一样的也往下看", () => {
  it("原样再拷一次：全一样，不问", () => {
    const w = chair(), t = target(w);
    assert(pasteConflict(t, copyInst(w.s, w.iseat)) === null);
    assert(pasteConflict(reopen(t), copyInst(reopen(w.s), w.iseat)) === null, "两边都存盘重开过");
  });
  it("椅子没改、椅腿改了：椅子一字不差，但要查出椅腿（设计书原写「它下面不再看」是错的）", () => {
    const w = chair(), t = target(w, 2);
    editLeg(w);
    const f = frontier(sceneStore(t), payloadBundle(copyInst(w.s, w.iseat)));
    eq(f.differ.map((x) => KINDS.get(x.ref.kind)!.nameOf(x.here)).join(), "椅腿");
    assert(f.same.some((r) => r.guid === w.seat.guid), "椅子是一样的");
  });
  it("弹窗的事实：摆了几份、几份锁着、在架上、两边各几张面、材质两边的颜色", () => {
    const w = chair(), t = target(w, 2);
    w.seat.name = "改了名的椅子";
    w.s.materials[w.wood] = { ...w.s.materials[w.wood], color: [0, 1, 0] };
    const seatT = t.defByGuid(w.seat.guid)!;
    rootInsts(t)[0].locked = true;
    applyOp(t, { op: "shelfPut", kind: "definition", ref: seatT.guid, folder: null, guid: mintGuid() });
    const rows = pasteConflict(t, copyInst(w.s, w.iseat))!, seat = rows.find((r) => r.kind === DEFINITION)!, mat = rows.find((r) => r.kind === MATERIAL)!;
    eq(seat.placed, 3); eq(seat.locked, 1); eq(seat.shelved, true); eq(seat.hereFaces, seat.incomingFaces);
    assert(seat.name === "椅子", "名字写这里叫什么");
    assert(conflictLine(seat).includes("摆了 3 份") && conflictLine(seat).includes("1 份锁着") && conflictLine(seat).includes("在素材架上"), conflictLine(seat));
    assert(conflictLine(mat).includes("#996633") && conflictLine(mat).includes("#00ff00"), conflictLine(mat));
    assert(mat.faces > 0, "这里几张面在用");
  });
  it("层永不进前沿的 differ（名字 / 可见不一样也不问）；默认层、内置背面不进", () => {
    const w = chair(), t = target(w);
    const l = t.layers.find((x) => x.name === "结构")!; l.visible = false; l.name = "这里叫别的";
    assert(pasteConflict(t, copyInst(w.s, w.iseat)) === null);
    const p = copyInst(w.s, w.iseat), f = frontier(sceneStore(t), payloadBundle(p));
    assert(!f.same.concat(f.create).some((r) => r.guid === DEFAULT_LAYER_GUID));
  });
  it("文字不说「别的模型」（剪贴板记的是第几次打开，同一文件重开也算）", () => {
    for (const f of ["../src/app/paste-actions.ts", "../src/editor/paste-plan.ts"]) {
      const lines = readFileSync(new URL(f, import.meta.url), "utf8").split("\n").filter((l) => !/^\s*(\/\/|\/?\*)/.test(l));
      assert(!lines.some((l) => /别的模型/.test(l)), `${f} 用户看得见的字里有「别的模型」`);
    }
  });
});

describe("§6 用拷来的更新", () => {
  it("原地换身体：句柄 / GUID 不变，摆着的每一份都跟上（user：拷出去修，拷回来，其他的实例都跟上）", () => {
    const w = chair(), t = target(w, 2), before = t.defByGuid(w.leg.guid)!, id = before.id, f0 = faces(t, w.leg.guid);
    editLeg(w);
    w.leg.name = "修好的椅腿";
    const seatId = t.defByGuid(w.seat.guid)!.id, n = t.defs.size;
    applyOp(t, pasteOp(t, copyInst(w.s, w.iseat), UPDATE));
    const after = t.defByGuid(w.leg.guid)!;
    eq(after.id, id, "句柄不变"); eq(after.name, "修好的椅腿"); assert(faces(t, w.leg.guid) === f0, "面数（盒子都是 6 张）");
    assert(after.body.kind === "brep" && after.body.kernel.vertices().some((v) => Math.abs(v.x) === 2 || Math.abs(v.y) === 2), "身体是新的");
    eq(t.defs.size, n, "没多定义");
    eq(rootInsts(t).length, 4, "原来 3 份 + 新贴 1 份"); assert(rootInsts(t).every((i) => i.def === seatId), "都指同一个椅子");
    assert(t.def(seatId).instances.size === 1 && [...t.def(seatId).instances.values()][0].def === id, "椅子里还是那条椅腿");
    uniqueGuids(t);
  });
  it("拷来的多了子组件：新建；拷来的少了：这边那条留着当孤儿，不删（生死按引用）", () => {
    const w = chair(), t = target(w);
    const extra = w.s.mintDef("新零件", sceneBox(1, 1));
    w.s.mintInstance(w.leg.id, null, extra.id, IDENTITY);
    for (const [id, i] of w.leg.instances) if (i.def === w.screw.id) w.leg.instances.delete(id);
    applyOp(t, pasteOp(t, copyInst(w.s, w.iseat), UPDATE));
    assert(t.defByGuid(extra.guid), "新建");
    const screwT = t.defByGuid(w.screw.guid);
    assert(screwT, "螺丝还在");
    assert(orphanDefs(census(t)).includes(screwT!.id), "没人用了 = 孤儿，等清理");
  });
  it("种类变了（硬表面 → 网格体）照换；对称设置跟源", () => {
    const w = chair(), t = target(w);
    applyOp(w.s, { op: "castDefinition", def: w.leg.id, to: "mesh" });
    w.s.meshMirrors.set(w.leg.id, { mode: "edit", axis: 1 });
    applyOp(t, pasteOp(t, copyInst(w.s, w.iseat), UPDATE));
    const leg = t.defByGuid(w.leg.guid)!;
    eq(leg.body.kind, "mesh");
    eq(t.meshMirrors.get(leg.id)?.axis, 1);
    // 再换回来：这边的对称设置不留着
    w.s.meshMirrors.delete(w.leg.id);
    applyOp(w.s, { op: "castDefinition", def: w.leg.id, to: "brep" });
    applyOp(t, pasteOp(t, copyInst(w.s, w.iseat), UPDATE));
    eq(t.defByGuid(w.leg.guid)!.body.kind, "brep"); assert(!t.meshMirrors.has(leg.id));
  });
  it("材质原地换条：下标不变，别的组件上用它的面也变了；关掉开关 = 留这里的", () => {
    const w = chair(), t = target(w), g = w.s.materials[w.wood].guid, i0 = t.materialByGuid(g), old = t.materials[i0];
    w.s.materials[w.wood] = { ...w.s.materials[w.wood], color: [0, 1, 0] };
    const off = t.clone();
    applyOp(off, pasteOp(off, copyInst(w.s, w.iseat), { entries: "update", except: [MATERIAL] }));
    assert(off.materials[i0].color[1] === old.color[1], "不跟：留这里的");
    applyOp(t, pasteOp(t, copyInst(w.s, w.iseat), UPDATE));
    eq(t.materialByGuid(g), i0, "下标不变"); eq(t.materials[i0].color[1], 1); assert(t.materials[i0] !== old, "换了对象（渲染缓存按对象身份）");
  });
  it("层永不被更新（§9-6）：这里的名字 / 可见不动；这里没有的层照建", () => {
    const w = chair(), t = target(w), l = t.layers.find((x) => x.name === "结构")!;
    l.visible = false;
    w.s.layers.push({ id: w.s.nextLayer++, guid: mintGuid(), name: "新层", visible: true });
    w.seat.name = "变一下";
    const inst = [...w.seat.instances.values()][0]; inst.layer = 2;
    applyOp(t, pasteOp(t, copyInst(w.s, w.iseat), UPDATE));
    eq(t.layers.find((x) => x.guid === l.guid)!.visible, false, "这里还是藏着");
    assert(t.layers.some((x) => x.name === "新层"), "没有的建了");
    const placed = [...t.defByGuid(w.seat.guid)!.instances.values()][0];
    eq(t.layers.find((x) => x.id === placed.layer)!.name, "新层", "层代号对上了目标的表");
  });
  it("站在要被更新的组件里：拒，说先退出来；指令本身也拒（OpRejected 进提示行）", () => {
    const w = chair(), t = target(w), legT = t.defByGuid(w.leg.guid)!;
    editLeg(w);
    const p = copyInst(w.s, w.iseat), pp = planPaste(t, p, UPDATE);
    assert(pasteBlocked(t, pp, t.root, [t.root, t.defByGuid(w.seat.guid)!.id, legT.id])!.includes("先退出来"), "站在椅腿里（链上）");
    assert(pasteBlocked(t, pp, t.root, [t.root]) === null, "站在外面可以");
    let msg = "";
    try { applyOp(t, { ...pasteOp(t, p, UPDATE), at: { def: legT.id, group: null } } as Op); } catch (e) { assert(e instanceof OpRejected, String(e)); msg = (e as Error).message; }
    assert(msg.includes("先退出来"), msg);
  });
  it("会成环的拒：源里 甲 → 乙，目标里 乙 → 甲——整包更新不成环；贴进甲里面才成环", () => {
    const s = new Scene(), a = s.mintDef("甲", sceneBox(1, 1)), b = s.mintDef("乙", sceneBox(1, 1)), i = s.mintInstance(s.root, null, a.id, IDENTITY);
    s.mintInstance(a.id, null, b.id, IDENTITY);
    const t = new Scene(), ta = t.mintDef("甲", sceneBox(1, 1), a.guid), tb = t.mintDef("乙", sceneBox(1, 1), b.guid);
    t.mintInstance(tb.id, null, ta.id, IDENTITY);
    t.mintInstance(t.root, null, tb.id, IDENTITY);
    const p = copyInst(s, i);
    assert(pasteWouldCycle(t, p, t.root, KEEP) === false, "留这里的：贴甲不成环");
    assert(pasteWouldCycle(t, p, t.root, UPDATE) === false, "整包用拷来的不成环");
    applyOp(t, pasteOp(t, p, UPDATE));
    eq(t.def(tb.id).instances.size, 0, "乙里不再摆甲"); eq(t.def(ta.id).instances.size, 1, "甲里摆乙");
    assert(pasteWouldCycle(t, p, tb.id, UPDATE), "贴进乙：甲 → 乙");
  });
  it("拷来的指向这份模型的根（手改文件 / 复制文件才有）：根永不更新；更新后绕回 = 拒", () => {
    const t = new Scene(), rootGuid = t.def(t.root).guid, x = t.mintDef("X", sceneBox(1, 1));
    t.mintInstance(t.root, null, x.id, IDENTITY);
    const s = new Scene(), xs = s.mintDef("X", sceneBox(1, 1), x.guid), fakeRoot = s.mintDef("根的旧版", sceneBox(1, 1), rootGuid);
    const i = s.mintInstance(s.root, null, xs.id, IDENTITY);
    s.mintInstance(xs.id, null, fakeRoot.id, IDENTITY);
    const p = copyInst(s, i), mp = planPaste(t, p, UPDATE);
    assert(!mp.plan.update.some((r) => r.guid === rootGuid), "模型根不在更新名单");
    assert(pasteBlocked(t, mp, t.root)?.includes("贴进它自己"), "X 换身体之后指向根 = 环");
  });
  it("撤销一步退回更新连带的所有份，重做回来；句柄 / GUID 一字不差（§9-6）", () => {
    const w = chair(); let t = target(w, 1);
    const h = new History(t), fp = (s: Scene) => JSON.stringify([...s.defs.values()].map((d) => [d.id, d.guid, d.name, [...d.instances.values()].map((i) => i.guid), d.body.kind === "brep" ? d.body.kernel.toBrep().vertices.length : 0]));
    const f0 = fp(t);
    editLeg(w); w.leg.name = "修好的";
    t = h.commit(t, pasteOp(t, copyInst(w.s, w.iseat), UPDATE)).scene;
    const f1 = fp(t);
    assert(f0 !== f1);
    t = h.undo()!.scene;
    eq(fp(t), f0, "撤销");
    t = h.redo(t)!.scene;
    eq(fp(t), f1, "重做");
  });
  it("存盘重开：更新过的文件读写一致，再比一次是一样的（拷回来不会一直问）", () => {
    const w = chair(), t = target(w);
    editLeg(w);
    const p = copyInst(w.s, w.iseat);
    applyOp(t, pasteOp(t, p, UPDATE));
    assert(pasteConflict(t, p) === null, "刚更新完：一样");
    assert(pasteConflict(reopen(t), p) === null, "存盘重开也一样");
    uniqueGuids(reopen(t));
  });
});

describe("留这份模型的", () => {
  it("这份模型一个字不变，只多摆一份；提示行说用的是这里的版本", () => {
    const w = chair(), t = target(w);
    editLeg(w);
    const f0 = t.def(t.defByGuid(w.leg.guid)!.id).name, nd = t.defs.size, n0 = rootInsts(t).length, p = copyInst(w.s, w.iseat), b = pasteBefore(t, p, KEEP);
    applyOp(t, pasteOp(t, p, KEEP));
    eq(t.defs.size, nd); eq(rootInsts(t).length, n0 + 1); eq(t.def(t.defByGuid(w.leg.guid)!.id).name, f0);
    const say = pasteSay(pasteReport(b, t), true);
    assert(say.includes("椅子") && say.includes("本文件这版"), say);
    assert(!say.includes("椅腿"), `椅腿被椅子挡住、没走到，不提：${say}`);
  });
});

describe("断开（break link）", () => {
  it("不一样的 + 指着它们的上层都铸新；一样的子组件继续共用；这边原来的不动（§9-6）", () => {
    const w = chair(), t = target(w, 1);
    editLeg(w);
    const n = t.defs.size, seat0 = t.defByGuid(w.seat.guid)!, leg0 = t.defByGuid(w.leg.guid)!, screw0 = t.defByGuid(w.screw.guid)!;
    const legBody0 = leg0.body, p = copyInst(w.s, w.iseat), n0 = rootInsts(t).length;
    applyOp(t, pasteOp(t, p, DETACH));
    eq(t.defs.size, n + 2, "新椅子、新椅腿；螺丝共用");
    const placed = rootInsts(t)[n0], seat1 = t.def(placed.def);
    assert(seat1.id !== seat0.id && seat1.guid !== w.seat.guid, "贴出来的是新椅子");
    const leg1 = t.def([...seat1.instances.values()][0].def);
    assert(leg1.id !== leg0.id && leg1.guid !== w.leg.guid, "新椅子里是新椅腿");
    eq([...leg1.instances.values()][0].def, screw0.id, "螺丝内容一样，继续共用");
    assert(leg1.body.kind === "brep" && leg1.body.kernel.vertices().some((v) => Math.abs(v.x) === 2), "新椅腿是拷来的样子");
    assert(t.defByGuid(w.leg.guid)!.body === legBody0, "原来的椅腿一点没动");
    uniqueGuids(t); uniqueGuids(reopen(t));
    eq(orphanDefs(census(t)).length, 0);
  });
  it("材质不一样：材质也铸新，新组件指新材质，这份模型别的面不变；关开关 = 用这里的材质", () => {
    const w = chair(), t = target(w), g = w.s.materials[w.wood].guid, i0 = t.materialByGuid(g), old = t.materials[i0], nm = t.materials.length;
    w.s.materials[w.wood] = { ...w.s.materials[w.wood], color: [0, 1, 0] };
    const off = t.clone(), n = t.defs.size;
    applyOp(off, pasteOp(off, copyInst(w.s, w.iseat), { entries: "detach", except: [MATERIAL] }));
    eq(off.materials.length, nm, "不跟 = 不多材质"); eq(off.defs.size, n, "只有材质不一样、又不跟 = 没东西要断");
    applyOp(t, pasteOp(t, copyInst(w.s, w.iseat), DETACH));
    eq(t.materials.length, nm + 1); assert(t.materials[i0] === old, "这里的木头没动");
    const nw = t.materials.at(-1)!; eq(nw.color[1], 1); assert(nw.guid !== g, "新身份");
    const placed = rootInsts(t).at(-1)!, leg1 = t.def([...t.def(placed.def).instances.values()][0].def);
    assert(leg1.body.materialSlots.includes(t.materials.length - 1), "新椅腿用新木头（沿边往上传：用它的组件也铸新）");
    assert(placed.def !== t.defByGuid(w.seat.guid)!.id, "上层也新");
    uniqueGuids(t);
  });
  it("撤销 / 重放：铸的新身份一字不差（录音带）", () => {
    const w = chair(); let t = target(w);
    editLeg(w);
    const h = new History(t), p = copyInst(w.s, w.iseat);
    t = h.commit(t, pasteOp(t, p, DETACH)).scene;
    const guids = (s: Scene) => [...s.defs.values()].map((d) => d.guid).join();
    const g1 = guids(t);
    t = h.undo()!.scene;
    t = h.redo(t)!.scene;
    eq(guids(t), g1);
  });
  it("站在不一样的那个组件里断开：可以（贴的是新的），不算成环", () => {
    const w = chair(), t = target(w), leg = t.defByGuid(w.leg.guid)!;
    editLeg(w);
    const p = copyInst(w.s, w.iseat);
    assert(pasteBlocked(t, planPaste(t, p, DETACH), leg.id, [t.root, leg.id]) === null);
    assert(pasteBlocked(t, planPaste(t, p, KEEP), leg.id, [t.root, leg.id]) !== null, "留这里的：椅子里有椅腿，贴进椅腿 = 环");
  });
});

describe("指令流只带要的（trimClosure）", () => {
  it("留这里的：全部有 = 一条不带；更新：不一样的 + 路上的上层（重放还走得到）；一样的兄弟不带", () => {
    const w = chair(), t = target(w), lamp = w.s.mintDef("灯", sceneBox(1, 1));
    w.s.mintInstance(w.seat.id, null, lamp.id, IDENTITY);
    applyOp(t, pasteOp(t, copyInst(w.s, w.iseat), UPDATE));
    editLeg(w);
    const p = copyInst(w.s, w.iseat), names = (d: Decision) => trimClosure(t, p, d).closure!.definitions.map((x) => x.name).sort().join();
    eq(names(KEEP), "");
    eq(names(UPDATE), "椅子,椅腿", "灯和螺丝一样，不带；椅子一样但在路上");
    eq(names(DETACH), "椅子,椅腿");
    const full = t.clone(), cut = t.clone();
    applyOp(full, { op: "paste", at: rootAt(full), ...localize(p, IDENTITY), merge: UPDATE } as Op);
    applyOp(cut, pasteOp(cut, p, UPDATE));
    eq(faces(cut, w.leg.guid), faces(full, w.leg.guid));
    eq(xsOf(cut, w.leg.guid).join(), xsOf(full, w.leg.guid).join(), "剪了和没剪落地一样");
  });
});

describe("导入素材同一条路（user「4 用」）", () => {
  it("撞上内容不一样：更新 / 留这里的 / 断开都走同一份；断开之后架上放的是新身份", () => {
    const w = chair(), t = target(w);
    editLeg(w);
    const doc = readCatsup(writeCatsup(documentFromScene(w.s, "源")));
    const keep = t.clone();
    applyOp(keep, shelfImportOp(keep, doc, [w.seat.guid], KEEP).op);
    eq(keep.shelf.items.map((x) => x.ref).join(), w.seat.guid);
    const up = t.clone();
    applyOp(up, shelfImportOp(up, doc, [w.seat.guid], UPDATE).op);
    assert(xsOf(up, w.leg.guid).some((x) => Math.abs(x) === 2), "更新了");
    eq(up.shelf.items.map((x) => x.ref).join(), w.seat.guid);
    const cut = t.clone(), n = cut.defs.size;
    const { op, already } = shelfImportOp(cut, doc, [w.seat.guid], DETACH);
    eq(already, 0);
    applyOp(cut, op);
    eq(cut.defs.size, n + 2);
    const shelved = cut.defByGuid(cut.shelf.items[0].ref)!;
    assert(shelved.guid !== w.seat.guid && shelved.name === "椅子", "架上是新椅子");
    assert(!orphanDefs(census(cut)).includes(shelved.id));
    uniqueGuids(cut);
  });
  it("断开：原来那个已经在架上也算要放（新身份不在架上）", () => {
    const w = chair(), t = target(w);
    applyOp(t, { op: "shelfPut", kind: "definition", ref: w.seat.guid, folder: null, guid: mintGuid() });
    editLeg(w);
    const doc = readCatsup(writeCatsup(documentFromScene(w.s, "源")));
    eq(shelfImportOp(t, doc, [w.seat.guid], KEEP).already, 1);
    const { op, already } = shelfImportOp(t, doc, [w.seat.guid], DETACH);
    eq(already, 0);
    applyOp(t, op);
    eq(t.shelf.items.length, 2);
  });
  it("没有不一样 = 不问", () => {
    const w = chair(), t = target(w), doc = readCatsup(writeCatsup(documentFromScene(w.s, "源")));
    assert(pasteConflict(t, shelfImportOp(t, doc, [w.seat.guid]).payload) === null);
  });
});

// 玩具种类：更新 / 断开也不偷看定义（§9-2）。引用别的 memo；声明 overwrite，内容 = 正文
interface Memo { guid: Guid; body: string; links: Guid[]; inner?: Guid }
const memoRef = (guid: Guid): Ref => ({ kind: "memo", guid });
registerKind<Memo>({
  kind: "memo", carry: true, structural: true, overwrite: true, constants: [],
  guidOf: (n) => n.guid,
  nameOf: (n) => n.body,
  refs: (n) => n.links.map(memoRef),
  rewrite: (n, map) => ({ ...n, guid: map(memoRef(n.guid)), links: n.links.map((g) => map(memoRef(g))) }),
  remintOwned: (n) => ({ ...n, inner: "新的附属" }),
  canon: (n) => n,
});
const memo = (guid: Guid, body: string, ...links: Guid[]) => ({ kind: "memo", doc: { guid, body, links } satisfies Memo });

describe("§9-2 玩具种类：比内容 / 更新 / 断开只认声明", () => {
  const here = () => tableStore([memo("顶", "顶", "中"), memo("中", "旧", "底"), memo("底", "底"), memo("别处", "别处", "底")], []);
  const b = { docs: [memo("顶", "顶", "中"), memo("中", "新", "底", "新子"), memo("底", "底"), memo("新子", "新子")], roots: [memoRef("顶")] };
  it("前沿：顶一样、中不一样、底一样、新子新建", () => {
    const f = frontier(here(), b);
    eq(f.differ.map((x) => x.ref.guid).join(), "中"); eq(f.create.map((r) => r.guid).join(), "新子"); eq(f.same.map((r) => r.guid).join(), "顶,底");
    eq(conflictRows(f)[0].name, "旧", "写这边叫什么");
  });
  it("留这里的：走到有的就停，新子不建", () => {
    const p = plan(here(), b, KEEP);
    eq(p.create.length, 0); eq(p.kept.map((r) => r.guid).join(), "顶");
  });
  it("更新：中进更新名单，新子新建，顶不动", () => {
    const p = plan(here(), b, UPDATE);
    eq(p.update.map((r) => r.guid).join(), "中"); eq(p.create.map((r) => r.guid).join(), "新子"); eq(p.remint.size, 0);
  });
  it("断开：中和指着它的顶都铸新；底共用；别处不在包里不管", () => {
    const p = plan(here(), b, DETACH);
    eq([...p.remint.keys()].sort().join(), "中,顶");
    eq(p.create.map((r) => r.guid).join(), "顶,中,新子"); eq(p.kept.length, 0, "底比过是一样的，不算「留了这边那版」");
    assert([...p.remint.values()].every((g) => g !== "中" && g !== "顶"));
  });
  it("except：这种不跟 = 比了也不动", () => {
    eq(plan(here(), b, { entries: "update", except: ["memo"] }).update.length, 0);
    eq(plan(here(), b, { entries: "detach", except: ["memo"] }).remint.size, 0);
  });
  it("overwrite: false 的种类永远算一样（层的政策不是硬编码）", () => {
    registerKind({ ...(KINDS.get("memo") as unknown as Parameters<typeof registerKind<Memo>>[0]), kind: "frozen-memo", overwrite: false, refs: () => [] });
    const st = tableStore([{ kind: "frozen-memo", doc: { guid: "x", body: "这里", links: [] } }], []);
    const f = frontier(st, { docs: [{ kind: "frozen-memo", doc: { guid: "x", body: "那里", links: [] } }], roots: [{ kind: "frozen-memo", guid: "x" }] });
    eq(f.differ.length, 0); eq(f.same.length, 1);
  });
});

describe("场景店：表里的引用和用量是真的", () => {
  it("defRef / materialRef 走 usage 不序列化：不碰 toBrep", () => {
    const w = chair(), st = sceneStore(w.s), orig = w.s.brep(w.leg.id).kernel.toBrep;
    w.s.brep(w.leg.id).kernel.toBrep = () => { throw new Error("普查不许序列化"); };
    assert(st.usage(defRef(w.leg.guid)).placed === 1);
    assert(st.usage(materialRef(w.s.materials[w.wood].guid)).faces > 0);
    assert(threw(() => st.docOf(defRef(w.leg.guid))), "docOf 才序列化");
    w.s.brep(w.leg.id).kernel.toBrep = orig;
  });
});
