// 自动标接缝（施工单二十二第 1 刀后半；src/mesh/auto-seams.ts）。created 2026-11-12 by Claude Opus 5.5
// 钉：补完以后每一片都能摊平（统筹 G，第 2 刀改：亏格为零、至少一条边界、可定向；不必是盘）；只加不减（user 的接缝原样、补的里没有已经是接缝的）；同样的输入同样的结果；
//    盒子 = 12 条折痕 6 片；圆柱 = 两圈折痕、侧面是个筒（两条边界）不再切；球 = 两个最远点之间一刀；环面 = 有把手 → 切；范围只选一张面 = 不补；非流形的边一定切；角度调大 = 少切。
import { describe, it, eq, assert } from "./runner.mjs";
import { MeshKernel, F_SEAM } from "../src/mesh/mesh-kernel.ts";
import { addBox, addPrimitive } from "../src/mesh/ops/index.ts";
import { GROWN } from "../src/mesh/corner-columns.ts";
import { autoSeams, chartShapes } from "../src/mesh/auto-seams.ts";

const P = (x: number, y: number, z: number) => ({ x, y, z });
const F = { o: P(0, 0, 0), x: P(1, 0, 0), y: P(0, 1, 0), z: P(0, 0, 1) };
/** 把补的标上，再问每片能不能摊平（统筹 G：亏格为零、至少一条边界、可定向）：能 = "ok"，不能 = 形状。 */
function applyAndCheck(m: MeshKernel, add: number[]): string[] {
  for (const e of add) m.setFlags(e, F_SEAM, true);
  return chartShapes(m, m.faces(), (e) => (m.edgeFlags[e] & F_SEAM) !== 0).map((c) => (c.flattenable ? "ok" : `χ${c.chi} b${c.boundaries} g${c.genus}`));
}
const allOk = (xs: string[]): string => (xs.every((x) => x === "ok") ? "ok" : xs.join(","));
/** 环面：n × k 个四边形，两个方向都绕回来（一个把手）。 */
function torus(n = 12, k = 8): MeshKernel {
  const m = new MeshKernel(), id: number[][] = [];
  for (let i = 0; i < n; i++) { id.push([]); for (let j = 0; j < k; j++) { const a = (2 * Math.PI * i) / n, b = (2 * Math.PI * j) / k, r = 2 + 0.6 * Math.cos(b); id[i].push(m.addVertex(P(r * Math.cos(a), r * Math.sin(a), 0.6 * Math.sin(b)))); } }
  for (let i = 0; i < n; i++) for (let j = 0; j < k; j++) m.addFace([id[i][j], id[(i + 1) % n][j], id[(i + 1) % n][(j + 1) % k], id[i][(j + 1) % k]], -1, GROWN);
  return m;
}

describe("自动标接缝（auto-seams.ts）", () => {
  it("盒子：12 条棱都是 90° 折痕 → 6 片、每片一张盘；没有为摊平补的", () => {
    const m = new MeshKernel(); addBox(m, P(0, 0, 0), P(1, 1, 1));
    const r = autoSeams(m, null, { angleDeg: 60 });
    eq(r.add.length, 12); eq(r.why.crease, 12); eq(r.why.handle + r.why.closed + r.why.nonManifold, 0); eq(r.charts, 6); eq(r.needCut, 0);
    eq(allOk(applyAndCheck(m, r.add)), "ok");
  });
  it("盒子、角度调到 100°（没有折痕）= 一个封闭的壳 → 两个最远点之间切一刀，切开是一张盘", () => {
    const m = new MeshKernel(); addBox(m, P(0, 0, 0), P(1, 1, 1));
    const r = autoSeams(m, null, { angleDeg: 100 });
    eq(r.why.crease, 0); assert(r.why.closed >= 2, `切了 ${r.why.closed} 条`); eq(r.charts, 1); eq(r.needCut, 1);
    eq(allOk(applyAndCheck(m, r.add)), "ok");
  });
  it("圆柱（16 段）：上下两圈折痕、侧面是个筒（两条边界、亏格零）= 能摊平，不再切（统筹 G：开口之间不连线）", () => {
    const m = new MeshKernel(); addPrimitive(m, "cylinder", F, [0.5, 0.5, 1], 16);
    const r = autoSeams(m, null, { angleDeg: 60 });
    eq(r.why.crease, 32, "两圈各 16 条"); eq(r.why.handle + r.why.closed, 0, "筒不切"); eq(r.charts, 3); eq(r.needCut, 0);
    const side = chartShapes(m, m.faces(), (e) => r.add.includes(e)).find((c) => c.boundaries === 2)!;
    eq(side.chi, 0); eq(side.genus, 0); eq(side.flattenable, true);
    eq(allOk(applyAndCheck(m, r.add)), "ok");
  });
  it("球：没有折痕、封闭 → 两个最远点之间一刀（不止一条边），切开是一张盘", () => {
    const m = new MeshKernel(); addPrimitive(m, "sphere", F, [0.5, 0.5, 0.5], 16);
    const r = autoSeams(m, null, { angleDeg: 60 });
    eq(r.why.crease, 0); assert(r.why.closed >= 3, `切了 ${r.why.closed} 条`); eq(r.charts, 1);
    eq(allOk(applyAndCheck(m, r.add)), "ok");
  });
  it("环面（一个把手、没有边界）：补的切口去掉把手（两圈），切完亏格零、有边界", () => {
    const m = torus();
    eq(chartShapes(m, m.faces(), () => false)[0].genus, 1, "本来亏格 1");
    const r = autoSeams(m, null, { angleDeg: 89 });
    eq(r.why.crease, 0); assert(r.why.handle >= 2, `切了 ${r.why.handle} 条`); eq(r.charts, 1);
    eq(allOk(applyAndCheck(m, r.add)), "ok");
  });
  it("带边界的环面（挖掉一块的把手）：只切把手，不在开口和别处之间连线", () => {
    const m = torus(), hole = m.faces()[0];
    const r = autoSeams(m, m.faces().filter((f) => f !== hole), { angleDeg: 89 });
    assert(r.why.handle >= 2, `切了 ${r.why.handle} 条`);
    for (const e of r.add) m.setFlags(e, F_SEAM, true);
    const sh = chartShapes(m, m.faces().filter((f) => f !== hole), (e) => (m.edgeFlags[e] & F_SEAM) !== 0);
    eq(sh.map((c) => (c.flattenable ? "ok" : `χ${c.chi} b${c.boundaries} g${c.genus}`)).join(","), "ok");
  });
  it("只加不减：user 已经标的接缝留着、补的里没有它；同样的输入同样的结果", () => {
    const m = new MeshKernel(); addPrimitive(m, "sphere", F, [0.5, 0.5, 0.5], 12);
    const mine = m.edges().slice(0, 5); for (const e of mine) m.setFlags(e, F_SEAM, true);
    const before = Array.from(m.edgeFlags).join(",");
    const a = autoSeams(m, null, { angleDeg: 60 }), b = autoSeams(m, null, { angleDeg: 60 });
    eq(Array.from(m.edgeFlags).join(","), before, "纯函数：不改内核");
    eq(a.add.join(","), b.add.join(","), "两次一样");
    for (const e of mine) assert(!a.add.includes(e), "补的里没有 user 的");
    eq(allOk(applyAndCheck(m, a.add)), "ok");
    for (const e of mine) assert((m.edgeFlags[e] & F_SEAM) !== 0, "user 的还在");
  });
  it("范围 = 只选顶面：本来就是一张盘 → 不补；范围外的面不碰", () => {
    const m = new MeshKernel(); addBox(m, P(0, 0, 0), P(1, 1, 1));
    const top = m.faces().find((f) => m.faceVerts(f).every((v) => m.pt(v).z === 1))!;
    const r = autoSeams(m, [top], { angleDeg: 60 });
    eq(r.add.length, 0); eq(r.charts, 1);
  });
  it("非流形的边（三张面共一条边）一定切", () => {
    const m = new MeshKernel(), a = m.addVertex(P(0, 0, 0)), b = m.addVertex(P(1, 0, 0));
    for (const q of [P(0.5, 1, 0), P(0.5, -1, 0), P(0.5, 0, 1)]) m.addFace([a, b, m.addVertex(q)], -1, GROWN);
    const e = m.edgeOf(a, b), r = autoSeams(m, null, { angleDeg: 179 });
    eq(r.why.nonManifold, 1); assert(r.add.includes(e)); eq(r.charts, 3);
    eq(allOk(applyAndCheck(m, r.add)), "ok");
  });
  it("角度调大 = 折痕少：圆柱 100° 时上下圈不切，三片连成一个封闭的壳 → 切一刀", () => {
    const m = new MeshKernel(); addPrimitive(m, "cylinder", F, [0.5, 0.5, 1], 16);
    const r = autoSeams(m, null, { angleDeg: 100 });
    eq(r.why.crease, 0); eq(r.charts, 1); eq(allOk(applyAndCheck(m, r.add)), "ok");
  });
});
