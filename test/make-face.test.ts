// 造面（Blender F；mesh/ops/make-face.ts 计划 + duplicate.ts makeFaceRing 造；统筹插队单 11-13）。created 2026-11-13 by Claude Opus 5.5
import { describe, it, eq, assert } from "./runner.mjs";
import { MeshKernel } from "../src/mesh/mesh-kernel.ts";
import { addBox, planMakeFace, makeFaceRing, fillOrBridge, ringNewell, loopCuts } from "../src/mesh/ops/index.ts";
import { FILL_CORNER_FROM_VERTEX } from "../src/mesh/ops/make-face.ts";
import { recalcNormals } from "../src/mesh/ops/orient.ts";

const P = (x: number, y: number, z: number) => ({ x, y, z });
const faceAtZ = (k: MeshKernel, z: number) => k.faces().find((f) => k.faceVerts(f).every((v) => Math.abs(k.pt(v).z - z) < 1e-9))!;
const vAt = (k: MeshKernel, x: number, y: number, z: number) => k.verts().find((v) => { const p = k.pt(v); return Math.abs(p.x - x) < 1e-9 && Math.abs(p.y - y) < 1e-9 && Math.abs(p.z - z) < 1e-9; })!;
const wire = (k: MeshKernel, a: number, b: number) => { const e = k.ensureEdge(a, b); k.setWire(e, true); return e; };
/** 计划 → 造：返回新面 / 新边，或者原因。 */
interface Made { face?: number; edge?: number; how?: string; err?: string }
function make(k: MeshKernel, sel: { verts?: number[]; edges?: number[] }, eye: { x: number; y: number; z: number } | null = null): Made {
  const p = planMakeFace(k, sel, eye);
  if (typeof p === "string") return { err: p };
  if (p.kind === "fill") { const r = fillOrBridge(k, sel); return typeof r === "string" ? { err: r } : { face: r.faces[0], how: "fill" }; }
  const r = makeFaceRing(k, p.kind === "edge" ? [p.a, p.b] : [...p.ring]);
  return typeof r === "string" ? { err: r } : { ...r, how: p.kind === "edge" ? "edge" : p.how };
}

describe("造面：五种选法", () => {
  it("① 一圈开口的边上的点 = 补洞（现成的补洞那条路）", () => {
    const k = new MeshKernel(); addBox(k, P(0, 0, 0), P(1, 1, 1)); k.removeFace(faceAtZ(k, 1));
    const r = make(k, { verts: [vAt(k, 0, 0, 1), vAt(k, 1, 0, 1), vAt(k, 1, 1, 1), vAt(k, 0, 1, 1)] });
    assert(!r.err && r.how === "fill", String(r)); eq(k.check().join(";"), ""); eq(recalcNormals(k.clone()).flipped, 0);
  });
  it("② 沿现成的边连成一条不闭合的链（开口盒子顶上三个点）= 把两头接上，朝向跟邻面", () => {
    const k = new MeshKernel(); addBox(k, P(0, 0, 0), P(1, 1, 1)); k.removeFace(faceAtZ(k, 1));
    const r = make(k, { verts: [vAt(k, 0, 0, 1), vAt(k, 1, 0, 1), vAt(k, 1, 1, 1)] });
    assert(!r.err && r.how === "chain" && r.face !== undefined, String(r));
    eq(k.faceVerts(r.face!).length, 3); eq(k.check().join(";"), ""); eq(recalcNormals(k.clone()).flipped, 0, "朝向和旁边的面一致");
    assert(ringNewell(k, k.faceVerts(r.face!)).z > 0, "开口朝上的盒子补上来的顶 = 朝外（+z）");
  });
  it("② 选的是链上的边（四边形只剩三条边）= 一样把两头接上", () => {
    const k = new MeshKernel(), a = k.addVertex(P(0, 0, 0)), b = k.addVertex(P(1, 0, 0)), c = k.addVertex(P(1, 1, 0)), d = k.addVertex(P(0, 1, 0));
    const es = [wire(k, a, b), wire(k, b, c), wire(k, c, d)];
    const r = make(k, { edges: es }, P(0.5, 0.5, 5));
    assert(!r.err && r.how === "chain", String(r)); eq(k.faceVerts(r.face!).length, 4); eq(k.check().join(";"), "");
    assert(ringNewell(k, k.faceVerts(r.face!)).z > 0, "旁边没有面 = 朝着眼睛（眼睛在 +z 上面）");
  });
  it("③ 两条不相邻的边 = 一张四边形（四个点按不交叉的那种排，面积 = 1）", () => {
    const k = new MeshKernel(), a = k.addVertex(P(0, 0, 0)), b = k.addVertex(P(1, 0, 0)), c = k.addVertex(P(0, 1, 0)), d = k.addVertex(P(1, 1, 0));
    const r = make(k, { edges: [wire(k, a, b), wire(k, c, d)] }, P(0, 0, 3));
    assert(!r.err && r.how === "quad", String(r));
    const n = ringNewell(k, k.faceVerts(r.face!)); eq(Math.round(Math.hypot(n.x, n.y, n.z) / 2 * 1e9) / 1e9, 1, "不交叉：面积是 1（交叉的蝴蝶结面积是 0）"); eq(k.check().join(";"), "");
  });
  it("④ 五个互不相连的点（乱序）= 按最贴合的平面绕一圈，面积 = 凸包；眼睛在下面 = 朝下", () => {
    const k = new MeshKernel(), pts = [P(1, 0, 2), P(-1, 0, 2), P(0, 1, 2), P(0.7, 0.7, 2), P(0, -1, 2)], vs = pts.map((p) => k.addVertex(p));
    const r = make(k, { verts: [vs[3], vs[0], vs[4], vs[1], vs[2]] }, P(0, 0, -10));
    assert(!r.err && r.how === "points", String(r));
    const n = ringNewell(k, k.faceVerts(r.face!)); assert(n.z < 0, "朝着眼睛（下面）"); eq(k.faceVerts(r.face!).length, 5); eq(k.check().join(";"), "");
    const area = Math.hypot(n.x, n.y, n.z) / 2, hull = 0.5 * (1 * 1) * 2 + 0.5 * 1 * 1 + 0.5 * Math.abs(1 * 0.7 - 0 * 0.7) + 0.5 * Math.abs(0.7 * 1 - 0.7 * 0);   // 绕一圈不自交：面积 = 各扇形之和
    assert(Math.abs(area - hull) < 1e-9, `面积 ${area} ≠ ${hull}`);
  });
  it("⑤ 两个点 = 连一条裸线", () => {
    const k = new MeshKernel(), a = k.addVertex(P(0, 0, 0)), b = k.addVertex(P(1, 0, 0));
    const r = make(k, { verts: [a, b] });
    assert(!r.err && r.edge !== undefined, String(r)); eq(k.edgeOf(a, b), r.edge!); eq(k.isWire(r.edge!), true); eq(k.faceCount(), 0);
  });
});

describe("造面：做不了要说原因（什么都不动）", () => {
  const refuse = (k: MeshKernel, sel: { verts?: number[]; edges?: number[] }, has: string) => { const f0 = k.faceCount(), e0 = k.edgeCount(), r = make(k, sel); assert(!!r.err && r.err.includes(has), `该说「${has}」，实际 ${JSON.stringify(r)}`); eq(k.faceCount(), f0); eq(k.edgeCount(), e0); };
  it("只选一个点 / 只选一条边、接不上东西：说具体怎么了（顺着填那条路），不只说「点不够」（统筹 11-13）", () => {
    const k = new MeshKernel(), a = k.addVertex(P(0, 0, 0)), b = k.addVertex(P(1, 0, 0));
    refuse(k, { verts: [a] }, "不在洞边上"); refuse(k, { edges: [wire(k, a, b)] }, "接不上开口边");
  });
  it("会造出一条边挂三张面（盒子底上一条已经挂两张面的边）", () => {
    const k = new MeshKernel(); addBox(k, P(0, 0, 0), P(1, 1, 1));
    refuse(k, { verts: [vAt(k, 0, 0, 0), vAt(k, 1, 0, 0), vAt(k, 1, 1, 1)] }, "三张面");
  });
  it("点在一条线上，没有面积", () => {
    const k = new MeshKernel(), vs = [P(0, 0, 0), P(1, 0, 0), P(2, 0, 0)].map((p) => k.addVertex(p));
    refuse(k, { verts: vs }, "一条线上");
  });
  it("这里已经有这张面了 / 这两个点之间已经有边了", () => {
    const k = new MeshKernel(), vs = [P(0, 0, 0), P(1, 0, 0), P(0, 1, 0)].map((p) => k.addVertex(p)); k.addFace(vs, { kind: "fresh" });
    refuse(k, { verts: vs.slice(0, 2).concat([vs[2]]) }, "已经有");
    const j = new MeshKernel(), a = j.addVertex(P(0, 0, 0)), b = j.addVertex(P(1, 0, 0)); wire(j, a, b);
    refuse(j, { verts: [a, b] }, "已经有边");
  });
  it("指令那一层：按点序连起来自己交叉（蝴蝶结）= 拒绝、说「交叉」（不是「一条线上」）", () => {
    const k = new MeshKernel(), [a, b, c, d] = [P(0, 0, 0), P(1, 0, 0), P(1, 1, 0), P(0, 1, 0)].map((p) => k.addVertex(p));
    const r = makeFaceRing(k, [a, c, b, d]); assert(typeof r === "string" && r.includes("交叉"), String(r)); eq(k.faceCount(), 0);
    const ok = makeFaceRing(k, [a, b, c, d]); assert(typeof ok !== "string", "同四个点按不交叉的顺序 = 造得出");
  });
  it("右键「补洞」在孤零零一张面上：不在它背面再叠一张（拒绝、说已经有这张面）", () => {
    const k = new MeshKernel(), vs = [P(0, 0, 0), P(1, 0, 0), P(0, 1, 0)].map((p) => k.addVertex(p)); k.addFace(vs, { kind: "fresh" });
    const r = fillOrBridge(k, { edges: k.edges() }); assert(typeof r === "string" && r.includes("已经有这张面"), String(r)); eq(k.faceCount(), 1);
    const h = new MeshKernel(); addBox(h, P(0, 0, 0), P(1, 1, 1)); h.removeFace(faceAtZ(h, 1));
    const ok = fillOrBridge(h, { edges: h.edges().filter((e) => h.eFaces(e).length === 1) }); assert(typeof ok !== "string", "真的洞照补");
    // 两面的盒子（每张面背后一张，转网格体「要出几侧就几张面」）删掉一侧再补回来 = 正当，照补（v0.19.102 把它也拦了，paint-invariant2 抓到）
    const d = new MeshKernel(); addBox(d, P(0, 0, 0), P(1, 1, 1)); for (const f of [...d.faces()]) d.addFace([...d.faceVerts(f)].reverse(), { kind: "fresh" });
    const top = faceAtZ(d, 1), ring = d.faceVerts(top); d.removeFace(top);
    const back = fillOrBridge(d, { edges: ring.map((v, i) => d.edgeOf(v, ring[(i + 1) % ring.length])) }); assert(typeof back !== "string", `删掉一侧再补回来：${String(back)}`);
  });
  it("指令那一层自己再核一遍：直接递一个会挂三张面的点序也拒绝", () => {
    const k = new MeshKernel(); addBox(k, P(0, 0, 0), P(1, 1, 1));
    const r = makeFaceRing(k, [vAt(k, 0, 0, 0), vAt(k, 1, 0, 0), vAt(k, 1, 1, 1)]); assert(typeof r === "string" && r.includes("三张面"), String(r));
  });
});

describe("顺着填（Blender 单边 / 单点 F：手册「Face from Single Vertex or Edge」+ 源码 tricky_extend_sel 三个函数）", () => {
  /** 计划 → 造 → 选区落到哪（按点说的对边 / 对点 → 这一份内核里的编号）。 */
  const press = (k: MeshKernel, sel: { verts?: number[]; edges?: number[] }): { err?: string; how?: string; n?: number; edge?: number; vert?: number } => {
    const p = planMakeFace(k, sel, null);
    if (typeof p === "string") return { err: p };
    if (p.kind !== "ring") return { err: `不是顺着填：${p.kind}` };
    const r = makeFaceRing(k, [...p.ring]);
    if (typeof r === "string") return { err: r };
    const a = p.after;
    return { how: p.how, n: p.ring.length, ...(a ? ("edge" in a ? { edge: k.edgeOf(a.edge[0], a.edge[1]) } : { vert: a.vert }) : {}) };
  };
  /** 长 5 的盒子切成 5 段，挖掉前面（y = 0）那一溜 5 张面 = 一条带子形的洞。 */
  const stripBox = (): { k: MeshKernel; left: number } => {
    const k = new MeshKernel(); addBox(k, P(0, 0, 0), P(5, 1, 1));
    const along = k.edges().find((e) => Math.abs(k.pt(k.edgeA[e]).x - k.pt(k.edgeB[e]).x) > 4)!; loopCuts(k, along, 4);
    for (const f of k.faces().filter((f) => k.faceVerts(f).every((v) => Math.abs(k.pt(v).y) < 1e-9))) k.removeFace(f);
    const left = k.edges().find((e) => [k.edgeA[e], k.edgeB[e]].every((v) => Math.abs(k.pt(v).x) < 1e-9 && Math.abs(k.pt(v).y) < 1e-9))!;
    return { k, left };
  };
  const openEdges = (k: MeshKernel) => k.edges().filter((e) => k.eFaces(e).length === 1);
  it("一条带子连按五下 F = 五张四边形，每次选区落在新的对边上；第六下 = 到头、说原因；洞补完、朝向一致", () => {
    const { k, left } = stripBox(); eq(openEdges(k).length, 12, "洞一圈 12 条边");
    let cur = left; const xs: number[] = [];
    for (let i = 0; i < 5; i++) {
      const r = press(k, { edges: [cur] });
      assert(!r.err && r.how === "strip" && r.n === 4 && r.edge !== undefined && r.edge >= 0, `第 ${i + 1} 下：${JSON.stringify(r)}`);
      cur = r.edge!; xs.push(Math.round(k.pt(k.edgeA[cur]).x * 1000) / 1000);
    }
    eq(xs.join(","), "1,2,3,4,5", "选区一格一格往右走"); eq(openEdges(k).length, 0, "洞补完了"); eq(k.check().join(";"), ""); eq(recalcNormals(k.clone()).flipped, 0, "朝向和邻面一致");
    const last = press(k, { edges: [cur] }); assert(!!last.err && last.err.includes("两边都有面"), `第六下：${JSON.stringify(last)}`);
  });
  it("一头分叉 = 不顺着填、说哪一头怎么了（不说「点不够」），什么都不动", () => {
    const k = new MeshKernel(), [a, b, c, d, e] = [P(0, 0, 0), P(1, 0, 0), P(-1, 1, 0), P(-1, -1, 0), P(2, 1, 0)].map((p) => k.addVertex(p));
    const w = (x: number, y: number) => { const g = k.ensureEdge(x, y); k.setWire(g, true); return g; };
    const ab = w(a, b); w(a, c); w(a, d); w(b, e);
    const f0 = k.faceCount(), r = press(k, { edges: [ab] });
    assert(!!r.err && r.err.includes("分叉") && !r.err.includes("点不够"), String(r.err)); eq(k.faceCount(), f0);
  });
  it("选的边两边都有面 = 「不在洞边上」", () => {
    const k = new MeshKernel(); addBox(k, P(0, 0, 0), P(1, 1, 1));
    const r = press(k, { edges: [k.edges()[0]] }); assert(!!r.err && r.err.includes("不在洞边上"), String(r.err));
  });
  it("一个点夹在两条开口边之间 = 拐角三角，选区落在对着它的边上；再按 F = 顺着填完收尾三角、选区落在对着原边的点上", () => {
    eq(FILL_CORNER_FROM_VERTEX, true);
    const k = new MeshKernel(); addBox(k, P(0, 0, 0), P(1, 1, 1)); k.removeFace(faceAtZ(k, 1));
    const r1 = press(k, { verts: [vAt(k, 0, 0, 1)] });
    assert(!r1.err && r1.how === "corner" && r1.n === 3 && r1.edge !== undefined, JSON.stringify(r1));
    const r2 = press(k, { edges: [r1.edge!] });
    assert(!r2.err && r2.how === "strip" && r2.n === 3 && r2.vert === vAt(k, 1, 1, 1), JSON.stringify(r2));
    eq(openEdges(k).length, 0); eq(k.check().join(";"), ""); eq(recalcNormals(k.clone()).flipped, 0);
  });
  it("一个点的两条开口边挨着同一张面（孤零零一张面的尖角）= 不补、说原因", () => {
    const k = new MeshKernel(), vs = [P(0, 0, 0), P(1, 0, 0), P(1, 1, 0), P(0, 1, 0)].map((p) => k.addVertex(p)); k.addFace(vs, { kind: "fresh" });
    const r = press(k, { verts: [vs[0]] }); assert(!!r.err && r.err.includes("尖角"), String(r.err)); eq(k.faceCount(), 1);
  });
});
