// 焊接（B19；user「weld现在满需要的」）：边链 → 折线曲线；同圆两弧 → 圆 / 弧；分叉 / 不连通拒；曲线整条连坐；文件往返。created 2026-10-24 by Claude Fable 5.1
import { describe, it, eq, assert } from "./runner.mjs";
import { Kernel } from "../src/kernel/kernel.ts";
import type { CurveSpec, PtIn } from "../src/kernel/kernel.ts";
import { planWeld } from "../src/kernel/weld.ts";
import { circleSegmentsOnPlane } from "../src/editor/tools.ts";
import { writeCatsup, readCatsup, newDocument } from "../src/format/index.ts";

const P = (x: number, y: number, z = 0): PtIn => ({ x, y, z });
const Z = { x: 0, y: 0, z: 1 }, X = { x: 1, y: 0, z: 0 };
const BASIS = { u: X, v: { x: 0, y: 1, z: 0 } };
const invariants = (k: Kernel): void => { const probs = (k as unknown as { curveReg: { validate(g: unknown): string[] } }).curveReg.validate(k.graph); assert(!probs.length, probs.join("; ")); };
const edgeBetween = (k: Kernel, a: PtIn, b: PtIn): number => k.edges().find((e) => { const E = k.graph.edge(e.id), pa = k.graph.pt(E.a), pb = k.graph.pt(E.b); const m = (p: PtIn, q: { x: number; y: number; z: number }) => Math.abs(p.x - q.x) < 1e-9 && Math.abs(p.y - q.y) < 1e-9 && Math.abs((p.z ?? 0) - q.z) < 1e-9; return (m(a, pa) && m(b, pb)) || (m(a, pb) && m(b, pa)); })!.id;

describe("weld: 焊接", () => {
  it("三段折线 → 一条开口折线曲线（选 / 擦当整体）；分叉拒；不连通拒", () => {
    const k = new Kernel();
    k.addEdges([[P(0, 0), P(1, 0)], [P(1, 0), P(2, 1)], [P(2, 1), P(3, 1)], [P(1, 0), P(1, 2)], [P(5, 5), P(6, 5)]]);
    const e1 = edgeBetween(k, P(0, 0), P(1, 0)), e2 = edgeBetween(k, P(1, 0), P(2, 1)), e3 = edgeBetween(k, P(2, 1), P(3, 1)), branch = edgeBetween(k, P(1, 0), P(1, 2)), far = edgeBetween(k, P(5, 5), P(6, 5));
    assert(typeof planWeld(k, [e1, e2, branch]) === "string", "分叉拒");
    assert(typeof planWeld(k, [e1, far]) === "string", "不连通拒");
    assert(typeof planWeld(k, [e1]) === "string", "一条拒");
    const plan = planWeld(k, [e3, e1, e2]);
    assert(typeof plan !== "string", "三段成链");
    if (typeof plan === "string") return;
    eq(plan.edges.length, 3); eq(plan.closed, false); eq(plan.spec.kind, "polyline");
    k.weldEdges([e3, e1, e2]);
    eq(k.curves().length, 1); const c = k.curves()[0];
    eq(c.kind, "polyline"); eq(c.closed, false); eq(c.edges.length, 3);
    assert([e1, e2, e3].every((e) => k.curveOf(e) === c.id && k.isCurve(e)), "三条都归这条曲线、带 curve 层");
    invariants(k);
    // 擦一段 = 整条没
    k.eraseEdges([e2]);
    assert(!k.graph.hasEdge(e1) && !k.graph.hasEdge(e3), "擦一段整条没");
    eq(k.curves().length, 0);
    invariants(k);
  });
  it("圆被弦切成两弧 → 焊两弧（各选一条边，整条连坐）→ 又是一条闭合圆；弦留着；文件往返保曲线", () => {
    const k = new Kernel();
    const segs = circleSegmentsOnPlane({ n: Z, d: 0 }, BASIS, { x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, 24);
    const spec: CurveSpec = { kind: "circle", closed: true, params: { center: { x: 0, y: 0, z: 0 }, radius: 1, normal: Z, xaxis: X, segments: 24 } };
    k.addEdges(segs.map(([a, b]) => [a, b] as [PtIn, PtIn]), { curve: spec });
    k.addEdges([[P(-1, 0), P(1, 0)]]);   // 弦（过圆心 → 切成两弧）
    eq(k.curves().length, 2, "两弧");
    assert(k.curves().every((c) => c.kind === "arc" && !c.closed), "都是开弧");
    const picks = k.curves().map((c) => c.edges[0]);
    const plan = planWeld(k, picks);
    assert(typeof plan !== "string", `两弧成链：${plan}`);
    if (typeof plan === "string") return;
    eq(plan.closed, true); eq(plan.spec.kind, "circle"); eq(plan.edges.length, 24);
    k.weldEdges(picks);
    eq(k.curves().length, 1); const c = k.curves()[0];
    eq(c.kind, "circle"); eq(c.closed, true); eq(c.edges.length, 24); eq(c.params!.radius, 1);
    assert(k.graph.hasEdge(edgeBetween(k, P(-1, 0), P(1, 0))), "弦还在");
    invariants(k);
    const back = Kernel.fromBrep(readCatsup(writeCatsup(newDocument(k.toBrep(), "t"))).root.brep);
    eq(back.curves().length, 1); eq(back.curves()[0].kind, "circle"); eq(back.curves()[0].edges.length, 24);
  });
});
