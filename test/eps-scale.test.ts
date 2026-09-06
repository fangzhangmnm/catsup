// ε 语义 = 视口高度分数（≡ fovY 角度分数）：同一世界、同一 halfH，视口高一倍 → 吸附圈（px）大一倍。
// created 2026-09-06 by Claude Fable 5.1（user：「吸附的语义还是屏幕大小…height+aspect 这个老 gl convention」）
import { describe, it, eq, assert } from "./runner.mjs";
import { Kernel } from "../src/kernel/kernel.ts";
import { OrbitCamera } from "../src/editor/camera.ts";
import { GROUND, snapPoint } from "../src/editor/pick.ts";
import { REF_VP_H, epsScale } from "../src/editor/solver.ts";
import { rectSegments } from "../src/editor/tools.ts";

const hand = { has: () => false, opaque: false };

describe("eps-scale", () => {
  it("基准 800px 高：epsScale=1；1600 高：2；竖屏 iPad 1366 高：1.7075", () => {
    eq(epsScale({ w: 1000, h: REF_VP_H }), 1);
    eq(epsScale({ w: 1000, h: 1600 }), 2);
    eq(Math.round(epsScale({ w: 1024, h: 1366 }) * 10000) / 10000, 1.7075);
  });

  it("同一 halfH，视口翻倍：12px 外的端点在 800 高吸不到、在 1600 高吸得到（点 ε 10 → 20）", () => {
    const k = new Kernel();
    k.addEdges(rectSegments({ x: 0, y: 0 }, { x: 100, y: 60 }));
    for (const proj of ["ortho", "persp"] as const) {
      const c = new OrbitCamera();
      c.projection = proj;
      c.yaw = -Math.PI / 2; c.pitch = 1.5; c.halfH = 100; c.target = { x: 50, y: 30, z: 0 };
      const corner = { x: 100, y: 60, z: 0 };
      for (const [h, want] of [[800, false], [1600, true]] as const) {
        const vp = { w: 1000, h };
        const s = c.worldToScreen(corner, vp);
        const tol = 8 * epsScale(vp);
        // 光标离端点的屏距固定 12px（顺着屏幕 x 方向），与视口高无关
        const sn = snapPoint(k, c, vp, s.x + 12, s.y, tol, { plane: GROUND, alignSources: [], hand });
        const hit = sn.kind === "endpoint";
        assert(hit === want, `${proj} h=${h}: kind=${sn.kind}，期望 endpoint=${want}`);
      }
    }
  });
});
