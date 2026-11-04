// 组 id 读写 + 网格体组件里实例的隐藏态（身份地基 ID-0 清点时实测出来的两个读文件 bug）。created 2026-11-04 by Claude Opus 5.5
// 组：scene-doc 读文件时先改 id 再判「临时 id 要不要删」，判断永远为「不删」→ id 有空缺（删过组）的文件读回来，同一个组在表里两份：
//   几何叠两层、文件变大、再删只删得掉一份、剩下那份删不掉。实例 2026-10-25 修过同一个写法（test/instance-ids.test.ts），组这边漏了。
// 网格体：scene-doc 的网格体分支读实例时漏了 hidden（硬表面分支有）→ 藏着的实例重开就露出来。
import { describe, it, eq, assert } from "./runner.mjs";
import { Scene } from "../src/scene/scene.ts";
import { applyOp, faceKey, edgeKey } from "../src/editor/ops.ts";
import { sceneBox } from "./format-scenes.ts";
import { Kernel } from "../src/kernel/kernel.ts";
import { writeCatsup, readCatsup, documentFromScene, sceneFromDocument } from "../src/format/index.ts";
import { translation } from "../src/scene/xform.ts";

const at = (s: Scene) => ({ def: s.root, group: null });
const roundtrip = (s: Scene): Scene => sceneFromDocument(readCatsup(writeCatsup(documentFromScene(s, "t"))));
/** 一个盒子，建两个组（各拿一张面），删掉第一个 → 剩一个组，id = 2（有空缺）。 */
function gapped(): Scene {
  let s = new Scene(sceneBox(1, 1));
  const k = () => s.kernelOf(at(s));
  s = applyOp(s, { op: "makeGroup", at: at(s), faces: [faceKey(k(), k().faces()[0].id)], edges: [] }).scene;
  s = applyOp(s, { op: "makeGroup", at: at(s), faces: [faceKey(k(), k().faces()[0].id)], edges: [] }).scene;
  return applyOp(s, { op: "eraseGroup", at: at(s), group: [...s.brep(s.root).groups.keys()][0] }).scene;
}
const groupKeys = (s: Scene): number[] => [...s.brep(s.root).groups.keys()];
const groupIds = (s: Scene): number[] => [...s.brep(s.root).groups.values()].map((g) => g.id);

describe("组 id 读写", () => {
  it("删过一个组（id 有空缺）→ 存了再读：组数和 id 不变、不多出重复", () => {
    const s = gapped();
    eq(groupKeys(s).join(","), "2", "前提：只剩 2 号");
    const r = roundtrip(s);
    eq(groupKeys(r).join(","), "2", "表里只有 2 号");
    eq(groupIds(r).join(","), "2", "对象的 id 和键一致");
    eq(documentFromScene(r, "t").root.groups.length, 1, "写出去还是一个组");
    eq(roundtrip(r).brep(r.root).groups.size, 1, "再存再读还是一个");
  });
  it("读回来的组删得掉（以前第二份删不掉、再点报错）", () => {
    const r = roundtrip(gapped());
    const s = applyOp(r, { op: "eraseGroup", at: at(r), group: groupIds(r)[0] }).scene;
    eq(s.brep(s.root).groups.size, 0, "删完一个不剩");
  });
  it("新建的组不撞老号（下一个号 = 最大号 + 1）", () => {
    let r = roundtrip(gapped());
    const k = r.kernelOf(at(r));
    r = applyOp(r, { op: "makeGroup", at: at(r), faces: [faceKey(k, k.faces()[0].id)], edges: [] }).scene;
    eq(groupKeys(r).join(","), "2,3", "接着 3 号");
  });
  it("老文件里已经重复的组（被旧版本写过）读进来合回一份，留后写的那份（编辑永远落在后写的那份上）", () => {
    const s = gapped();
    const doc = documentFromScene(s, "t");
    const one = doc.root.groups[0];
    const stale = { ...one, brep: new Kernel().toBrep(), name: "旧的那份" };
    doc.root.groups = [stale, { ...one, name: "新的那份" }];
    const r = sceneFromDocument(readCatsup(writeCatsup(doc)));
    eq(groupKeys(r).join(","), "2", "合回一份");
    const g = r.brep(r.root).groups.get(2)!;
    eq(g.name, "新的那份", "留后写的");
    assert(g.kernel.faces().length > 0, "几何是后写那份的");
  });
  it("组的父子关系跨空缺保住", () => {
    let s = new Scene(sceneBox(1, 1));
    const k = () => s.kernelOf(at(s));
    s = applyOp(s, { op: "makeGroup", at: at(s), faces: [faceKey(k(), k().faces()[0].id)], edges: [] }).scene;
    s = applyOp(s, { op: "makeGroup", at: at(s), faces: [faceKey(k(), k().faces()[0].id)], edges: [] }).scene;
    const [a, b] = groupKeys(s);
    s = applyOp(s, { op: "makeGroup", at: at(s), faces: [], edges: [], groups: [b] }).scene;
    const c = groupKeys(s).find((g) => g !== a && g !== b)!;
    s = applyOp(s, { op: "eraseGroup", at: at(s), group: a }).scene;
    const r = roundtrip(s);
    eq(r.brep(r.root).groups.get(b)?.parent, c, "孩子还挂在原来的父组下");
    eq(r.brep(r.root).groups.size, 2, "两个组，不多");
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
