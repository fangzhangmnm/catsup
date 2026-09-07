// test/xr-pointer-frame.test.ts —— VR 指针帧（球面度量，无虚拟屏）golden。A17 sunset 2026-09-08。
// created 2026-09-07 by Claude Fable 5.1；rewritten 2026-09-08
import { describe, it, assert } from "./runner.mjs";
import { XRPointerFrame, XR_NOMINAL_VP, EPS_VR_DEG } from "../src/editor/xr-pointer-frame.ts";

const near = (a: number, b: number, t = 1e-6): boolean => Math.abs(a - b) <= t;
const VP = XR_NOMINAL_VP;

describe("xr-pointer-frame: 球面度量（度）", () => {
  it("ray(任意 x,y) = 手柄射线本身；点角距：正前方 0°，脚下/身后 > 90°（没有 1/z 镜像 branch）", () => {
    const pf = new XRPointerFrame();
    pf.set({ origin: { x: 0, y: 0, z: 1 }, dir: { x: 0, y: 0, z: 1 } });
    const r = pf.ray(123, 456, VP);
    assert(r.origin.z === 1 && r.dir.z === 1, "ray ignores (x, y)");
    assert(near(pf.distTo(0, 0, { x: 0, y: 0, z: 5 }, VP), 0), "ahead");
    for (const p of [{ x: 0.001, y: 0.002, z: 0 }, { x: 0, y: 0, z: 0.5 }, { x: 2, y: 0, z: 1 }]) {
      assert(pf.distTo(0, 0, p, VP) >= 90 - 1e-9, `behind/side ${JSON.stringify(p)} = ${pf.distTo(0, 0, p, VP)}`);
    }
    assert(near(pf.distTo(0, 0, { x: Math.tan(Math.PI / 6), y: 0, z: 2 }, VP), 30, 1e-9), "30° off");
  });
  it("线段角距：足点在弧内 = 到大圆的距离；弧外 = 端点；t 在 [0,1]；无限直线穿原点 = 0", () => {
    const pf = new XRPointerFrame();
    pf.set({ origin: { x: 0, y: 0, z: 0 }, dir: { x: 0, y: 1, z: 0 } });
    // 线段 (−1, 2, 0.5) → (1, 2, 0.5)：在 y=2 平面上，离射线 (0,1,0) 的大圆距离 = atan(0.5/2)
    const r = pf.distToSeg(0, 0, { x: -1, y: 2, z: 0.5 }, { x: 1, y: 2, z: 0.5 }, VP);
    assert(near(r.d, Math.atan2(0.5, 2) * 180 / Math.PI, 1e-6) && near(r.t, 0.5, 1e-6), `arc ${JSON.stringify(r)}`);
    const r2 = pf.distToSeg(0, 0, { x: 3, y: 2, z: 0 }, { x: 5, y: 2, z: 0 }, VP);   // 弧外：最近端点 (3,2,0)
    assert(near(r2.t, 0) && near(r2.d, Math.atan2(3, 2) * 180 / Math.PI, 1e-6), `endpoint ${JSON.stringify(r2)}`);
    const r3 = pf.distToSeg(0, 0, { x: 0, y: 3, z: 0 }, { x: 0, y: 5, z: 0 }, VP, true);
    assert(near(r3.d, 0, 1e-9), `line through origin ${JSON.stringify(r3)}`);
  });
  it("环距：射线穿环内 = 0；环外 = 到最近边", () => {
    const pf = new XRPointerFrame();
    pf.set({ origin: { x: 0.5, y: 0.5, z: 2 }, dir: { x: 0, y: 0, z: -1 } });
    const ring = [{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, { x: 1, y: 1, z: 0 }, { x: 0, y: 1, z: 0 }];
    assert(near(pf.distToRing(0, 0, ring, VP), 0), "inside");
    pf.set({ origin: { x: 3, y: 0.5, z: 2 }, dir: { x: 0, y: 0, z: -1 } });
    assert(pf.distToRing(0, 0, ring, VP) > 40, "outside → edge distance");
  });
  it("dirCos：锚点切平面上的方向比较——射线向上偏 → z 轴 |cos|≈1、x 轴 ≈0", () => {
    const pf = new XRPointerFrame();
    const anchor = { x: 0, y: 3, z: 0 };
    pf.set({ origin: { x: 0, y: 0, z: 0 }, dir: { x: 0, y: 3, z: 0.3 } });   // 光标略高于锚点
    const [cx, , cz] = pf.dirCos(0, 0, anchor, [{ x: 1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }, { x: 0, y: 0, z: 1 }], VP);
    assert(cz !== null && cz > 0.99 && cx !== null && cx < 0.01, `cos x=${cx} z=${cz}`);
  });
  it("travel = 射线转角（度）；eps 是独立的角度常量集", () => {
    const pf = new XRPointerFrame();
    pf.set({ origin: { x: 0, y: 0, z: 0 }, dir: { x: 0, y: 1, z: 0 } });
    pf.markDown();
    pf.set({ origin: { x: 0, y: 0, z: 0 }, dir: { x: Math.sin(Math.PI / 36), y: Math.cos(Math.PI / 36), z: 0 } });
    assert(near(pf.travel(), 5, 1e-9), `travel=${pf.travel()}`);
    assert(pf.eps().point === EPS_VR_DEG.point && pf.eps().line < pf.eps().point, "eps set");
  });
});
