// 改段数（回转体重新细分，纪元账本 DT94，2026-10-26，Claude Opus 5.5）。user：「多段圆柱 可以……反正先做试一下，大不了以后改」「记住可以，没必要提示」。
// 认：一整块全是同轴、同段数、角度对齐的一串圆 + 圈间的 圆盘 / 圆环 / 四边形长条；改：按新段数造快照、删旧粘新（圆还是圆、长条边还是软边、颜色朝外的还朝外）。
import { describe, it, eq, assert } from "./runner.mjs";
import { Kernel } from "../src/kernel/kernel.ts";
import type { Pt3 } from "../src/kernel/kernel.ts";
import { Scene, absorbSnapshot } from "../src/scene/scene.ts";
import { applyOp, type Op } from "../src/editor/ops.ts";
import { findRevolved } from "../src/editor/repairs/resegment/plan.ts";
import "../src/editor/repairs/resegment/index.ts";   // 登记插件指令 "resegment"
import { circleCurveSpec, circleSegmentsOnPlane } from "../src/editor/tools.ts";
import { GROUND } from "../src/editor/pick.ts";
import { compose, rotationAbout, translation } from "../src/scene/xform.ts";
import { kernelFromTriangles } from "../src/kernel/from-triangles.ts";

const P = (x: number, y: number, z = 0): Pt3 => ({ x, y, z });
const ROOT = (s: Scene) => ({ def: s.root, group: null });
/** 地面以上 z 高处画一个真圆（圆心在 z 轴上）。 */
const ring = (k: Kernel, r: number, z: number, N = 24): void => { const c = P(0, 0, z), rim = P(r, 0, z); k.addEdges(circleSegmentsOnPlane({ n: P(0, 0, 1), d: z }, GROUND.basis, c, rim, N), { curve: circleCurveSpec((p) => p, c, rim, { plane: { n: P(0, 0, 1) } }, N) }); };
const cylinder = (N = 24): Kernel => { const k = new Kernel(); ring(k, 1, 0, N); k.pushPull(k.faces()[0].id, 1); return k; };
/** 两级炮管：r1 推 1 → 顶上画 r0.5 同心圆 → 推 2。 */
const barrel = (N = 24): Kernel => {
  const k = cylinder(N); ring(k, 0.5, 1, N);
  const disk = k.faces().find((f) => f.holes.length === 0 && k.faceRings3(f.id)!.outer.every((p) => Math.abs(p.z - 1) < 1e-9 && Math.hypot(p.x, p.y) < 0.6))!;
  k.pushPull(disk.id, 2); return k;
};
const op = (s: Scene, segments: number): Op => ({ op: "plugin", name: "resegment", at: ROOT(s), args: { faces: [], segments } });
/** 导入的 N 棱柱三角网（侧面每格两个三角、两头三角扇），按导入的规矩：弯折 ≤ 20° 的边变软。 */
const importedPrism = (N: number, r = 1, h = 1): Kernel => {
  const pos: Pt3[] = [], tris: number[] = [];
  for (const z of [0, h]) for (let j = 0; j < N; j++) { const a = (2 * Math.PI * j) / N; pos.push(P(r * Math.cos(a), r * Math.sin(a), z)); }
  for (let j = 0; j < N; j++) { const j1 = (j + 1) % N; tris.push(j, j1, N + j1, j, N + j1, N + j); }
  for (let j = 1; j + 1 < N; j++) { tris.push(0, j + 1, j); tris.push(N, N + j, N + j + 1); }
  return kernelFromTriangles(pos, tris, { softDeg: 20 }).kernel;
};
const circles = (k: Kernel) => k.curves().filter((c) => c.kind === "circle" && c.params).map((c) => c.params!);

describe("改段数（回转体，DT94）", () => {
  it("圆柱 24 → 48：两圈还是圆、48 格长条 + 两个圆盘、长条边是软边、点都在原来的圆上", () => {
    const k = cylinder();
    const f = findRevolved(k, null);
    eq(f.bodies.length, 1); eq(f.bodies[0].rings.length, 2); eq(f.bodies[0].links.length, 1);
    let s = new Scene(k);
    s = applyOp(s, op(s, 48)).scene;
    const k2 = s.kernelOf(ROOT(s));
    eq(k2.faces().length, 50);
    eq(circles(k2).map((p) => p.segments).join(), "48,48");
    eq(k2.soft.size, 48, "长条之间的边是软边");
    assert(k2.vertices().every((v) => Math.abs(Math.hypot(v.x, v.y) - 1) < 1e-6 && (Math.abs(v.z) < 1e-6 || Math.abs(v.z - 1) < 1e-6)), "点都在原来的两个圆上");
  });
  it("两级炮管（长条 · 圆环 · 长条，4 圈）24 → 12：一次改完", () => {
    const k = barrel();
    const b = findRevolved(k, null).bodies[0];
    eq(b.rings.length, 4); eq(b.links.map((l) => l.kind).sort().join(), "annulus,band,band");
    let s = new Scene(k);
    s = applyOp(s, op(s, 12)).scene;
    const k2 = s.kernelOf(ROOT(s));
    eq(k2.faces().length, 12 + 12 + 2 + 1);
    eq(circles(k2).map((p) => p.segments).join(), "12,12,12,12");
    eq(findRevolved(k2, null).bodies[0].segments, 12, "改完照样认得出");
    assert(k2.edges().every((e) => new Set(e.faceLinks).size === 2), "还是封闭的实体（每条边挂两张面）");
  });
  it("横着摆的炮管（轴沿 x）照样认、照样改", () => {
    const src = barrel(), k = new Kernel();
    absorbSnapshot(k, src.toBrep(), compose(translation(P(5, 2, 1)), rotationAbout(P(0, 0, 0), P(0, 1, 0), Math.PI / 2)));
    eq(findRevolved(k, null).bodies.length, 1);
    let s = new Scene(k);
    s = applyOp(s, op(s, 16)).scene;
    eq(circles(s.kernelOf(ROOT(s))).map((p) => p.segments).join(), "16,16,16,16");
  });
  it("侧面画了一条线（粘了东西）→ 不改，报「看着像但不干净」", () => {
    const k = cylinder();
    const quad = k.faces().find((f) => f.outer.vids.length === 4)!, o = k.faceRings3(quad.id)!.outer;
    k.addEdges([[o[0], o[2]]]);
    const f = findRevolved(k, null);
    eq(f.bodies.length, 0); eq(f.notClean, 1);
  });
  it("导入的 24 边圆柱（三角网、没有圆的登记）：从网格认出来；改完各圈登记成圆", () => {
    const k = importedPrism(24);
    eq(k.curves().filter((c) => c.kind === "circle").length, 0, "导入的没有圆");
    eq(findRevolved(k, null).bodies.length, 1);
    let s = new Scene(k);
    s = applyOp(s, op(s, 32)).scene;
    const k2 = s.kernelOf(ROOT(s));
    eq(circles(k2).map((p) => p.segments).join(), "32,32");
    eq(k2.faces().length, 34);
  });
  it("导入的立方体（4 边）/ 12 棱柱（棱是硬边 = 故意做成多棱的）：不认", () => {
    eq(findRevolved(importedPrism(4), null).bodies.length, 0, "立方体");
    eq(findRevolved(importedPrism(12), null).bodies.length, 0, "12 棱柱（每条棱弯 30° > 20°，导入成硬边）");
  });
  it("外侧涂了颜色：改完外侧还是那个颜色", () => {
    const k = cylinder();
    for (const f of k.faces()) if (f.outer.vids.length === 4) {
      const rec = k.planeOf(f.id)!, o = k.faceRings3(f.id)!.outer, mid = o.reduce((a, p) => P(a.x + p.x / 4, a.y + p.y / 4, a.z + p.z / 4), P(0, 0, 0));
      const out = rec.plane.n.x * mid.x + rec.plane.n.y * mid.y >= 0;   // 平面法向朝外 → 正面
      k.faceLayers.set(out ? "material" : "materialBack", f.id, 2);
    }
    let s = new Scene(k);
    s = applyOp(s, op(s, 36)).scene;
    const k2 = s.kernelOf(ROOT(s));
    const quads = k2.faces().filter((f) => f.outer.vids.length === 4);
    eq(quads.length, 36);
    assert(quads.every((f) => { const rec = k2.planeOf(f.id)!, o = k2.faceRings3(f.id)!.outer, mid = o.reduce((a, p) => P(a.x + p.x / 4, a.y + p.y / 4, a.z + p.z / 4), P(0, 0, 0)); const outSide = rec.plane.n.x * mid.x + rec.plane.n.y * mid.y >= 0 ? 0 : 1; return k2.faceMaterialOf(f.id, outSide) === 2 && (k2.faceMaterialOf(f.id, outSide === 0 ? 1 : 0) ?? -1) === -1; }), "朝外的那一侧 = 2，朝里没颜色");
  });
});
