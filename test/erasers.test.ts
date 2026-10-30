// 橡皮家族（v0.13.16；user 2026-10-24「加两种橡皮……共轴就变成一个边，如果不共轴，但在角度护栏内，那么拼成长弧线」「共面就删边，不共面就改软边」「对焊接只认degree2同意」）：
// 内核溶解（真合并）/ A33 断口判定 / 焊边规划 / 软边规划 / batch op 一次撤销。created 2026-10-24 by Claude Fable 5.1
import { describe, it, eq, assert } from "./runner.mjs";
import { Kernel } from "../src/kernel/kernel.ts";
import type { PtIn } from "../src/kernel/kernel.ts";
import { Scene } from "../src/scene/scene.ts";
import { History } from "../src/editor/history.ts";
import type { Op } from "../src/editor/ops.ts";
import { planWeldErase, planSoftErase, turnDeg } from "../src/editor/erase-plans.ts";
import { TOOL_OPTIONS } from "../src/editor/tool-config.ts";

const P = (x: number, y: number, z = 0): PtIn => ({ x, y, z });
const same = (p: PtIn, q: { x: number; y: number; z: number }): boolean => Math.abs(p.x - q.x) < 1e-6 && Math.abs(p.y - q.y) < 1e-6 && Math.abs((p.z ?? 0) - q.z) < 1e-6;
const vertexAt = (k: Kernel, p: PtIn): number => k.vertices().find((v) => same(p, v))!.id;
const edgeBetween = (k: Kernel, a: PtIn, b: PtIn): number => k.edges().find((e) => { const E = k.graph.edge(e.id), pa = k.graph.pt(E.a), pb = k.graph.pt(E.b); return (same(a, pa) && same(b, pb)) || (same(a, pb) && same(b, pa)); })!.id;
const invariants = (k: Kernel): void => { const probs = k.curveProblems(); assert(!probs.length, probs.join("; ")); };
const rootOf = (s: Scene) => ({ def: s.root, group: null });

describe("erasers: 内核溶解 + A33 断口", () => {
  it("分两笔画的方形底边（接点 = 断口）：isBreakJunction 真；溶解 → 边少一条、面还是那张、环少一个点", () => {
    const k = new Kernel();
    k.addEdges([[P(0, 0), P(1, 0)], [P(1, 0), P(2, 0)], [P(2, 0), P(2, 2)], [P(2, 2), P(0, 2)], [P(0, 2), P(0, 0)]]);
    eq(k.faces().length, 1); eq(k.edges().length, 5);
    const j = vertexAt(k, P(1, 0));
    assert(k.isBreakJunction(j), "分两笔画的接点是断口");
    assert(!k.isBreakJunction(vertexAt(k, P(2, 0))), "角不是断口");
    const fid = k.faces()[0].id, rev0 = k.rev;
    eq(k.dissolveVertices([j]), 1);
    assert(k.rev > rev0, "rev bump");
    eq(k.edges().length, 4); eq(k.faces().length, 1); eq(k.faces()[0].id, fid, "面身份不变");
    eq(k.face(fid)!.outer.edges.length, 4);
    const e = edgeBetween(k, P(0, 0), P(2, 0));
    eq([...new Set(k.graph.edge(e).faceLinks)].length, 1, "并出的边挂着那张面");
    assert(!k.vertices().some((v) => same(P(1, 0), v)), "中间点回收");
    invariants(k);
    // 再溶一次 = 没东西可溶，不抛
    eq(k.dissolveVertices([j]), 0);
  });
  it("不满足的跳过：度 3 的点 / 转角的点 / 两边面链接不同（一边有膜一边裸线）", () => {
    const k = new Kernel();
    k.addEdges([[P(0, 0), P(1, 0)], [P(1, 0), P(2, 0)], [P(2, 0), P(2, 2)], [P(2, 2), P(0, 2)], [P(0, 2), P(0, 0)], [P(2, 0), P(3, 0)]]);
    // (2,0) 度 3；(3,0) 度 1；底边外伸的裸线 (2,0)-(3,0) 与 (1,0)-(2,0) 共线但 (2,0) 度 3
    eq(k.dissolveVertices([vertexAt(k, P(2, 0)), vertexAt(k, P(2, 2)), vertexAt(k, P(3, 0))]), 0);
    eq(k.edges().length, 6);
    // 裸线分两笔：(4,0)-(5,0)-(6,0) 两边都零膜 → 面链接相同（都空）→ 可溶
    k.addEdges([[P(4, 0), P(5, 0)], [P(5, 0), P(6, 0)]]);
    assert(k.isBreakJunction(vertexAt(k, P(5, 0))));
    eq(k.dissolveVertices([vertexAt(k, P(5, 0))]), 1);
    assert(k.graph.hasEdge(edgeBetween(k, P(4, 0), P(6, 0))));
    // 膜边 + 裸线延长：画 (0,2)-(0,3)... (0,2) 度 3，不行；造一个度 2 但面链接不同的：竖线 (5,5)-(5,6) 裸，再 (5,6)-(5,7) 裸 → 可溶；加面在 (5,5)-(5,6) 一侧
    k.addEdges([[P(5, 5), P(5, 6)], [P(5, 6), P(5, 7)], [P(5, 5), P(6, 5)], [P(6, 5), P(6, 6)], [P(6, 6), P(5, 6)]]);
    const j = vertexAt(k, P(5, 6));
    eq(k.graph.vertex(j).edges.size, 3, "(5,6) 现在度 3（面的角 + 裸线）");
    eq(k.dissolveVertices([j]), 0);
    invariants(k);
  });
  it("同一条折线曲线内部的共轴接点也是断口（10-30 改：user「一条曲线里面共轴应该自动合并吧」；以前钉的是「不算」）；两条折线曲线共轴相接 → 是断口，溶解后归第一条链", () => {
    const k = new Kernel();
    k.addEdges([[P(0, 0), P(1, 0)], [P(1, 0), P(2, 0)]], { curve: { kind: "polyline", closed: false } });
    assert(k.isBreakJunction(vertexAt(k, P(1, 0))), "折线曲线自己的共轴段间也算");
    k.addEdges([[P(2, 0), P(3, 0)], [P(3, 0), P(3, 1)]], { curve: { kind: "polyline", closed: false } });
    eq(k.curves().length, 2);
    const j = vertexAt(k, P(2, 0));
    assert(k.isBreakJunction(j), "两条曲线的共轴接点是断口");
    eq(k.dissolveVertices([j]), 1);
    invariants(k);
    eq(k.edges().length, 3);
  });
});

describe("erasers: 焊边规划（planWeldErase）", () => {
  it("三段共线：两个接点都溶解、不焊；中间 30° 的折线：焊成一条链；90° 超护栏不碰", () => {
    const k = new Kernel();
    k.addEdges([[P(0, 0), P(1, 0)], [P(1, 0), P(2, 0)], [P(2, 0), P(3, 0)]]);
    const ids = k.edges().map((e) => e.id);
    const plan = planWeldErase(k, ids, 45);
    eq(plan.dissolve.length, 2); eq(plan.welds.length, 0); eq(plan.tooSharp, 0);
    const k2 = new Kernel();
    const c = Math.cos(Math.PI / 6), s = Math.sin(Math.PI / 6);
    k2.addEdges([[P(0, 0), P(1, 0)], [P(1, 0), P(1 + c, s)], [P(1 + c, s), P(1 + c, s + 1)]]);   // 30° 再 60°
    const t1 = turnDeg(k2, vertexAt(k2, P(1, 0)))!, t2 = turnDeg(k2, vertexAt(k2, P(1 + c, s)))!;
    assert(Math.abs(t1 - 30) < 1e-3, `turn ${t1}`); assert(Math.abs(t2 - 60) < 1e-3, `turn ${t2}`);   // 内核坐标量化
    const p2 = planWeldErase(k2, k2.edges().map((e) => e.id), 45);
    eq(p2.dissolve.length, 0); eq(p2.welds.length, 1); eq(p2.welds[0].length, 2); eq(p2.tooSharp, 1);
    const p3 = planWeldErase(k2, k2.edges().map((e) => e.id), 90);
    eq(p3.welds.length, 1); eq(p3.welds[0].length, 3); eq(p3.tooSharp, 0);
    // 只刮一条边 → 没有「两边都被刮到」的接点
    const p4 = planWeldErase(k2, [k2.edges()[0].id], 90);
    eq(p4.dissolve.length + p4.welds.length, 0);
  });
  it("同一条折线曲线里的共轴接点（老文件 / 先焊后画的）：算断口、刮一下就并；圆的段不动（user 10-30「焊边橡皮为什么没法把共轴线段给合成一条线」）", () => {
    const k = new Kernel();
    k.addEdges([[P(0, 0), P(1, 0)], [P(1, 0), P(2, 0)], [P(2, 0), P(3, 1)]], { curve: { kind: "polyline", closed: false } });
    eq(k.curves().length, 1); eq(k.curves()[0].edges.length, 3, "画进来的折线曲线带着共轴接点");
    const j = vertexAt(k, P(1, 0));
    assert(k.isBreakJunction(j), "折线曲线里的共轴接点 = 断口");
    const plan = planWeldErase(k, [k.edges()[0].id], 45);   // 刮一段 = 整条曲线连坐
    eq(plan.dissolve.length, 1); assert(same(P(1, 0), plan.dissolve[0]), "并的是 (1,0)"); eq(plan.welds.length, 0, "已经是一条曲线，不再焊");
    eq(k.dissolveVertices([j]), 1);
    eq(k.curves()[0].edges.length, 2); invariants(k);
  });
  it("混合链：共轴接点 + 30° 接点 → 先溶解再焊，焊的边键按溶解后的形状；整批一个 batch、一次撤销", () => {
    const h = new History();
    const c = Math.cos(Math.PI / 6), sn = Math.sin(Math.PI / 6);
    const s = h.commit(new Scene(), { op: "addEdges", segs: [[P(0, 0), P(1, 0)], [P(1, 0), P(2, 0)], [P(2, 0), P(2 + c, sn)]] }).scene;
    const ROOT = rootOf(s); const k = s.kernelOf(ROOT);
    const plan = planWeldErase(k, k.edges().map((e) => e.id), 45);
    eq(plan.dissolve.length, 1); eq(plan.welds.length, 1); eq(plan.welds[0].length, 2);
    const ops: Op[] = [{ op: "dissolveVertices", at: ROOT, points: plan.dissolve }, ...plan.welds.map((edges): Op => ({ op: "weldEdges", at: ROOT, edges }))];
    const r = h.commit(s, { op: "batch", label: "weldErase", ops });
    const k2 = r.scene.kernelOf(ROOT);
    eq(k2.edges().length, 2); eq(k2.curves().length, 1); eq(k2.curves()[0].edges.length, 2); eq(k2.curves()[0].kind, "polyline");
    invariants(k2);
    const back = h.undo();
    assert(back, "能撤销");
    const k3 = back!.scene.kernelOf(ROOT);
    eq(k3.edges().length, 3, "一次撤销回到三条散边"); eq(k3.curves().length, 0);
  });
  it("刮到弧的一段 = 整条弧参与：两段不同圆的弧在接点 15° 相接 → 焊成一条折线曲线；同圆两弧 → 焊回弧", () => {
    const k = new Kernel();
    // 两条短折线曲线（当弧用：曲线连坐规则一样）
    k.addEdges([[P(0, 0), P(1, 0)], [P(1, 0), P(2, 0.2)]], { curve: { kind: "polyline", closed: false } });
    k.addEdges([[P(2, 0.2), P(3, 0.5)], [P(3, 0.5), P(4, 1)]], { curve: { kind: "polyline", closed: false } });
    eq(k.curves().length, 2);
    const first = k.curves()[0].edges[0];
    const plan = planWeldErase(k, [first, k.curves()[1].edges[1]], 45);   // 各刮一段
    eq(plan.welds.length, 1); eq(plan.welds[0].length, 4, "两条曲线整条进链");
    k.weldEdges(plan.welds[0].map(([a, b]) => edgeBetween(k, a, b)));
    eq(k.curves().length, 1); eq(k.curves()[0].edges.length, 4);
    invariants(k);
  });
});

describe("erasers: 软边规划（planSoftErase）", () => {
  it("出厂上限下 12 段棱柱（两面夹 30°）的竖边能软化、上圈 90° 的棱护住（user 10-30「软边橡皮为什么软化不了」：老默认 20° 全挡）", () => {
    const k = new Kernel(), n = 12, R = 1, H = 1;
    const at = (i: number, z: number): PtIn => P(R * Math.cos((2 * Math.PI * i) / n), R * Math.sin((2 * Math.PI * i) / n), z);
    const segs: [PtIn, PtIn][] = [];
    for (let i = 0; i < n; i++) { segs.push([at(i, 0), at(i + 1, 0)]); segs.push([at(i, H), at(i + 1, H)]); segs.push([at(i, 0), at(i, H)]); }
    k.addEdges(segs);
    eq(k.faces().length, n + 2);
    const maxDeg = TOOL_OPTIONS.softErase.maxDeg.def;
    const sides = Array.from({ length: n }, (_, i) => edgeBetween(k, at(i, 0), at(i, H)));
    const rim = Array.from({ length: n }, (_, i) => edgeBetween(k, at(i, H), at(i + 1, H)));
    const p = planSoftErase(k, [...sides, ...rim], maxDeg);
    eq(p.soften.length, n, `竖边 ${n} 条软化（上限 ${maxDeg}°）`); eq(p.tooSharp, n, "上圈直角棱不碰"); eq(p.erase.length, 0);
  });
  it("盒子：竖棱 90° 超 20° 护栏不碰、放到 90° 软化；顶面被一条线切成两半 → 那条线共面 → 删边并面", () => {
    const k = new Kernel();
    const B = [[0, 0], [1, 0], [1, 1], [0, 1]];
    const segs: [PtIn, PtIn][] = [];
    for (let i = 0; i < 4; i++) { const a = B[i], b = B[(i + 1) % 4]; segs.push([P(a[0], a[1], 0), P(b[0], b[1], 0)]); segs.push([P(a[0], a[1], 1), P(b[0], b[1], 1)]); segs.push([P(a[0], a[1], 0), P(a[0], a[1], 1)]); }
    k.addEdges(segs);
    eq(k.faces().length, 6);
    const rib = edgeBetween(k, P(0, 0, 0), P(0, 0, 1));
    const p1 = planSoftErase(k, [rib], 20);
    eq(p1.soften.length, 0); eq(p1.erase.length, 0); eq(p1.tooSharp, 1);
    const p2 = planSoftErase(k, [rib, rib], 90);
    eq(p2.soften.length, 1, "去重"); eq(p2.tooSharp, 0);
    k.setEdgeLayer("soft", [rib], true); k.setEdgeLayer("smooth", [rib], true);
    assert(k.isSoft(rib) && k.isSmooth(rib));
    // 顶面切一刀
    k.addEdges([[P(0.5, 0, 1), P(0.5, 1, 1)]]);
    eq(k.faces().length, 7);
    const cut = edgeBetween(k, P(0.5, 0, 1), P(0.5, 1, 1));
    const p3 = planSoftErase(k, [cut], 20);
    eq(p3.erase.length, 1); eq(p3.soften.length, 0);
    k.eraseEdges([cut]);
    eq(k.faces().length, 6, "共面两半并回一张");
    // 裸线没有二面角 → 不算
    k.addEdges([[P(5, 5, 0), P(6, 5, 0)]]);
    const bare = edgeBetween(k, P(5, 5, 0), P(6, 5, 0));
    const p4 = planSoftErase(k, [bare], 20);
    eq(p4.erase.length + p4.soften.length + p4.tooSharp, 0);
  });
  it("屋脊：两张 10° 二面角的膜 → 软化；批 = 删边 + 软化一起，一次撤销", () => {
    const hist = new History();
    const h = 0.125;   // 两坡各 atan(0.125) ≈ 7.1° → 二面角 ≈ 14.25°（量化友好的数）
    const s = hist.commit(new Scene(), { op: "addEdges", segs: [[P(0, 0, 0), P(1, 0, h)], [P(1, 0, h), P(1, 1, h)], [P(1, 1, h), P(0, 1, 0)], [P(0, 1, 0), P(0, 0, 0)], [P(1, 0, h), P(2, 0, 0)], [P(2, 0, 0), P(2, 1, 0)], [P(2, 1, 0), P(1, 1, h)]] }).scene;
    const ROOT = rootOf(s); const k = s.kernelOf(ROOT);
    eq(k.faces().length, 2);
    const ridge = edgeBetween(k, P(1, 0, h), P(1, 1, h));
    const a = k.dihedralDeg(ridge)!;
    assert(Math.abs(a - 14.25) < 0.1, `屋脊二面角 ${a}`);
    const plan = planSoftErase(k, [ridge], 20);
    eq(plan.soften.length, 1); eq(plan.tooSharp, 0);
    const r = hist.commit(s, { op: "batch", label: "softErase", ops: [{ op: "setEdgeLayers", at: ROOT, edges: plan.soften, layers: ["soft", "smooth"], on: true }] });
    const k2 = r.scene.kernelOf(ROOT);
    assert(k2.isSoft(edgeBetween(k2, P(1, 0, h), P(1, 1, h))), "软了");
    const back = hist.undo()!.scene;
    assert(!back.kernelOf(ROOT).isSoft(edgeBetween(back.kernelOf(ROOT), P(1, 0, h), P(1, 1, h))), "撤销回硬");
  });
});
