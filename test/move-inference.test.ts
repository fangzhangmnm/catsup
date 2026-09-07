// test/move-inference.test.ts —— move 自由拖的宽锥三轴三选一 / 擦射线护栏 / 线第二点黏地面 golden（2026-09-07 VR 真机屋脊案）。
// created 2026-09-07 by Claude Fable 5.1
import { describe, it, assert, eq } from "./runner.mjs";
import { Kernel } from "../src/kernel/kernel.ts";
import { OrbitCamera } from "../src/editor/camera.ts";
import { GROUND, NO_HAND, grazing, inferAxisByDirection, resolvePlane } from "../src/editor/pick.ts";

const VP = { w: 800, h: 800 };
const near = (a: number, b: number, t = 1e-6): boolean => Math.abs(a - b) <= t;

describe("move: 宽锥三轴三选一（SU 方向推断）", () => {
  it("顶视正交：光标从锚点向右拖 → x 轴；向上拖 → y 轴；45° 对角 → 无轴（锥外）", () => {
    const c = new OrbitCamera(); c.setView("top"); c.halfH = 5; c.target = { x: 0, y: 0, z: 0 };
    const a = { x: 0, y: 0, z: 0 };
    const s0 = c.angularPx(a, VP);
    const r1 = inferAxisByDirection(c, VP, a, s0.x + 100, s0.y + 5)!;
    assert(r1 && r1.axis === "x" && near(r1.p.y, 0, 1e-3) && r1.p.x > 0.5, `right → ${JSON.stringify(r1)}`);
    const r2 = inferAxisByDirection(c, VP, a, s0.x - 5, s0.y - 100)!;
    assert(r2 && r2.axis === "y" && near(r2.p.x, 0, 1e-3) && r2.p.y > 0.5, `up → ${JSON.stringify(r2)}`);
    const r3 = inferAxisByDirection(c, VP, a, s0.x + 100, s0.y - 100);
    eq(r3, null, "45° 对角在两个 30° 锥之外");
  });
  it("顶视看不到 z 轴（射线与 z 平行）→ z 不参赛；斜视透视时向上拖 → z", () => {
    const c = new OrbitCamera(); c.setView("top"); c.halfH = 5;
    const a = { x: 1, y: 1, z: 0 };
    const s0 = c.angularPx(a, VP);
    const r = inferAxisByDirection(c, VP, a, s0.x + 3, s0.y - 100);
    assert(!r || r.axis !== "z", `top view must not pick z: ${JSON.stringify(r)}`);
    const p = new OrbitCamera(); p.projection = "persp"; p.yaw = -Math.PI / 4; p.pitch = 0.3; p.halfH = 4; p.target = { x: 0, y: 0, z: 0.5 };
    const sp = p.angularPx(a, VP);
    const rz = inferAxisByDirection(p, VP, a, sp.x, sp.y - 120)!;
    assert(rz && rz.axis === "z" && rz.p.z > 0.2 && near(rz.p.x, 1, 1e-3) && near(rz.p.y, 1, 1e-3), `up in persp → z: ${JSON.stringify(rz)}`);
  });
});

describe("grazing：射线与平面近平行", () => {
  it("站着看远处地面（俯仰 3°）= 擦；俯视 = 不擦", () => {
    const shallow = { origin: { x: 0, y: 0, z: 1.6 }, dir: { x: 0, y: Math.cos(0.05), z: -Math.sin(0.05) } };
    assert(grazing(GROUND, shallow), "3° should graze");
    const steep = { origin: { x: 0, y: 0, z: 1.6 }, dir: { x: 0, y: Math.cos(0.6), z: -Math.sin(0.6) } };
    assert(!grazing(GROUND, steep), "34° should not graze");
  });
});

describe("线第二点：首点在地面 → 兜底黏地面（不随指针俯仰翻竖直面）", () => {
  it("透视低俯仰（15°）、锚点在地面、光标指向远处地面：无 basePlane 会挑竖直面（点飞到空中）；有 basePlane 点仍在 z=0", () => {
    const k = new Kernel();
    const c = new OrbitCamera(); c.projection = "persp"; c.yaw = -Math.PI / 2; c.pitch = 0.26; c.halfH = 3; c.target = { x: 0, y: 3, z: 0 };
    const p1 = { x: 0, y: 1, z: 0 };
    const far = c.angularPx({ x: 0.3, y: 6, z: 0 }, VP);   // 远处地面上的一点
    const withBase = resolvePlane(k, c, VP, far.x, far.y, 8, { p1, hand: NO_HAND, basePlane: GROUND });
    assert(near(withBase.snap.p.z, 0, 1e-6), `with basePlane z=${withBase.snap.p.z}`);
    assert(Math.abs(withBase.plane.plane.n.z) > 0.999, "plane stays ground");
    const without = resolvePlane(k, c, VP, far.x, far.y, 8, { p1, hand: NO_HAND });
    // 记录现状（不断言其错）：低俯仰下 pickByFacing 挑的是竖直面，点离地 → 这就是「画线突然跳到空中」
    assert(Math.abs(without.plane.plane.n.z) < 0.5 || near(without.snap.p.z, 0, 1e-6), `sanity: ${JSON.stringify(without.plane.plane.n)}`);
  });
});
