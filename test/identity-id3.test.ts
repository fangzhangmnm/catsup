// 身份地基 ID-3（计划书 ai-docs/20261104-identity-foundation-plan.md §15）：跨文件粘贴（载荷闭包 + 合并三张对照表）+ 素材架（六条指令、活着算架子、太新的架子）+ 素材导入。created 2026-11-04 by Claude Opus 5.5
// user 11-04「第一次新建，之后再贴只多摆一份」；10-30「反正就是要么被引用要么被素材库引用」「架子上放引用、只放标记进来的组件、进架必须命名、可重名、不同文件夹」。
import { describe, it, eq, assert } from "./runner.mjs";
import { documentFromScene, readCatsup, sceneFromDocument, writeCatsup, decodeGlb, mintGuid } from "../src/format/index.ts";
import { encodeGlb } from "../src/format/glb.ts";
import { DEFAULT_LAYER_GUID } from "../src/format/guid.ts";
import { ROOT_CONTEXT, Scene, type Instance } from "../src/scene/scene.ts";
import { applyOp, OpRejected, ShearRejected, describeOp, faceKey, edgeKey, type Op } from "../src/editor/ops.ts";
import { History, opTier } from "../src/editor/history.ts";
import { opTouchesLocked } from "../src/editor/op-locks.ts";
import { census, liveDefs, orphanDefs, shelfRows, unusedMaterials } from "../src/scene/resources.ts";
import { castPayload, extract, localize, transferEmpty, type TransferPayload } from "../src/editor/transfer.ts";
import { importCandidates, pasteBefore, pasteReport, pasteSay, pasteWouldCycle, payloadFromDocument, shelfImportOp, trimClosure } from "../src/editor/paste-plan.ts";
import { formatNotesSay } from "../src/app/format-notes.ts";
import { sceneBox } from "./format-scenes.ts";
import { IDENTITY, translation } from "../src/scene/xform.ts";

const rootAt = (s: Scene) => ({ def: s.root, group: null });
const reopen = (s: Scene): Scene => sceneFromDocument(readCatsup(writeCatsup(documentFromScene(s, "t"))));
const pasteOp = (s: Scene, p: TransferPayload): Op => { const l = localize(p, IDENTITY); return { op: "paste", at: rootAt(s), ...(l.brep ? { brep: l.brep } : {}), ...(l.groups ? { groups: l.groups } : {}), ...(l.instances ? { instances: l.instances } : {}), ...(l.materials ? { materials: l.materials } : {}), ...(l.closure ? { closure: l.closure } : {}) }; };
const copyInst = (s: Scene, inst: Instance): TransferPayload => extract(s, ROOT_CONTEXT, { faces: [], edges: [] }, [{ kind: "instance", instance: inst.id }])!;
/** 站在 chain 那一层拷（实例句柄只在自己那个定义里唯一，子组件里的不能拿到根上去查）。 */
const copyIn = (s: Scene, chain: readonly Instance[], inst: Instance): TransferPayload => extract(s, { chain: chain.map((i) => i.id), group: null }, { faces: [], edges: [] }, [{ kind: "instance", instance: inst.id }])!;
const rejected = (fn: () => unknown): string => { try { fn(); return ""; } catch (e) { return e instanceof OpRejected ? e.message : `不是 OpRejected：${String(e)}`; } };
const threw = (fn: () => unknown): boolean => { try { fn(); return false; } catch { return true; } };
const png = new Uint8Array([137, 80, 78, 71, 1, 2, 3]);

/** 根里一份甲；甲里一份乙（在甲的组里、归「结构」层）；乙里一份丙。甲用「红」（带贴图），丙用「蓝」。 */
function source() {
  const s = new Scene(sceneBox(1, 1));
  const red = s.addMaterial({ name: "红", color: [1, 0, 0], texture: { mimeType: "image/png", bytes: png, sizeM: [1, 1] } }), blue = s.addMaterial({ name: "蓝", color: [0, 0, 1] });
  s.addMaterial({ name: "没人用", color: [0, 1, 0] });
  const a = s.mintDef("甲", sceneBox(1, 1)), b = s.mintDef("乙", sceneBox(1, 1)), c = s.mintDef("丙", sceneBox(1, 1));
  const ka = s.brep(a.id).kernel; ka.setFaceMaterial([ka.faces()[0].id], s.slotFor(a.id, red));
  const kc = s.brep(c.id).kernel; kc.setFaceMaterial([kc.faces()[0].id], s.slotFor(c.id, blue));
  s.layers.push({ id: s.nextLayer++, guid: mintGuid(), name: "结构", visible: false, color: [0.1, 0.2, 0.3] });
  const layer = s.layers[1];
  const grp = s.mintGroup(a.id, null, sceneBox(1, 1), { origin: { x: 0, y: 0, z: 0 }, x: { x: 1, y: 0, z: 0 }, y: { x: 0, y: 1, z: 0 }, z: { x: 0, y: 0, z: 1 } }); grp.name = "组一";
  const ia = s.mintInstance(s.root, null, a.id, translation({ x: 5, y: 0, z: 0 }));
  const ib = s.mintInstance(a.id, grp.id, b.id, IDENTITY); ib.layer = layer.id; ib.name = "那份乙";
  const ic = s.mintInstance(b.id, null, c.id, IDENTITY);
  return { s, a: a.id, b: b.id, c: c.id, ia, ib, ic, red, blue, layer, grp };
}
const defNames = (s: Scene): string => [...s.defs.values()].filter((d) => d.id !== s.root).map((d) => d.name).sort().join("");
const rootInsts = (s: Scene): Instance[] => [...s.def(s.root).instances.values()];

describe("① 载荷自带闭包", () => {
  it("递归两层的定义、用到的材质（含贴图字节）、用到的层；实例按 GUID 引用", () => {
    const w = source(), p = copyInst(w.s, w.ia);
    eq(p.closure!.definitions.map((d) => d.name).sort().join(""), "丙乙甲", "往下走到底");
    eq(p.instances![0].def, w.s.def(w.a).guid, "实例上是 GUID");
    eq(typeof p.instances![0].def, "string");
    const names = (p.materials ?? []).map((m) => m.name).sort().join("");
    eq(names, "红蓝", "用到的才带；「没人用」不带");
    const red = p.materials!.find((m) => m.name === "红")!;
    eq([...red.texture!.bytes].join(), [...png].join(), "贴图字节在");
    eq(p.closure!.layers.map((l) => l.name).join(), "结构", "只带用到的层");
    eq(p.closure!.definitions.find((d) => d.name === "甲")!.groups[0].guid, w.grp.guid, "组的 GUID 在");
    assert(!transferEmpty(p));
  });
  it("实例的层：闭包里有，载荷上是 GUID", () => {
    const w = source();
    const top = rootInsts(w.s)[0]; top.layer = w.layer.id;
    const p = copyInst(w.s, top);
    eq(p.instances![0].layer, w.layer.guid);
  });
  it("没有实例的载荷没有闭包（纯几何照旧）", () => {
    const w = source(), k = w.s.brep(w.s.root).kernel;
    const p = extract(w.s, ROOT_CONTEXT, { faces: [k.faces()[0].id], edges: [] }, [])!;
    assert(!p.closure, "不带");
  });
  it("转种类不丢闭包；localize 不碰定义里的坐标", () => {
    const w = source(), p = copyInst(w.s, w.ia);
    eq(castPayload(p, "mesh").closure, p.closure);
    const l = localize(p, translation({ x: 1, y: 1, z: 1 }));
    eq(l.closure, p.closure);
    assert(l.instances![0].xform !== p.instances![0].xform, "摆放跟着换");
  });
  it("mesh 身体的定义也进闭包、跨文件装得回去", () => {
    const w = source();
    applyOp(w.s, { op: "castDefinition", def: w.c, to: "mesh" });
    const t = new Scene(), p = copyInst(w.s, w.ia);
    applyOp(t, pasteOp(t, p));
    const c = t.defByGuid(w.s.def(w.c).guid)!;
    eq(c.body.kind, "mesh");
    assert(c.body.kind === "mesh" && c.body.kernel.faces().length > 0, "几何在");
  });
});

describe("② 跨文件粘贴：第一次新建，之后再贴只多摆一份（user 11-04）", () => {
  it("新建带原 GUID（定义 / 组 / 里面的子实例 / 材质 / 层）；世界位置不变", () => {
    const w = source(), t = new Scene(sceneBox(2, 2));
    const p = copyInst(w.s, w.ia);
    applyOp(t, pasteOp(t, p));
    eq(defNames(t), "丙乙甲");
    const a = t.defByGuid(w.s.def(w.a).guid)!, b = t.defByGuid(w.s.def(w.b).guid)!;
    eq([...a.instances.values()][0].guid, w.ib.guid, "定义里的子实例是它的内部结构，GUID 保留");
    eq([...a.instances.values()][0].name, "那份乙");
    assert(a.body.kind === "brep" && [...a.body.groups.values()][0].guid === w.grp.guid, "组的 GUID 保留");
    eq([...b.instances.values()][0].guid, w.ic.guid);
    eq(t.materials.map((m) => m.name).sort().join(""), "红蓝", "「没人用」没带过来");
    eq(t.materials[t.materialByGuid(w.s.materials[w.red].guid)].texture?.bytes, png, "贴图是同一份字节");
    eq(rootInsts(t)[0].xform[3], 5, "摆在原来的世界位置");
  });
  it("面上的颜色对：目标的材质表下标和源不一样也对得上", () => {
    const w = source(), t = new Scene(sceneBox(2, 2));
    t.addMaterial({ name: "目标自己的", color: [0, 0, 0] });
    applyOp(t, pasteOp(t, copyInst(w.s, w.ia)));
    const a = t.defByGuid(w.s.def(w.a).guid)!, k = t.brep(a.id).kernel, painted = k.faces().map((f) => t.materialOfSlot(a.id, k.faceMaterialOf(f.id, 0))?.name).filter(Boolean);
    eq(painted.join(), "红");
  });
  it("再贴一次：定义、材质、层都不多，根上多摆一份", () => {
    const w = source(), t = new Scene(), p = copyInst(w.s, w.ia);
    applyOp(t, pasteOp(t, p));
    const nd = t.defs.size, nm = t.materials.length, nl = t.layers.length;
    applyOp(t, pasteOp(t, p));
    eq(t.defs.size, nd); eq(t.materials.length, nm); eq(t.layers.length, nl);
    eq(rootInsts(t).length, 2); eq(rootInsts(t)[0].def, rootInsts(t)[1].def, "同一个定义");
  });
  it("存盘再开：跨文件贴过的文件读写一致", () => {
    const w = source(), t = new Scene(), p = copyInst(w.s, w.ia);
    applyOp(t, pasteOp(t, p));
    const back = reopen(t);
    eq(defNames(back), "丙乙甲");
    eq([...back.def(back.root).instances.values()].length, 1);
    eq(back.defByGuid(w.s.def(w.c).guid)?.name, "丙");
  });
});

describe("② 续：组里的实例、贴进网格体", () => {
  it("拷一个组（组里摆着实例）跨文件：组和实例都是新的摆放，定义带原 GUID 新建", () => {
    const w = source(), t = new Scene();
    const p = extract(w.s, { chain: [w.ia.id], group: null }, { faces: [], edges: [] }, [{ kind: "group", group: w.grp.id }])!;
    eq(p.groups!.length, 1); eq(p.instances![0].parent, 0, "实例挂在载荷里的组下面");
    applyOp(t, pasteOp(t, p));
    const g = [...t.brep(t.root).groups.values()][0], i = rootInsts(t)[0];
    assert(g.guid !== w.grp.guid, "顶层的组是新的摆放，现铸");
    eq(i.parent, g.id); eq(t.def(i.def).guid, w.s.def(w.b).guid, "定义是原身份"); assert(i.guid !== w.ib.guid);
    eq(t.layers.find((l) => l.id === i.layer)?.guid, w.layer.guid, "层跟着");
    eq(i.name, "那份乙");
  });
  it("贴进网格体：实例照样接、闭包照样合并", () => {
    const w = source(), t = new Scene(), m = t.mintDef("网", sceneBox(1, 1));
    applyOp(t, { op: "castDefinition", def: m.id, to: "mesh" });
    t.mintInstance(t.root, null, m.id, IDENTITY);
    const l = localize(copyInst(w.s, w.ia), IDENTITY);
    applyOp(t, { op: "paste", at: { def: m.id, group: null }, instances: l.instances!, materials: l.materials!, closure: l.closure! });
    const placed = [...t.def(m.id).instances.values()][0];
    eq(t.def(placed.def).guid, w.s.def(w.a).guid);
  });
  it("materialize 的循环防线也管闭包：手改文件里互相摆 = 拒，不炸成死循环", () => {
    const w = source(), doc = readCatsup(writeCatsup(documentFromScene(w.s, "源")));
    const c = doc.definitions.find((d) => d.name === "丙")!, a = doc.definitions.find((d) => d.name === "甲")!;
    const looped = { ...c, instances: [{ guid: mintGuid(), definition: a.guid, parent: null, xform: IDENTITY }] };
    const defs = doc.definitions.map((d) => (d === c ? looped : d)), t = new Scene();
    assert(threw(() => applyOp(t, { op: "paste", at: rootAt(t), materials: [], closure: { definitions: defs, layers: [], roots: [a.guid] } })), "拒");
  });
});

describe("子组的编号比父组小（把老组装进新组；fuzz 抓到）", () => {
  const nested = () => {
    const w = source(), F = { origin: { x: 0, y: 0, z: 0 }, x: { x: 1, y: 0, z: 0 }, y: { x: 0, y: 1, z: 0 }, z: { x: 0, y: 0, z: 1 } };
    const inner = w.s.mintGroup(w.a, null, sceneBox(1, 1), F), outer = w.s.mintGroup(w.a, null, sceneBox(1, 1), F);
    inner.parent = outer.id; inner.name = "里"; outer.name = "外";
    assert(inner.id < outer.id, "前提");
    return { ...w, inner, outer };
  };
  it("拷外面那个组、贴：父子关系在，不报错（以前「group parent index out of order」）", () => {
    const w = nested(), t = new Scene();
    const p = extract(w.s, { chain: [w.ia.id], group: null }, { faces: [], edges: [] }, [{ kind: "group", group: w.outer.id }])!;
    eq(p.groups!.length, 2);
    applyOp(t, pasteOp(t, p));
    const gs = [...t.brep(t.root).groups.values()], i = gs.find((g) => g.name === "里")!, o = gs.find((g) => g.name === "外")!;
    eq(i.parent, o.id, "里在外里面"); eq(o.parent, null, "外在顶层");
    assert(threw(() => applyOp(t, { op: "paste", at: rootAt(t), groups: [{ ...p.groups![0], parent: 9 }] })), "下标越界照样拒");
  });
  it("做成唯一：复制出来的组还是嵌套的（以前子组静默丢掉父组）", () => {
    const w = nested();
    w.s.mintInstance(w.s.root, null, w.a, IDENTITY);   // 两份，才能做成唯一
    applyOp(w.s, { op: "makeUnique", def: w.s.root, instance: w.ia.id });
    const fresh = w.s.def(w.ia.def), gs = fresh.body.kind === "brep" ? [...fresh.body.groups.values()] : [];
    assert(fresh.id !== w.a, "新定义");
    eq(gs.find((g) => g.name === "里")!.parent, gs.find((g) => g.name === "外")!.id);
    eq(gs.find((g) => g.name === "外")!.parent, null);
  });
});

describe("③ 同 GUID 用目标那条，不比内容", () => {
  it("目标改过的版本不被覆盖", () => {
    const w = source(), t = new Scene(), p = copyInst(w.s, w.ia);
    applyOp(t, pasteOp(t, p));
    const a = t.defByGuid(w.s.def(w.a).guid)!;
    a.name = "目标改过名";
    const faces = t.brep(a.id).kernel.faces().length;
    w.s.def(w.a).name = "源也改过名";
    applyOp(t, pasteOp(t, copyInst(w.s, w.ia)));
    eq(t.defByGuid(w.s.def(w.a).guid)?.name, "目标改过名");
    eq(t.brep(a.id).kernel.faces().length, faces);
  });
  it("目标的旧版用不上的子组件不建出来（不造孤儿）", () => {
    const w = source(), t = new Scene();
    applyOp(t, pasteOp(t, copyInst(w.s, w.ia)));
    const n = t.defs.size;
    const d = w.s.mintDef("后加的丁", sceneBox(1, 1));
    w.s.mintInstance(w.a, null, d.id, IDENTITY);
    const p = copyInst(w.s, w.ia);
    assert(p.closure!.definitions.some((x) => x.name === "后加的丁"), "源的闭包里有它");
    const before = pasteBefore(t, p);
    applyOp(t, pasteOp(t, p));
    eq(t.defs.size, n, "甲用目标那版，丁没人用，不建");
    const r = pasteReport(before, t);
    assert(!r.createdDefs.includes("后加的丁") && !r.reusedDefs.includes("后加的丁"), "报告里也不提它");
    eq(orphanDefs(census(t)).length, 0, "没有孤儿");
  });
  it("闭包里的新定义引用目标已有的定义：接到目标那条上", () => {
    const w = source(), t = new Scene();
    const inner = copyIn(w.s, [w.ia], w.ib);   // 乙（含丙）先贴进目标
    eq(inner.closure!.definitions.map((d) => d.name).sort().join(""), "丙乙", "前提：拷的真是乙");
    applyOp(t, pasteOp(t, inner));
    const bT = t.defByGuid(w.s.def(w.b).guid)!;
    bT.name = "目标的乙";
    applyOp(t, pasteOp(t, copyInst(w.s, w.ia)));
    const aT = t.defByGuid(w.s.def(w.a).guid)!;
    eq([...aT.instances.values()][0].def, bT.id, "甲（新建）里那份乙指向目标已有的乙");
    eq(t.defByGuid(w.s.def(w.b).guid)?.name, "目标的乙");
  });
});

describe("④ 层合并", () => {
  it("默认层合回；同名不同 GUID 并排；新层带原 GUID / 名 / 可见 / 色", () => {
    const w = source(), t = new Scene();
    t.layers.push({ id: t.nextLayer++, guid: mintGuid(), name: "结构", visible: true });
    w.ia.layer = 0;
    applyOp(t, pasteOp(t, copyInst(w.s, w.ia)));
    eq(rootInsts(t)[0].layer, 0, "默认层合回默认层");
    eq(t.layers.filter((l) => l.guid === DEFAULT_LAYER_GUID).length, 1, "没长第二个默认层");
    const same = t.layers.filter((l) => l.name === "结构");
    eq(same.length, 2, "同名不同 GUID 并排");
    const mine = t.layers.find((l) => l.guid === w.layer.guid)!;
    eq(mine.visible, false); eq(mine.color?.join(), "0.1,0.2,0.3");
  });
  it("定义里实例的层代号跟着换：目标里同一个代号是别的层也不串", () => {
    const w = source(), t = new Scene();
    t.layers.push({ id: t.nextLayer++, guid: mintGuid(), name: "目标的层一", visible: true });
    eq(t.layers[1].id, w.layer.id, "前提：两边代号撞了");
    applyOp(t, pasteOp(t, copyInst(w.s, w.ia)));
    const ib = [...t.defByGuid(w.s.def(w.a).guid)!.instances.values()][0];
    eq(t.layers.find((l) => l.id === ib.layer)?.guid, w.layer.guid, "指向带过来的那层");
    assert(ib.layer !== w.layer.id, "代号换了");
  });
  it("用不上的层不带；已有的不再加", () => {
    const w = source(), t = new Scene();
    const p = copyIn(w.s, [w.ia, w.ib], w.ic);   // 丙里没有层
    eq(p.closure!.layers.length, 0, "闭包里就没带");
    applyOp(t, pasteOp(t, p));
    eq(t.layers.length, 1);
  });
});

describe("⑤ 撤销过了头再贴（清点 §4 B 根治）", () => {
  it("拷组件甲 → 撤到甲建出来之前 → 新建乙（拿到同一个句柄）→ 贴：是甲不是乙，GUID 同原来", () => {
    let s = new Scene(sceneBox(1, 1));
    const h = new History(s), k = s.brep(s.root).kernel;
    s = h.commit(s, { op: "makeComponent", at: rootAt(s), faces: k.faces().map((f) => faceKey(k, f.id)), edges: k.edges().map((e) => edgeKey(k, e.id)), name: "甲" }).scene;
    const inst = rootInsts(s)[0], guid = s.def(inst.def).guid, id = inst.def;
    const p = copyInst(s, inst);
    s = h.undo()!.scene;
    assert(!s.defs.has(id), "撤到甲之前");
    const yi = s.mintDef("乙", sceneBox(2, 2));
    eq(yi.id, id, "乙拿到了甲的句柄");
    s = applyOp(s, pasteOp(s, p)).scene;
    const placed = rootInsts(s).at(-1)!;
    eq(s.def(placed.def).name, "甲"); eq(s.def(placed.def).guid, guid, "原身份");
    eq(s.defByGuid(yi.guid)?.name, "乙", "乙没被碰");
  });
  it("撤销一贴：闭包新建的定义 / 材质 / 层全回去；重做 GUID 不变", () => {
    const w = source();
    let t = new Scene();
    const h = new History(t), p = copyInst(w.s, w.ia), op = pasteOp(t, p);
    eq(opTier(t, op).tier, "scene", "整份场景快照：闭包新建的条目一起回去");
    t = h.commit(t, op).scene;
    const fp = (x: Scene) => JSON.stringify([[...x.defs.values()].map((d) => [d.guid, [...d.instances.values()].map((i) => i.guid)]), x.materials.map((m) => m.guid), x.layers.map((l) => l.guid)]);
    const after = fp(t);
    t = h.undo()!.scene;
    eq(t.defs.size, 1); eq(t.materials.length, 0); eq(t.layers.length, 1);
    t = h.redo(t)!.scene;
    eq(fp(t), after, "重做是自反交换，不重铸");
  });
});

describe("⑥ 摆放现铸 GUID", () => {
  it("贴两次 = 两份不同 GUID，都不是源那份；定义同一个", () => {
    const w = source(), t = new Scene(), p = copyInst(w.s, w.ia);
    applyOp(t, pasteOp(t, p)); applyOp(t, pasteOp(t, p));
    const [x, y] = rootInsts(t);
    assert(x.guid !== y.guid && x.guid !== w.ia.guid && y.guid !== w.ia.guid);
    eq(x.def, y.def);
  });
  it("同一个文件里拷贴：不新建条目", () => {
    const w = source(), n = w.s.defs.size, m = w.s.materials.length, l = w.s.layers.length;
    applyOp(w.s, pasteOp(w.s, copyInst(w.s, w.ia)));
    eq(w.s.defs.size, n); eq(w.s.materials.length, m); eq(w.s.layers.length, l);
    eq(rootInsts(w.s).length, 2);
    assert(rootInsts(w.s)[0].guid !== rootInsts(w.s)[1].guid);
  });
  it("老复现包：实例的 def / layer 是数字句柄，照旧能重放", () => {
    const w = source();
    const op = { op: "paste", at: rootAt(w.s), instances: [{ parent: null, def: w.a, xform: IDENTITY, layer: w.layer.id }] } as unknown as Op;
    applyOp(w.s, op);
    const it = rootInsts(w.s).at(-1)!;
    eq(it.def, w.a); eq(it.layer, w.layer.id);
    assert(threw(() => applyOp(w.s, { op: "paste", at: rootAt(w.s), instances: [{ parent: null, def: 999, xform: IDENTITY }] } as unknown as Op)), "句柄不在 = 拒");
  });
});

describe("指令流不攒闭包（trimClosure）", () => {
  it("同一个文件里贴：指令里一条定义都不带；跨文件：只带真要新建的；重放结果一样", () => {
    const w = source(), p = copyInst(w.s, w.ia);
    eq(trimClosure(w.s, p).closure!.definitions.length, 0, "全都有");
    const t = new Scene();
    eq(trimClosure(t, p).closure!.definitions.length, 3, "全没有");
    applyOp(t, pasteOp(t, copyIn(w.s, [w.ia, w.ib], w.ic)));   // 丙已经在
    const trimmed = trimClosure(t, p);
    eq(trimmed.closure!.definitions.map((d) => d.name).sort().join(""), "乙甲", "丙不带");
    eq(p.closure!.definitions.length, 3, "原载荷没动（下次贴、提示行还要用）");
    const a = t.clone(), b = t.clone();
    applyOp(a, pasteOp(a, p)); applyOp(b, pasteOp(b, trimmed));
    eq(defNames(a), defNames(b));
    eq(a.materials.map((m) => m.guid).join(), b.materials.map((m) => m.guid).join(), "材质一样");
    eq(a.layers.map((l) => l.guid).join(), b.layers.map((l) => l.guid).join(), "层一样");
  });
  it("素材导入：已有的定义不进指令", () => {
    const w = source(), doc = readCatsup(writeCatsup(documentFromScene(w.s, "源"))), t = new Scene();
    applyOp(t, pasteOp(t, copyInst(w.s, w.ia)));
    const { op } = shelfImportOp(t, doc, [w.s.def(w.a).guid]);
    assert(op.op === "batch" && op.ops[0].op === "paste" && op.ops[0].closure!.definitions.length === 0, "一条都不带");
  });
});

describe("重放：指令流按 GUID 认条目，重放出来的 GUID 和当初一样", () => {
  it("建组件 → 拷贴（闭包剪过）→ 上架 → 取下：重放不抛，全部 GUID 一样", () => {
    let s = new Scene(sceneBox(1, 1));
    const h = new History(s), k = s.brep(s.root).kernel, fp = (x: Scene) => JSON.stringify([[...x.defs.values()].map((d) => [d.guid, [...d.instances.values()].map((i) => i.guid)]), x.materials.map((m) => m.guid), x.layers.map((l) => l.guid), x.shelf.items.map((it) => [it.guid, it.ref])]);
    s = h.commit(s, { op: "makeComponent", at: rootAt(s), faces: k.faces().map((f) => faceKey(k, f.id)), edges: k.edges().map((e) => edgeKey(k, e.id)), name: "甲" }).scene;
    s = h.commit(s, { op: "addMaterial", name: "红", color: [1, 0, 0] }).scene;
    s = h.commit(s, { op: "addLayer", name: "层" }).scene;
    const inst = rootInsts(s)[0];
    s = h.commit(s, { op: "assignLayer", at: rootAt(s), instances: [inst.id], layer: s.layers[1].id }).scene;
    const p = copyInst(s, inst);
    s = h.commit(s, pasteOp(s, trimClosure(s, p))).scene;
    s = h.commit(s, { op: "shelfPut", kind: "definition", ref: s.def(inst.def).guid, folder: null, guid: mintGuid() }).scene;
    s = h.commit(s, { op: "shelfPut", kind: "material", ref: s.materials[0].guid, folder: null, guid: mintGuid() }).scene;
    s = h.commit(s, { op: "shelfTake", item: s.shelf.items[1].guid }).scene;
    eq(fp(h.replay()), fp(s), "重放 = 实时");
    eq(fp(h.stateAt(h.position())), fp(s));
  });
  it("撤销后走新分支：录音带跟着截断", () => {
    let s = new Scene();
    const h = new History(s);
    s = h.commit(s, { op: "addLayer", name: "一" }).scene;
    s = h.commit(s, { op: "addLayer", name: "二" }).scene;
    s = h.undo()!.scene;
    s = h.commit(s, { op: "addLayer", name: "三" }).scene;
    eq(h.replay().layers.map((l) => l.guid).join(), s.layers.map((l) => l.guid).join());
  });
  it("提交失败不留录音带；重放之外的铸造不受影响", () => {
    let s = new Scene();
    const h = new History(s);
    s = h.commit(s, { op: "addLayer", name: "一" }).scene;
    assert(threw(() => h.commit(s, { op: "shelfTake", item: mintGuid() })), "失败");
    eq(h.depth(), 1);
    eq(h.replay().layers.at(-1)!.guid, s.layers.at(-1)!.guid);
    assert(mintGuid() !== mintGuid(), "平时照常现铸");
  });
});

describe("贴之前查环（pasteWouldCycle）", () => {
  it("贴进自己 / 自己的子孙 = 环；别的地方不是", () => {
    const w = source(), p = copyInst(w.s, w.ia);
    assert(pasteWouldCycle(w.s, p, w.a), "甲贴进甲");
    assert(pasteWouldCycle(w.s, p, w.c), "甲贴进丙：甲里有丙");
    assert(!pasteWouldCycle(w.s, p, w.s.root));
  });
  it("闭包里的新定义引用目标已有的定义，贴进那个已有的定义 = 环（查合并之后的样子）", () => {
    const w = source(), t = new Scene();
    applyOp(t, pasteOp(t, copyIn(w.s, [w.ia, w.ib], w.ic)));   // 丙先到目标
    const cT = t.defByGuid(w.s.def(w.c).guid)!, p = copyInst(w.s, w.ia);
    assert(!t.defByGuid(w.s.def(w.a).guid), "甲在目标里还没有");
    assert(pasteWouldCycle(t, p, cT.id), "甲 → 乙 → 丙，贴进丙");
    assert(threw(() => applyOp(t.clone(), { ...pasteOp(t, p), at: { def: cT.id, group: null } } as Op)), "指令本身也拒");
  });
});

describe("提示行（pasteReport / pasteSay）", () => {
  it("别的模型来的：说新建了什么、哪些用的是本文件这版", () => {
    const w = source(), t = new Scene(), p = copyInst(w.s, w.ia);
    const b0 = pasteBefore(t, p);
    applyOp(t, pasteOp(t, p));
    const r0 = pasteReport(b0, t);
    eq(r0.createdDefs.slice().sort().join(""), "丙乙甲");
    assert(pasteSay(r0, true).includes("新建了组件"));
    assert(pasteSay(r0, true).includes("新建了材质"));
    assert(pasteSay(r0, true).includes("新建了层"));
    const b1 = pasteBefore(t, p);
    applyOp(t, pasteOp(t, p));
    const r1 = pasteReport(b1, t);
    eq(r1.createdDefs.length, 0);
    assert(pasteSay(r1, true).includes("用的是本文件这版"), pasteSay(r1, true));
  });
  it("同一个模型里贴：什么都不多说（常态）；撤销过头建回来的照样说", () => {
    const w = source(), p = copyInst(w.s, w.ia);
    const b = pasteBefore(w.s, p);
    applyOp(w.s, pasteOp(w.s, p));
    eq(pasteSay(pasteReport(b, w.s), false), "");
    const t = new Scene(), b2 = pasteBefore(t, p);
    applyOp(t, pasteOp(t, p));
    assert(pasteSay(pasteReport(b2, t), false).includes("新建了组件"));
  });
  it("名字多了只列三个", () => {
    const say = pasteSay({ reusedDefs: [], createdDefs: ["a", "b", "c", "d"], updatedDefs: [], detachedDefs: [], reusedMaterials: [], createdMaterials: [], updatedMaterials: [], createdLayers: [] }, true);
    assert(say.includes("等 4 个") && !say.includes("「d」"), say);
  });
});

describe("⑦ 素材架六条指令", () => {
  const shelf = () => { const w = source(); return { ...w, gA: w.s.def(w.a).guid, gB: w.s.def(w.b).guid, gRed: w.s.materials[w.red].guid }; };
  it("上架：组件 / 材质都能；顺序 = 放的顺序；index = 同夹第几个", () => {
    const w = shelf();
    applyOp(w.s, { op: "shelfPut", kind: "definition", ref: w.gA, folder: null, guid: mintGuid() });
    applyOp(w.s, { op: "shelfPut", kind: "material", ref: w.gRed, folder: null, guid: mintGuid() });
    applyOp(w.s, { op: "shelfPut", kind: "definition", ref: w.gB, folder: null, index: 0, guid: mintGuid() });
    eq(w.s.shelf.items.map((x) => x.ref).join(), [w.gB, w.gA, w.gRed].join());
  });
  it("上架的拒绝路：东西不在 / 已在架上 / 文件夹不在 / 身份撞了 / 模型根", () => {
    const w = shelf();
    assert(threw(() => applyOp(w.s, { op: "shelfPut", kind: "definition", ref: mintGuid(), folder: null, guid: mintGuid() })), "东西不在");
    assert(threw(() => applyOp(w.s, { op: "shelfPut", kind: "material", ref: w.gA, folder: null, guid: mintGuid() })), "这个 GUID 不是材质");
    applyOp(w.s, { op: "shelfPut", kind: "definition", ref: w.gA, folder: null, guid: "11111111-1111-4111-8111-111111111111" });
    assert(rejected(() => applyOp(w.s, { op: "shelfPut", kind: "definition", ref: w.gA, folder: null, guid: mintGuid() })).includes("已经在素材架上"), "不静默");
    assert(rejected(() => applyOp(w.s, { op: "shelfPut", kind: "definition", ref: w.gB, folder: mintGuid(), guid: mintGuid() })).includes("文件夹"), "文件夹不在");
    assert(rejected(() => applyOp(w.s, { op: "shelfPut", kind: "definition", ref: w.gB, folder: null, guid: "11111111-1111-4111-8111-111111111111" })).length > 0, "身份撞了");
    assert(rejected(() => applyOp(w.s, { op: "shelfPut", kind: "definition", ref: w.s.def(w.s.root).guid, folder: null, guid: mintGuid() })).includes("最外一层"), "模型根");
    eq(w.s.shelf.items.length, 1, "拒绝的都没进");
  });
  it("取下：只去引用，条目还在；不在架上 = 拒", () => {
    const w = shelf();
    applyOp(w.s, { op: "shelfPut", kind: "definition", ref: w.gA, folder: null, guid: mintGuid() });
    const item = w.s.shelf.items[0].guid;
    applyOp(w.s, { op: "shelfTake", item });
    eq(w.s.shelf.items.length, 0);
    assert(w.s.defByGuid(w.gA), "定义还在");
    assert(threw(() => applyOp(w.s, { op: "shelfTake", item })), "拿不存在的 = 拒");
  });
  it("挪：换文件夹 + 同夹排序；文件夹不在 = 拒且不动", () => {
    const w = shelf();
    applyOp(w.s, { op: "shelfFolderAdd", name: "角色", parent: null, guid: mintGuid() });
    const folder = w.s.shelf.folders[0].guid;
    applyOp(w.s, { op: "shelfPut", kind: "definition", ref: w.gA, folder: null, guid: mintGuid() });
    applyOp(w.s, { op: "shelfPut", kind: "definition", ref: w.gB, folder: null, guid: mintGuid() });
    applyOp(w.s, { op: "shelfPut", kind: "material", ref: w.gRed, folder, guid: mintGuid() });
    const [iA, iB] = w.s.shelf.items;
    applyOp(w.s, { op: "shelfMove", item: iB.guid, folder: null, index: 0 });
    eq(w.s.shelf.items.filter((x) => x.folder === null).map((x) => x.ref).join(), [w.gB, w.gA].join(), "同夹排序");
    applyOp(w.s, { op: "shelfMove", item: iA.guid, folder, index: 0 });
    eq(w.s.shelf.items.filter((x) => x.folder === folder).map((x) => x.ref).join(), [w.gA, w.gRed].join(), "换文件夹、排到第 0 个");
    assert(rejected(() => applyOp(w.s, { op: "shelfMove", item: iA.guid, folder: mintGuid() })).length > 0);
    eq(w.s.shelf.items.find((x) => x.guid === iA.guid)?.folder, folder, "拒了没动");
    assert(threw(() => applyOp(w.s, { op: "shelfMove", item: mintGuid(), folder: null })), "条目不在");
  });
  it("文件夹：建 / 改名 / 删；不能空名、父不在、删非空、身份重复（这是唯一能造环的路）", () => {
    const w = shelf();
    applyOp(w.s, { op: "shelfFolderAdd", name: "外", parent: null, guid: "22222222-2222-4222-8222-222222222222" });
    const outer = w.s.shelf.folders[0].guid;
    applyOp(w.s, { op: "shelfFolderAdd", name: "里", parent: outer, guid: mintGuid() });
    const inner = w.s.shelf.folders[1].guid;
    assert(rejected(() => applyOp(w.s, { op: "shelfFolderAdd", name: "  ", parent: null, guid: mintGuid() })).length > 0, "空名");
    assert(rejected(() => applyOp(w.s, { op: "shelfFolderAdd", name: "x", parent: mintGuid(), guid: mintGuid() })).length > 0, "父不在");
    assert(rejected(() => applyOp(w.s, { op: "shelfFolderAdd", name: "x", parent: inner, guid: outer })).length > 0, "把外层的身份挂到里层下面 = 环，拒");
    applyOp(w.s, { op: "shelfFolderRename", folder: inner, name: "里面" });
    eq(w.s.shelf.folders[1].name, "里面");
    assert(rejected(() => applyOp(w.s, { op: "shelfFolderRename", folder: inner, name: "" })).length > 0, "空名");
    assert(threw(() => applyOp(w.s, { op: "shelfFolderRename", folder: mintGuid(), name: "x" })), "不在");
    assert(rejected(() => applyOp(w.s, { op: "shelfFolderRemove", folder: outer })).includes("先搬空"), "里面有子文件夹");
    applyOp(w.s, { op: "shelfPut", kind: "definition", ref: w.gA, folder: inner, guid: mintGuid() });
    assert(rejected(() => applyOp(w.s, { op: "shelfFolderRemove", folder: inner })).includes("先搬空"), "里面有条目");
    applyOp(w.s, { op: "shelfTake", item: w.s.shelf.items[0].guid });
    applyOp(w.s, { op: "shelfFolderRemove", folder: inner });
    applyOp(w.s, { op: "shelfFolderRemove", folder: outer });
    eq(w.s.shelf.folders.length, 0);
    assert(threw(() => applyOp(w.s, { op: "shelfFolderRemove", folder: outer })), "已经没了");
  });
  it("撤销 / 重做：骨架级记录，架子回去，GUID 不重铸", () => {
    const w = shelf();
    let s = w.s;
    const h = new History(s);
    const op: Op = { op: "shelfPut", kind: "definition", ref: w.gA, folder: null, guid: mintGuid() };
    eq(opTier(s, op).tier, "skeleton");
    for (const o of [{ op: "shelfTake", item: "x" }, { op: "shelfMove", item: "x", folder: null }, { op: "shelfFolderAdd", name: "x", parent: null, guid: mintGuid() }, { op: "shelfFolderRename", folder: "x", name: "x" }, { op: "shelfFolderRemove", folder: "x" }] as Op[]) eq(opTier(s, o).tier, "skeleton");
    s = h.commit(s, op).scene;
    const g = s.shelf.items[0].guid;
    s = h.undo()!.scene;
    eq(s.shelf.items.length, 0);
    s = h.redo(s)!.scene;
    eq(s.shelf.items[0].guid, g, "不重铸");
    eq(s.def(s.root).guid, w.s.def(w.s.root).guid);
  });
  it("存盘再开：条目顺序、文件夹、身份都在", () => {
    const w = shelf();
    applyOp(w.s, { op: "shelfFolderAdd", name: "角色", parent: null, guid: mintGuid() });
    const folder = w.s.shelf.folders[0].guid;
    applyOp(w.s, { op: "shelfPut", kind: "definition", ref: w.gB, folder, guid: mintGuid() });
    applyOp(w.s, { op: "shelfPut", kind: "material", ref: w.gRed, folder: null, guid: mintGuid() });
    applyOp(w.s, { op: "shelfPut", kind: "definition", ref: w.gA, folder, guid: mintGuid() });
    const back = reopen(w.s);
    eq(JSON.stringify(back.shelf.items), JSON.stringify(w.s.shelf.items));
    eq(JSON.stringify(back.shelf.folders), JSON.stringify(w.s.shelf.folders));
  });
  it("describeOp 六条都有摘要", () => {
    for (const o of [{ op: "shelfPut", kind: "material", ref: "abcdef", folder: null, guid: mintGuid() }, { op: "shelfTake", item: "abcdef" }, { op: "shelfMove", item: "abcdef", folder: null }, { op: "shelfFolderAdd", name: "x", parent: null, guid: mintGuid() }, { op: "shelfFolderRename", folder: "abcdef", name: "x" }, { op: "shelfFolderRemove", folder: "abcdef" }] as Op[]) assert(describeOp(o).startsWith("shelf"), describeOp(o));
  });
  it("锁着的也能上架（素材架不碰几何）；纯合并不碰锁；真要摆东西照旧看锁", () => {
    const w = shelf();
    eq(opTouchesLocked(w.s, { op: "shelfPut", kind: "definition", ref: w.gA, folder: null, guid: mintGuid() }, () => true), false);
    eq(opTouchesLocked(w.s, { op: "shelfTake", item: "x" }, () => true), false);
    eq(opTouchesLocked(w.s, { op: "paste", at: rootAt(w.s), closure: { definitions: [], layers: [], roots: [] } }, () => true), false, "纯合并");
    eq(opTouchesLocked(w.s, pasteOp(w.s, copyInst(w.s, w.ia)), () => true), true, "有摆放");
  });
});

describe("⑧ 生死算上架子", () => {
  it("架上的和它够得着的都活着；清理拒绝；取下后变孤儿才能清", () => {
    const w = source(), t = new Scene(), a = w.s.def(w.a).guid;
    applyOp(t, pasteOp(t, copyInst(w.s, w.ia)));
    const aId = t.defByGuid(a)!.id, cId = t.defByGuid(w.s.def(w.c).guid)!.id;
    applyOp(t, { op: "eraseInstance", def: t.root, instance: rootInsts(t)[0].id });
    assert(!liveDefs(t).has(aId), "没摆 = 孤儿");
    eq(orphanDefs(census(t)).length, 3, "连同里面的");
    applyOp(t, { op: "shelfPut", kind: "definition", ref: a, folder: null, guid: mintGuid() });
    assert(liveDefs(t).has(aId) && liveDefs(t).has(cId), "架上的和它里面的都活着");
    eq(orphanDefs(census(t)).length, 0);
    assert(census(t).defs.find((d) => d.def === aId)!.shelved, "清点里标着");
    assert(threw(() => applyOp(t, { op: "purgeDefs", defs: [aId] })), "上架的不许清");
    applyOp(t, { op: "shelfTake", item: t.shelf.items[0].guid });
    eq(orphanDefs(census(t)).length, 3, "取下 = 孤儿");
    applyOp(t, { op: "purgeDefs", defs: orphanDefs(census(t)) });
    eq(t.defs.size, 1);
  });
  it("架上组件用的材质不算没人用；单独上架的材质也不算", () => {
    const w = source(), s = w.s, a = s.def(w.a).guid;
    applyOp(s, { op: "eraseInstance", def: s.root, instance: w.ia.id });
    const red = s.materials[w.red].guid, idle = s.materials.findIndex((m) => m.name === "没人用");
    assert(census(s).materials.find((m) => m.guid === red)!.orphanFaces > 0, "没上架：红只在孤儿里");
    applyOp(s, { op: "shelfPut", kind: "definition", ref: a, folder: null, guid: mintGuid() });
    assert(census(s).materials.find((m) => m.guid === red)!.faces > 0, "上架后算活着");
    assert(unusedMaterials(census(s)).includes(idle));
    applyOp(s, { op: "shelfPut", kind: "material", ref: s.materials[idle].guid, folder: null, guid: mintGuid() });
    assert(!unusedMaterials(census(s)).includes(idle), "材质上架 = 不算没人用");
  });
  it("资源页的顺序表：文件夹树展开、缩进；手改文件成环也不许看不见", () => {
    const w = source(), s = w.s, a = s.def(w.a).guid, gRed = s.materials[w.red].guid;
    applyOp(s, { op: "shelfFolderAdd", name: "外", parent: null, guid: mintGuid() });
    const outer = s.shelf.folders[0].guid;
    applyOp(s, { op: "shelfFolderAdd", name: "里", parent: outer, guid: mintGuid() });
    const inner = s.shelf.folders[1].guid;
    applyOp(s, { op: "shelfPut", kind: "definition", ref: a, folder: inner, guid: mintGuid() });
    applyOp(s, { op: "shelfPut", kind: "material", ref: gRed, folder: null, guid: mintGuid() });
    s.shelf.items.push({ guid: mintGuid(), kind: "texture", ref: mintGuid(), folder: null });
    const rows = shelfRows(s);
    eq(rows.map((r) => `${r.depth}${r.name}`).join(), "0外,1里,2甲,0红,0（更新版的素材：texture）");
    eq(rows[2].def, w.a); eq(rows[3].material, w.red); eq(rows[2].type, "definition");
    s.shelf.folders[0].parent = inner;   // 手改的文件：外 ⇄ 里 成环
    const looped = shelfRows(s);
    assert(looped.some((r) => r.name === "甲") && looped.some((r) => r.name === "外") && looped.some((r) => r.name === "里"), "都还看得见");
  });
});

describe("⑨ 太新的架子", () => {
  const tooNew = () => {
    const w = source(), doc = documentFromScene(w.s, "t"), comp = doc.definitions.find((d) => d.name === "甲")!;
    doc.shelf = { folders: [], items: [{ guid: mintGuid(), kind: "definition", ref: comp.guid, folder: null }], extra: {} };
    const { json, bin } = decodeGlb(writeCatsup(doc)) as unknown as { json: any; bin: Uint8Array };   // eslint-disable-line @typescript-eslint/no-explicit-any
    json.extensions.CATSUP_shelf.version = 2; json.extensions.CATSUP_shelf.future = { x: 1 };
    const back = readCatsup(encodeGlb(json, bin));
    return { w, back, raw: JSON.stringify(json.extensions.CATSUP_shelf), s: sceneFromDocument(back) };
  };
  it("读进来：架子空、标着冻结；六条指令和清理都拒；克隆也带着", () => {
    const { s, w } = tooNew(), a = w.s.def(w.a).guid;
    assert(s.shelfFrozen, "标着"); eq(s.shelfFrozen!.major, 2); eq(s.shelf.items.length, 0);
    assert(s.clone().shelfFrozen && s.cloneSkeleton().shelfFrozen, "撤销换场景不丢");
    const f = mintGuid();
    for (const o of [{ op: "shelfPut", kind: "definition", ref: a, folder: null, guid: mintGuid() }, { op: "shelfTake", item: f }, { op: "shelfMove", item: f, folder: null }, { op: "shelfFolderAdd", name: "x", parent: null, guid: mintGuid() }, { op: "shelfFolderRename", folder: f, name: "x" }, { op: "shelfFolderRemove", folder: f }] as Op[]) assert(rejected(() => applyOp(s, o)).includes("更新版"), describeOp(o));
    assert(rejected(() => applyOp(s, { op: "purgeDefs", defs: [] })).includes("清理"), "清理会删到看不见的架上的东西");
    assert(rejected(() => applyOp(s, { op: "purgeMaterials", materials: [] })).includes("清理"));
  });
  it("存盘：原字节带回，不被空架子盖掉", () => {
    const { s, back, raw } = tooNew();
    const { json } = decodeGlb(writeCatsup(documentFromScene(s, "t", back))) as unknown as { json: any };   // eslint-disable-line @typescript-eslint/no-explicit-any
    eq(JSON.stringify(json.extensions.CATSUP_shelf), raw, "一个字节不差");
    assert(json.extensionsUsed.includes("CATSUP_shelf"));
  });
  it("本版的架子不冻：OpRejected 不是 ShearRejected 的子类、反过来是（commit 按基类进提示行）", () => {
    assert(new ShearRejected("x") instanceof OpRejected);
    assert(!sceneFromDocument(readCatsup(writeCatsup(documentFromScene(new Scene(), "t")))).shelfFrozen);
  });
});

describe("⑩ 素材导入别的 .catsup", () => {
  const doc0 = () => { const w = source(), doc = readCatsup(writeCatsup(documentFromScene(w.s, "源"))); return { w, doc }; };
  it("抠闭包：挑中的往下走到底 + 用到的材质 / 层；根不算", () => {
    const { w, doc } = doc0(), p = payloadFromDocument(doc, [w.s.def(w.a).guid, doc.root.guid, mintGuid()]);
    eq(p.closure!.definitions.map((d) => d.name).sort().join(""), "丙乙甲");
    eq(p.closure!.roots!.join(), w.s.def(w.a).guid, "不认识的 GUID / 根不算挑中");
    eq(p.materials!.map((m) => m.name).sort().join(""), "红蓝");
    eq(p.closure!.layers.map((l) => l.name).join(), "结构");
    assert(!p.instances, "没有摆放");
    assert(transferEmpty(p), "extract 意义上是空的，paste 照样接");
  });
  it("候选：根不列；没起名的不列、数出来；摆了几份", () => {
    const { w } = doc0();
    w.s.mintDef("a3f2", sceneBox(1, 1));
    const doc = readCatsup(writeCatsup(documentFromScene(w.s, "源"))), c = importCandidates(doc);
    eq(c.rows.map((r) => r.name).sort().join(""), "丙乙甲");
    eq(c.unnamed, 1);
    eq(c.rows.find((r) => r.name === "甲")!.placed, 1);
    eq(c.rows[0].kind, "brep");
  });
  it("纯合并 + 上架：一步撤销；场景里没多摆东西", () => {
    const { w, doc } = doc0();
    let t = new Scene(sceneBox(2, 2));
    const h = new History(t), a = w.s.def(w.a).guid, { op, already } = shelfImportOp(t, doc, [a]);
    eq(already, 0);
    t = h.commit(t, op).scene;
    eq(rootInsts(t).length, 0, "不摆");
    eq(defNames(t), "丙乙甲");
    eq(t.shelf.items.map((x) => x.ref).join(), a);
    eq(orphanDefs(census(t)).length, 0, "架上的和它里面的都活着");
    t = h.undo()!.scene;
    eq(t.defs.size, 1); eq(t.shelf.items.length, 0); eq(t.materials.length, 0);
    t = h.redo(t)!.scene;
    eq(t.shelf.items.length, 1);
  });
  it("目标已有同一个组件：用目标那条；已在架上的不重复放（不会整步被拒）", () => {
    const { w, doc } = doc0(), t = new Scene(), a = w.s.def(w.a).guid, b = w.s.def(w.b).guid;
    applyOp(t, pasteOp(t, copyInst(w.s, w.ia)));
    t.defByGuid(a)!.name = "目标版";
    applyOp(t, { op: "shelfPut", kind: "definition", ref: a, folder: null, guid: mintGuid() });
    const { op, already } = shelfImportOp(t, doc, [a, b]);
    eq(already, 1);
    applyOp(t, op);
    eq(t.defByGuid(a)?.name, "目标版");
    eq(t.shelf.items.map((x) => x.ref).join(), [a, b].join());
  });
  it("挑中了已有的 A 和新的 B（A 的旧版不引用 B）：B 照样建出来（挑中的是根）", () => {
    const { w } = doc0(), t = new Scene(), a = w.s.def(w.a).guid;
    applyOp(t, pasteOp(t, copyInst(w.s, w.ia)));
    const d = w.s.mintDef("新丁", sceneBox(1, 1));
    w.s.mintInstance(w.a, null, d.id, IDENTITY);
    const doc = readCatsup(writeCatsup(documentFromScene(w.s, "源")));
    const n = t.defs.size;
    applyOp(t, shelfImportOp(t, doc, [a]).op);
    eq(t.defs.size, n, "只挑甲：丁不建");
    applyOp(t, shelfImportOp(t, doc, [d.guid]).op);
    eq(t.defs.size, n + 1, "挑了丁：建");
  });
  it("太新的架子：导入整步拒绝，什么都不进", () => {
    const { w, doc } = doc0(), s = new Scene();
    s.shelfFrozen = { major: 2, minor: 0, patch: 0 };
    let t = s;
    const h = new History(t);
    let msg = "";
    try { t = h.commit(t, shelfImportOp(t, doc, [w.s.def(w.a).guid]).op).scene; } catch (e) { msg = String((e as { cause?: unknown }).cause); t = (e as { restored: Scene }).restored; }
    assert(msg.includes("更新版"), msg);
    eq(t.defs.size, 1, "快照装回去了"); eq(t.materials.length, 0);
  });
});

describe("⑪ 构造器收根的身份", () => {
  it("new Scene(kernel, guid)；读写不变", () => {
    const g = mintGuid(), s = new Scene(sceneBox(1, 1), g);
    eq(s.def(s.root).guid, g);
    const doc = documentFromScene(s, "t");
    eq(sceneFromDocument(doc).def(s.root).guid, g);
    assert(new Scene().def(new Scene().root).guid !== "", "不给 = 现铸");
    eq(doc.root.guid, g);
  });
});

describe("打开文件时要说的话（format-notes）", () => {
  it("两种素材架情况各一句；太新的不说「能看」", () => {
    const say = formatNotesSay({ newerMinor: [], newerPatch: [], shelfTooNew: { major: 2, minor: 1, patch: 0 }, danglingShelfRefs: 3 } as never);
    eq(say.length, 2);
    assert(say[0].includes("shelf 2.1.0") && say[0].includes("原样带回") && !say[0].includes("只能看"), "太新的架子本版读不出，不许说能看");
    assert(say[1].includes("3 格") && say[1].includes("丢掉"));
    eq(formatNotesSay({ newerMinor: [], newerPatch: [] } as never).length, 0);
  });
});
