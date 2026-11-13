// 造面（Blender F；mesh/ops/make-face.ts 计划 + duplicate.ts makeFaceRing 造；统筹插队单 11-13）。created 2026-11-13 by Claude Opus 5.5
import { describe, it, eq, assert } from "./runner.mjs";
import { MeshKernel } from "../src/mesh/mesh-kernel.ts";
import { addBox, planMakeFace, makeFaceRing, fillOrBridge, ringNewell } from "../src/mesh/ops/index.ts";
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
  it("点不够：只选一个点 / 只选一条边", () => {
    const k = new MeshKernel(), a = k.addVertex(P(0, 0, 0)), b = k.addVertex(P(1, 0, 0));
    refuse(k, { verts: [a] }, "点不够"); refuse(k, { edges: [wire(k, a, b)] }, "点不够");
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
  });
  it("指令那一层自己再核一遍：直接递一个会挂三张面的点序也拒绝", () => {
    const k = new MeshKernel(); addBox(k, P(0, 0, 0), P(1, 1, 1));
    const r = makeFaceRing(k, [vAt(k, 0, 0, 0), vAt(k, 1, 0, 0), vAt(k, 1, 1, 1)]); assert(typeof r === "string" && r.includes("三张面"), String(r));
  });
});
