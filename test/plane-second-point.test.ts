// 第二点平面查询：含光标的膜（且含锚点）胜出——从侧面底边往上拖矩形/线，几何落在侧面而不是地面。
// created 2026-09-06 by Claude Fable 5.1（user 截图案：「一个 cube，我从侧面的底边开始往上拖 rect，结果没有吸附在侧面上，反而一直显示边上」）
import { describe, it, assert } from "./runner.mjs";
import { Kernel } from "../src/kernel/kernel.ts";
import type { Pt3 } from "../src/kernel/kernel.ts";
import { OrbitCamera } from "../src/editor/camera.ts";
import { resolveRectPlane, faceUnderCursor } from "../src/editor/solver.ts";
import { rectSegments } from "../src/editor/tools.ts";
import { dist3, distToPlane } from "../src/kernel/geom.ts";

const VP = { w: 1000, h: 800 };
const P = (x: number, y: number, z: number): Pt3 => ({ x, y, z });

function box(): Kernel {
  const k = new Kernel();
  k.addEdges(rectSegments({ x: 0, y: 0 }, { x: 100, y: 60 }));
  k.pushPull(k.faces()[0].id, 40);
  return k;
}
/** 从南面（-Y）略俯视看盒子的正面 y=0。 */
function frontCam(proj: "ortho" | "persp"): OrbitCamera {
  const c = new OrbitCamera();
  c.projection = proj;
  c.yaw = -Math.PI / 2; c.pitch = 0.5; c.halfH = 120; c.target = P(50, 30, 20);
  return c;
}

describe("plane-second-point", () => {
  for (const proj of ["ortho", "persp"] as const) {
    it(`${proj}：光标在正面膜内 → faceUnderCursor 命中正面（法向 ±Y）`, () => {
      const k = box(); const c = frontCam(proj);
      const s = c.worldToScreen(P(60, 0, 25), VP);
      const f = faceUnderCursor(k, c, VP, s.x, s.y);
      assert(f && Math.abs(f.plane.n.y) > 0.99, `hit=${JSON.stringify(f?.plane.n)}`);
    });

    it(`${proj}：锚点在正面底边、光标在正面膜内 → 平面=正面，解析点在正面上（不再躺地报「边上」）`, () => {
      const k = box(); const c = frontCam(proj);
      const p1 = P(40, 0, 0);                       // 底边上一点（正面与底面共享）
      const s = c.worldToScreen(P(60, 0, 25), VP);  // 正面内部、不在任何轴线上
      const r = resolveRectPlane(k, c, VP, p1, s.x, s.y, 8, []);
      assert(Math.abs(r.plane.plane.n.y) > 0.99, `plane n=${JSON.stringify(r.plane.plane.n)}`);
      assert(distToPlane(r.snap.p, r.plane.plane) < 1e-6, "解析点应在正面平面上");
      assert(dist3(r.snap.p, P(60, 0, 25)) < 1e-6, `解析点 ${JSON.stringify(r.snap.p)}`);
      assert(r.snap.kind !== "on-edge", `不该报边上：${r.snap.kind}`);
    });

    it(`${proj}：锚点在背面底边（不在正面平面上）、光标在正面膜内 → 正面不胜出，平面仍含锚点`, () => {
      const k = box(); const c = frontCam(proj);
      const p1 = P(40, 60, 0);
      const s = c.worldToScreen(P(60, 0, 25), VP);
      const r = resolveRectPlane(k, c, VP, p1, s.x, s.y, 8, []);
      assert(distToPlane(p1, r.plane.plane) < 1e-6, "平面必须含锚点");
      assert(Math.abs(distToPlane(P(60, 0, 25), r.plane.plane)) > 1 || Math.abs(r.plane.plane.n.y) < 0.99 || Math.abs(r.plane.plane.d - 60) < 1e-6, "正面(y=0)不得胜出");
    });

    it(`${proj}：锚点在底边、光标在空中（无膜）→ 退回过锚点轴平面`, () => {
      const k = box(); const c = frontCam(proj);
      const p1 = P(40, 0, 0);
      const s = c.worldToScreen(P(-80, 0, 30), VP);   // 盒子左侧空中
      const r = resolveRectPlane(k, c, VP, p1, s.x, s.y, 8, []);
      assert(distToPlane(p1, r.plane.plane) < 1e-6, "平面必须含锚点");
      const n = r.plane.plane.n;
      assert([Math.abs(n.x), Math.abs(n.y), Math.abs(n.z)].some((v) => v > 0.999), "应是轴向平面");
    });
  }
});
