// 拍平（纪元排期 T9 / 账本 DT7，2026-10-26，Claude Opus 5.5）。user：「也许比我想的简单……只是把所有小于角度的硬边干掉就行」；
// 例子「大家在 0.5、一个在 0.51」→ 0.5（众数平面）；「确保不要有任何面破」（零破面）。
// 10-26 夜 DT104：软边 / 折线也是候选（user「然后拍平当然管软边和折边！」）；整片弯得超过阈值 = 曲面，不拍（圆柱侧面每条软边只弯 15°）。
import { describe, it, eq, assert } from "./runner.mjs";
import { Kernel } from "../src/kernel/kernel.ts";
import type { Pt3 } from "../src/kernel/kernel.ts";
import { Scene } from "../src/scene/scene.ts";
import { applyOp, type Op } from "../src/editor/ops.ts";
import { History } from "../src/editor/history.ts";
import { PLANAR_DEFAULTS, planPlanar } from "../src/editor/repairs/planar/plan.ts";
import "../src/editor/repairs/planar/index.ts";   // 登记插件指令 "planar"
import { circleSegmentsOnPlane } from "../src/editor/tools.ts";
import { GROUND } from "../src/editor/pick.ts";

const P = (x: number, y: number, z = 0): Pt3 => ({ x, y, z });
const loop = (k: Kernel, pts: Pt3[]): void => { k.addEdges(pts.map((p, i) => [p, pts[(i + 1) % pts.length]] as [Pt3, Pt3])); };
/** 2×1 平面在 0.5 高 + 旁边 1×1 微翘面（远端两点 0.51）——共用一条硬边，弯折 ≈ 0.57°。 */
const tilted = (): Kernel => {
  const k = new Kernel();
  loop(k, [P(0, 0, 0.5), P(2, 0, 0.5), P(2, 1, 0.5), P(0, 1, 0.5)]);
  loop(k, [P(2, 0, 0.5), P(3, 0, 0.51), P(3, 1, 0.51), P(2, 1, 0.5)]);
  return k;
};
const rootAt = (s: Scene) => ({ def: s.root, group: null });
const op = (s: Scene, extra: Record<string, unknown> = {}): Op => ({ op: "plugin", name: "planar", at: rootAt(s), args: { faces: [], deg: 20, target: "mode", eraseInner: true, ...extra } });

describe("planar: 拍平", () => {
  it("user 的例子：大多数点在 0.5、翘起的两点在 0.51 → 全部到 0.5；擦内线 = 并成一张面；没有破面", () => {
    const k = tilted();
    eq(k.faces().length, 2);
    const plan = planPlanar(k, null, PLANAR_DEFAULTS);
    eq(plan.groups.length, 1); eq(plan.groups[0].length, 2);
    let s = new Scene(k);
    const r = applyOp(s, op(s)); s = r.scene;
    const k2 = s.kernelOf(rootAt(s));
    assert(k2.vertices().every((v) => Math.abs(v.z - 0.5) < 1e-9), "全部点在 0.5");
    eq(k2.faces().length, 1, "内线擦掉 → 一张面");
    assert(!r.events.some((e) => e.type === "BURST"), "零破面");
  });
  it("不擦内线：拍平了、边留着（两张共面的面）", () => {
    let s = new Scene(tilted());
    s = applyOp(s, op(s, { eraseInner: false })).scene;
    const k2 = s.kernelOf(rootAt(s));
    assert(k2.vertices().every((v) => Math.abs(v.z - 0.5) < 1e-9));
    eq(k2.faces().length, 2);
  });
  it("尖屋脊（弯 160°）不是候选；圆柱（平滑组）整片弯得超过阈值 = 曲面：没有要拍的组、报 1 片曲面", () => {
    const k = new Kernel(), s80 = (80 * Math.PI) / 180, dz = -Math.tan(s80);
    k.addEdges([[P(0, 0, 0), P(0, 2, 0)], [P(0, 2, 0), P(-1, 2, dz)], [P(-1, 2, dz), P(-1, 0, dz)], [P(-1, 0, dz), P(0, 0, 0)], [P(0, 2, 0), P(1, 2, dz)], [P(1, 2, dz), P(1, 0, dz)], [P(1, 0, dz), P(0, 0, 0)]] as [Pt3, Pt3][]);
    eq(planPlanar(k, null, PLANAR_DEFAULTS).groups.length, 0, "尖屋脊");
    const c = new Kernel();
    c.addEdges(circleSegmentsOnPlane(GROUND.plane, GROUND.basis, P(0, 0, 0), P(1, 0, 0), 24), { curve: true });
    c.pushPull(c.faces()[0].id, 2);
    const pc = planPlanar(c, null, PLANAR_DEFAULTS);
    eq(pc.groups.length, 0, "圆柱：侧面每条软边弯 15° < 20°，但整片弯一圈 → 不拍"); eq(pc.curved, 1);
  });
  it("几乎平的软边 / 折线（DT104）：照样拍平、擦掉 → 一张面", () => {
    for (const layer of ["soft", "fold"]) {
      const k = tilted();
      const mid = k.edges().find((e) => { const a = k.graph.pt(e.a), b = k.graph.pt(e.b); return Math.abs(a.x - 2) < 1e-9 && Math.abs(b.x - 2) < 1e-9; })!;
      k.setEdgeLayer(layer, [mid.id], true);
      if (layer === "soft") k.setEdgeLayer("smooth", [mid.id], true);
      assert(layer === "soft" ? k.isSoft(mid.id) : k.isFold(mid.id), `${layer} 打上了`);
      eq(planPlanar(k, null, PLANAR_DEFAULTS).groups.length, 1, `${layer}：是候选`);
      let s = new Scene(k);
      const r = applyOp(s, op(s)); s = r.scene;
      const k2 = s.kernelOf(rootAt(s));
      assert(k2.vertices().every((v) => Math.abs(v.z - 0.5) < 1e-9), `${layer}：全部点在 0.5`);
      eq(k2.faces().length, 1, `${layer}：并成一张面`);
      assert(!r.events.some((e) => e.type === "BURST"), `${layer}：零破面`);
    }
  });
  it("硬边 24 棱柱（每条棱弯 15°）：整片弯一圈 = 曲面，不拍（以前整组被拍扁 → 破面 → 整步被拒）", () => {
    const c = new Kernel();
    c.addEdges(circleSegmentsOnPlane(GROUND.plane, GROUND.basis, P(0, 0, 0), P(1, 0, 0), 24));
    c.pushPull(c.faces()[0].id, 2);
    const side = c.edges().find((e) => Math.abs(c.graph.pt(e.a).z - c.graph.pt(e.b).z) > 1)!;
    assert(!c.isSoft(side.id), "侧棱是硬边");
    const pc = planPlanar(c, null, PLANAR_DEFAULTS);
    eq(pc.groups.length, 0); eq(pc.curved, 1);
  });
  it("同一个模型里：微翘的板照样拍、旁边的圆柱不碰", () => {
    const k = tilted();
    k.addEdges(circleSegmentsOnPlane(GROUND.plane, GROUND.basis, P(10, 0, 0), P(11, 0, 0), 24), { curve: true });
    const disk = k.faces().find((f) => k.faceRings3(f.id)!.outer.every((p) => p.x > 8))!;
    k.pushPull(disk.id, 2);
    const plan = planPlanar(k, null, PLANAR_DEFAULTS);
    eq(plan.groups.length, 1); eq(plan.curved, 1);
    assert(plan.moves.every((m) => m.to.x < 5), "只挪板上的点");
  });
  it("已经平的面上画的线框（窗框，没推拉）：不是拍平的活，不擦（以前会被擦掉）", () => {
    const k = new Kernel(); loop(k, [P(0, 0), P(4, 0), P(4, 3), P(0, 3)]); loop(k, [P(1, 1), P(2, 1), P(2, 2), P(1, 2)]);
    eq(k.faces().length, 2);
    eq(planPlanar(k, null, PLANAR_DEFAULTS).groups.length, 0);
  });
  it("已经平、只被软边分开（被拉正拉平的微折 / 导入的三角网）：擦软边并成一张面；同平面上的硬线留着", () => {
    const k = new Kernel(); loop(k, [P(0, 0), P(4, 0), P(4, 3), P(0, 3)]);
    k.addEdges([[P(2, 0), P(2, 3)]]);   // 中线：一会儿变软
    loop(k, [P(0.5, 0.5), P(1.5, 0.5), P(1.5, 1.5), P(0.5, 1.5)]);   // 左半边上画的硬线框（窗框）
    const mid = k.edges().find((e) => { const a = k.graph.pt(e.a), b = k.graph.pt(e.b); return Math.abs(a.x - 2) < 1e-9 && Math.abs(b.x - 2) < 1e-9; })!.id;
    k.setEdgeLayer("soft", [mid], true); k.setEdgeLayer("smooth", [mid], true);
    const plan = planPlanar(k, null, PLANAR_DEFAULTS);
    eq(plan.groups.length, 1); eq(plan.erase.map((e) => e.id).join(), String(mid), "只擦那条软边，窗框留着");
    let s = new Scene(k);
    s = applyOp(s, op(s)).scene;
    eq(s.kernelOf(rootAt(s)).faces().length, 2, "两半并成一张（窗框里那张照旧）");
  });
  it("微翘的两半、一半涂了色：拍平，但两侧颜色不一样的那条边不擦", () => {
    const k = tilted();
    const far = k.faces().find((f) => k.faceRings3(f.id)!.outer.some((p) => Math.abs(p.z - 0.51) < 1e-9))!;
    k.faceLayers.set("material", far.id, 3);
    const plan = planPlanar(k, null, PLANAR_DEFAULTS);
    eq(plan.groups.length, 1); eq(plan.erase.length, 0, "颜色不一样不并");
    assert(plan.moves.length > 0, "照样拍平");
  });
  it("撤销回原样（一步）", () => {
    const s0 = new Scene(tilted()), h = new History(s0);
    let s = s0.clone();
    s = h.commit(s, op(s)).scene;
    s = h.undo()!.scene;
    const k = s.kernelOf(rootAt(s));
    eq(k.faces().length, 2); assert(k.vertices().some((v) => Math.abs(v.z - 0.51) < 1e-9), "翘起的点回来了");
  });
});
