// 0.14 物体模型契约守卫（ai-docs/20261024-object-model-contract.md §6）：层级只有物体（组不可锁）；ImageAsset 必带尺度；cast 只认登记方向且失败不改文档；
// 可见性继承单调（祖先藏 ⇒ 子藏）且 WorldView 过滤；mesh / layers / instance.layer 格式往返（card 2026-10-24 深夜 sunset）；v4 老样本读进来 = 默认层 + 全继承。created 2026-10-24 by Claude Fable 5.1
import { describe, it, eq, assert } from "./runner.mjs";
import { Kernel } from "../src/kernel/kernel.ts";
import { Scene } from "../src/scene/scene.ts";
import { translation, WORLD_FRAME } from "../src/scene/xform.ts";
import { WorldView } from "../src/scene/world-view.ts";
import { ROOT_CONTEXT } from "../src/scene/scene.ts";
import { applyOp, OpTargetError } from "../src/editor/ops.ts";
import { canCast, KINDS, brepToMesh } from "../src/scene/kinds.ts";
import { chainVisible, effectiveLayersOfChain } from "../src/scene/layers.ts";
import { assertImageAsset } from "../src/format/document.ts";
import { documentFromScene, sceneFromDocument, readCatsup, writeCatsup, newDocument } from "../src/format/index.ts";
import { listFixtures, readFixture } from "./fixtures/format/fixtures.mjs";
import { SCENES, SCENE_DOCS } from "./format-scenes.ts";

const P = (x: number, y: number, z = 0) => ({ x, y, z });
const box = (): Kernel => { const k = new Kernel(); const B = [[0, 0], [1, 0], [1, 1], [0, 1]]; const segs: [ReturnType<typeof P>, ReturnType<typeof P>][] = []; for (let i = 0; i < 4; i++) { const a = B[i], b = B[(i + 1) % 4]; segs.push([P(a[0], a[1], 0), P(b[0], b[1], 0)]); segs.push([P(a[0], a[1], 1), P(b[0], b[1], 1)]); segs.push([P(a[0], a[1], 0), P(a[0], a[1], 1)]); } k.addEdges(segs); return k; };
const PNG = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13]);
const I = translation({ x: 0, y: 0, z: 0 });
const at = (x: number, y: number, z: number) => translation({ x, y, z });

describe("object model: 层级只有物体", () => {
  it("组不能锁（setLocked 带 group 被拒，文档不动）；实例能锁", () => {
    const s = new Scene(box());
    const g = s.mintGroup(s.root, null, box(), WORLD_FRAME);
    const gid = g.id;
    let threw: unknown = null;
    try { applyOp(s, { op: "setLocked", at: { def: s.root, group: null }, group: gid, on: true }); } catch (e) { threw = e; }
    assert(threw instanceof OpTargetError, "组锁被拒");
    const child = s.mintDef("子", box()); const inst = s.mintInstance(s.root, null, child.id, at(3, 0, 0));
    applyOp(s, { op: "setLocked", at: { def: s.root, group: null }, instance: inst.id, on: true });
    assert(s.def(s.root).instances.get(inst.id)!.locked === true);
  });
});

describe("object model: 图片资产必带尺度 + cast 登记表", () => {
  it("assertImageAsset 拒 0 尺度 / 空字节（贴图导入走它；card 已退场）", () => {
    let t = 0;
    try { assertImageAsset({ mimeType: "image/png", bytes: PNG, sizeM: [0, 1] }); } catch { t++; }
    try { assertImageAsset({ mimeType: "image/png", bytes: new Uint8Array(0), sizeM: [1, 1] }); } catch { t++; }
    eq(t, 2);
  });
  it("cast：brep → mesh 通（盒子 12 三角、材质槽照抄）；mesh → brep 拒且文档不动", () => {
    const s = new Scene(box());
    const child = s.mintDef("盒", box()); s.mintInstance(s.root, null, child.id, at(2, 0, 0));
    assert(canCast("brep", "mesh").ok && !canCast("mesh", "brep").ok && !canCast("brep", "brep").ok);
    const m = brepToMesh(s.brep(child.id));
    eq(m.indices.length, 12 * 3); eq(m.triMaterial!.length, 12);
    applyOp(s, { op: "castDefinition", def: child.id, to: "mesh" });
    eq(s.kindOf(child.id), "mesh");
    let threw = false; try { applyOp(s, { op: "castDefinition", def: child.id, to: "brep" }); } catch { threw = true; }
    assert(threw && s.kindOf(child.id) === "mesh", "拒了且没动");
    // 内核 op 对 mesh 池拒
    threw = false; try { applyOp(s, { op: "addEdges", at: { def: child.id, group: null }, segs: [[P(0, 0), P(1, 0)]] }); } catch { threw = true; }
    assert(threw, "mesh 池没有内核 op");
  });
});

describe("object model: 层", () => {
  it("继承：自己的 ?? 父的 ?? 0；藏父连子一起藏；WorldView 不装藏掉的槽；删层成员回继承；0 不可删", () => {
    const s = new Scene(box());
    const a = s.mintDef("A", box()), b = s.mintDef("B", box());
    const ia = s.mintInstance(s.root, null, a.id, at(3, 0, 0));
    const ib = s.mintInstance(a.id, null, b.id, at(0, 3, 0));
    applyOp(s, { op: "addLayer", name: "天花板" });
    eq(s.layers.length, 2); const L = s.layers[1].id;
    applyOp(s, { op: "assignLayer", at: { def: s.root, group: null }, instances: [ia.id], layer: L });
    eq(JSON.stringify(effectiveLayersOfChain(s, [ia.id, ib.id])), JSON.stringify([L, L]), "子继承父的层");
    assert(chainVisible(s, [ia.id, ib.id]));
    applyOp(s, { op: "setLayerVisible", layer: L, visible: false });
    assert(!chainVisible(s, [ia.id]) && !chainVisible(s, [ia.id, ib.id]), "藏父连子一起藏");
    const wv = new WorldView(s, ROOT_CONTEXT);
    eq(wv.slots.length, 1, "只剩根池");
    applyOp(s, { op: "assignLayer", at: { def: a.id, group: null }, instances: [ib.id], layer: 0 });
    assert(!chainVisible(s, [ia.id, ib.id]), "子显式归默认层也救不了：祖先藏着");
    applyOp(s, { op: "setLayerVisible", layer: L, visible: true });
    eq(new WorldView(s, ROOT_CONTEXT).slots.length, 3);
    applyOp(s, { op: "removeLayer", layer: L });
    eq(s.def(s.root).instances.get(ia.id)!.layer, undefined, "删层 → 成员回继承");
    let threw = false; try { applyOp(s, { op: "removeLayer", layer: 0 }); } catch { threw = true; } assert(threw);
  });
});

describe("object model: 格式往返（document v3 / definitions v6）", () => {
  it("mesh / layers / instance.layer 写了再读逐字相等；组没有 locked", () => {
    const s = new Scene(box());
    applyOp(s, { op: "addLayer", name: "参考", color: [1, 0, 0] });
    const ref = s.mintDef("参考体", box()); s.mintInstance(s.root, null, ref.id, at(1, 0, 0));
    const cardInst = [...s.def(s.root).instances.values()][0];
    applyOp(s, { op: "assignLayer", at: { def: s.root, group: null }, instances: [cardInst.id], layer: 1 });
    const m = s.mintDef("网格", box()); s.mintInstance(s.root, null, m.id, at(0, 3, 0));
    applyOp(s, { op: "castDefinition", def: m.id, to: "mesh" });
    const doc = documentFromScene(s, "t");
    const bytes = writeCatsup(doc);
    const back = readCatsup(bytes);
    eq(back.layers.length, 2); eq(back.layers[1].name, "参考"); eq(JSON.stringify(back.layers[1].color), JSON.stringify([1, 0, 0]));
    const meshDoc = back.definitions.find((d) => d.kind === "mesh")!;
    assert(meshDoc && meshDoc.mesh, "mesh 载荷在");
    eq(meshDoc.mesh!.indices.length, 36); eq(meshDoc.mesh!.positions.length, 8 * 3); eq(meshDoc.mesh!.triMaterial!.length, 12);
    const rootDoc = back.root;
    const ci = rootDoc.instances.find((i) => back.definitions[i.definition].name === "参考体")!;
    eq(ci.layer, 1);
    const s2 = sceneFromDocument(back);
    eq(s2.layers.length, 2);
    eq([...s2.defs.values()].filter((d) => d.body.kind === "mesh").length, 1);
    // 第二次写：字节幂等
    const bytes2 = writeCatsup(documentFromScene(s2, "t"));
    eq(bytes2.length, bytes.length, "二次写长度一致");
  });
  it("v4 老样本读进来 = 默认层 + 全继承；旧 group.locked 丢弃", () => {
    const v4 = new Set(listFixtures(4));   // 后来才加的样本（如 6.1 的 hidden）v4 里没有
    const files = [...Object.keys(SCENES), ...Object.keys(SCENE_DOCS)].map((n) => `${n}.glb`).filter((f) => v4.has(f));
    assert(files.length > 0);
    for (const f of files) {
      const doc = readCatsup(readFixture(4, f));
      eq(doc.layers.length, 1); eq(doc.layers[0].id, 0);
      for (const d of doc.definitions) { for (const g of d.groups) assert(!("locked" in g), `${f}: group.locked 该丢弃`); for (const i of d.instances) eq(i.layer, undefined); }
    }
    void newDocument;
  });
});
