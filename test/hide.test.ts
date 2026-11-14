// 隐藏 / 全部显示（DT49，user 2026-10-25「然后 hide unhide all也马上需要了，这个gltf规范里有吗？」「嗯线和面也可以hidden，这样可以挖洞看里面」）：
// 组件 = 实例 hidden（藏父连子）；面 / 线 = 面层 / 边层 hidden；不画、不吸、点不中；存档 definitions 6.1 + glTF 节点 KHR_node_visibility。created 2026-10-25 by Claude Opus 5.5
import { describe, it, eq, assert } from "./runner.mjs";
import { Scene, ROOT_CONTEXT } from "../src/scene/scene.ts";
import { WorldView } from "../src/scene/world-view.ts";
import { applyOp } from "../src/editor/ops.ts";
import { sceneGrouped, sceneHidden } from "./format-scenes.ts";
import { writeCatsup, readCatsup, documentFromScene, sceneFromDocument, decodeGlb } from "../src/format/index.ts";

const counts = (s: Scene) => { const v = new WorldView(s, ROOT_CONTEXT); return { slots: v.slots.length, faces: v.faces().length, edges: v.edges().length }; };
const flags = (s: Scene) => {
  const k = s.kernelOf({ def: s.root, group: null });
  return { faces: k.faces().filter((f) => k.isFaceHidden(f.id)).length, edges: k.edges().filter((e) => k.isEdgeHidden(e.id)).length, insts: [...s.def(s.root).instances.values()].filter((i) => i.hidden).length };
};

describe("DT49 隐藏 / 全部显示", () => {
  it("藏一面墙 + 一条边 + 第二份圆柱：合成视图里都没了（不画、不吸、点不中），图里还在", () => {
    const plain = counts(sceneGrouped()), hid = counts(sceneHidden());
    eq(hid.slots, plain.slots - 1, "第二份圆柱整份不进来");
    assert(hid.faces < plain.faces - 1, "墙 + 第二份圆柱的面都少了");
    assert(hid.edges < plain.edges, "隐藏的边不列");
    eq(JSON.stringify(flags(sceneHidden())), JSON.stringify({ faces: 1, edges: 1, insts: 1 }));
  });
  it("存了再读：三种隐藏都还在；glb 里隐藏的节点带 KHR_node_visibility { visible: false }", () => {
    const bytes = writeCatsup(documentFromScene(sceneHidden(), "t"));
    const back = sceneFromDocument(readCatsup(bytes));
    eq(JSON.stringify(flags(back)), JSON.stringify({ faces: 1, edges: 1, insts: 1 }));
    const json = decodeGlb(bytes).json as { extensionsUsed: string[]; nodes: { extensions?: Record<string, { visible?: boolean }> }[] };
    assert(json.extensionsUsed.includes("KHR_node_visibility"), "extensionsUsed 列了");
    eq(json.nodes.filter((n) => n.extensions?.KHR_node_visibility?.visible === false).length, 1, "一个节点藏着");
    const plainJson = decodeGlb(writeCatsup(documentFromScene(sceneGrouped(), "t"))).json as { extensionsUsed: string[] };
    assert(!plainJson.extensionsUsed.includes("KHR_node_visibility"), "没隐藏就不列");
  });
  it("全部显示：一条 op 全放回来；撤销 = 回到藏着", () => {
    const s = applyOp(sceneHidden(), { op: "unhideAll" }).scene;
    eq(JSON.stringify(flags(s)), JSON.stringify({ faces: 0, edges: 0, insts: 0 }));
    eq(JSON.stringify(counts(s)), JSON.stringify(counts(sceneGrouped())));
  });
});

// ---------------------------------------------------------------- 网格体的藏（统筹 11-13：自由建模 H / Shift+H / Alt+H；a = 全部显示扫网格体；b = 转回硬表面带上藏面）。added 2026-11-13 by Claude Opus 5.5
import { MeshKernel } from "../src/mesh/mesh-kernel.ts";
import { addBox } from "../src/mesh/ops/index.ts";
import { planHide, vertHidden } from "../src/mesh/hide-plan.ts";
import { HIDE_EDGE, edgeMark, faceHidden, givenFaceValues } from "../src/mesh/reserved-columns.ts";
import { hiddenCount } from "../src/scene/hidden.ts";
import { History } from "../src/editor/history.ts";
import { faceKey } from "../src/editor/ops.ts";
import { meshToBrep, meshToBrepCheck } from "../src/scene/kinds.ts";
import { sceneBox, oneSided } from "./format-scenes.ts";
import { IDENTITY } from "../src/scene/xform.ts";

const Q = (x: number, y: number, z: number) => ({ x, y, z });
/** 一个网格体组件（闭合方块，6 张四边形）摆在根上。 */
function meshScene(): { s: Scene; def: number; m: () => MeshKernel } {
  const s = new Scene(sceneBox()), d = s.mintDef("块", sceneBox()), k = new MeshKernel();
  addBox(k, Q(0, 0, 0), Q(1, 1, 1));
  d.body = { kind: "mesh", kernel: k, materialSlots: [], uvSetSlots: [] };
  s.mintInstance(s.root, null, d.id, IDENTITY);
  return { s, def: d.id, m: () => s.mesh(d.id).kernel };
}
const meshHid = (m: MeshKernel) => ({ faces: m.faces().filter((f) => faceHidden(m, f)).length, edges: m.edges().filter((e) => edgeMark(m, e, HIDE_EDGE)).length });
const brepHid = (s: Scene, def: number) => { const k = s.brep(def).kernel; return { faces: k.faces().length, hidden: k.faces().filter((f) => k.isFaceHidden(f.id)).length, hiddenEdges: k.edges().filter((e) => k.isEdgeHidden(e.id)).length }; };

describe("网格体的藏（自由建模 H / Shift+H）", () => {
  it("H 藏一张面：面藏、它的四条边还挨着露着的面 = 不藏；点都还露着", () => {
    const { m } = meshScene(), k = m(), top = k.faces()[0];
    const p = planHide(k, { faces: new Set([top]), edges: new Set() }, false);
    eq(JSON.stringify([p.faces, p.edges.length]), JSON.stringify([[top], 0]));
  });
  it("H 藏整块（六张面全选）：六张面 + 十二条边全藏（不留线框），点跟着边全藏", () => {
    const { m } = meshScene(), k = m(), p = planHide(k, { faces: new Set(k.faces()), edges: new Set() }, false);
    eq(p.faces.length, 6); eq(p.edges.length, 12);
  });
  it("Shift+H 选着一张面：另外五张面藏、只挨着藏面的八条边藏、挨着选中那张的四条留着；选中的那张不动", () => {
    const { m } = meshScene(), k = m(), keep = k.faces()[0], p = planHide(k, { faces: new Set([keep]), edges: new Set() }, true);
    eq(p.faces.length, 5); assert(!p.faces.includes(keep), "选中的不藏"); eq(p.edges.length, 8);
    const ring = new Set<number>(); const vs = k.faceVerts(keep); vs.forEach((v, i) => ring.add(k.edgeOf(v, vs[(i + 1) % vs.length])));
    assert(p.edges.every((e) => !ring.has(e)), "选中那张面的边不藏");
  });
  it("op setHidden（meshFaces / meshEdges）：照单写；有一个编号不在 = 整条拒、什么都没改；点跟着边（vertHidden）", () => {
    const { s, def, m } = meshScene(), k0 = m(), keep = k0.faces()[0], p = planHide(k0, { faces: new Set([keep]), edges: new Set() }, true);
    let threw = false;
    try { applyOp(s, { op: "setHidden", at: { def, group: null }, meshFaces: [...p.faces, 9999], on: true }); } catch { threw = true; }
    assert(threw, "不在的面 = 拒"); eq(JSON.stringify(meshHid(m())), JSON.stringify({ faces: 0, edges: 0 }), "拒了 = 一个都没改");
    applyOp(s, { op: "setHidden", at: { def, group: null }, meshFaces: p.faces, meshEdges: p.edges, on: true });
    eq(JSON.stringify(meshHid(m())), JSON.stringify({ faces: 5, edges: 8 }));
    const k = m(), onKeep = new Set(k.faceVerts(keep)), hv = k.verts().filter((v) => vertHidden(k, v));
    eq(hv.length, 4); assert(hv.every((v) => !onKeep.has(v)), "藏起来的点 = 不在留着的那张面上的四个");
  });
  it("a：全部显示的数和放回来都算上网格体（以前只看硬表面）", () => {
    const { s, def, m } = meshScene(), k = m();
    applyOp(s, { op: "setHidden", at: { def, group: null }, meshFaces: [k.faces()[1], k.faces()[2]], meshEdges: [k.edges()[0]], on: true });
    eq(JSON.stringify(hiddenCount(s)), JSON.stringify({ instances: 0, faces: 2, edges: 1 }));
    const back = applyOp(s, { op: "unhideAll" }).scene;
    eq(JSON.stringify(hiddenCount(back)), JSON.stringify({ instances: 0, faces: 0, edges: 0 }));
    eq(JSON.stringify(meshHid(back.mesh(def).kernel)), JSON.stringify({ faces: 0, edges: 0 }));
  });
  it("撤销：网格体的藏 = 一步、记成网格体那一档（不整份拷场景）；撤了连第一次建的藏面列都回去", () => {
    const { s, def, m } = meshScene(), h = new History(s), cols0 = m().columnDefs().map((c) => c.id).join(",");
    h.commit(s, { op: "setHidden", at: { def, group: null }, meshFaces: [m().faces()[0]], on: true });
    eq(meshHid(m()).faces, 1);
    h.undo(); eq(meshHid(m()).faces, 0); eq(m().columnDefs().map((c) => c.id).join(","), cols0, "列也回去");
    h.redo(s); eq(meshHid(m()).faces, 1);
  });
});

describe("b：转回硬表面带上藏面（统筹 11-13；以前藏着的面不带 = 悄悄少）", () => {
  const roundTrip = (s: Scene, def: number): Scene => applyOp(applyOp(s, { op: "castDefinition", def, to: "mesh" }).scene, { op: "castDefinition", def, to: "brep" }).scene;
  for (const sided of [true, false]) it(`硬表面藏两张面 → 网格体 → 硬表面，再走一圈：面数不变、那两张还藏着、全部显示放得回来（${sided ? "单面" : "两侧都出 = 背靠背两张"}）`, () => {
    let s = new Scene(sceneBox()); const d = s.mintDef("盒", sceneBox()); s.mintInstance(s.root, null, d.id, IDENTITY); if (sided) oneSided(s, d.id);
    const k = s.brep(d.id).kernel, two = k.faces().slice(1, 3).map((f) => faceKey(k, f.id));
    s = applyOp(s, { op: "setHidden", at: { def: d.id, group: null }, faces: two, on: true }).scene;
    const before = brepHid(s, d.id); eq(before.hidden, 2);
    s = roundTrip(s, d.id); eq(JSON.stringify(brepHid(s, d.id)), JSON.stringify(before), "第一圈");
    s = roundTrip(s, d.id); eq(JSON.stringify(brepHid(s, d.id)), JSON.stringify(before), "第二圈");
    s = applyOp(s, { op: "unhideAll" }).scene; eq(brepHid(s, d.id).hidden, 0); eq(brepHid(s, d.id).faces, before.faces);
  });
  it("网格体整块藏了（面 + 边）→ 硬表面：面和边都还藏着（不冒出一副线框）；带得过去 = 不问", () => {
    const { s, def, m } = meshScene(), k = m(), p = planHide(k, { faces: new Set(k.faces()), edges: new Set() }, false);
    applyOp(s, { op: "setHidden", at: { def, group: null }, meshFaces: p.faces, meshEdges: p.edges, on: true });
    eq(JSON.stringify(meshToBrepCheck(s.mesh(def), 20)), JSON.stringify({ mixedHidden: 0, lostHiddenEdges: 0 }));
    const b = applyOp(s, { op: "castDefinition", def, to: "brep" }).scene;
    eq(JSON.stringify(brepHid(b, def)), JSON.stringify({ faces: 6, hidden: 6, hiddenEdges: 12 }));
  });
  it("藏了一张面的网格体：藏面和露着的同一平面上不并（藏没藏不一样）、藏着的那张转过去还藏着", () => {
    const { s, def, m } = meshScene(), k = m();
    applyOp(s, { op: "setHidden", at: { def, group: null }, meshFaces: [k.faces()[3]], on: true });
    const b = applyOp(s, { op: "castDefinition", def, to: "brep" }).scene;
    eq(JSON.stringify(brepHid(b, def)), JSON.stringify({ faces: 6, hidden: 1, hiddenEdges: 0 }));
  });
  it("带不过去的那种：背靠背两张一藏一露 = 合成一张膜只能露着，转之前数得出来（meshToBrepCheck），真转出来的就是露着的", () => {
    const m = new MeshKernel(), v = [Q(0, 0, 0), Q(1, 0, 0), Q(1, 1, 0), Q(0, 1, 0)].map((p) => m.addVertex(p));
    m.addFace(v, { kind: "fresh", face: givenFaceValues(m, {}) });
    const back = m.addFace([...v].reverse(), { kind: "fresh", face: givenFaceValues(m, { hidden: true }) });
    assert(faceHidden(m, back), "背面那张藏着");
    const body = { kind: "mesh" as const, kernel: m, materialSlots: [], uvSetSlots: [] };
    eq(JSON.stringify(meshToBrepCheck(body, 20)), JSON.stringify({ mixedHidden: 1, lostHiddenEdges: 0 }));
    const b = meshToBrep(body, 20);
    eq(b.kernel.faces().length, 1); eq(b.kernel.faces().filter((f) => b.kernel.isFaceHidden(f.id)).length, 0, "露着（转之前问过的就是这个）");
  });
  it("网格体转回硬表面：隐藏的面照带，丢的只有背靠背一藏一露那种 + 并掉的藏边（去向表 + 声明）", async () => {
    const { KINDS, CAST_FATES } = await import("../src/scene/kinds.ts");
    eq(KINDS.mesh.castsTo.find((c) => c.to === "brep")!.loses.filter((l) => /hidden/.test(l)).sort().join(","), "lost-hidden-edges,mixed-hidden");
    eq(JSON.stringify(CAST_FATES.mesh.brep!["hidden-faces"]), JSON.stringify({ lost: "mixed-hidden" }));
  });
});

describe("setHidden 不许把物件和面 / 边混在一条里（统筹 11-13：撤销分档看到 instance 只记骨架，混着的面 / 边撤不回）", () => {
  it("实例 + 硬表面的面 / 网格体的面混在一条 = 拒（OpTargetError），场景一点没动；分开发照常", () => {
    const s = sceneGrouped(), inst = [...s.def(s.root).instances.values()][0], k = s.kernelOf({ def: s.root, group: null }), f = k.faces()[0];
    const at = { def: s.root, group: inst.parent }, before = JSON.stringify(flags(s));
    for (const extra of [{ faces: [faceKey(k, f.id)] }, { meshFaces: [0] }]) {
      let threw = "";
      try { applyOp(s, { op: "setHidden", at, instance: inst.id, ...extra, on: true }); } catch (e) { threw = (e as Error).name + ":" + (e as Error).message; }
      assert(/instance and faces/.test(threw), `混着发 = 拒：${threw}`);
      eq(JSON.stringify(flags(s)), before, "拒了 = 一点没动");
    }
    applyOp(s, { op: "setHidden", at, instance: inst.id, on: true });
    eq(flags(s).insts, 1, "只藏物件照常");
  });
});
