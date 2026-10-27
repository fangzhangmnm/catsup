// 补洞（纪元账本 DT103，2026-10-26，Claude Opus 5.5）。user：「补洞可以」。
// 洞 = 只挂一张面的边围成的简单平面环、环外的面都不和它同平面；补法 = 沿环重描（结算机长面）。平板上挖的洞是故意的、不补。
import { describe, it, eq, assert } from "./runner.mjs";
import { Kernel } from "../src/kernel/kernel.ts";
import type { Pt3 } from "../src/kernel/kernel.ts";
import { Scene } from "../src/scene/scene.ts";
import { applyOp } from "../src/editor/ops.ts";
import { planHoles } from "../src/editor/repairs/fill-holes/plan.ts";

const P = (x: number, y: number, z = 0): Pt3 => ({ x, y, z });
const loop = (k: Kernel, pts: Pt3[]): void => { k.addEdges(pts.map((p, i) => [p, pts[(i + 1) % pts.length]] as [Pt3, Pt3])); };
const faceAt = (k: Kernel, pred: (p: Pt3) => boolean) => k.faces().find((f) => k.faceRings3(f.id)!.outer.every(pred))!;
const openBox = (rot = 0): Kernel => {
  const c = Math.cos(rot), s = Math.sin(rot), R = (x: number, y: number) => P(x * c - y * s, x * s + y * c);
  const k = new Kernel(); loop(k, [R(0, 0), R(1, 0), R(1, 2), R(0, 2)]); k.pushPull(k.faces()[0].id, 1);
  k.eraseFaces([faceAt(k, (p) => Math.abs(p.z - 1) < 1e-9).id]); return k;
};
const fill = (k: Kernel) => { const plan = planHoles(k, null); let s = new Scene(k); const segs = plan.loops.flatMap((pts) => pts.map((p, i) => [p, pts[(i + 1) % pts.length]] as [Pt3, Pt3])); const r = segs.length ? applyOp(s, { op: "addEdges", at: { def: s.root, group: null }, segs }) : { scene: s, events: [] }; return { plan, k2: r.scene.kernelOf({ def: r.scene.root, group: null }), events: r.events }; };

describe("补洞（DT103）", () => {
  it("缺顶的盒子 → 补上（6 张面），零破面", () => {
    const k = openBox(); eq(k.faces().length, 5);
    const { plan, k2, events } = fill(k);
    eq(plan.loops.length, 1); eq(k2.faces().length, 6);
    assert(!events.some((e) => e.type === "BURST"), "零破面");
  });
  it("转了 37° 的盒子缺顶 → 照样补", () => {
    const { plan, k2 } = fill(openBox((37 * Math.PI) / 180));
    eq(plan.loops.length, 1); eq(k2.faces().length, 6);
  });
  it("单张地板、平板上挖的洞：环外的面和环同平面 = 故意的，不补", () => {
    const k = new Kernel(); loop(k, [P(0, 0), P(4, 0), P(4, 4), P(0, 4)]);
    eq(planHoles(k, null).loops.length, 0, "地板的外圈不是洞");
    loop(k, [P(1, 1), P(2, 1), P(2, 2), P(1, 2)]);
    k.eraseFaces([faceAt(k, (p) => p.x >= 1 - 1e-9 && p.x <= 2 + 1e-9 && p.y >= 1 - 1e-9 && p.y <= 2 + 1e-9).id]);
    eq(k.faces().length, 1, "挖出一个洞");
    eq(planHoles(k, null).loops.length, 0, "挖的洞不补");
  });
  it("缺两张相邻的面：开口不在一个平面上 → 不补、报出来", () => {
    const k = openBox();
    k.eraseFaces([faceAt(k, (p) => Math.abs(p.y) < 1e-9).id]);
    const plan = planHoles(k, null);
    eq(plan.loops.length, 0); eq(plan.skipped, 1);
  });
  it("范围：选区碰到洞的边 → 补；选区在别处 → 不补", () => {
    const k = openBox();
    const rim = k.edges().find((e) => e.faceLinks.length === 1)!.id, other = k.edges().find((e) => e.faceLinks.length === 2)!.id;
    eq(planHoles(k, new Set([rim])).loops.length, 1);
    eq(planHoles(k, new Set([other])).loops.length, 0);
  });
});
