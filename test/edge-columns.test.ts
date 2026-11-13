// 边上的列 + 布尔 + 边的来历（属性地基轮第三步 3a；规程 ai-docs/20261112-attribute-protocol.md 第九½节的接口要求 a / b / e / f / h）。created 2026-11-13 by Claude Opus 5.5
// 列名都是测试自己起的（引擎只认声明）。3a 行为零改动：现有的标记还在老数组里，这里只钉新接口。
import { describe, it, eq, assert } from "./runner.mjs";
import { MeshKernel, type ColumnDef } from "../src/mesh/mesh-kernel.ts";
import { FRESH, GROWN_EDGE } from "../src/mesh/columns.ts";
import { addBox, mergeVerts } from "../src/mesh/ops/index.ts";
import { Scene } from "../src/scene/scene.ts";
import { applyOp, type Op } from "../src/editor/ops.ts";
import { History } from "../src/editor/history.ts";
import { mintGuid } from "../src/format/guid.ts";
import { IDENTITY } from "../src/scene/xform.ts";
import { UV_AT_COL, UV_SET_COL } from "../src/scene/uv.ts";
import { sceneBox } from "./format-scenes.ts";
import type { Pt3 } from "../src/kernel/geom.ts";

const P = (x: number, y: number, z = 0): Pt3 => ({ x, y, z });
const FLAG: ColumnDef = { id: "flag", on: "edge", type: "bool", continuous: false, fill: 0, merge: "defaultIfMixed" };   // 都有才留
const ANY: ColumnDef = { id: "any", on: "edge", type: "bool", continuous: false, fill: 0, merge: "firstNonDefault" };   // 有一个就留
const NUM: ColumnDef = { id: "num", on: "edge", type: "int", continuous: false, fill: -1, merge: "first" };
const SIDE: ColumnDef = { id: "side", on: "face", type: "bool", continuous: false, fill: 0, merge: "defaultIfMixed" };
const clean = (k: MeshKernel, where: string): void => { const bad = k.check(); eq(bad.length, 0, `${where}：${bad.slice(0, 3).join("；")}`); };
const throws = (f: () => void, re: RegExp): void => { let m = ""; try { f(); } catch (e) { m = String(e); } assert(re.test(m), m || "没抛"); };
/** 一排点 + 三列边上的列。 */
function line(n: number): { k: MeshKernel; v: number[] } {
  const k = new MeshKernel(); k.addColumn(FLAG); k.addColumn(ANY); k.addColumn(NUM);
  return { k, v: Array.from({ length: n }, (_, i) => k.addVertex(P(i, 0))) };
}

describe("边上的列：声明、造边按来历填值（接口要求 a / b）", () => {
  it("声明：边上的整数 / 布尔、面上的布尔能加；列清单和几何计数", () => {
    const k = new MeshKernel(); addBox(k, P(0, 0, 0), P(1, 1, 1));
    k.addColumn(FLAG); k.addColumn(NUM); k.addColumn(SIDE);
    eq(k.columnDefs().map((d) => d.id).join(), "side,flag,num");
    eq(JSON.stringify(k.columnList()), JSON.stringify([
      { id: "side", on: "face", type: "bool", count: 6, bytes: 6 },
      { id: "flag", on: "edge", type: "bool", count: 12, bytes: 12 },
      { id: "num", on: "edge", type: "int", count: 12, bytes: 48 },
    ]));
    eq(JSON.stringify(k.elementCounts()), JSON.stringify({ points: 8, edges: 12, faces: 6, corners: 24, wires: 0 }));
    for (const e of k.edges()) { eq(k.edgeValue(e, "flag"), 0); eq(k.edgeValue(e, "num"), -1); }
    clean(k, "加列");
  });
  it("addEdge：带着来历造新边，值当场填好；对已经在的边申报来历 = 抛；自环 / 死点 = 抛", () => {
    const { k, v } = line(4);
    const e0 = k.addEdge(v[0], v[1], { kind: "fresh", values: new Map([["flag", 1], ["num", 5]]) });
    eq(k.edgeValue(e0, "flag"), 1); eq(k.edgeValue(e0, "num"), 5); eq(k.edgeValue(e0, "any"), 0, "没给的列 = 缺省值");
    throws(() => k.addEdge(v[1], v[0], GROWN_EDGE), /already exists/);
    throws(() => k.addEdge(v[2], v[2], GROWN_EDGE), /loop edge/);
    throws(() => k.addEdge(v[2], 99, GROWN_EDGE), /not alive/);
    throws(() => k.addEdge(v[2], v[3], { kind: "fresh", values: new Map([["flag", 2]]) }), /bool column flag got 2/);
    eq(k.edgeOf(v[2], v[3]), -1, "抛了就没造");
    eq(k.ensureEdge(v[0], v[1]), e0, "ensureEdge 找到已经在的就原样返回、不碰值"); eq(k.edgeValue(e0, "flag"), 1);
  });
  it("一块 / 一份 = 照抄；新长 = 缺省值；并成 = 每列照自己的规则取、来源不一样进边的报告（和面同形）", () => {
    const { k, v } = line(8);
    const src = k.addEdge(v[0], v[1], { kind: "fresh", values: new Map([["flag", 1], ["any", 1], ["num", 3]]) }), shape = k.edgeShape(src);
    for (const kind of ["piece", "copy"] as const) { const e = k.addEdge(v[2], v[3], { kind, of: shape }); eq([k.edgeValue(e, "flag"), k.edgeValue(e, "any"), k.edgeValue(e, "num")].join(), "1,1,3", kind); k.setWire(e, true); k.removeEdge(e); }
    const g = k.addEdge(v[2], v[3], GROWN_EDGE); eq([k.edgeValue(g, "flag"), k.edgeValue(g, "any"), k.edgeValue(g, "num")].join(), "0,0,-1", "新长");
    const other = k.addEdge(v[4], v[5], { kind: "fresh", values: new Map([["num", 9]]) });
    k.takeReport();
    const j = k.addEdge(v[6], v[7], { kind: "joined", of: [shape, k.edgeShape(other)] });
    eq([k.edgeValue(j, "flag"), k.edgeValue(j, "any"), k.edgeValue(j, "num")].join(), "0,1,3", "都有才留 / 有一个就留 / 取最前的");
    const r = k.takeReport().oddEdges.get(j)!;
    assert(r !== undefined, "并成不一样进报告");
    eq(JSON.stringify([...r.edge]), JSON.stringify([["flag", [1, 0]], ["any", [1, 0]], ["num", [3, 9]]]), "每列带各来源的值");
    eq(k.takeReport().oddEdges.size, 0, "拿过就清空");
  });
  it("报告的标记跟着来历传：并成对不上的边再被抄一份，新边也带着；边删了就不报", () => {
    const { k, v } = line(8);
    const a = k.addEdge(v[0], v[1], { kind: "fresh", values: new Map([["flag", 1]]) }), b = k.addEdge(v[2], v[3], GROWN_EDGE);
    const j = k.addEdge(v[4], v[5], { kind: "joined", of: [k.edgeShape(a), k.edgeShape(b)] });
    const c = k.addEdge(v[6], v[7], { kind: "copy", of: k.edgeShape(j) });
    const r = k.takeReport().oddEdges;
    assert(r.has(j) && r.has(c), "抄的那条也带着标记"); eq(JSON.stringify(r.get(c)!.edge.get("flag")), "[1,0]");
    const d = k.addEdge(v[1], v[2], { kind: "joined", of: [k.edgeShape(a), k.edgeShape(b)] }); k.setWire(d, true); k.removeEdge(d);
    eq(k.takeReport().oddEdges.has(d), false, "边删了不报");
  });
  it("addFace 顺手补的缺边 = 新长（缺省值）；空出来的编号再用，值按来历重写（不留上一条边的）", () => {
    const { k, v } = line(4);
    const e = k.addEdge(v[0], v[1], { kind: "fresh", values: new Map([["flag", 1], ["num", 7]]) });
    k.setWire(e, true); k.removeEdge(e);
    const f = k.addFace([v[0], v[1], v[2]], -1, FRESH);
    for (const x of k.fEdges(f)) { eq(k.edgeValue(x, "flag"), 0, `边 ${x}`); eq(k.edgeValue(x, "num"), -1); }
    assert(k.fEdges(f).includes(e), "空出来的编号被再用了"); clean(k, "加面");
  });
  it("合并点：几条边并成同一对点 = 并成（先后 = 编号从小到大），每列照自己的规则；只换一头的边值不动", () => {
    const k = new MeshKernel(); k.addColumn(FLAG); k.addColumn(ANY); k.addColumn(NUM);
    const v = [P(0, 0), P(1, 0), P(1, 1), P(1, -0.1), P(1, -1), P(2, 0)].map((p) => k.addVertex(p));
    k.addFace([v[0], v[1], v[2]], -1, FRESH); k.addFace([v[0], v[4], v[3]], -1, FRESH);
    const e01 = k.edgeOf(v[0], v[1]), e03 = k.edgeOf(v[0], v[3]), e12 = k.edgeOf(v[1], v[2]);
    k.setEdgeValue(e01, "flag", 1); k.setEdgeValue(e01, "num", 4); k.setEdgeValue(e03, "any", 1); k.setEdgeValue(e03, "num", 8); k.setEdgeValue(e12, "flag", 1);
    k.takeReport();
    mergeVerts(k, [v[1], v[3]], "first"); clean(k, "合并");
    const kept = k.edgeOf(v[0], v[1]); eq(kept, Math.min(e01, e03));
    eq([k.edgeValue(kept, "flag"), k.edgeValue(kept, "any"), k.edgeValue(kept, "num")].join(), [0, 1, e01 < e03 ? 4 : 8].join());
    const r = k.takeReport().oddEdges.get(kept); assert(r !== undefined, "来源不一样进报告"); eq([...r!.edge.keys()].sort().join(), "any,flag,num");
    eq(k.edgeValue(e12, "flag"), 1, "边 1–2 没动");
    const k2 = new MeshKernel(); k2.addColumn(FLAG); const w = [P(0, 0), P(1, 0), P(2, 0), P(1, 1)].map((p) => k2.addVertex(p));
    k2.addFace([w[0], w[1], w[3]], -1, FRESH); const e13 = k2.edgeOf(w[1], w[3]); k2.setEdgeValue(e13, "flag", 1); k2.addVertex(P(5, 5));
    mergeVerts(k2, [w[2], w[1]], "first");   // 点 2 只是孤点：合并之后边 1–3 一头都没换，值原样
    eq(k2.edgeValue(e13, "flag"), 1);
  });
  it("裸线位是结构位（isWire / setWire），不在列清单里", () => {
    const { k, v } = line(2);
    const e = k.addEdge(v[0], v[1], GROWN_EDGE); k.setWire(e, true);
    assert(k.isWire(e)); eq(k.elementCounts().wires, 1); clean(k, "裸线");
    assert(!k.columnList().some((c) => /wire/.test(c.id)));
  });
});

describe("读的人拿着「列」这个对象（接口要求 e）", () => {
  it("data 永远是现在那一条：拿着对象、数组扩容之后读到的是新值；删了列 = 再问是 null；rev 跟着变", () => {
    const { k, v } = line(2);
    const col = k.column("flag")!, before = col.data;
    const extra = Array.from({ length: 40 }, (_, i) => k.addVertex(P(i, 1)));
    let last = -1; for (let i = 0; i + 1 < extra.length; i++) { last = k.addEdge(extra[i], extra[i + 1], { kind: "fresh", values: new Map([["flag", 1]]) }); k.setWire(last, true); }
    assert(col.data !== before, "扩容换了数组"); eq(col.data[last], 1, "拿着的对象读到新值"); eq(before.length < k.edgeCount(), true);
    const rev = k.rev; assert(k.removeColumn("flag")); assert(k.rev !== rev, "删列 rev 变"); eq(k.column("flag"), null); eq(k.removeColumn("flag"), false);
    eq(k.column("nope"), null); void v;
  });
});

describe("撤销：第一次写才出现的列、删掉的列（接口要求 f）", () => {
  const snap = (k: MeshKernel): string => JSON.stringify(k.toSnapshot());
  it("内核：提交 = 影子换真身、撤销 = 再换一次；加列 / 删列之后撤销，「有没有这一列」和每个值都和之前一样", () => {
    const k = new MeshKernel(); addBox(k, P(0, 0, 0), P(1, 1, 1)); k.addColumn(NUM);
    for (const e of k.edges()) k.setEdgeValue(e, "num", e * 3);
    const s0 = snap(k);
    const sh = k.clone(); sh.addColumn(FLAG); sh.setEdgeValue(sh.edges()[2], "flag", 1); sh.addColumn(SIDE); sh.setFaceValue(sh.faces()[1], "side", 1);
    k.swapWith(sh);   // 提交
    assert(k.hasColumn("flag") && k.hasColumn("side"));
    k.swapWith(sh);   // 撤销
    assert(!k.hasColumn("flag") && !k.hasColumn("side"), "撤销之后新加的列没了"); eq(snap(k), s0, "值逐位一样");
    k.swapWith(sh); eq(k.edgeValue(k.edges()[2], "flag"), 1, "重做回来"); k.swapWith(sh);
    const sh2 = k.clone(); sh2.removeColumn("num"); k.swapWith(sh2);
    assert(!k.hasColumn("num")); k.swapWith(sh2);
    assert(k.hasColumn("num"), "撤销删列 = 列回来"); eq(snap(k), s0, "值逐位一样");
  });
  it("真的 History：开始画第一次写贴图坐标那两列 → 撤销没有、重做有、值一样", () => {
    let s = new Scene(); const d = s.mintDef("网格", sceneBox()); s.mintInstance(s.root, null, d.id, IDENTITY);
    s = applyOp(s, { op: "castDefinition", def: d.id, to: "mesh" }).scene;
    const m = new MeshKernel(); addBox(m, P(0, 0, 0), P(2, 1, 1)); s.mesh(d.id).kernel = m;
    const h = new History(s), k = (): MeshKernel => s.mesh(d.id).kernel;
    assert(!k().hasColumn(UV_SET_COL.id) && !k().hasColumn(UV_AT_COL.id));
    const op: Op = { op: "startPaint", def: d.id, faces: k().faces(), uvSet: mintGuid(), textureGuid: mintGuid(), materialGuid: mintGuid(), names: { uvSet: "UV", paint: "画", material: "画" }, color: [0.5, 0.5, 0.5] };
    s = h.commit(s, op, false).scene;
    assert(k().hasColumn(UV_SET_COL.id) && k().hasColumn(UV_AT_COL.id), "第一次写建了列");
    const after = snap(k());
    const u = h.undo()!; s = u.scene;
    assert(!k().hasColumn(UV_SET_COL.id) && !k().hasColumn(UV_AT_COL.id), "撤销之后没有这两列");
    const r = h.redo(s)!; s = r.scene;
    eq(snap(k()), after, "重做之后列和值逐位一样");
  });
});

describe("快照、自检", () => {
  it("toSnapshot / fromSnapshot 带着边上的列来回逐位一样；没有边上的列的快照和以前一样（不多键）", () => {
    const k = new MeshKernel(); addBox(k, P(0, 0, 0), P(1, 1, 1)); k.addColumn(FLAG); k.addColumn(NUM);
    k.edges().forEach((e, i) => { k.setEdgeValue(e, "flag", i % 2); k.setEdgeValue(e, "num", i); });
    const s = k.toSnapshot(), back = MeshKernel.fromSnapshot(s);
    eq(JSON.stringify(back.toSnapshot()), JSON.stringify(s)); clean(back, "读回");
    const plain = new MeshKernel(); addBox(plain, P(0, 0, 0), P(1, 1, 1));
    assert(!("edge" in plain.toSnapshot()), "没有边上的列 = 没有 edge 键");
  });
  it("自检：布尔列的值只有 0 / 1；边上的列数组装得下所有的边", () => {
    const { k, v } = line(2);
    const e = k.addEdge(v[0], v[1], GROWN_EDGE); k.setWire(e, true);
    throws(() => k.setEdgeValue(e, "flag", 3), /0 or 1/);
    (k.column("flag")!.data as Uint8Array)[e] = 2;
    assert(k.check().some((x) => /bool column flag = 2/.test(x)), k.check().join("；"));
  });
});
