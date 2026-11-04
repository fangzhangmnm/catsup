// 组 / 实例读文件的两个老 bug 的回归（身份地基 ID-0 清点时实测出来的）。created 2026-11-04 by Claude Opus 5.5
// 组：v0.18.27 以前读文件先改 id 再判「临时 id 要不要删」，判断永远为「不删」→ id 有空缺（删过组）的文件读回来，同一个组在表里两份：
//   几何叠两层、文件变大、再删只删得掉一份、剩下那份删不掉。实例 2026-10-25 修过同一个写法（test/instance-ids.test.ts）。
//   现在文件里没有组 id 了（引用全是 GUID，句柄读的时候现发），这个 bug 没有地方再长；老文件已经写出去的重复由迁移合回（migrate/definitions.ts）。
// 网格体：v0.18.27 以前网格体分支读实例漏了 hidden（硬表面分支有）→ 藏着的实例重开就露出来。现在两种身体共用一段读法。
import { describe, it, eq, assert } from "./runner.mjs";
import { Scene } from "../src/scene/scene.ts";
import { applyOp, faceKey, edgeKey } from "../src/editor/ops.ts";
import { downgradeDefinitionsToV6, sceneBox } from "./format-scenes.ts";
import { Kernel } from "../src/kernel/kernel.ts";
import { writeCatsup, readCatsup, documentFromScene, sceneFromDocument, decodeGlb } from "../src/format/index.ts";
import { encodeGlb } from "../src/format/glb.ts";
import { translation } from "../src/scene/xform.ts";

const at = (s: Scene) => ({ def: s.root, group: null });
const roundtrip = (s: Scene): Scene => sceneFromDocument(readCatsup(writeCatsup(documentFromScene(s, "t"))));
/** 一个盒子，建两个组（各拿一张面），删掉第一个 → 剩一个组，句柄 2（有空缺）。 */
function gapped(): Scene {
  let s = new Scene(sceneBox(1, 1));
  const k = () => s.kernelOf(at(s));
  s = applyOp(s, { op: "makeGroup", at: at(s), faces: [faceKey(k(), k().faces()[0].id)], edges: [] }).scene;
  s = applyOp(s, { op: "makeGroup", at: at(s), faces: [faceKey(k(), k().faces()[0].id)], edges: [] }).scene;
  return applyOp(s, { op: "eraseGroup", at: at(s), group: [...s.brep(s.root).groups.keys()][0] }).scene;
}
const groups = (s: Scene) => [...s.brep(s.root).groups.values()];

describe("组读写（身份 = GUID）", () => {
  it("删过一个组 → 存了再读：组数和身份不变、不多出重复", () => {
    const s = gapped(), before = groups(s).map((g) => g.guid).join();
    const r = roundtrip(s);
    eq(groups(r).map((g) => g.guid).join(), before, "还是这一个组");
    eq(documentFromScene(r, "t").root.groups.length, 1, "写出去还是一个组");
    eq(groups(roundtrip(r)).map((g) => g.guid).join(), before, "再存再读还是它");
    for (const [k, g] of roundtrip(r).brep(r.root).groups) eq(g.id, k, "表的键 = 对象的句柄");
  });
  it("读回来的组删得掉（以前第二份删不掉、再点报错）", () => {
    const r = roundtrip(gapped());
    const s = applyOp(r, { op: "eraseGroup", at: at(r), group: groups(r)[0].id }).scene;
    eq(s.brep(s.root).groups.size, 0, "删完一个不剩");
  });
  it("读回来之后新建的组不撞句柄", () => {
    let r = roundtrip(gapped());
    const n0 = r.brep(r.root).groups.size, k = r.kernelOf(at(r));
    r = applyOp(r, { op: "makeGroup", at: at(r), faces: [faceKey(k, k.faces()[0].id)], edges: [] }).scene;
    eq(r.brep(r.root).groups.size, n0 + 1, "多一个");
    eq(new Set(groups(r).map((g) => g.guid)).size, n0 + 1, "身份各不相同");
  });
  it("老文件（6.x）里已经重复的组：迁移时合回一份，留后写的（编辑永远落在后写的那份上）", () => {
    const { json, bin } = decodeGlb(writeCatsup(documentFromScene(gapped(), "t"))) as { json: Record<string, unknown>; bin: Uint8Array };
    downgradeDefinitionsToV6(json, (defs) => {
      const d = defs.list.find((x) => x.groups.length)!, one = d.groups[0];
      d.groups = [{ ...one, id: 2, name: "旧的那份" }, { ...one, id: 2, name: "新的那份" }];
    });
    const r = sceneFromDocument(readCatsup(encodeGlb(json, bin)));
    eq(groups(r).length, 1, "合回一份");
    eq(groups(r)[0].name, "新的那份", "留后写的");
    assert(groups(r)[0].kernel.faces().length > 0, "几何在");
  });
  it("组的父子关系跨空缺保住", () => {
    let s = new Scene(sceneBox(1, 1));
    const k = () => s.kernelOf(at(s));
    s = applyOp(s, { op: "makeGroup", at: at(s), faces: [faceKey(k(), k().faces()[0].id)], edges: [] }).scene;
    s = applyOp(s, { op: "makeGroup", at: at(s), faces: [faceKey(k(), k().faces()[0].id)], edges: [] }).scene;
    const [a, b] = [...s.brep(s.root).groups.keys()];
    s = applyOp(s, { op: "makeGroup", at: at(s), faces: [], edges: [], groups: [b] }).scene;
    const c = [...s.brep(s.root).groups.keys()].find((g) => g !== a && g !== b)!;
    const kid = s.brep(s.root).groups.get(b)!.guid, dad = s.brep(s.root).groups.get(c)!.guid;
    s = applyOp(s, { op: "eraseGroup", at: at(s), group: a }).scene;
    const r = roundtrip(s), byGuid = new Map(groups(r).map((g) => [g.guid, g]));
    eq(byGuid.size, 2, "两个组，不多");
    eq(byGuid.get(kid)!.parent, byGuid.get(dad)!.id, "孩子还挂在原来的父组下");
  });
});

describe("网格体组件里实例的隐藏态", () => {
  it("网格体组件里藏着的实例，存了再读还藏着（硬表面对照）", () => {
    for (const kind of ["brep", "mesh"] as const) {
      let s = new Scene(sceneBox(1, 1));
      const k = s.kernelOf(at(s));
      s = applyOp(s, { op: "makeComponent", at: at(s), faces: k.faces().map((f) => faceKey(k, f.id)), edges: k.edges().map((e) => edgeKey(k, e.id)), name: "内" }).scene;
      const inner = [...s.def(s.root).instances.values()][0].def;
      const outer = s.mintDef("外", new Kernel());
      s.mintInstance(s.root, null, outer.id, translation({ x: 3, y: 0, z: 0 }));
      const ii = s.mintInstance(outer.id, null, inner, translation({ x: 0, y: 3, z: 0 }));
      ii.hidden = true; ii.locked = true; ii.name = "藏着的";
      if (kind === "mesh") s = applyOp(s, { op: "castDefinition", def: outer.id, to: "mesh" }).scene;
      const r = roundtrip(s);
      const d = [...r.defs.values()].find((x) => x.name === "外")!;
      eq(r.kindOf(d.id), kind, "种类没变");
      const j = [...d.instances.values()][0];
      eq(!!j.hidden, true, `${kind}：还藏着`);
      eq(!!j.locked, true, `${kind}：还锁着`);
      eq(j.name, "藏着的", `${kind}：名字还在`);
    }
  });
});
