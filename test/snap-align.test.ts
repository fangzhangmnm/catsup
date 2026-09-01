// 轴对齐 1-DOF 约束层（QoL 波 2026-09-01：原点/坐标轴 snap + from-point 共轴 + 正交合成）。
// created by Claude Fable 5, 2026-09-01
import { describe, it, eq, assert } from "./runner.mjs";
import { Kernel } from "../src/kernel/kernel.ts";
import type { Pt3 } from "../src/kernel/kernel.ts";
import { OrbitCamera } from "../src/playground/camera.ts";
import { GROUND, resolveRectPlane, snapPoint } from "../src/playground/pick.ts";

const VP = { w: 1000, h: 800 };
const TOL = 8;
function topCam(): OrbitCamera {
  const c = new OrbitCamera();
  c.yaw = -Math.PI / 2;
  c.pitch = 1.5707;      // lab 同款顶视
  c.target = { x: 0, y: 0, z: 0 };
  c.halfH = 50;          // 1 世界单位 = 8px
  return c;
}
const at = (c: OrbitCamera, p: Pt3) => c.worldToScreen(p, VP);

describe("snap: 轴对齐约束层", () => {
  it("原点点吸附（永久源）", () => {
    const c = topCam();
    const s = at(c, { x: 0.2, y: 0.3, z: 0 });
    const r = snapPoint(new Kernel(), c, VP, s.x, s.y, TOL, GROUND);
    eq(r.kind, "origin", "kind=origin");
    assert(Math.abs(r.p.x) < 1e-9 && Math.abs(r.p.y) < 1e-9, "吸到 (0,0)");
  });

  it("坐标轴线吸附 = 过原点的共轴线（无 anchor 也生效）", () => {
    const c = topCam();
    const s = at(c, { x: 5, y: 0.4, z: 0 });
    const r = snapPoint(new Kernel(), c, VP, s.x, s.y, TOL, GROUND);
    eq(r.kind, "align", "kind=align");
    assert(Math.abs(r.p.y) < 1e-9, "吸到 X 轴上 (y=0)");
    assert(Math.abs(r.p.x - 5) < 0.2, "沿轴滑动到光标处");
    eq(r.hints?.length, 1, "一条提示线");
    eq(r.hints?.[0].axis, "x", "提示轴=X");
  });

  it("正交双约束合成：铅笔手画矩形的闭合角点", () => {
    // 已有边 (0,0)-(10,0)；anchor=(10,6)（第三笔起点）；光标凑近 (0,6) →
    // 过 anchor 的 X 轴锁 ∩ 过起点(0,0)/原点的 Y 共轴线 = 角点 (0,6) 一击落位
    const k = new Kernel();
    k.addEdges([[{ x: 0, y: 0 }, { x: 10, y: 0 }]]);
    const c = topCam();
    const s = at(c, { x: 0.3, y: 6.2, z: 0 });
    const r = snapPoint(k, c, VP, s.x, s.y, TOL, GROUND, { x: 10, y: 6, z: 0 });
    eq(r.kind, "align-combo", "kind=align-combo");
    assert(Math.abs(r.p.x) < 1e-9 && Math.abs(r.p.y - 6) < 1e-9, `角点=(0,6)，实际 (${r.p.x},${r.p.y})`);
    eq(r.hints?.length, 2, "两条提示线");
  });

  it("anchor 世界轴锁保留旧 kind（axis-x）", () => {
    const c = topCam();
    const s = at(c, { x: 7, y: 0.2, z: 0 });
    const r = snapPoint(new Kernel(), c, VP, s.x, s.y, TOL, GROUND, { x: 0, y: 0, z: 0 });
    eq(r.kind, "axis-x", "anchor 源 → legacy kind");
    assert(Math.abs(r.p.y) < 1e-9, "锁在 X 轴");
  });
});

describe("snap: 轴平行 3D（XZ/YZ 画图入口）", () => {
  it("竖直共轴合成：Z 轴锁 ∩ 高处顶点的水平共轴 → 空中角点", () => {
    // 高处顶点 V=(0,0,10)；anchor=(10,0,0)；光标凑近 (10,0,10) →
    // 过 anchor 的 Z 线 ∩ 过 V 的 X 向共轴线（共享固定坐标 y=0 一致=真相交）→ (10,0,10)
    const k = new Kernel();
    k.addEdges([[{ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 10 }]]);
    const c = new OrbitCamera();          // 默认 3D 轨道视角
    c.target = { x: 5, y: 0, z: 5 };
    c.halfH = 50;
    const s = at(c, { x: 10.2, y: 0, z: 9.8 });
    const r = snapPoint(k, c, VP, s.x, s.y, TOL, GROUND, { x: 10, y: 0, z: 0 });
    eq(r.kind, "align-combo", "kind=align-combo");
    assert(Math.abs(r.p.x - 10) < 1e-9 && Math.abs(r.p.z - 10) < 1e-9, `角点=(10,0,10)，实际 (${r.p.x},${r.p.y},${r.p.z})`);
  });

  it("3D 两线不相交 → 拒绝合成（共享固定坐标不一致）", () => {
    // V=(0,0,10) 的 X 向线（y=0,z=10）与 anchor=(10,5,0) 的 Z 线（x=10,y=5）：y 不一致（0≠5）→ 无 combo
    const k = new Kernel();
    k.addEdges([[{ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 10 }]]);
    const c = new OrbitCamera();
    c.target = { x: 5, y: 2, z: 5 };
    c.halfH = 50;
    const s = at(c, { x: 10.1, y: 4.2, z: 9.9 });
    const r = snapPoint(k, c, VP, s.x, s.y, TOL, GROUND, { x: 10, y: 5, z: 0 });
    assert(r.kind !== "align-combo", `不许假相交合成（实际 kind=${r.kind}）`);
  });
});

describe("rect: 画面平面决定（①面平行②摄像机托底③看第二点）", () => {
  it("横视角空处 → 摄像机托底=竖直平面", () => {
    const c = new OrbitCamera();
    c.yaw = -Math.PI / 2;   // 视线≈沿 +Y
    c.pitch = 0.1;
    c.halfH = 50;
    const s = at(c, { x: 3, y: 0, z: 3 });
    const { plane } = resolveRectPlane(new Kernel(), c, VP, { x: 0, y: 0, z: 0 }, s.x, s.y, TOL);
    assert(Math.abs(Math.abs(plane.plane.n.y) - 1) < 1e-9, `应取 XZ 竖直面，实际 n=(${plane.plane.n.x},${plane.plane.n.y},${plane.plane.n.z})`);
  });

  it("第二点吸到高处端点 → 拉出含它的竖直平面（压过摄像机托底）", () => {
    const k = new Kernel();
    k.addEdges([[{ x: 8, y: 0, z: 0 }, { x: 8, y: 0, z: 6 }]]);   // 高处端点 (8,0,6)
    const c = new OrbitCamera();                                   // 默认斜俯视（托底≈地面）
    c.target = { x: 4, y: 0, z: 3 };
    c.halfH = 50;
    const s = at(c, { x: 8.1, y: 0, z: 5.9 });
    const { plane, snap } = resolveRectPlane(k, c, VP, { x: 0, y: 0, z: 0 }, s.x, s.y, TOL);
    eq(snap.kind, "endpoint", "第二点吸到端点");
    assert(Math.abs(Math.abs(plane.plane.n.y) - 1) < 1e-9, "含 (8,0,6) 与首点的平面=XZ（y=0）");
  });
});
