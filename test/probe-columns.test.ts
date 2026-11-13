// 探针列（属性地基轮 3d，统筹 11-13 / 规程第九½节）：一列全 1 的边列、一列全 7 的面列，照 src/mesh/edge-mark-rules.ts 的 OPS 表逐个操作跑一个典型例子。created 2026-11-13 by Claude Opus 5.5
// 钉：表里写了 piece / copy / joined = 这个例子里一定有带着值（1 / 7）的新元素；写了 grown / fresh = 一定有缺省值（0）的新元素；没写的那一类一个都不许有；
//    没动的元素值不变；做完自检干净。「新元素」= 编号新的，或编号没变但两头 / 环（点的集合）变了的。
//    探针列不是保留名（谁都不认识它的名字）：操作要是按名字手抄标记、或者造了空元素回头补，这里会露出来（该带值的成了 0，或者不该有 0 的冒出 0）。
// 守卫：表里每个函数在 RUN 里有一个例子（新加一个操作 = 表里一行 + 这里一个例子），RUN 里没有表里不认识的。
// 快慢补丁（统筹 11-13 深夜）起也跑 ops 文件夹以外造元素的地方（ELSEWHERE：镜像 / 对称化、并物件）；并物件 = 源的列原样带过来（given = 带值）。
import { describe, it, eq, assert } from "./runner.mjs";
import { MeshKernel } from "../src/mesh/mesh-kernel.ts";
import { FRESH, type ColumnDef } from "../src/mesh/columns.ts";
import { ELSEWHERE, OPS, type Birth, type OpsRow } from "../src/mesh/edge-mark-rules.ts";
import * as Mir from "../src/mesh/mirror.ts";
import { appendMesh } from "../src/editor/ops.ts";
import type { MeshBody } from "../src/scene/scene.ts";
import * as Ops from "../src/mesh/ops/index.ts";
import { translation } from "../src/scene/xform.ts";
import type { Pt3 } from "../src/kernel/geom.ts";

const P = (x: number, y: number, z: number): Pt3 => ({ x, y, z });
const PE: ColumnDef = { id: "probe_e", on: "edge", type: "bool", continuous: false, fill: 0, merge: "defaultIfMixed" };
const PF: ColumnDef = { id: "probe_f", on: "face", type: "int", continuous: false, fill: 0, merge: "first" };
const F = { o: P(0, 0, 0), x: P(1, 0, 0), y: P(0, 1, 0), z: P(0, 0, 1) };

const box = (): MeshKernel => { const k = new MeshKernel(); Ops.addBox(k, P(0, 0, 0), P(1, 1, 1)); return k; };
const top = (k: MeshKernel): number => k.faces().find((f) => k.facePts(f).every((p) => p.z === 1))!;
const quad = (): MeshKernel => { const k = new MeshKernel(); Ops.addPolygon(k, [P(0, 0, 0), P(1, 0, 0), P(1, 1, 0), P(0, 1, 0)]); return k; };
/** 两张共一条边、在同一个平面里的四边形（并面、溶解用）。 */
const twoQuads = (): { k: MeshKernel; shared: number } => {
  const k = new MeshKernel(), v = [P(0, 0, 0), P(1, 0, 0), P(2, 0, 0), P(2, 1, 0), P(1, 1, 0), P(0, 1, 0)].map((p) => k.addVertex(p));
  k.addFace([v[0], v[1], v[4], v[5]], FRESH); k.addFace([v[1], v[2], v[3], v[4]], FRESH);
  return { k, shared: k.edgeOf(v[1], v[4]) };
};
const boundaryEdge = (k: MeshKernel): number => k.edges().find((e) => k.eFaces(e).length === 1)!;
/** 两个盒子中间夹一堵 x = 0 的墙（墙的每条边挂三张面 = 对称化留下的夹层面那种）。 */
const walled = (): MeshKernel => {
  const k = new MeshKernel(), v = new Map<string, number>(), V = (x: number, y: number, z: number): number => { const key = `${x},${y},${z}`; let i = v.get(key); if (i === undefined) { i = k.addVertex(P(x, y, z)); v.set(key, i); } return i; };
  for (const [x0, x1] of [[-1, 0], [0, 1]]) {
    k.addFace([V(x0, 0, 0), V(x0, 1, 0), V(x1, 1, 0), V(x1, 0, 0)], FRESH); k.addFace([V(x0, 0, 1), V(x1, 0, 1), V(x1, 1, 1), V(x0, 1, 1)], FRESH);
    k.addFace([V(x0, 0, 0), V(x1, 0, 0), V(x1, 0, 1), V(x0, 0, 1)], FRESH); k.addFace([V(x0, 1, 0), V(x0, 1, 1), V(x1, 1, 1), V(x1, 1, 0)], FRESH);
  }
  k.addFace([V(-1, 0, 0), V(-1, 0, 1), V(-1, 1, 1), V(-1, 1, 0)], FRESH); k.addFace([V(1, 0, 0), V(1, 1, 0), V(1, 1, 1), V(1, 0, 1)], FRESH);
  k.addFace([V(0, 0, 0), V(0, 1, 0), V(0, 1, 1), V(0, 0, 1)], FRESH);   // 墙
  return k;
};
/** 一份网格体（并物件用）：材质槽、排法速查表都空着。 */
const bodyOf = (k: MeshKernel): MeshBody => ({ kind: "mesh", kernel: k, materialSlots: [], uvSetSlots: [] });

/** 每个操作：一个起手的样子（探针列在它之后才加、全设好）+ 做这个操作。 */
interface Case { readonly start: () => MeshKernel; readonly run: (k: MeshKernel) => void }
const C = (start: () => MeshKernel, run: (k: MeshKernel) => void): Case => ({ start, run });
let shared = -1;
const RUN: Record<string, Case> = {
  "bevel.ts:bevelEdges": C(box, (k) => { Ops.bevelEdges(k, [k.fEdges(top(k))[0]], 0.1, 2); }),
  "bevel.ts:bevelVerts": C(box, (k) => { Ops.bevelVerts(k, [k.faceVerts(top(k))[0]], 0.1); }),
  "build.ts:addPolygon": C(box, (k) => { Ops.addPolygon(k, [P(3, 0, 0), P(4, 0, 0), P(4, 1, 0)]); }),
  "build.ts:fillLoop": C(box, (k) => { const vs = [P(3, 0, 0), P(4, 0, 0), P(4, 1, 0)].map((p) => k.addVertex(p)); Ops.fillLoop(k, vs); }),
  "build.ts:addBox": C(box, (k) => { Ops.addBox(k, P(3, 0, 0), P(4, 1, 1)); }),
  "cleanup.ts:limitedDissolve": C(() => { const k = box(), t = top(k), r = k.faceVerts(t); Ops.splitFace(k, t, r[0], r[2]); Ops.splitEdge(k, k.edgeOf(r[1], r[2]), 0.5); return k; }, (k) => { Ops.limitedDissolve(k, 5); }),
  "cleanup.ts:removeDoubles": C(() => { const k = box(), c = k.pt(k.faceVerts(top(k))[0]); const v = [c, P(c.x + 2, c.y, c.z), P(c.x + 2, c.y + 1, c.z)].map((p) => k.addVertex(p)); k.addFace(v, FRESH); return k; }, (k) => { Ops.removeDoubles(k, 1e-6); }),
  "delete.ts:deleteFaces": C(box, (k) => { Ops.deleteFaces(k, [top(k)]); }),
  "delete.ts:deleteEdges": C(box, (k) => { Ops.deleteEdges(k, [k.fEdges(top(k))[0]]); }),
  "delete.ts:deleteVerts": C(box, (k) => { Ops.deleteVerts(k, [k.faceVerts(top(k))[0]]); }),
  "delete.ts:deleteSelection": C(() => { const t = twoQuads(); shared = t.shared; return t.k; }, (k) => { Ops.deleteSelection(k, { edges: [shared] }, true); }),
  "duplicate.ts:duplicateGeometry": C(box, (k) => { Ops.duplicateGeometry(k, { faces: [top(k)] }); }),
  "duplicate.ts:fillOrBridge": C(() => { const k = new MeshKernel(); Ops.addPolygon(k, [P(0, 0, 0), P(1, 0, 0), P(1, 1, 0), P(0, 1, 0)]); Ops.addPolygon(k, [P(0, 0, 2), P(0, 1, 2), P(1, 1, 2), P(1, 0, 2)]); return k; }, (k) => { const r = Ops.fillOrBridge(k, { edges: k.edges() }); assert(typeof r !== "string", String(r)); }),
  "extrude.ts:extrudeFaces": C(box, (k) => { Ops.extrudeFaces(k, [top(k)]); }),
  "extrude.ts:extrudeEdges": C(quad, (k) => { Ops.extrudeEdges(k, [boundaryEdge(k)]); }),
  "extrude.ts:extrudeVerts": C(box, (k) => { Ops.extrudeVerts(k, [k.faceVerts(top(k))[0]]); }),
  "extrude.ts:extrudeAndOffset": C(box, (k) => { Ops.extrudeAndOffset(k, { faces: [top(k)] }, P(0, 0, 0.5)); }),
  "extrude.ts:extrudeAlongNormals": C(quad, (k) => { Ops.extrudeAlongNormals(k, { edges: [boundaryEdge(k)] }, 0.3); }),
  "geometry.ts:moveVerts": C(box, (k) => { const v = k.faceVerts(top(k))[0]; Ops.moveVerts(k, [{ v, to: P(0.2, 0.2, 1.3) }]); }),
  "geometry.ts:translateVerts": C(box, (k) => { Ops.translateVerts(k, k.faceVerts(top(k)), P(0, 0, 0.5)); }),
  "geometry.ts:transformVerts": C(box, (k) => { Ops.transformVerts(k, k.faceVerts(top(k)), translation(P(0.1, 0, 0))); }),
  "geometry.ts:setFaceMaterial": C(box, (k) => { Ops.setFaceMaterial(k, [top(k)], 2); }),
  "geometry.ts:flipFaces": C(box, (k) => { Ops.flipFaces(k, [top(k)]); }),
  "inset.ts:insetFaces": C(box, (k) => { Ops.insetFaces(k, [top(k)], 0.1); }),
  "join.ts:joinFaces": C(() => { const t = twoQuads(); shared = t.shared; return t.k; }, (k) => { Ops.joinFaces(k, shared); }),
  "join.ts:dissolveVertex": C(() => { const k = box(); Ops.splitEdge(k, k.fEdges(top(k))[0], 0.5); return k; }, (k) => { const v = k.verts().find((x) => k.vEdges(x).length === 2)!; Ops.dissolveVertex(k, v); }),
  "loopcut.ts:loopCut": C(box, (k) => { Ops.loopCut(k, k.fEdges(top(k))[0], 0.5); }),
  "loopcut.ts:loopCuts": C(box, (k) => { Ops.loopCuts(k, k.fEdges(top(k))[0], 2, 0.5); }),
  "merge.ts:mergeVerts": C(box, (k) => { const r = k.faceVerts(top(k)); Ops.mergeVerts(k, [r[0], r[1]], "center"); }),
  "orient.ts:recalcNormals": C(() => { const k = box(); Ops.flipFaces(k, [top(k)]); return k; }, (k) => { Ops.recalcNormals(k, { outside: true }); }),
  "primitives.ts:addPrimitive": C(box, (k) => { Ops.addPrimitive(k, "cylinder", { ...F, o: P(4, 0, 0) }, [0.5, 0.5, 1], 8); }),
  "split.ts:splitEdge": C(box, (k) => { Ops.splitEdge(k, k.fEdges(top(k))[0], 0.3); }),
  "split.ts:splitFace": C(box, (k) => { const t = top(k), r = k.faceVerts(t); Ops.splitFace(k, t, r[0], r[2]); }),
  "split.ts:knife": C(box, (k) => { const t = top(k), es = k.fEdges(t); Ops.knife(k, t, [{ e: es[0], t: 0.5 }, { e: es[2], t: 0.5 }]); }),
  "subdivide.ts:catmullClark": C(box, (k) => { Ops.catmullClark(k); }),
  "subdivide.ts:subdivide": C(box, (k) => { Ops.subdivide(k, 1); }),
  // ops 文件夹以外（ELSEWHERE）
  "mesh/mirror.ts:bisectPlane": C(() => { const k = new MeshKernel(); Ops.addBox(k, P(-0.5, 0, 0), P(0.5, 1, 1)); return k; }, (k) => { Mir.bisectPlane(k, 0); }),
  "mesh/mirror.ts:symmetrize": C(() => { const k = new MeshKernel(); Ops.addBox(k, P(-0.3, 0, 0), P(0.7, 1, 1)); return k; }, (k) => { Mir.symmetrize(k, 0, 1); }),
  "mesh/mirror.ts:removeSeamWalls": C(walled, (k) => { eq(Mir.removeSeamWalls(k, 0), 1, "夹层面去掉一张"); }),
  "mesh/mirror.ts:snapToSymmetry": C(() => { const k = new MeshKernel(); Ops.addBox(k, P(-0.5, 0, 0), P(0.5, 1, 1)); const v = k.verts().find((x) => k.pt(x).x === 0.5)!; k.setPos(v, { ...k.pt(v), x: 0.503 }); return k; }, (k) => { Mir.snapToSymmetry(k, k.verts(), 0, 0.01); }),
  "editor/ops.ts:appendMesh": C(box, (k) => {
    const src = box(); src.addColumn(PE); src.addColumn(PF);   // 源也带着这两列（全 1 / 全 7）：并过来的面和边要原样带着
    for (const e of src.edges()) src.setEdgeValue(e, PE.id, 1);
    for (const f of src.faces()) src.setFaceValue(f, PF.id, 7);
    appendMesh(bodyOf(k), bodyOf(src), translation(P(3, 0, 0)));
  }),
};

const ekey = (k: MeshKernel, e: number): string => { const a = k.edgeA[e], b = k.edgeB[e]; return a < b ? `${a},${b}` : `${b},${a}`; };
const fkey = (k: MeshKernel, f: number): string => [...k.faceVerts(f)].sort((a, b) => a - b).join(",");
const INHERIT: readonly Birth[] = ["piece", "copy", "joined", "given"], DEFAULT: readonly Birth[] = ["grown", "fresh"];
const tally = (k: MeshKernel, before: Map<number, string>, keyOf: (k: MeshKernel, x: number) => string, xs: readonly number[], read: (x: number) => number | null, carried: number) => {
  let inherited = 0, defaulted = 0; const oldChanged: number[] = [], odd: string[] = [];
  for (const x of xs) {
    const v = read(x), isNew = before.get(x) !== keyOf(k, x);
    if (!isNew) { if (v !== carried) oldChanged.push(x); continue; }
    if (v === carried) inherited++; else if (v === 0) defaulted++; else odd.push(`${x}=${v}`);
  }
  return { inherited, defaulted, oldChanged, odd };
};

/** 表的全部行：ops 文件夹（键 = 文件名）+ 别处（键 = src 下的路径）。 */
const ROWS: readonly (readonly [string, OpsRow])[] = [...Object.entries(OPS), ...Object.entries(ELSEWHERE)];

describe("探针列：照 OPS 表逐个操作看来历（一份 / 一块 / 并成带值，新长 / 凭空来的是缺省值）", () => {
  it("守卫：表里每个函数（ops 文件夹 + ELSEWHERE）在这里有一个例子，这里没有表里不认识的", () => {
    const listed = ROWS.flatMap(([file, row]) => Object.keys(row.ops).map((fn) => `${file}:${fn}`)).sort();
    eq(listed.filter((x) => !RUN[x]).join(", "), "", "表里新加了操作 = 这里加一个例子");
    eq(Object.keys(RUN).filter((x) => !listed.includes(x)).sort().join(", "), "", "这里的例子表里没有");
  });
  for (const [file, row] of ROWS) for (const [fn, births] of Object.entries(row.ops)) {
    it(`${file} ${fn}：新边 [${births.edges.join(" ") || "无"}]、新面 [${births.faces.join(" ") || "无"}]`, () => {
      const c = RUN[`${file}:${fn}`]; assert(!!c, "没有例子");
      const k = c.start(); k.addColumn(PE); k.addColumn(PF);
      for (const e of k.edges()) k.setEdgeValue(e, PE.id, 1);
      for (const f of k.faces()) k.setFaceValue(f, PF.id, 7);
      const be = new Map(k.edges().map((e) => [e, ekey(k, e)])), bf = new Map(k.faces().map((f) => [f, fkey(k, f)]));
      c.run(k);
      eq(k.check().join("；"), "", "自检干净");
      const E = tally(k, be, ekey, k.edges(), (e) => k.edgeValue(e, PE.id), 1), Fc = tally(k, bf, fkey, k.faces(), (f) => k.faceValue(f, PF.id), 7);
      eq(E.oldChanged.join(","), "", "没动的边值不变"); eq(Fc.oldChanged.join(","), "", "没动的面值不变");
      eq(E.odd.join(","), "", "边上只有 1 或 0"); eq(Fc.odd.join(","), "", "面上只有 7 或 0");
      const want = (bs: readonly Birth[], set: readonly Birth[]): boolean => bs.some((b) => set.includes(b));
      eq(E.inherited > 0, want(births.edges, INHERIT), `带值的新边 ${E.inherited} 条（表：${births.edges.join(" ") || "无"}）`);
      eq(E.defaulted > 0, want(births.edges, DEFAULT), `缺省值的新边 ${E.defaulted} 条（表：${births.edges.join(" ") || "无"}）`);
      eq(Fc.inherited > 0, want(births.faces, INHERIT), `带值的新面 ${Fc.inherited} 张（表：${births.faces.join(" ") || "无"}）`);
      eq(Fc.defaulted > 0, want(births.faces, DEFAULT), `缺省值的新面 ${Fc.defaulted} 张（表：${births.faces.join(" ") || "无"}）`);
    });
  }
});
