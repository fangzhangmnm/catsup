// 恢复层级（纪元账本 DT99，2026-10-26，Claude Opus 5.5）。user：「形状一样的块自动合并好主意！！！……自动恢复层级做着吧」。
// 连在一起的块各成一组；形状一样的（旋转 + 平移对得上，材质 / 边层也一样）合成同一个组件的几份；这一层已有的素组也参加；世界里的几何一点不变。
import { describe, it, eq, assert } from "./runner.mjs";
import { Kernel } from "../src/kernel/kernel.ts";
import type { Pt3 } from "../src/kernel/kernel.ts";
import { Scene, absorbSnapshot, extractSnapshot } from "../src/scene/scene.ts";
import { applyOp, type Op } from "../src/editor/ops.ts";
import { History } from "../src/editor/history.ts";
import { classifyShapes, congruentXform, piecesOf } from "../src/editor/hierarchy.ts";
import { compose, det3, rotationAbout, scalingAbout, translation, applyPt } from "../src/scene/xform.ts";
import { circleCurveSpec, circleSegmentsOnPlane } from "../src/editor/tools.ts";
import { GROUND } from "../src/editor/pick.ts";

const P = (x: number, y: number, z = 0): Pt3 => ({ x, y, z });
const loop = (k: Kernel, pts: Pt3[]): void => { k.addEdges(pts.map((p, i) => [p, pts[(i + 1) % pts.length]] as [Pt3, Pt3])); };
/** 1×2×0.5 的盒子（不对称：三个边长都不同 → 只有旋转能对上）。 */
const boxKernel = (w = 1, d = 2, h = 0.5): Kernel => { const k = new Kernel(); loop(k, [P(0, 0), P(w, 0), P(w, d), P(0, d)]); k.pushPull(k.faces()[0].id, h); return k; };
/** 手性件：L 形柱、竖着那条臂上再长一级台阶（光是拉伸的 L 形柱不手性——镜像后翻个面就一样）。 */
const lKernel = (): Kernel => {
  const k = new Kernel(); loop(k, [P(0, 0), P(2, 0), P(2, 1), P(1, 1), P(1, 3), P(0, 3)]); k.pushPull(k.faces()[0].id, 0.5);
  loop(k, [P(0, 1.5, 0.5), P(1, 1.5, 0.5), P(1, 3, 0.5), P(0, 3, 0.5)]);
  const step = k.faces().find((f) => { const o = k.faceRings3(f.id)!.outer; return o.length === 4 && o.every((p) => Math.abs(p.z - 0.5) < 1e-9 && p.y >= 1.5 - 1e-9); })!;
  k.pushPull(step.id, 0.3); return k;
};
const wheelKernel = (): Kernel => { const k = new Kernel(), c = P(0, 0, 0), rim = P(0.4, 0, 0); k.addEdges(circleSegmentsOnPlane(GROUND.plane, GROUND.basis, c, rim, 24), { curve: circleCurveSpec((p) => p, c, rim, GROUND, 24) }); k.pushPull(k.faces()[0].id, 0.2); return k; };
const ROOT = (s: Scene) => ({ def: s.root, group: null });
const op = (s: Scene, dedupe = true, mirror = false): Op => ({ op: "restoreHierarchy", at: ROOT(s), faces: [], edges: [], dedupe, mirror });
/** 两组点按 1 µm 容差一一配上（整理前后世界里的点应完全一样）。 */
const samePts = (a: Pt3[], b: Pt3[], tol = 1e-6): boolean => {
  if (a.length !== b.length) return false;
  const used = new Uint8Array(b.length);
  return a.every((p) => { const j = b.findIndex((q, i) => !used[i] && Math.abs(q.x - p.x) <= tol && Math.abs(q.y - p.y) <= tol && Math.abs(q.z - p.z) <= tol); if (j < 0) return false; used[j] = 1; return true; });
};
const worldPts = (s: Scene): Pt3[] => s.pointsOfDef(s.root);
const R30 = compose(translation(P(5, 1, 0)), rotationAbout(P(0, 0, 0), P(0, 0, 1), Math.PI / 6));
const RX = compose(translation(P(-4, 0, 2)), rotationAbout(P(0, 0, 0), P(1, 0, 0), Math.PI / 2));

describe("hierarchy: 形状比对", () => {
  it("同一个盒子转 30° + 平移 → 找得到变换；把 a 摆过去 = b", () => {
    const a = boxKernel().toBrep(), k = new Kernel();
    absorbSnapshot(k, a, R30);
    const b = k.toBrep(), m = congruentXform(a, b);
    assert(m !== null, "对得上");
    assert(samePts(a.vertices.map((p) => applyPt(m!, p)), [...b.vertices]), "a 的点经变换 = b 的点（盒子自己有对称，变换不一定是摆放用的那个）");
  });
  it("尺寸不同 / 镜像（手性 L 形）/ 等比放大 → 对不上", () => {
    const a = boxKernel().toBrep();
    eq(congruentXform(a, boxKernel(1, 2.01, 0.5).toBrep()), null, "差 1 cm");
    const l = lKernel().toBrep(), km = new Kernel();
    absorbSnapshot(km, l, scalingAbout(P(0, 0, 0), P(-1, 1, 1)));
    eq(congruentXform(l, km.toBrep()), null, "不开镜像：手性件的镜像不算一样");
    const mm = congruentXform(l, km.toBrep(), { mirror: true });
    assert(mm !== null && det3(mm) < 0, "开镜像：对得上，变换带镜像（行列式 −1）");
    const kr = new Kernel(); absorbSnapshot(kr, l, R30);
    assert(congruentXform(l, kr.toBrep()) !== null, "转过的 L 形算一样");
    const ks = new Kernel(); absorbSnapshot(ks, a, scalingAbout(P(0, 0, 0), P(2, 2, 2)));
    eq(congruentXform(a, ks.toBrep()), null, "放大两倍不算一样");
  });
  it("对称件（24 段圆柱，软边 + 圆曲线）横过来摆 → 对得上", () => {
    const a = wheelKernel().toBrep(), k = new Kernel();
    absorbSnapshot(k, a, RX);
    assert(congruentXform(a, k.toBrep()) !== null);
  });
  it("材质不同 → 不算一样", () => {
    const k1 = boxKernel(), k2 = boxKernel();
    const top = k2.faces().find((f) => k2.faceRings3(f.id)!.outer.every((p) => Math.abs(p.z - 0.5) < 1e-9))!;
    k2.faceLayers.set("material", top.id, 3);
    eq(congruentXform(k1.toBrep(), k2.toBrep()), null);
    eq(classifyShapes([k1.toBrep(), k2.toBrep(), boxKernel().toBrep()]).classes.map((c) => c.length).join(","), "2,1", "两个没上色的一类、上色的自己一类");
  });
});

describe("hierarchy: 恢复层级 op", () => {
  /** 根上散着：三个一样的盒子（一个转过）+ 一个圆柱 + 一根孤线。 */
  const messy = (): Scene => {
    const k = new Kernel(), box = boxKernel().toBrep();
    absorbSnapshot(k, box);
    absorbSnapshot(k, box, translation(P(3, 0, 0)));
    absorbSnapshot(k, box, R30);
    absorbSnapshot(k, wheelKernel().toBrep(), translation(P(0, 6, 0)));
    k.addEdges([[P(-5, -5, 0), P(-4, -5, 0)]]);
    return new Scene(k);
  };
  it("连通块：4 块含面的；孤线不算", () => {
    const s = messy();
    eq(piecesOf(s.kernelOf(ROOT(s))).length, 4);
  });
  it("三个盒子 → 一个组件三份；圆柱 → 一个组；孤线留在原地；世界里的点一个不差", () => {
    let s = messy();
    const before = worldPts(s), defs0 = s.defs.size;
    s = applyOp(s, op(s)).scene;
    eq(s.defs.size, defs0 + 1, "多一个组件定义");
    const comp = [...s.defs.values()].find((d) => d.id !== s.root)!;
    eq(comp.name, "零件 1");
    eq([...s.def(s.root).instances.values()].filter((i) => i.def === comp.id).length, 3, "三份");
    eq(s.brep(s.root).groups.size, 1, "圆柱成组");
    const rk = s.kernelOf(ROOT(s));
    eq(rk.faces().length, 0, "根上没面了"); eq(rk.edges().length, 1, "孤线还在");
    assert(samePts(worldPts(s), before), "世界里的几何不变");
    const g = [...s.brep(s.root).groups.values()][0];
    assert(g.kernel.curves().some((c) => c.kind === "circle"), "圆柱进组还是圆");
  });
  it("关掉合并 → 四块各成一组，没有组件", () => {
    let s = messy();
    const before = worldPts(s);
    s = applyOp(s, op(s, false)).scene;
    eq(s.defs.size, 1); eq(s.brep(s.root).groups.size, 4);
    assert(samePts(worldPts(s), before), "世界里的几何不变");
  });
  it("只有一块 → 什么都不做（不多包一层）", () => {
    let s = new Scene(boxKernel());
    s = applyOp(s, op(s)).scene;
    eq(s.brep(s.root).groups.size, 0); eq(s.kernelOf(ROOT(s)).faces().length, 6);
  });
  it("已经各自成组的一排轮子（素组）→ 合成组件，组没了", () => {
    let s = new Scene(new Kernel());
    const w = wheelKernel().toBrep();
    for (let i = 0; i < 4; i++) { const k = new Kernel(); absorbSnapshot(k, w, translation(P(i * 1.5, 0, 0))); s.mintGroup(s.root, null, k, { origin: P(i * 1.5, 0, 0), x: P(1, 0, 0), y: P(0, 1, 0), z: P(0, 0, 1) }); }
    const before = worldPts(s);
    s = applyOp(s, op(s)).scene;
    eq(s.brep(s.root).groups.size, 0, "四个组换成实例");
    eq(s.def(s.root).instances.size, 4);
    eq(new Set([...s.def(s.root).instances.values()].map((i) => i.def)).size, 1, "同一个定义");
    assert(samePts(worldPts(s), before), "世界里的几何不变");
  });
  it("组件定义里面也能跑（子子孙孙由修复的「含子物体」逐池跑）", () => {
    let s = messy();
    const k = s.kernelOf(ROOT(s));
    const all = piecesOf(k);
    s = applyOp(s, { op: "makeComponent", at: ROOT(s), faces: [...all[0].faces, ...all[1].faces].map((f) => { const r = k.faceRings3(f)!; return r.outer; }), edges: [], name: "两个盒子" } as unknown as Op).scene;
    const def = [...s.defs.values()].find((d) => d.name === "两个盒子")!;
    const before = worldPts(s);
    s = applyOp(s, { op: "restoreHierarchy", at: { def: def.id, group: null }, faces: [], edges: [], dedupe: true }).scene;
    eq(s.def(def.id).instances.size, 2, "定义里的两个盒子 → 两份实例");
    assert(samePts(worldPts(s), before), "世界里的几何不变");
  });
  it("左右镜像的手性件：开镜像 → 一个组件两份（一份负变换）；不开 → 两个组；世界里的点都不变", () => {
    for (const mirror of [true, false]) {
      const k = new Kernel(), l = lKernel().toBrep();
      absorbSnapshot(k, l, translation(P(2, 0, 0)));
      absorbSnapshot(k, l, scalingAbout(P(0, 0, 0), P(-1, 1, 1)));
      let s = new Scene(k);
      const before = worldPts(s);
      s = applyOp(s, op(s, true, mirror)).scene;
      if (mirror) {
        eq(s.def(s.root).instances.size, 2); eq(s.brep(s.root).groups.size, 0);
        assert([...s.def(s.root).instances.values()].some((i) => det3(i.xform) < 0), "有一份是镜像的");
      } else { eq(s.def(s.root).instances.size, 0); eq(s.brep(s.root).groups.size, 2); }
      assert(samePts(worldPts(s), before), `世界里的几何不变（mirror=${mirror}）`);
    }
  });
  it("撤销 = 一步回原样", () => {
    const s0 = messy(), h = new History(s0);
    let s = s0.clone();
    const before = worldPts(s);
    s = h.commit(s, op(s)).scene;
    s = h.undo()!.scene;
    eq(s.defs.size, 1); eq(s.brep(s.root).groups.size, 0); eq(s.kernelOf(ROOT(s)).faces().length, 18 + 26);
    assert(samePts(worldPts(s), before), "世界里的几何不变");
  });
  it("快照抽出来的件和原件形状一样（规划用的快照不丢东西）", () => {
    const s = messy(), k = s.kernelOf(ROOT(s)), ps = piecesOf(k);
    const snaps = ps.map((p) => extractSnapshot(k, p.faces, p.edges));
    eq(classifyShapes(snaps).classes.map((c) => c.length).sort().join(","), "1,3");
  });
});
