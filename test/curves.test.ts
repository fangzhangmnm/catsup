// 曲线实体（0.10 曲线与曲面纪元，2026-10-24，Claude Fable 5.1；设计稿 ai-docs/20261023-curves-and-surfaces-design.md）：
// 圆 = 一条闭合曲线；推拉的帽 = 新曲线（圆心平移）；擦一段 = 整条没（连带它围的面）；线切过 = 两条弧；炸开 = 边留实体没；挪一个顶点 = 参数作废；
// 整体平移 / 旋转 = 参数跟着走；文件往返保曲线。
import { describe, it, eq, assert } from "./runner.mjs";
import { Kernel } from "../src/kernel/kernel.ts";
import type { CurveSpec, PtIn } from "../src/kernel/kernel.ts";
import { circleSegmentsOnPlane } from "../src/editor/tools.ts";
import { writeCatsup, readCatsup, newDocument } from "../src/format/index.ts";
import { circleOfFace, offsetCircleSpec } from "../src/editor/tools.ts";
import { IDENTITY } from "../src/scene/xform.ts";

const P = (x: number, y: number, z = 0): PtIn => ({ x, y, z });
const Z = { x: 0, y: 0, z: 1 }, X = { x: 1, y: 0, z: 0 };
const GROUND = { plane: { n: Z, d: 0 }, basis: { u: X, v: { x: 0, y: 1, z: 0 } } };
function circle(k: Kernel, cx: number, cy: number, r: number, z = 0, n = 24): void {
  const segs = circleSegmentsOnPlane({ n: Z, d: z }, GROUND.basis, { x: cx, y: cy, z }, { x: cx + r, y: cy, z }, n);
  const spec: CurveSpec = { kind: "circle", closed: true, params: { center: { x: cx, y: cy, z }, radius: r, normal: Z, xaxis: X, segments: n } };
  k.addEdges(segs.map(([a, b]) => [a, b] as [PtIn, PtIn]), { curve: spec });
}
const faceAt = (k: Kernel, p: PtIn) => k.hitTest(p, 1e-3).face;
const invariants = (k: Kernel): void => { const probs = (k as unknown as { curveReg: { validate(g: unknown): string[] } }).curveReg.validate(k.graph); assert(!probs.length, probs.join("; ")); };

describe("curves: 曲线实体", () => {
  it("画圆 = 一条闭合 circle 曲线，24 条边按序成链，带圆心半径；边带 curve 层", () => {
    const k = new Kernel(); circle(k, 0, 0, 1);
    eq(k.curves().length, 1); const c = k.curves()[0];
    eq(c.kind, "circle"); eq(c.closed, true); eq(c.edges.length, 24); eq(c.params!.radius, 1);
    assert(c.edges.every((e) => k.isCurve(e)), "边带 curve 层");
    for (const e of c.edges) eq(k.curveOf(e), c.id);
    invariants(k);
  });
  it("推拉成圆柱：顶圈是**新**曲线（圆心 z 平移），底圈仍在，侧棱全软", () => {
    const k = new Kernel(); circle(k, 0, 0, 1);
    k.pushPull(k.faces()[0].id, 2);
    eq(k.curves().length, 2, "两条曲线");
    const tops = k.curves().filter((c) => Math.abs(c.params!.center.z - 2) < 1e-9);
    eq(tops.length, 1); eq(tops[0].kind, "circle"); eq(tops[0].edges.length, 24);
    const risers = k.edges().filter((e) => { const a = k.graph.pt(e.a), b = k.graph.pt(e.b); return Math.abs(a.z - b.z) > 1; });
    eq(risers.length, 24); assert(risers.every((e) => k.isSoft(e.id)), "侧棱软");
    invariants(k);
  });
  it("橡皮擦顶圈的一段 = 整个顶圈没了（SU：顶面与靠它围住的 24 张侧面一起消失）；底圈与底面不动", () => {
    const k = new Kernel(); circle(k, 0, 0, 1); k.pushPull(k.faces()[0].id, 2);
    const top = k.curves().find((c) => Math.abs(c.params!.center.z - 2) < 1e-9)!;
    k.eraseEdges([top.edges[3]]);
    eq(k.curves().length, 1, "只剩底圈");
    assert(faceAt(k, P(0, 0, 2)) === undefined, "顶面没了");
    assert(faceAt(k, P(0, 0, 0)) !== undefined, "底面在");
    eq(k.faces().length, 1, "只剩底面（侧面失去顶边 = 死）");
    assert(!k.edges().some((e) => k.graph.pt(e.a).z > 1 && k.graph.pt(e.b).z > 1), "顶圈 24 条边一条不剩（侧棱留着当裸线，SU 同款）");
    invariants(k);
  });
  it("一条线切过圆 → 两条弧（同圆参数，开口），面一分为二", () => {
    const k = new Kernel(); circle(k, 0, 0, 1);
    k.addEdges([[P(-2, 0), P(2, 0)]]);
    eq(k.faces().length, 2);
    const cs = k.curves();
    eq(cs.length, 2); assert(cs.every((c) => c.kind === "arc" && !c.closed && c.params!.radius === 1), "两条开口弧");
    eq(cs[0].edges.length + cs[1].edges.length, 24);
    invariants(k);
  });
  it("炸开曲线：边留着、实体没了、不再带 curve 层", () => {
    const k = new Kernel(); circle(k, 0, 0, 1);
    const n = k.edges().length;
    k.explodeCurves([k.curves()[0].id]);
    eq(k.curves().length, 0); eq(k.edges().length, n); assert(k.edges().every((e) => !k.isCurve(e.id)));
  });
  it("挪圆上一个顶点 → 参数作废（polyline，身份留着）；整体平移 → 圆心跟着走", () => {
    const k = new Kernel(); circle(k, 0, 0, 1);
    const c0 = k.curves()[0];
    const v = k.vertices().find((v) => Math.abs(v.x - 1) < 1e-9 && Math.abs(v.y) < 1e-9)!;
    k.moveVertices([{ id: v.id, to: P(1.3, 0, 0) }]);
    const c1 = k.curveById(c0.id)!;
    eq(c1.kind, "polyline"); assert(!c1.params, "参数作废");
    const k2 = new Kernel(); circle(k2, 0, 0, 1);
    k2.transformAll((p) => ({ x: p.x + 5, y: p.y, z: p.z }));
    eq(k2.curves()[0].kind, "circle"); eq(k2.curves()[0].params!.center.x, 5);
    k2.transformAll((p) => ({ x: p.x * 2 - 5, y: p.y * 2, z: p.z }));   // 均匀缩放 ×2：半径 2
    assert(Math.abs(k2.curves()[0].params!.radius - 2) < 1e-9, "相似变换保圆");
    k2.transformAll((p) => ({ x: p.x * 2, y: p.y, z: p.z }));          // 非均匀 → polyline
    eq(k2.curves()[0].kind, "polyline");
  });
  it("文件往返保曲线（种类 / 闭合 / 参数 / 边链）", () => {
    const k = new Kernel(); circle(k, 0, 0, 1); k.pushPull(k.faces()[0].id, 2);
    const bytes = writeCatsup(newDocument(k.toBrep(), "t"));
    const k2 = Kernel.fromBrep(readCatsup(bytes).root.brep);
    eq(k2.curves().length, 2);
    for (const c of k2.curves()) { eq(c.kind, "circle"); eq(c.closed, true); eq(c.edges.length, 24); assert(Math.abs(c.params!.radius - 1) < 1e-6); }
    invariants(k2);
  });
  it("偏移圆：外环是闭合圆 → circleOfFace 给圆参数；offsetCircleSpec 半径 r − d，塌没 → null", () => {
    const k = new Kernel(); circle(k, 0, 0, 1);
    const c = circleOfFace(k, k.faces()[0].id, IDENTITY)!;
    assert(c && Math.abs(c.radius - 1) < 1e-9 && Math.abs(c.center.x) < 1e-9, "拿到圆参数");
    const inner = offsetCircleSpec(c, 0.3)!;
    assert(Math.abs(inner.params!.radius - 0.7) < 1e-9 && inner.kind === "circle" && inner.closed, "向内 0.3 → r 0.7");
    eq(offsetCircleSpec(c, 1), null, "塌没");
    const k2 = new Kernel(); circle(k2, 0, 0, 1); k2.addEdges([[P(-2, 0.1), P(2, 0.1)]]);   // 切过 → 不再是一条闭合圆
    eq(circleOfFace(k2, k2.faces()[0].id, IDENTITY), null);
  });
  it("跟随：圆沿直线扫一段 → 末帽是同参数的圆（圆心平移）；侧面站圈不另立曲线", () => {
    const k = new Kernel(); circle(k, 0, 0, 1);
    k.followMe(k.faces()[0].id, [{ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 2 }], { closed: false });
    const circles = k.curves().filter((c) => c.kind === "circle" && c.closed);
    eq(circles.length, 2, "起始帽（原圆）+ 末帽");
    assert(circles.some((c) => Math.abs(c.params!.center.z - 2) < 1e-9 && Math.abs(c.params!.radius - 1) < 1e-9), "末帽圆心 z=2 半径 1");
    invariants(k);
  });
});
