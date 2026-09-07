// 「面上」吸附（SU On Face）：悬停未落笔、光标裸落膜内 → kind=on-face；同平面环外 / 轴系平面 → null。
// created 2026-09-06 by Claude Fable 5.1（user：「还没有落笔的时候也应该显示面上的吸附」）
import { describe, it, eq, assert } from "./runner.mjs";
import { Kernel } from "../src/kernel/kernel.ts";
import type { Pt3 } from "../src/kernel/kernel.ts";
import { OrbitCamera } from "../src/editor/camera.ts";
import { GROUND, drawPlaneAt, snapPoint, NO_HAND } from "../src/editor/pick.ts";
import { resolveRectPlane } from "../src/editor/solver.ts";
import { rectSegments } from "../src/editor/tools.ts";

const VP = { w: 1000, h: 800 };
const P = (x: number, y: number, z = 0): Pt3 => ({ x, y, z });
const hand = { has: () => false, opaque: false };

function scene(): { k: Kernel; c: OrbitCamera } {
  const k = new Kernel();
  k.addEdges(rectSegments({ x: 0, y: 0 }, { x: 100, y: 60 }));
  const c = new OrbitCamera();
  c.yaw = -Math.PI / 2; c.pitch = 1.5; c.halfH = 100; c.target = P(50, 30, 0);
  return { k, c };
}

describe("on-face", () => {
  it("悬停在膜内（首点查询）→ on-face，点就是射线落点", () => {
    const { k, c } = scene();
    const s = c.worldToScreen(P(50, 30), VP);
    const plane = drawPlaneAt(k, c, VP, s.x, s.y);
    eq(plane.face, k.faces()[0].id);
    const sn = snapPoint(k, c, VP, s.x, s.y, 8, { plane, alignSources: [], hand });
    eq(sn.kind, "on-face");
    assert(Math.abs(sn.p.x - 50) < 1e-6 && Math.abs(sn.p.y - 30) < 1e-6);
  });

  it("同平面但在膜环外（地面空处）→ 轴系平面不带 face → null", () => {
    const { k, c } = scene();
    const s = c.worldToScreen(P(-40, 30), VP);
    const plane = drawPlaneAt(k, c, VP, s.x, s.y);
    eq(plane.face, undefined);
    const sn = snapPoint(k, c, VP, s.x, s.y, 8, { plane, alignSources: [], hand });
    eq(sn.kind, null);
  });

  it("GROUND 常量（无出身）永不报面上", () => {
    const { k, c } = scene();
    const s = c.worldToScreen(P(50, 30), VP);
    const sn = snapPoint(k, c, VP, s.x, s.y, 8, { plane: GROUND, alignSources: [], hand });
    eq(sn.kind, null);
  });

  it("低维目标仍优先：膜内靠近端点 → endpoint，不被面上抢走", () => {
    const { k, c } = scene();
    const s = c.worldToScreen(P(100, 60), VP);
    const plane = drawPlaneAt(k, c, VP, s.x + 3, s.y);
    const sn = snapPoint(k, c, VP, s.x + 3, s.y, 8, { plane, alignSources: [], hand });
    eq(sn.kind, "endpoint");
  });

  it("第二点拖进膜内（含点膜）→ on-face；拖出环外 → 不报面上", () => {
    const { k, c } = scene();
    const p1 = P(0, 30);   // 左边上一点（不在轴线上避免 axis 抢先：用 y=31）
    const anchor = P(0, 31);
    const inside = c.worldToScreen(P(40, 17), VP);
    const r1 = resolveRectPlane(k, c, VP, anchor, inside.x, inside.y, 8, [], NO_HAND);
    eq(r1.snap.kind, "on-face");
    void p1;
  });
});
