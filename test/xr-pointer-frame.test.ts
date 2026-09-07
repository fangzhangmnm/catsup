// test/xr-pointer-frame.test.ts —— VR 控制器指针帧 golden：手后半球的点永不落在虚拟屏上（1/z 镜像 branch 掐掉）。
// created 2026-09-07 by Claude Fable 5.1（VR 真机首轮 #4「会拾取到 1/z 的 z->-z 平面」）
import { describe, it, assert } from "./runner.mjs";
import { XRPointerFrame, XR_VIRTUAL_VP } from "../src/editor/xr-pointer-frame.ts";

describe("xr-pointer-frame: 手后半球不参赛", () => {
  it("射线朝上时，脚下/身后的点投影到屏外（远点），正前方的点在屏心", () => {
    const pf = new XRPointerFrame();
    pf.set({ origin: { x: 0, y: 0, z: 1 }, dir: { x: 0, y: 0, z: 1 } });
    const vp = XR_VIRTUAL_VP;
    const c = pf.cursor();
    for (const p of [{ x: 0.001, y: 0.002, z: 0 }, { x: 0, y: 0, z: 0.5 }, { x: 0.3, y: -0.2, z: 0.999 }, { x: 2, y: 0, z: 1 }]) {
      const s = pf.angularPx(p, vp);
      assert(Math.hypot(s.x - c.x, s.y - c.y) > vp.h, `behind/side point ${JSON.stringify(p)} → ${JSON.stringify(s)}`);
    }
    const s = pf.angularPx({ x: 0, y: 0, z: 5 }, vp);
    assert(Math.abs(s.x - c.x) < 1e-6 && Math.abs(s.y - c.y) < 1e-6, `ahead → ${JSON.stringify(s)}`);
  });
  it("ray(屏心) 就是控制器射线本身", () => {
    const pf = new XRPointerFrame();
    pf.set({ origin: { x: 1, y: 2, z: 3 }, dir: { x: 0.6, y: 0, z: 0.8 } });
    const r = pf.ray(XR_VIRTUAL_VP.w / 2, XR_VIRTUAL_VP.h / 2, XR_VIRTUAL_VP);
    assert(Math.abs(r.dir.x - 0.6) < 1e-9 && Math.abs(r.dir.z - 0.8) < 1e-9 && r.origin.x === 1, JSON.stringify(r));
  });
});
