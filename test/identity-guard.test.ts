// 身份地基守卫（计划书 ai-docs/20261104-identity-foundation-plan.md §4；家规「文件里条目的身份 = GUID，不用序号」）。created 2026-11-04 by Claude Opus 5.5
// ① 文件里每个条目都有合法 GUID，引用全是 GUID ② 读写、撤销重做不重铸；动词不换身份 ③ 老文件迁移（序号 → GUID、对照表、坏数据照旧拒开）④ 对照表：槽号是代号 ⑤ 素材架读写 ⑥ 定义的迁移没拿到材质表就抛（不许静默清槽）。
import { describe, it, eq, assert } from "./runner.mjs";
const { readFileSync } = (await import("node:fs" as string)) as { readFileSync(p: URL, e: string): string };   // test/*.ts 不拉 @types/node（同 orphan-defs.test.ts）
import { Kernel } from "../src/kernel/kernel.ts";
import { Scene } from "../src/scene/scene.ts";
import { History } from "../src/editor/history.ts";
import { applyOp, faceKey, edgeKey } from "../src/editor/ops.ts";
import { translation } from "../src/scene/xform.ts";
import { DEFAULT_LAYER_GUID, decodeGlb, documentFromScene, isGuid, mintGuid, newDocument, readCatsup, sceneFromDocument, writeCatsup, writeGltfModel, FormatTooNewError } from "../src/format/index.ts";
import { migrateExtension } from "../src/format/migrate/index.ts";
import { encodeGlb } from "../src/format/glb.ts";
import { SCENE_DOCS, downgradeDefinitionsToV6, sceneBox, sceneFingerprint } from "./format-scenes.ts";
import { listCorpusDirs, listFixtures, readFixture } from "./fixtures/format/fixtures.mjs";

const at = (s: Scene) => ({ def: s.root, group: null });
const jsonOf = (b: Uint8Array) => decodeGlb(b) as { json: any; bin: Uint8Array };
const roundtrip = (s: Scene): Scene => sceneFromDocument(readCatsup(writeCatsup(documentFromScene(s, "t"))));
/** 一个有组件、组、实例、材质、层的场景。 */
function rich(): Scene {
  let s = new Scene(sceneBox(1, 1));
  const k = () => s.kernelOf(at(s));
  s = applyOp(s, { op: "addMaterial", name: "红", color: [1, 0, 0] }).scene;
  s = applyOp(s, { op: "paintFaces", at: at(s), faces: [faceKey(k(), k().faces()[0].id)], material: 0 }).scene;
  s = applyOp(s, { op: "addLayer", name: "墙" }).scene;
  s = applyOp(s, { op: "makeGroup", at: at(s), faces: [faceKey(k(), k().faces()[0].id)], edges: [] }).scene;
  s = applyOp(s, { op: "makeComponent", at: at(s), faces: k().faces().map((f) => faceKey(k(), f.id)), edges: k().edges().map((e) => edgeKey(k(), e.id)), name: "块" }).scene;
  const comp = [...s.def(s.root).instances.values()][0].def;
  s = applyOp(s, { op: "placeInstance", at: at(s), definition: comp, xform: translation({ x: 5, y: 0, z: 0 }) }).scene;
  return s;
}
/** 全部身份（按条目种类排好，比两次用）。 */
function guids(s: Scene): string {
  const out: string[] = [`mat ${s.materials.map((m) => m.guid).join()}`, `layer ${s.layers.map((l) => l.guid).join()}`];
  for (const d of [...s.defs.values()].sort((a, b) => a.guid.localeCompare(b.guid))) {
    const b = d.body;
    out.push(`def ${d.guid} inst ${[...d.instances.values()].map((i) => i.guid).join()} groups ${b.kind === "brep" ? [...b.groups.values()].map((g) => g.guid).join() : ""}`);
  }
  return out.join("\n");
}

describe("身份守卫：文件里只有 GUID", () => {
  it("每个条目都有合法 GUID；root、实例的 definition / parent、组的 parent、槽表、节点扩展都是 GUID", () => {
    const { json } = jsonOf(writeCatsup(documentFromScene(rich(), "t")));
    const defs = json.extensions.CATSUP_definitions;
    const known = new Set(defs.list.map((d: any) => { assert(isGuid(d.guid), "定义有 GUID"); return d.guid; }));
    assert(known.has(defs.root), "root 是 GUID 且在表里");
    const mats = new Set(json.materials.map((m: any) => { const g = m.extensions.CATSUP_material.guid; assert(isGuid(g), "材质有 GUID"); return g; }));
    for (const l of json.extensions.CATSUP_document.layers) assert(isGuid(l.guid), "层有 GUID");
    let nInst = 0, nGroup = 0, nSlot = 0;
    for (const d of defs.list) {
      const gs = new Set(d.groups.map((g: any) => g.guid));
      for (const g of d.groups) { nGroup++; assert(isGuid(g.guid), "组有 GUID"); assert(!("id" in g), "组没有序号"); assert(g.parent === null || gs.has(g.parent), "组的 parent 是 GUID"); }
      for (const i of d.instances) { nInst++; assert(isGuid(i.guid), "实例有 GUID"); assert(!("id" in i), "实例没有序号"); assert(known.has(i.definition), "实例的 definition 是 GUID"); assert(i.parent === null || gs.has(i.parent), "实例的 parent 是 GUID"); }
      for (const m of d.materialSlots) { nSlot++; assert(m === null || mats.has(m), "槽表的值是材质 GUID"); }
    }
    assert(nInst >= 2 && nGroup >= 1 && nSlot >= 1, `样本要覆盖到（实例 ${nInst} 组 ${nGroup} 槽 ${nSlot}）`);
    for (const n of json.nodes) assert(known.has(n.extensions.CATSUP_instance.definition), "节点扩展的 definition 也是 GUID");
  });
  it("默认层全家一个身份（跨文件才能合回默认层）；别的层各有各的", () => {
    const a = new Scene(), b = new Scene();
    eq(a.layers[0].guid, DEFAULT_LAYER_GUID); eq(b.layers[0].guid, DEFAULT_LAYER_GUID);
    const s = applyOp(new Scene(), { op: "addLayer", name: "x" }).scene;
    assert(s.layers[1].guid !== DEFAULT_LAYER_GUID && isGuid(s.layers[1].guid), "新层现铸");
  });
  it("写入器源码不再按下标引用（棘轮：doc.definitions[inst.definition]、c in doc.materials 这类写法不许回来）", () => {
    const src = readFileSync(new URL("../src/format/write.ts", import.meta.url), "utf8");
    for (const bad of ["doc.definitions[inst.definition]", "in doc.materials", "root: doc.rootIndex"]) assert(!src.includes(bad), `write.ts 里又出现 ${bad}`);
  });
  it("mintGuid：没有 randomUUID（局域网 http 预览）也铸得出合法 v4", () => {
    const orig = Object.getOwnPropertyDescriptor(globalThis.crypto.constructor.prototype, "randomUUID")!;
    const set = (v: unknown): void => { Object.defineProperty(globalThis.crypto, "randomUUID", { value: v, configurable: true }); };
    try { set(undefined); for (let i = 0; i < 50; i++) assert(isGuid(mintGuid()), "后备路径铸的也合法"); }
    finally { delete (globalThis.crypto as unknown as Record<string, unknown>).randomUUID; void orig; }
    assert(isGuid(mintGuid()), "恢复之后照常");
  });
});

describe("不重铸守卫", () => {
  it("读 → 写 → 再读：GUID 逐条相等；再写逐字节一致", () => {
    const s = rich(), a = writeCatsup(documentFromScene(s, "t"));
    const s2 = sceneFromDocument(readCatsup(a));
    eq(guids(s2), guids(s), "读回来逐条相等");
    const b = writeCatsup(documentFromScene(s2, "t"));
    eq(guids(sceneFromDocument(readCatsup(b))), guids(s), "再读还相等");
    assert(a.byteLength === b.byteLength && a.every((x, i) => x === b[i]), "再写逐字节一致");
  });
  it("实例在文件里的顺序保住（同级顺序 = 有序表）", () => {
    const s = rich(), order = (x: Scene): string => [...x.def(x.root).instances.values()].map((i) => i.guid).join();
    eq(order(roundtrip(s)), order(s));
  });
  it("撤销到底、重做到底：GUID 不变（重做是交换，不重跑动词）", () => {
    let s = new Scene(sceneBox(1, 1));
    const h = new History(s), k = () => s.kernelOf(at(s));
    const step = (op: Parameters<typeof applyOp>[1]): void => { s = h.commit(s, op).scene; };
    step({ op: "addMaterial", name: "红", color: [1, 0, 0] });
    step({ op: "addLayer", name: "墙" });
    step({ op: "makeGroup", at: at(s), faces: [faceKey(k(), k().faces()[0].id)], edges: [] });
    step({ op: "makeComponent", at: at(s), faces: k().faces().map((f) => faceKey(k(), f.id)), edges: k().edges().map((e) => edgeKey(k(), e.id)), name: "块" });
    const want = guids(s);
    for (let r = h.undo(); r; r = h.undo()) s = r.scene;
    eq(s.materials.length, 0, "撤到头");
    for (let r = h.redo(s); r; r = h.redo(s)) s = r.scene;
    eq(guids(s), want, "重做回来逐条相等");
  });
  it("克隆保身份（撤销记录靠它）", () => {
    const s = rich();
    eq(guids(s.clone()), guids(s), "clone");
    eq(guids(s.cloneSkeleton()), guids(s), "cloneSkeleton");
  });
  it("改名 / 挪 / 换种类不换身份；做成唯一 = 新定义新身份，实例身份不变", () => {
    let s = rich();
    const inst = [...s.def(s.root).instances.values()][0], oldDef = inst.def, defGuid = s.def(oldDef).guid, instGuid = inst.guid;   // 动词原地改实例对象：先记下来
    s = applyOp(s, { op: "rename", at: at(s), def: oldDef, name: "新名字" }).scene;
    s = applyOp(s, { op: "transformInstance", def: s.root, instance: inst.id, xform: translation({ x: 9, y: 0, z: 0 }) }).scene;
    eq(s.def(oldDef).guid, defGuid, "改名不换定义身份");
    eq(s.def(s.root).instances.get(inst.id)!.guid, instGuid, "挪不换实例身份");
    s = applyOp(s, { op: "castDefinition", def: oldDef, to: "mesh" }).scene;
    eq(s.def(oldDef).guid, defGuid, "换种类不换定义身份");
    s = applyOp(s, { op: "makeUnique", def: s.root, instance: inst.id }).scene;
    const after = s.def(s.root).instances.get(inst.id)!;
    eq(after.guid, instGuid, "做成唯一：实例身份不变");
    assert(s.def(after.def).guid !== defGuid, "做成唯一：定义是新身份");
    eq(s.def(oldDef).guid, defGuid, "原定义身份不变");
  });
});

describe("老文件（definitions 6.x → 7）", () => {
  it("冻结语料里每个 7 之前的样本：引用都换成 GUID、指得上", () => {
    let n = 0;
    for (const v of listCorpusDirs()) for (const f of listFixtures(v)) {
      const doc = readCatsup(readFixture(v, f));
      const defs = new Set(doc.definitions.map((d) => { assert(isGuid(d.guid), `${v}/${f} 定义 GUID`); return d.guid; }));
      const mats = new Set(doc.materials.map((m) => m.guid));
      eq(doc.root, doc.definitions[doc.rootIndex], `${v}/${f} root`);
      for (const d of doc.definitions) {
        const gs = new Set(d.groups.map((g) => g.guid));
        for (const g of d.groups) assert(g.parent === null || gs.has(g.parent), `${v}/${f} 组 parent`);
        for (const i of d.instances) { assert(defs.has(i.definition), `${v}/${f} 实例 definition`); assert(i.parent === null || gs.has(i.parent), `${v}/${f} 实例 parent`); }
        for (const m of d.materialSlots) assert(m === null || mats.has(m), `${v}/${f} 槽表`);
      }
      n++;
    }
    assert(n > 50, `语料要跑到（${n}）`);
  });
  it("迁移语义：6.x 形状读回来 = 同一个场景（面上的槽号、组的父子、实例挂在哪个组都对得上）", () => {
    for (const [name, make] of Object.entries(SCENE_DOCS)) {
      const s = make(), { json, bin } = jsonOf(writeCatsup(documentFromScene(s, name)));
      downgradeDefinitionsToV6(json);
      eq(sceneFingerprint(sceneFromDocument(readCatsup(encodeGlb(json, bin)))), sceneFingerprint(make()), `${name}：老形状读回来指纹一致`);
    }
  });
  it("坏数据照旧拒开：实例指向不存在的定义（下标越界）", () => {
    const { json, bin } = jsonOf(writeCatsup(documentFromScene(rich(), "t")));
    downgradeDefinitionsToV6(json, (d) => { d.list[d.root].instances[0].definition = 99; });
    let msg = ""; try { readCatsup(encodeGlb(json, bin)); } catch (e) { msg = String(e); }
    assert(msg.includes("references a missing definition"), `要拒开：${msg}`);
  });
  it("槽表里越界的材质下标 = 这一槽没材质，占位不压缩（面上的代号指着位置）", () => {
    const { json, bin } = jsonOf(writeCatsup(documentFromScene(rich(), "t")));
    downgradeDefinitionsToV6(json, (d) => { d.list[d.root].materialSlots = [99, 0]; });
    const doc = readCatsup(encodeGlb(json, bin));
    eq(doc.root.materialSlots.length, 2, "两槽都在");
    eq(doc.root.materialSlots[0], null, "越界 = null");
    eq(doc.root.materialSlots[1], doc.materials[0].guid, "第二槽对上材质");
  });
  it("定义 6→7 的迁移没拿到材质表就抛（不许静默把槽表清成 null）", () => {
    const { json } = jsonOf(writeCatsup(documentFromScene(rich(), "t")));
    downgradeDefinitionsToV6(json);
    let msg = ""; try { migrateExtension("CATSUP_definitions", json.extensions.CATSUP_definitions); } catch (e) { msg = String(e); }
    assert(msg.includes("materialGuids"), `要抛：${msg}`);
  });
  it("没动过的老文件读两次，内容语义一样（GUID 现铸，存了才定）", () => {
    const v = (listCorpusDirs() as string[]).find((t) => t === "6")!, f = (listFixtures(v) as string[]).find((x) => x.startsWith("grouped"))!;
    const a = sceneFromDocument(readCatsup(readFixture(v, f))), b = sceneFromDocument(readCatsup(readFixture(v, f)));
    eq(sceneFingerprint(a), sceneFingerprint(b), "语义一样");
    assert(a.def(a.root).guid !== b.def(b.root).guid, "身份是现铸的");
  });
  it("definitions 比本版新 → 拒开，原文报版本", () => {
    const { json, bin } = jsonOf(writeCatsup(documentFromScene(rich(), "t")));
    json.extensions.CATSUP_definitions.version = 8;
    let e: unknown; try { readCatsup(encodeGlb(json, bin)); } catch (x) { e = x; }
    assert(e instanceof FormatTooNewError, "FormatTooNewError");
  });
});

describe("导出不受影响", () => {
  it("只导选中的按定义的 GUID 找；找不到的跳过", () => {
    const doc = documentFromScene(rich(), "t"), comp = doc.definitions.find((d) => d !== doc.root)!;
    const nameOf = (only: { definition: string }[]) => jsonOf(writeGltfModel(doc, { textures: false, lines: false, only: only.map((o) => ({ ...o, xform: translation({ x: 0, y: 0, z: 0 }), name: "那一份" })) })).json.nodes.length;
    assert(nameOf([{ definition: comp.guid }]) >= 2, "根 + 那一份");
    eq(nameOf([{ definition: mintGuid() }]), 1, "找不到 = 只有根节点");
  });
});

describe("素材架 CATSUP_shelf 1.0", () => {
  const shelved = () => {
    const s = rich(), doc = documentFromScene(s, "t"), comp = doc.definitions.find((d) => d !== doc.root)!;
    const folder = mintGuid();
    doc.shelf = { folders: [{ guid: folder, name: "角色", parent: null }], items: [{ guid: mintGuid(), kind: "definition", ref: comp.guid, folder }, { guid: mintGuid(), kind: "material", ref: doc.materials[0].guid, folder: null }], extra: {} };
    return { doc, comp };
  };
  it("没有架子 = 不写这个扩展", () => {
    const { json } = jsonOf(writeCatsup(newDocument(new Kernel().toBrep(), "t")));
    assert(!("CATSUP_shelf" in json.extensions), "空的不写"); assert(!json.extensionsUsed.includes("CATSUP_shelf"), "不进 extensionsUsed");
  });
  it("读写往返、顺序保住、过场景层也保住", () => {
    const { doc } = shelved();
    const back = readCatsup(writeCatsup(doc));
    eq(JSON.stringify(back.shelf!.items), JSON.stringify(doc.shelf!.items), "条目逐字");
    eq(JSON.stringify(back.shelf!.folders), JSON.stringify(doc.shelf!.folders), "文件夹逐字");
    const again = documentFromScene(sceneFromDocument(back), "t", back);
    eq(JSON.stringify(again.shelf!.items), JSON.stringify(doc.shelf!.items), "过场景层不丢");
    assert(jsonOf(writeCatsup(doc)).json.extensionsUsed.includes("CATSUP_shelf"), "进 extensionsUsed");
  });
  it("引用悬空 = 丢掉那一格、记一笔，不猜不造；文件夹悬空 = 回顶层", () => {
    const { doc } = shelved();
    doc.shelf!.items.push({ guid: mintGuid(), kind: "definition", ref: mintGuid(), folder: mintGuid() });
    const back = readCatsup(writeCatsup(doc));
    eq(back.shelf!.items.length, 2, "悬空那格丢掉");
    eq(back.readNotes!.danglingShelfRefs, 1, "记一笔");
  });
  it("未知键 / 未知种类原样带回（更新的版本写的）", () => {
    const { doc } = shelved();
    doc.shelf!.items.push({ guid: mintGuid(), kind: "texture", ref: mintGuid(), folder: null, future: 1 });
    doc.shelf!.extra = { futureTop: 7 };
    const back = readCatsup(writeCatsup(doc));
    eq(back.shelf!.items[2].kind, "texture"); eq(back.shelf!.items[2].future, 1); eq(back.shelf!.extra.futureTop, 7);
  });
  it("架子 major 比本版新 → 不拒开：原字节带回、架子先空", () => {
    const { doc } = shelved();
    const { json, bin } = jsonOf(writeCatsup(doc));
    json.extensions.CATSUP_shelf.version = 2;
    const back = readCatsup(encodeGlb(json, bin));
    assert(!back.shelf, "架子先空"); assert(back.readNotes!.shelfTooNew, "记一笔");
    const { json: j2 } = jsonOf(writeCatsup(back));
    eq(j2.extensions.CATSUP_shelf.version, 2, "原样写回");
    assert(j2.extensionsUsed.includes("CATSUP_shelf"), "extensionsUsed 里还有");
  });
});
