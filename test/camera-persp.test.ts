// 透视相机：worldToScreen ∘ screenRay 往返、视向、缩放钉点、视图预置。created 2026-09-06 by Claude Fable 5.1
import { describe, it, eq, assert } from "./runner.mjs";
import type { Pt3 } from "../src/kernel/kernel.ts";
import { OrbitCamera, rayPlane } from "../src/editor/camera.ts";
import { dist3 } from "../src/kernel/geom.ts";

const VP = { w: 1000, h: 800 };
const P = (x: number, y: number, z = 0): Pt3 => ({ x, y, z });

function persp(): OrbitCamera {
  const c = new OrbitCamera();
  c.projection = "persp";
  c.target = { x: 5, y: 5, z: 0 };
  c.halfH = 50;
  return c;
}

describe("camera persp", () => {
  it("默认仍是正交（测试/探针数值不受透视化影响）", () => {
    eq(new OrbitCamera().projection, "ortho");
  });

  it("worldToScreen ∘ screenRay∩地面 往返一致", () => {
    const c = persp();
    for (const p of [P(0, 0), P(30, -20), P(-15, 40), P(8, 8)]) {
      const s = c.worldToScreen(p, VP);
      const r = c.screenRay(s.x, s.y, VP);
      const q = rayPlane(r.origin, r.dir, { x: 0, y: 0, z: 1 }, 0)!;
      assert(dist3(p, q) < 1e-6, `往返偏差 ${dist3(p, q)} at ${JSON.stringify(p)}`);
    }
  });

  it("target 投影在屏幕中心；眼距 = halfH / tan(fov/2)", () => {
    const c = persp();
    const s = c.worldToScreen(c.target, VP);
    assert(Math.abs(s.x - 500) < 1e-6 && Math.abs(s.y - 400) < 1e-6, `${s.x},${s.y}`);
    eq(Math.round(c.eyeDist() * 1000) / 1000, Math.round((50 / Math.tan(c.fovY / 2)) * 1000) / 1000);
  });

  it("近大远小：同样的世界长度，离眼越近屏幕越长", () => {
    const c = persp();
    c.setView("front");
    const near = c.eyeDir();   // 朝眼方向
    const a0 = { x: c.target.x - 5, y: c.target.y, z: 0 }, a1 = { x: c.target.x + 5, y: c.target.y, z: 0 };
    const b0 = { x: a0.x + near.x * 100, y: a0.y + near.y * 100, z: a0.z + near.z * 100 };
    const b1 = { x: a1.x + near.x * 100, y: a1.y + near.y * 100, z: a1.z + near.z * 100 };
    const la = Math.hypot(c.worldToScreen(a1, VP).x - c.worldToScreen(a0, VP).x, c.worldToScreen(a1, VP).y - c.worldToScreen(a0, VP).y);
    const lb = Math.hypot(c.worldToScreen(b1, VP).x - c.worldToScreen(b0, VP).x, c.worldToScreen(b1, VP).y - c.worldToScreen(b0, VP).y);
    assert(lb > la * 1.2, `near ${lb} vs far ${la}`);
  });

  it("viewDirAt：正交=常向量；透视=指向眼睛的单位向量", () => {
    const o = new OrbitCamera();
    const d1 = o.viewDirAt(P(0, 0)), d2 = o.viewDirAt(P(100, 100, 50));
    assert(dist3(d1, d2) < 1e-12);
    const c = persp();
    const p = P(20, -30, 10);
    const v = c.viewDirAt(p);
    const e = c.eye();
    const len = Math.hypot(v.x, v.y, v.z);
    assert(Math.abs(len - 1) < 1e-9);
    const toEye = { x: e.x - p.x, y: e.y - p.y, z: e.z - p.z };
    const n = Math.hypot(toEye.x, toEye.y, toEye.z);
    assert(Math.abs(v.x * n - toEye.x) < 1e-6 && Math.abs(v.z * n - toEye.z) < 1e-6);
  });

  it("zoomAt：光标下的 target 深度平面点缩放前后钉在同一屏幕位置（两制）", () => {
    for (const proj of ["ortho", "persp"] as const) {
      const c = persp();
      c.projection = proj;
      const sx = 720, sy = 260;
      const r0 = c.screenRay(sx, sy, VP);
      const fwd = c.forward();
      const d0 = fwd.x * c.target.x + fwd.y * c.target.y + fwd.z * c.target.z;
      const P0 = rayPlane(r0.origin, r0.dir, fwd, d0)!;
      c.zoomAt(0.5, sx, sy, VP);
      const s1 = c.worldToScreen(P0, VP);
      assert(Math.abs(s1.x - sx) < 1e-6 && Math.abs(s1.y - sy) < 1e-6, `${proj}: ${s1.x},${s1.y}`);
      c.zoomAt(2, sx, sy, VP);
      const s2 = c.worldToScreen(P0, VP);
      assert(Math.abs(s2.x - sx) < 1e-6 && Math.abs(s2.y - sy) < 1e-6, `${proj} back: ${s2.x},${s2.y}`);
    }
  });

  it("fitPoints 把包围盒装进视口；空集回默认", () => {
    const c = persp();
    c.fitPoints([P(0, 0, 0), P(100, 0, 0), P(100, 60, 0), P(0, 60, 40)], VP);
    for (const p of [P(0, 0, 0), P(100, 0, 0), P(100, 60, 0), P(0, 60, 40)]) {
      const s = c.worldToScreen(p, VP);
      assert(s.x >= 0 && s.x <= VP.w && s.y >= 0 && s.y <= VP.h, `${JSON.stringify(s)}`);
    }
    c.fitPoints([], VP);
    eq(c.halfH, 220);
  });
});
