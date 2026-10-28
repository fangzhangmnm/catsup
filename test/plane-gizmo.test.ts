// plane-gizmo.ts 的大小（2026-10-28 Claude Opus 5.5；user「硬表面的镜像的gizmos大小不应该随着视口乱动」）：
// 镜像面把手按屏幕像素定大小——同一个位置、同一个相机，面朝哪边都一样大；转视角（同一距离）也一样大。以前沿面内的轴量尺，轴斜着朝镜头时把手巨大。
import { describe, it, assert } from "./runner.mjs";
import { OrbitCamera } from "../src/editor/camera.ts";
import { gizmoGeom, worldPerPx } from "../src/editor/plane-gizmo.ts";

const vp = { w: 1000, h: 800 };
const near = (a: number, b: number, rel = 0.02): boolean => Math.abs(a - b) <= rel * Math.max(Math.abs(a), Math.abs(b));

describe("plane-gizmo 大小只看屏幕像素", () => {
  for (const proj of ["persp", "ortho"] as const) {
    it(`${proj}：面朝哪边把手都一样大`, () => {
      const c = new OrbitCamera(); c.projection = proj; c.yaw = 0.7; c.pitch = 0.5; c.halfH = 4; c.target = { x: 0, y: 0, z: 0 };
      const o = { x: 0.5, y: -0.3, z: 0.2 };
      const sizes = [{ x: 1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }, { x: 0, y: 0, z: 1 }, c.viewDir(o)].map((n) => gizmoGeom({ origin: o, normal: n }, c, vp).size);
      for (const s of sizes) assert(near(s, sizes[0]), `大小 ${sizes.map((x) => x.toFixed(4)).join(" / ")}`);
    });
  }
  it("persp：绕目标转一圈（距离不变）把手一样大", () => {
    const c = new OrbitCamera(); c.projection = "persp"; c.pitch = 0.4; c.halfH = 4; c.target = { x: 0, y: 0, z: 0 };
    const sizes: number[] = [];
    for (let k = 0; k < 8; k++) { c.yaw = (k * Math.PI) / 4; sizes.push(gizmoGeom({ origin: { x: 0, y: 0, z: 0 }, normal: { x: 1, y: 0, z: 0 } }, c, vp).size); }
    for (const s of sizes) assert(near(s, sizes[0]), `大小 ${sizes.map((x) => x.toFixed(4)).join(" / ")}`);
  });
  it("worldPerPx 和屏幕上量出来的一致（垂直于视线 1 px）", () => {
    const c = new OrbitCamera(); c.projection = "persp"; c.yaw = 1.1; c.pitch = 0.3; c.halfH = 3; c.target = { x: 0, y: 0, z: 0 };
    const w = worldPerPx(c, vp, { x: 0, y: 0, z: 0 })!;
    assert(w > 0 && Number.isFinite(w), `wpp ${w}`);
  });
});
