// 折线（纪元账本 DT87，2026-10-26 Claude Opus 5.5）：面内部的折痕。擦边亚种的分类、卫生不变量、灌面、OBJ 并回一个多边形、推拉不带、自动折面亚种。
import { describe, it, assert, eq } from "./runner.mjs";
import { Kernel } from "../src/kernel/kernel.ts";
import type { Pt3 } from "../src/kernel/kernel.ts";
import { polygonFaces, surfaceFaces } from "../src/kernel/flood.ts";
import { exportObj } from "../src/editor/obj-io.ts";
import { sceneFolded } from "./format-scenes.ts";
import { bakeDefinition } from "../src/format/bake.ts";

const P = (x: number, y: number, z: number): Pt3 => ({ x, y, z });
const edgeAt = (k: Kernel, a: Pt3, b: Pt3) => k.edges().find((e) => { const p = k.graph.pt(e.a), q = k.graph.pt(e.b); const same = (u: Pt3, v: Pt3) => Math.abs(u.x - v.x) < 1e-9 && Math.abs(u.y - v.y) < 1e-9 && Math.abs(u.z - v.z) < 1e-9; return (same(p, a) && same(q, b)) || (same(p, b) && same(q, a)); })!;

describe("折线（DT87）", () => {
  it("样本：不平的四边形 = 两张三角 + 一条折线；两块算一个面（灌面跨它）", () => {
    const k = sceneFolded();
    eq(k.faces().length, 2, "两张三角");
    const diag = edgeAt(k, P(0, 0, 0), P(1, 1, 0.25));
    assert(k.isFold(diag.id), "对角线是折线");
    const [f1, f2] = k.faces().map((f) => f.id);
    eq(polygonFaces(k, f1).sort().join(), [f1, f2].sort().join(), "一个多边形 = 两块");
    eq(surfaceFaces(k, f1).length, 2, "单击（平滑组）也跨折线");
  });
  it("擦边分类（Blender 亚种的护栏）：不共面两膜之间 → 折；边界 / 共面 → 照常擦；三张以上 → 拒绝", () => {
    const k = new Kernel();
    // 盒子的一条棱（两张不共面的面）、地面上的一条边界边、一块被墙站在中线上的地面（那条线连着三张面）
    k.addEdges([[P(0, 0, 0), P(2, 0, 0)], [P(2, 0, 0), P(2, 2, 0)], [P(2, 2, 0), P(0, 2, 0)], [P(0, 2, 0), P(0, 0, 0)], [P(1, 0, 0), P(1, 2, 0)]]);
    k.addEdges([[P(1, 0, 0), P(1, 0, 1)], [P(1, 0, 1), P(1, 2, 1)], [P(1, 2, 1), P(1, 2, 0)]]);
    const mid = edgeAt(k, P(1, 0, 0), P(1, 2, 0)), rim = edgeAt(k, P(0, 0, 0), P(0, 2, 0)), top = edgeAt(k, P(1, 0, 1), P(1, 2, 1));
    eq(k.graph.edge(mid.id).faceLinks.length, 3, "中线连着两块地 + 墙");
    const plan = k.foldPlan([mid.id, rim.id, top.id]);
    assert(plan.refuse.includes(mid.id), "三张面 → 拒绝（不悄悄破面）");
    assert(plan.erase.includes(rim.id) && plan.erase.includes(top.id), "只连一张面 → 照常擦");
    const box = new Kernel();
    box.addEdges([[P(0, 0, 0), P(1, 0, 0)], [P(1, 0, 0), P(1, 1, 0)], [P(1, 1, 0), P(0, 1, 0)], [P(0, 1, 0), P(0, 0, 0)]]);
    box.pushPull(box.faces()[0].id, 1);
    const edge = edgeAt(box, P(1, 0, 0), P(1, 1, 0));
    eq(box.foldPlan([edge.id]).fold.join(), String(edge.id), "盒子的棱（两张不共面）→ 折");
  });
  it("卫生：一侧的面没了（只剩一张）= 折线退回普通边", () => {
    const k = sceneFolded();
    const diag = edgeAt(k, P(0, 0, 0), P(1, 1, 0.25));
    k.eraseEdges([edgeAt(k, P(0, 1, 0), P(0, 0, 0)).id]);   // 擦掉第二张三角的一条边 → 它破掉
    assert(k.graph.hasEdge(diag.id), "对角线还在");
    assert(!k.isFold(diag.id), "只连一张面了 → 不再是折线");
  });
  it("OBJ 导出：折面写成一个多边形（四个顶点），没有内部折线", () => {
    const obj = exportObj(sceneFolded());
    const faces = obj.split("\n").filter((l) => l.startsWith("f "));
    eq(faces.length, 1, "一个面");
    eq(faces[0].split(" ").length - 1, 4, "四个顶点");
  });
  it("glb 里给别的软件看的线（LINES）：折线不出——导出的 = 屏幕上的（2026-10-26 补）", () => {
    const snap = sceneFolded().toBrep(), n = { v: 0 };
    const r = bakeDefinition(snap, { add: () => n.v++ }, 0);
    const lines = (r.accessors[2] as { count: number }).count / 2, folds = snap.edgeLayers?.fold?.length ?? 0;
    assert(folds === 1, `样本里一条折线：${folds}`);
    eq(lines, snap.edges.length - folds, "线 = 全部边 − 折线");
  });
  it("推拉一块：它环上的折线退回普通边，帽边也不带折线", () => {
    const k = sceneFolded();
    const f = k.faces()[0].id;
    k.pushPull(f, 0.5);
    eq(k.edgeLayers.layer("fold").size, 0, "推拉之后没有折线");
  });
  it("自动折面亚种：挪点把方块拉不平 → 缺省折缝是硬线；带 fold 折缝 = 折线", () => {
    const mk = (): Kernel => { const k = new Kernel(); k.addEdges([[P(0, 0, 0), P(1, 0, 0)], [P(1, 0, 0), P(1, 1, 0)], [P(1, 1, 0), P(0, 1, 0)], [P(0, 1, 0), P(0, 0, 0)]]); return k; };
    const lift = (k: Kernel, opts?: { creaseLayers?: readonly string[] }) => { const v = k.vertices().find((x) => x.x === 1 && x.y === 1)!; k.moveVertices([{ id: v.id, to: P(1, 1, 0.3) }], opts); };
    const hard = mk(); lift(hard);
    const soft = mk(); lift(soft, { creaseLayers: ["fold"] });
    eq(hard.faces().length, 2, "折成两块"); eq(soft.faces().length, 2, "折成两块");
    eq(hard.edgeLayers.layer("fold").size, 0, "缺省 = 硬线");
    eq(soft.edgeLayers.layer("fold").size, 1, "fold 亚种 = 一条折线");
  });
});
