// 身份层（ID-4，设计书 ai-docs/20261104-identity-layer-design.md §9）：模块只 import 自己；玩具种类证明通用；场景店和种类声明说的是同一张图；清理 / 做成唯一走这层之后语义不变。created 2026-11-04 by Claude Opus 5.5
import { describe, it, eq, assert } from "./runner.mjs";
const { readFileSync, readdirSync } = (await import("node:fs" as string)) as { readFileSync(p: URL, e: string): string; readdirSync(p: URL): string[] };   // test/*.ts 不拉 @types/node（同 orphan-defs.test.ts）
import { KINDS, registerKind, refKey, type Ref } from "../src/identity/kinds.ts";
import { bundleOf, census, closure, frontier, KEEP, plan, planWouldCycle, wouldCycle } from "../src/identity/graph.ts";
import { tableStore } from "../src/identity/store.ts";
import { mintGuid, type Guid } from "../src/identity/guid.ts";
import { DEFINITION, LAYER, MATERIAL, defRef, layerRef, materialRef } from "../src/format/entry-kinds.ts";
import { docStore, sceneStore } from "../src/format/scene-store.ts";
import { documentFromScene, readCatsup, writeCatsup } from "../src/format/index.ts";
import { Scene } from "../src/scene/scene.ts";
import { applyOp } from "../src/editor/ops.ts";
import { IDENTITY } from "../src/scene/xform.ts";
import { sceneBox } from "./format-scenes.ts";

describe("§9-1 模块边界", () => {
  it("src/identity/ 只 import 自己（不认识 kernel / mesh / scene / format）", () => {
    const dir = new URL("../src/identity/", import.meta.url);
    const files = readdirSync(dir);
    assert(files.length >= 4, "guid / kinds / store / graph 都在");
    for (const f of files) for (const m of readFileSync(new URL(f, dir), "utf8").matchAll(/^\s*(?:import|export)[^;\n]*from\s+["']([^"']+)["']/gm)) assert(/^\.\/[\w-]+\.ts$/.test(m[1]), `${f} import 了 ${m[1]}`);
  });
  it("format/guid.ts 只是转发（老 import 不用改，身份的家只有一个）", () => {
    const src = readFileSync(new URL("../src/format/guid.ts", import.meta.url), "utf8");
    assert(/export \* from "\.\.\/identity\/guid\.ts"/.test(src));
    assert(!/function |const /.test(src), "这里不许再长东西");
  });
  it("三种条目都登记了；政策表和设计书 §3 对得上", () => {
    const k = (n: string) => KINDS.get(n)!;
    eq(k(DEFINITION).structural, true); eq(k(MATERIAL).structural, false); eq(k(LAYER).structural, false);
    eq(k(LAYER).overwrite, false, "层永不更新"); eq(k(MATERIAL).overwrite, true); eq(k(DEFINITION).overwrite, true);
    assert(k(DEFINITION).carry && k(MATERIAL).carry && k(LAYER).carry);
    assert(k(LAYER).constants.length === 1 && k(MATERIAL).constants.length === 2, "默认层；内置正 / 背面");
  });
});

// 玩具种类（§9-2）：引用别的 note。算法要是偷偷认得定义 / 材质，这里就过不了
interface Note { guid: Guid; title: string; links: Guid[]; owned?: Guid }
const noteRef = (guid: Guid): Ref => ({ kind: "note", guid });
registerKind<Note>({
  kind: "note", carry: true, structural: true, overwrite: true, constants: [],
  guidOf: (n) => n.guid,
  nameOf: (n) => n.title,
  refs: (n) => n.links.map(noteRef),
  rewrite: (n, map) => ({ ...n, guid: map(noteRef(n.guid)), links: n.links.map((g) => map(noteRef(g))) }),
  remintOwned: (n) => ({ ...n, owned: mintGuid() }),
});
const note = (guid: Guid, ...links: Guid[]) => ({ kind: "note", doc: { guid, title: guid, links } satisfies Note });

describe("§9-2 玩具种类：图算法只认声明", () => {
  it("闭包只顺「我需要谁」走；菱形只算一次；前序（先自己后依赖）", () => {
    const st = tableStore([note("a", "b", "c"), note("b", "d"), note("c", "d"), note("d"), note("独立")], []);
    eq(closure(st, [noteRef("a")]).map((r) => r.guid).join(), "a,b,d,c");
    eq(closure(st, [noteRef("b")]).map((r) => r.guid).join(), "b,d", "不往回指：b 的闭包不含 a");
    eq(closure(st, [noteRef("没有")]).length, 0, "店里没有的走不下去");
  });
  it("闭包经不起环也不爆栈：环 = 走完就停；一万层链不炸", () => {
    const loop = tableStore([note("x", "y"), note("y", "x")], []);
    eq(closure(loop, [noteRef("x")]).length, 2);
    const chain = Array.from({ length: 10000 }, (_, i) => note(`n${i}`, ...(i < 9999 ? [`n${i + 1}`] : [])));
    eq(closure(tableStore(chain, []), [noteRef("n0")]).length, 10000);
  });
  it("普查：从根走，够不着 = 孤儿（孤儿用着的也是孤儿）；反向索引看得见谁引用", () => {
    const st = tableStore([note("root", "a"), note("a", "b"), note("b"), note("孤一", "孤二"), note("孤二", "b")], [noteRef("root")]);
    const c = census(st);
    eq(c.orphans.filter((r) => r.kind === "note").map((r) => r.guid).sort().join(), "孤一,孤二");
    assert(c.isLive(noteRef("b")), "孤儿也用它，但活的也用它");
    assert(!c.isLive(noteRef("孤二")));
    eq(c.usedBy(noteRef("b")).map((r) => r.guid).sort().join(), "a,孤二");
    eq(c.usedBy(noteRef("root")).length, 0);
  });
  it("前沿：没有 = 新建并往下走；有 = 用这边的，下面不再看", () => {
    const here = tableStore([note("有", "旧子")], []);
    const b = { docs: [note("新", "有", "新子"), note("新子"), note("有", "只在那边的子"), note("只在那边的子")], roots: [noteRef("新")] };
    const f = frontier(here, b);
    eq(f.create.map((r) => r.guid).join(), "新,新子");
    eq(f.same.map((r) => r.guid).join(), "有");
    eq(plan(here, b, KEEP).create.map((r) => r.guid).join(), "新,新子");
  });
  it("查环：按落地之后的样子（这边有的看这边、没有的看包）", () => {
    const here = tableStore([note("目标"), note("甲", "目标")], []);
    const incoming = { docs: [note("新", "甲"), note("甲")], roots: [noteRef("新")] };
    assert(planWouldCycle(here, incoming, plan(here, incoming, KEEP), noteRef("目标")), "新 → 甲（这边的版本）→ 目标");
    assert(!planWouldCycle(here, incoming, plan(here, incoming, KEEP), noteRef("别处")));
    assert(!wouldCycle(() => [materialRef("m")], [materialRef("m")], materialRef("m")), "不 structural 的种类不查");
  });
  it("包：从店里取出来还是能给别的店用（搬运两步走）", () => {
    const from = tableStore([note("甲", "乙"), note("乙"), note("丙")], []), into = tableStore([], []);
    const b = bundleOf(from, [noteRef("甲")]);
    eq(b.docs.length, 2, "丙不带");
    eq(frontier(into, b).create.map((r) => r.guid).join(), "甲,乙");
  });
  it("不认识的种类：走不下去、不当孤儿（永不清理）", () => {
    const st = tableStore([note("root")], [noteRef("root"), { kind: "未来的种类", guid: "x" }]);
    eq(census(st).orphans.length, 0);
    eq(closure(st, st.roots()).map(refKey).join(), "note:root");
  });
});

/** 根里摆甲（用红、归结构层）；甲里摆乙（用默认背面）；另有孤儿丙（用蓝），一个架上的丁。 */
function world() {
  const s = new Scene(sceneBox(1, 1));
  const red = s.addMaterial({ name: "红", color: [1, 0, 0] }), blue = s.addMaterial({ name: "蓝", color: [0, 0, 1] });
  s.addMaterial({ name: "只在槽表里", color: [0, 1, 0] });
  const a = s.mintDef("甲", sceneBox(1, 1)), b = s.mintDef("乙", sceneBox(1, 1)), c = s.mintDef("丙", sceneBox(1, 1)), d = s.mintDef("丁", sceneBox(1, 1));
  const ka = s.brep(a.id).kernel; ka.setFaceMaterial([ka.faces()[0].id], s.slotFor(a.id, red));
  const kc = s.brep(c.id).kernel; kc.setFaceMaterial([kc.faces()[0].id], s.slotFor(c.id, blue));
  s.slotFor(a.id, 2);   // 槽表里有、没有面用
  s.layers.push({ id: s.nextLayer++, guid: mintGuid(), name: "结构", visible: true });
  const ia = s.mintInstance(s.root, null, a.id, IDENTITY); ia.layer = 1;
  const ia2 = s.mintInstance(s.root, null, a.id, IDENTITY); ia2.locked = true;
  s.mintInstance(a.id, null, b.id, IDENTITY);
  s.shelf.items.push({ guid: mintGuid(), kind: "definition", ref: d.guid, folder: null });
  return { s, a, b, c, d, red, blue };
}

describe("场景店和种类声明说的是同一张图", () => {
  it("每个定义：refsOf（快路，不序列化）= 声明的 refs(docOf)，连顺序都一样", () => {
    const { s } = world(), st = sceneStore(s);
    for (const g of st.all(DEFINITION)) {
      const r = defRef(g), fast = st.refsOf(r).map(refKey).join(), byDecl = KINDS.get(DEFINITION)!.refs(st.docOf(r)).map(refKey).join();
      eq(fast, byDecl, s.defs.size ? `定义 ${g}` : "");
    }
  });
  it("存盘读回来的纯文档店：同一张图", () => {
    const { s } = world(), a = sceneStore(s), b = docStore(readCatsup(writeCatsup(documentFromScene(s, "t"))));
    const sorted = (st: typeof b, r: Ref): string => st.refsOf(r).map(refKey).sort().join();
    for (const g of a.all(DEFINITION)) eq(sorted(b, defRef(g)), sorted(a, defRef(g)));
  });
  it("闭包带上定义 + 材质 + 层，不带架子、不带孤儿；内置背面走不进包", () => {
    const { s, a, b } = world(), st = sceneStore(s);
    s.brep(b.id).materialSlots.push(-2);
    const bundle = bundleOf(st, [defRef(a.guid)]), names = (k: string) => bundle.docs.filter((e) => e.kind === k).map((e) => KINDS.get(k)!.nameOf(e.doc)).join();
    eq(names(DEFINITION), "甲,乙");
    eq(names(MATERIAL), "红,只在槽表里", "槽表里的跟着走，蓝只在孤儿里不带");
    eq(names(LAYER), "", "实例的层在根那一层，甲里的实例没归层");
  });
  it("用量：摆了几份只算活着的、几份锁着；面按材质数；架子", () => {
    const { s, a, c, d, red, blue } = world(), st = sceneStore(s);
    const ua = st.usage(defRef(a.guid));
    eq(ua.placed, 2); eq(ua.locked, 1); eq(ua.shelved, false);
    eq(st.usage(defRef(c.guid)).placed, 0, "孤儿");
    assert(st.usage(defRef(d.guid)).shelved, "架上的");
    eq(st.usage(materialRef(s.materials[red].guid)).faces, 2, "一张面两侧都涂了，一侧算一次（和资源页以前数的一样）");
    const ub = st.usage(materialRef(s.materials[blue].guid));
    eq(ub.faces, 0); eq(ub.orphanFaces, 2, "只躺在孤儿里");
    eq(st.usage(layerRef("没有")).placed, 0);
  });
});

describe("做成唯一走身份层：断开的同一份声明", () => {
  it("新身份（定义 / 组 / 实例都铸新）；子组件、材质、层还是原来那些；组的父子还在", () => {
    const s = new Scene(sceneBox(1, 1)), a = s.mintDef("甲", sceneBox(1, 1)), b = s.mintDef("乙", sceneBox(1, 1));
    const red = s.addMaterial({ name: "红", color: [1, 0, 0] }), ka = s.brep(a.id).kernel;
    ka.setFaceMaterial([ka.faces()[0].id], s.slotFor(a.id, red));
    s.layers.push({ id: s.nextLayer++, guid: mintGuid(), name: "结构", visible: true });
    const frame = { origin: { x: 0, y: 0, z: 0 }, x: { x: 1, y: 0, z: 0 }, y: { x: 0, y: 1, z: 0 }, z: { x: 0, y: 0, z: 1 } };
    const parent = s.mintGroup(a.id, null, sceneBox(1, 1), frame), child = s.mintGroup(a.id, parent.id, sceneBox(1, 1), frame);
    const sub = s.mintInstance(a.id, child.id, b.id, IDENTITY); sub.layer = 1; sub.name = "那份乙"; sub.locked = true;
    const one = s.mintInstance(s.root, null, a.id, IDENTITY);
    s.mintInstance(s.root, null, a.id, IDENTITY);
    applyOp(s, { op: "makeUnique", def: s.root, instance: one.id });
    const u = s.def(one.def);
    assert(u.id !== a.id && u.guid !== a.guid, "新定义新 GUID"); eq(u.name, "甲·唯一");
    assert(u.body.kind === "brep");
    const groups = u.body.kind === "brep" ? [...u.body.groups.values()] : [];
    eq(groups.length, 2);
    assert(groups.every((g) => g.guid !== parent.guid && g.guid !== child.guid), "组铸新");
    const inner = [...u.instances.values()][0], newChild = groups.find((g) => g.id === inner.parent)!;
    assert(inner.guid !== sub.guid, "实例铸新"); eq(inner.def, b.id, "子组件还是乙"); eq(inner.layer, 1); eq(inner.name, "那份乙"); eq(inner.locked, true);
    assert(newChild.parent !== null && groups.some((g) => g.id === newChild.parent), "组的父子在新的那两个之间");
    const k = u.body.kind === "brep" ? u.body.kernel : null!;
    eq(k.faces().map((f) => s.materialOfSlot(u.id, k.faceMaterialOf(f.id, 0))?.name).filter(Boolean).join(), "红", "面上的颜色对");
    assert(s.defByGuid(a.guid), "原来的还在");
    eq([...s.def(a.id).instances.values()][0].guid, sub.guid, "原来的实例不动");
  });
});
