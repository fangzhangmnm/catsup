// 工具自带的推断目标（B22，2026-10-24 Claude Fable 5.1；user「rect, 2 point arc 这些是不是正方形，半圆，你忘了做snap？这些工具提供的snap点你想一下怎么设计接口」）：
// 一个口 AlignQuery.toolTargets；矩形 = 从首点出发的对角线（正方形 / 黄金分割，1-D）；两点弧 = 半圆点（0-D）；标签进 Snap3.label。
import { describe, it, eq, assert } from "./runner.mjs";
import { Kernel } from "../src/kernel/kernel.ts";
import type { Pt3 } from "../src/kernel/kernel.ts";
import { OrbitCamera } from "../src/editor/camera.ts";
import { snapPoint } from "../src/editor/solver.ts";
import { GROUND, NO_HAND } from "../src/editor/pick.ts";
import { arcToolTargets, rectToolTargets } from "../src/editor/tools.ts";

const P = (x: number, y: number, z = 0): Pt3 => ({ x, y, z });
const VP = { w: 1000, h: 800 };
const topCam = (): OrbitCamera => { const c = new OrbitCamera(); c.yaw = -Math.PI / 2; c.pitch = 1.5707; c.halfH = 50; return c; };
const far = (): Kernel => { const k = new Kernel(); k.addEdges([[P(-30, -30), P(-29, -30)]]); return k; };

describe("tool-targets: 矩形的正方形 / 黄金分割", () => {
  it("第二点离 45° 对角线 2 px → 吸到对角线，标签「正方形」，提示线从首点出发；离远不吸", () => {
    const cam = topCam(), k = far(), anchor = P(1, 1, 0);
    const T = rectToolTargets(anchor, GROUND.basis);
    eq(T.length, 6); eq(T.filter((t) => t.label === "正方形").length, 2); eq(T.filter((t) => t.label === "黄金分割").length, 4);
    const sp = cam.angularPx(P(4, 4.25, 0), VP);   // 离对角线 0.25/√2 m ≈ 1.4 px
    const r = snapPoint(k, cam, VP, sp.x, sp.y, 8, { plane: GROUND, anchor, hand: NO_HAND, toolTargets: T, lines: false });
    eq(r.kind, "tool"); eq(r.label, "正方形");
    assert(Math.abs((r.p.x - 1) - (r.p.y - 1)) < 1e-9, `落在对角线上：${r.p.x},${r.p.y}`);
    assert(r.hints?.length === 1 && r.hints[0].a === anchor || (r.hints && Math.abs(r.hints[0].a.x - 1) < 1e-9), "提示线从首点出发");
    const far2 = cam.angularPx(P(4, 9, 0), VP);   // 离六条线都 > 10 px
    const r2 = snapPoint(k, cam, VP, far2.x, far2.y, 8, { plane: GROUND, anchor, hand: NO_HAND, toolTargets: T, lines: false });
    assert(r2.kind !== "tool", `离远不吸：${r2.kind}`);
  });
  it("黄金分割线：第二点在 (φ, 1) 方向上 → 标签「黄金分割」；端点在旁边 → 端点赢", () => {
    const cam = topCam(), k = far(), anchor = P(0, 0, 0);
    const T = rectToolTargets(anchor, GROUND.basis), phi = (1 + Math.sqrt(5)) / 2;
    const sp = cam.angularPx(P(3 * phi, 3 + 0.1, 0), VP);
    const r = snapPoint(k, cam, VP, sp.x, sp.y, 8, { plane: GROUND, anchor, hand: NO_HAND, toolTargets: T, lines: false });
    eq(r.kind, "tool"); eq(r.label, "黄金分割");
    assert(Math.abs(r.p.x / r.p.y - phi) < 1e-6, "落在 φ 线上");
    const k2 = far(); k2.addEdges([[P(3 * phi, 3.3, 0), P(3 * phi, 9, 0)]]);
    const r2 = snapPoint(k2, cam, VP, sp.x, sp.y, 8, { plane: GROUND, anchor, hand: NO_HAND, toolTargets: T, lines: false });
    eq(r2.kind, "endpoint", "几何先于工具目标");
  });
});

describe("tool-targets: 两点弧的半圆", () => {
  it("弦 (0,0)-(4,0)：半圆点 = (2,±2)；凸度点离它 3 px → 吸住，标签「半圆」", () => {
    const cam = topCam(), k = far();
    const T = arcToolTargets(P(0, 0, 0), P(4, 0, 0), P(0, 0, 1));
    eq(T.length, 2);
    assert(T.some((t) => t.locus.dim === 0 && Math.abs(t.locus.p.x - 2) < 1e-9 && Math.abs(t.locus.p.y - 2) < 1e-9), "上半圆点");
    const sp = cam.angularPx(P(2.3, 2.2, 0), VP);
    const r = snapPoint(k, cam, VP, sp.x, sp.y, 8, { plane: GROUND, anchor: P(0, 0, 0), hand: NO_HAND, toolTargets: T, lines: false });
    eq(r.kind, "tool"); eq(r.label, "半圆"); assert(Math.abs(r.p.x - 2) < 1e-9 && Math.abs(r.p.y - 2) < 1e-9);
    eq(arcToolTargets(P(1, 1, 0), P(1, 1, 0), P(0, 0, 1)).length, 0, "弦退化没有目标");
  });
});
