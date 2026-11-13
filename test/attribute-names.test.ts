// 物体窗口「元素」页的显示名（app/attribute-names.ts；属性地基轮 3½，统筹 11-13 深夜）+ 内核核值快路和造边同一个规矩。created 2026-11-13 by Claude Opus 5.5
// 钉：① 每个保留名、贴图坐标那两列、硬表面每个知名层都有显示名；② 两边共用的显示名只许是 SYNONYMS 登记过的那几对（同一个意思同一个名字，不同意思不许撞名）；
//    ③ 类型、大小的说法；④ MeshKernel.edgeDisagrees 的快路（一份 / 一块 / 新长）和 columns.ts edgeColumnValues 逐列结论一样（随机旧样子）。
import { describe, it, eq, assert } from "./runner.mjs";
import { BREP_NAMES, MESH_NAMES, SYNONYMS, brepAttrName, bytesSay, meshAttrName, typeSay } from "../src/app/attribute-names.ts";
import { RESERVED_EDGE, RESERVED_FACE } from "../src/mesh/reserved-columns.ts";
import { UV_AT_COL, UV_SET_COL } from "../src/scene/uv.ts";
import { EDGE_LAYERS, FACE_LAYERS } from "../src/kernel/layers.ts";
import { MeshKernel, type EdgeColumn, type EdgeOrigin } from "../src/mesh/mesh-kernel.ts";
import { edgeColumnValues, type ColumnDef } from "../src/mesh/columns.ts";
import { addBox } from "../src/mesh/ops/index.ts";

describe("元素页的显示名（app/attribute-names.ts）", () => {
  it("每个保留名、贴图坐标两列、硬表面每个知名层都有显示名；网格体的带原名、硬表面的不带；不认识的原样显示", () => {
    for (const d of [...RESERVED_EDGE, ...RESERVED_FACE, UV_SET_COL, UV_AT_COL]) { assert(!!MESH_NAMES[d.id], `${d.id} 没有显示名`); eq(meshAttrName(d.id).code, d.id); }
    for (const n of EDGE_LAYERS) assert(!!BREP_NAMES[`edge:${n}`], `硬表面边层 ${n} 没有显示名`);
    for (const n of FACE_LAYERS) assert(!!BREP_NAMES[`face:${n}`], `硬表面面层 ${n} 没有显示名`);
    eq(JSON.stringify(meshAttrName("my_weight")), JSON.stringify({ label: "my_weight", code: null }), "文件里带来的不认识的列 = 原样的名字");
    eq(brepAttrName("edge", "plugin:x"), "plugin:x");
    eq(brepAttrName("face", "material"), "材质（正面）"); eq(brepAttrName("face", "materialBack"), "材质（背面）"); eq(meshAttrName("material_index").label, "材质");
  });
  it("同一个意思同一个名字：同一个显示名底下的名字（两边合起来）正好是 SYNONYMS 登记的那一组；没登记的显示名只许对一个名字", () => {
    const byLabel = new Map<string, string[]>();
    for (const [id, l] of Object.entries(MESH_NAMES)) byLabel.set(l, [...(byLabel.get(l) ?? []), `mesh:${id}`]);
    for (const [id, l] of Object.entries(BREP_NAMES)) byLabel.set(l, [...(byLabel.get(l) ?? []), `brep:${id}`]);
    for (const [label, ids] of byLabel) {
      const syn = SYNONYMS.find((x) => x.label === label);
      if (!syn) { eq(ids.length, 1, `「${label}」对了好几个名字（${ids.join("、")}）却没登记成同义`); continue; }
      eq([...ids].sort().join(), [...syn.mesh.map((x) => `mesh:${x}`), ...syn.brep.map((x) => `brep:${x}`)].sort().join(), `「${label}」底下的名字和登记的不一样`);
    }
    for (const syn of SYNONYMS) assert(byLabel.has(syn.label), `登记的「${syn.label}」两张表里都没用`);
  });
  it("类型、大小的说法", () => {
    eq(typeSay("bool"), "是 / 否"); eq(typeSay("int"), "整数"); eq(typeSay("floats:2"), "2 个小数");
    eq(bytesSay(12), "12 B"); eq(bytesSay(1536), "1.5 KB"); eq(bytesSay(200 * 1024), "200 KB"); eq(bytesSay(3 * 1024 * 1024), "3.0 MB");
  });
});

describe("按环造边核值：内核的快路和造边同一个规矩（MeshKernel.edgeDisagrees ↔ columns.ts edgeColumnValues）", () => {
  it("随机的旧样子（有的列缺着、有的值不一样）上，一份 / 一块 / 新长：快路说一样 ⟺ edgeColumnValues 算出来的值逐列等于边身上的；说不一样时报的就是第一列对不上的", () => {
    let seed = 3; const rnd = (): number => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    const defs: ColumnDef[] = [
      { id: "a", on: "edge", type: "bool", continuous: false, fill: 0, merge: "defaultIfMixed" },
      { id: "b", on: "edge", type: "int", continuous: false, fill: -1, merge: "first" },
      { id: "c", on: "edge", type: "bool", continuous: false, fill: 1, merge: "firstNonDefault" },
    ];
    const k = new MeshKernel(); addBox(k, { x: 0, y: 0, z: 0 }, { x: 1, y: 1, z: 1 }); for (const d of defs) k.addColumn(d);
    const cols = defs.map((d) => k.column(d.id) as EdgeColumn), es = k.edges();
    let agree = 0, disagree = 0;
    for (let i = 0; i < 3000; i++) {
      const e = es[Math.floor(rnd() * es.length)];
      k.setEdgeValue(e, "a", rnd() < 0.5 ? 1 : 0); k.setEdgeValue(e, "b", Math.floor(rnd() * 3) - 1); k.setEdgeValue(e, "c", rnd() < 0.5 ? 1 : 0);
      const kind = (["piece", "copy", "grown"] as const)[Math.floor(rnd() * 3)];
      const values = rnd() < 0.15 ? null : new Map(defs.filter(() => rnd() < 0.8).map((d) => [d.id, d.type === "int" ? Math.floor(rnd() * 3) - 1 : rnd() < 0.5 ? 1 : 0] as const));
      const origin: EdgeOrigin = kind === "grown" ? { kind } : { kind, of: { a: 0, b: 1, values } };
      const want = edgeColumnValues(cols, origin).values, have = defs.map((d) => k.edgeValue(e, d.id)!);
      const firstBad = want.findIndex((w, j) => w !== have[j]), got = k.edgeDisagrees(e, origin);
      if (firstBad < 0) { eq(got, null, `第 ${i} 次：值一样，快路却说不一样`); agree++; }
      else { eq(JSON.stringify(got), JSON.stringify({ id: defs[firstBad].id, have: have[firstBad], want: want[firstBad] }), `第 ${i} 次`); disagree++; }
    }
    assert(agree > 200 && disagree > 200, `两种都要碰到：一样 ${agree}、不一样 ${disagree}`);
  });
});
