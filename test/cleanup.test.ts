// 清理碎渣（纪元账本 DT102，2026-10-26，Claude Opus 5.5）。user：「清理碎渣」（真样本等 user 找到那个清理了三天的模型）。
// ① 悬空的线擦掉 ② 很短的边并成一个点 ③ 同一平面上切碎的面并回去（两边材质一样才并；曲线 / 隐藏的不碰）。
import { describe, it, eq, assert } from "./runner.mjs";
import { Kernel } from "../src/kernel/kernel.ts";
import type { Pt3 } from "../src/kernel/kernel.ts";
import { Scene } from "../src/scene/scene.ts";
import { applyOp, type Op } from "../src/editor/ops.ts";
import { coplanarInnerEdges, strayEdges, tinyEdgeMoves } from "../src/editor/repairs/cleanup/plan.ts";
import "../src/editor/repairs/cleanup/index.ts";   // 登记插件指令 "cleanup"
import { circleCurveSpec, circleSegmentsOnPlane } from "../src/editor/tools.ts";
import { GROUND } from "../src/editor/pick.ts";

const P = (x: number, y: number, z = 0): Pt3 => ({ x, y, z });
const loop = (k: Kernel, pts: Pt3[]): void => { k.addEdges(pts.map((p, i) => [p, pts[(i + 1) % pts.length]] as [Pt3, Pt3])); };
const ROOT = (s: Scene) => ({ def: s.root, group: null });
const op = (s: Scene, args: Record<string, unknown>): Op => ({ op: "plugin", name: "cleanup", at: ROOT(s), args: { edges: [], stray: true, tinyLen: 0.001, coplanar: true, ...args } });
/** 一张 2×1 的面被中间一条线切成两半。 */
const split = (): Kernel => { const k = new Kernel(); loop(k, [P(0, 0), P(2, 0), P(2, 1), P(0, 1)]); k.addEdges([[P(1, 0), P(1, 1)]]); return k; };

describe("清理碎渣（DT102）", () => {
  it("① 悬空的线：盒子旁边一根孤线 → 擦掉，盒子不动", () => {
    const k = new Kernel(); loop(k, [P(0, 0), P(1, 0), P(1, 1), P(0, 1)]); k.pushPull(k.faces()[0].id, 1);
    k.addEdges([[P(3, 0), P(4, 0)]]);
    eq(strayEdges(k, null).length, 1);
    let s = new Scene(k);
    s = applyOp(s, op(s, { tinyLen: 0, coplanar: false })).scene;
    const k2 = s.kernelOf(ROOT(s));
    eq(k2.edges().length, 12); eq(k2.faces().length, 6);
  });
  it("② 很短的边：方形一角多出一个 0.4 mm 的点 → 并掉，剩 4 个点、一张面", () => {
    const k = new Kernel(); loop(k, [P(0, 0), P(1, 0), P(1, 1), P(0, 1), P(0, 0.0004)]);
    eq(k.vertices().length, 5);
    const t = tinyEdgeMoves(k, null, 0.001);
    eq(t.clusters, 1); eq(t.moves.length, 1);
    let s = new Scene(k);
    s = applyOp(s, op(s, { stray: false, coplanar: false })).scene;
    const k2 = s.kernelOf(ROOT(s));
    eq(k2.vertices().length, 4); eq(k2.faces().length, 1);
  });
  it("③ 同一平面上切成两半 → 并回一张面；一半涂了别的颜色 → 不并", () => {
    const k = split(); eq(k.faces().length, 2);
    eq(coplanarInnerEdges(k, null).length, 1);
    let s = new Scene(k);
    s = applyOp(s, op(s, { stray: false, tinyLen: 0 })).scene;
    eq(s.kernelOf(ROOT(s)).faces().length, 1);
    const k3 = split();
    k3.faceLayers.set("material", k3.faces()[0].id, 2);
    eq(coplanarInnerEdges(k3, null).length, 0, "涂了色的不并");
  });
  it("③ 面上画的圆（曲线）不擦；隐藏的边不擦", () => {
    const k = new Kernel(); loop(k, [P(-2, -2), P(2, -2), P(2, 2), P(-2, 2)]);
    const c = P(0, 0), rim = P(0.5, 0);
    k.addEdges(circleSegmentsOnPlane(GROUND.plane, GROUND.basis, c, rim, 24), { curve: circleCurveSpec((p) => p, c, rim, GROUND, 24) });
    eq(k.faces().length, 2);
    eq(coplanarInnerEdges(k, null).length, 0, "圆是曲线，不擦");
    const k2 = split(), mid = coplanarInnerEdges(k2, null)[0];
    k2.setEdgeLayer("hidden", [mid], true);
    eq(coplanarInnerEdges(k2, null).length, 0, "隐藏的不擦");
  });
  it("③ 看不见的软边默认不并；打开「软边也并」才并", () => {
    const k = split(), mid = coplanarInnerEdges(k, null)[0];
    k.setEdgeLayer("soft", [mid], true); k.setEdgeLayer("smooth", [mid], true);
    eq(coplanarInnerEdges(k, null).length, 0, "默认不看软边");
    eq(coplanarInnerEdges(k, null, { soft: true }).length, 1);
    let s = new Scene(k);
    s = applyOp(s, op(s, { stray: false, tinyLen: 0, softToo: true })).scene;
    eq(s.kernelOf(ROOT(s)).faces().length, 1);
  });
  it("范围：只看选中的边", () => {
    const k = split(), mid = coplanarInnerEdges(k, null)[0], other = k.edges().find((e) => e.id !== mid)!.id;
    eq(coplanarInnerEdges(k, new Set([other])).length, 0);
    eq(coplanarInnerEdges(k, new Set([mid])).length, 1);
  });
});
