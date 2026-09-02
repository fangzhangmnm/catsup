// 轴对齐 1-DOF 约束层（QoL 波 2026-09-01：原点/坐标轴 snap + from-point 共轴 + 正交合成）。
// created by Claude Fable 5, 2026-09-01
import { describe, it, eq, assert } from "./runner.mjs";
import { Kernel } from "../src/kernel/kernel.ts";
import type { Pt3 } from "../src/kernel/kernel.ts";
import { OrbitCamera } from "../src/playground/camera.ts";
import { GROUND, rectFirstPlane, resolveRectPlane, snapPoint } from "../src/playground/pick.ts";

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
    const r = snapPoint(k, c, VP, s.x, s.y, TOL, GROUND, { x: 10, y: 0, z: 0 }, null, [{ x: 0, y: 0, z: 10 }]);
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
    const r = snapPoint(k, c, VP, s.x, s.y, TOL, GROUND, { x: 10, y: 5, z: 0 }, null, [{ x: 0, y: 0, z: 10 }]);
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

describe("rect: 首点平面裁决（元逻辑：维度优先+延迟承诺）", () => {
  const wall = (): Kernel => {
    const k = new Kernel();
    k.addEdges([
      [{ x: 0, y: 0, z: 0 }, { x: 0, y: 10, z: 0 }],
      [{ x: 0, y: 10, z: 0 }, { x: 0, y: 10, z: 8 }],
      [{ x: 0, y: 10, z: 8 }, { x: 0, y: 0, z: 8 }],
      [{ x: 0, y: 0, z: 8 }, { x: 0, y: 0, z: 0 }],
    ]);
    return k;
  };
  const cam3 = (): OrbitCamera => {
    const c = new OrbitCamera();
    c.target = { x: 0, y: 5, z: 4 };
    c.halfH = 20;   // 拉近：8px 容差圈 < 0.5 世界单位，裸落点才真裸（对齐线覆盖面是 grill 议题）
    return c;
  };
  it("点墙角（端点赢）→ 平面延迟（fixed=null），不再被墙锁死", () => {
    const k = wall(), c = cam3();
    const s = at(c, { x: 0, y: 10, z: 8 });
    const r = rectFirstPlane(k, c, VP, s.x, s.y, TOL);
    eq(r.snap.kind, "endpoint", "首点=角点");
    eq(r.fixed, null, "平面延迟给第二点");
  });
  it("裸落墙面内部 → 面平行锁定（充能制痊愈：无充能源=无幽灵 align）", () => {
    const k = wall(), c = cam3();
    const s = at(c, { x: 0, y: 5, z: 4 });
    const r = rectFirstPlane(k, c, VP, s.x, s.y, TOL);
    eq(r.snap.kind, null, "无低维目标");
    assert(r.fixed !== null && Math.abs(Math.abs(r.fixed.plane.n.x) - 1) < 1e-9, "锁墙平面（n=±x）");
  });
});

describe("snap: 派生相交轨迹（可描不改图，user 2026-09-01 拍板）", () => {
  it("线×线延长交点：两边载线段外相交 → 交点可捕捉", () => {
    const k = new Kernel();
    k.addEdges([[{ x: 0, y: 0 }, { x: 6, y: 0 }], [{ x: 10, y: 4 }, { x: 10, y: 1 }]]);
    const c = topCam();
    const s = at(c, { x: 10, y: -0.5, z: 0 });  // 离 (10,1) 端点的 ε 圈远一点（端点 rank 更高）
    const r = snapPoint(k, c, VP, s.x, s.y, TOL, GROUND);
    eq(r.kind, "intersection", "kind=交点");
    assert(Math.abs(r.p.x - 10) < 1e-9 && Math.abs(r.p.y) < 1e-9, `延长交点=(10,0)，实际 (${r.p.x},${r.p.y})`);
  });

  it("面×面交线：穿插两膜的交线段可吸附（SU 摆烂处的 snap 升级）", () => {
    const k = new Kernel();
    const loop = (pts: Pt3[]): void => {
      const segs: [Pt3, Pt3][] = [];
      for (let i = 0; i < pts.length; i++) segs.push([pts[i], pts[(i + 1) % pts.length]]);
      k.addEdges(segs);
    };
    loop([{ x: 0, y: 0, z: 0 }, { x: 20, y: 0, z: 0 }, { x: 20, y: 20, z: 0 }, { x: 0, y: 20, z: 0 }]);
    loop([{ x: 5, y: 10, z: -5 }, { x: 15, y: 10, z: -5 }, { x: 15, y: 10, z: 5 }, { x: 5, y: 10, z: 5 }]);
    eq(k.faces().length, 2, "两膜穿插（无自愈改图=与 SU 对齐）");
    const c = new OrbitCamera();
    c.target = { x: 10, y: 10, z: 0 };
    c.halfH = 30;
    const s = at(c, { x: 8, y: 10, z: 0 });
    const r = snapPoint(k, c, VP, s.x, s.y, TOL, GROUND);
    eq(r.kind, "cross-line", "kind=交线");
    assert(Math.abs(r.p.y - 10) < 1e-6 && Math.abs(r.p.z) < 1e-6, `吸在交线上，实际 (${r.p.x},${r.p.y},${r.p.z})`);
    assert(r.hints?.some((h) => h.axis === "i"), "整段交线高亮提示");
  });
});

describe("rect: 自由落点=轴系统平面本体（2026-09-01 修案：不是过相机目标的平行面）", () => {
  it("相机目标抬高后，空处首点仍落在 z=0 轴平面上", () => {
    const c = topCam();
    c.target = { x: 0, y: 0, z: 4 };   // orbit/pan 把目标抬离地面
    const s = at(c, { x: 3, y: 2, z: 0 });
    const r = rectFirstPlane(new Kernel(), c, VP, s.x, s.y, TOL);
    eq(r.snap.kind, null, "自由落点");
    assert(Math.abs(r.snap.p.z) < 1e-9, `落在 z=0 轴平面，实际 z=${r.snap.p.z}`);
  });
});

describe("兜底底面偏置（user 2026-09-02 实测 SU：45° 仍落底面，阈值=天顶角 60°）", () => {
  it("45° 俯角 → 仍取底面（底/立面非平权）", () => {
    const c = new OrbitCamera();
    c.pitch = Math.PI / 4;   // 45°：|fwd.z|≈0.707 ≥ 0.5 → 底面
    c.halfH = 50;
    const s = at(c, { x: 3, y: 2, z: 0 });
    const { plane } = resolveRectPlane(new Kernel(), c, VP, { x: 0, y: 0, z: 0 }, s.x, s.y, TOL);
    assert(Math.abs(Math.abs(plane.plane.n.z) - 1) < 1e-9, `45° 应落底面，实际 n=(${plane.plane.n.x},${plane.plane.n.y},${plane.plane.n.z})`);
  });
});

describe("兜底偏置二修（2026-09-02：resolveRectPlane 每帧重挑也要偏底面）", () => {
  it("默认 3/4 视角（俯 35°）第二点自由移动 → 平面=底面不是立面", () => {
    const c = new OrbitCamera();
    c.pitch = 0.61;   // lab 默认俯角；|fwd.x|≈0.579 略大于 |fwd.z|≈0.573——无偏置时立面误胜
    c.halfH = 50;
    const s = at(c, { x: 4, y: 3, z: 0 });
    const { plane } = resolveRectPlane(new Kernel(), c, VP, { x: 0, y: 0, z: 0 }, s.x, s.y, TOL);
    assert(Math.abs(Math.abs(plane.plane.n.z) - 1) < 1e-9, `默认视角应落底面，实际 n=(${plane.plane.n.x},${plane.plane.n.y},${plane.plane.n.z})`);
  });
});
