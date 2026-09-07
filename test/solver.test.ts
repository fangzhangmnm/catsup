// 求解器 property 测试 —— 不变量层（spec = snap-model SSoT / three-phase-roadmap §二）。
// created by Claude Fable 5, 2026-09-01
import { describe, it, eq, assert } from "./runner.mjs";
import { Kernel } from "../src/kernel/kernel.ts";
import { OrbitCamera } from "../src/editor/camera.ts";
import { EPS, RANK, buildConstraints, solvePoint } from "../src/editor/solver.ts";
import { GROUND } from "../src/editor/pick.ts";

const VP = { w: 1000, h: 800 };
const topCam = (): OrbitCamera => {
  const c = new OrbitCamera();
  c.yaw = -Math.PI / 2; c.pitch = 1.5707; c.halfH = 50;
  return c;
};
const scene = (): Kernel => {
  const k = new Kernel();
  k.addEdges([
    [{ x: 0, y: 0 }, { x: 20, y: 0 }], [{ x: 20, y: 0 }, { x: 20, y: 20 }],
    [{ x: 20, y: 20 }, { x: 0, y: 20 }], [{ x: 0, y: 20 }, { x: 0, y: 0 }],
    [{ x: -10, y: -10 }, { x: -10, y: 30 }],
  ]);
  return k;
};

describe("solver: property 不变量", () => {
  it("解点永远落在光标合成半径邻域内（全屏扫描）", () => {
    const k = scene(), c = topCam();
    let seed = 7;
    const rnd = (): number => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    const C = buildConstraints({ k, plane: GROUND.plane, anchor: { x: 5, y: 5, z: 0 }, alignSources: [{ x: 20, y: 20, z: 0 }] });
    for (let i = 0; i < 200; i++) {
      const sx = rnd() * VP.w, sy = rnd() * VP.h;
      const sol = solvePoint({ pf: c, vp: VP }, { x: sx, y: sy }, C);
      assert(sol !== null, "兜底平面保证有解");
      if (sol!.dim === 2) continue; // 兜底=光标射线本身
      const sp = c.angularPx(sol!.p, VP);
      assert(Math.hypot(sp.x - sx, sp.y - sy) <= EPS.combo + 1e-6, `解点出圈 d=${Math.hypot(sp.x - sx, sp.y - sy)}`);
    }
  });

  it("确定性：同输入两次求解逐字节同解", () => {
    const k = scene(), c = topCam();
    const C = buildConstraints({ k, plane: GROUND.plane, anchor: { x: 5, y: 5, z: 0 } });
    for (const [sx, sy] of [[500, 400], [520, 380], [100, 700]]) {
      const a = solvePoint({ pf: c, vp: VP }, { x: sx, y: sy }, C);
      const b = solvePoint({ pf: c, vp: VP }, { x: sx, y: sy }, C);
      eq(JSON.stringify(a), JSON.stringify(b), "同输入同解");
    }
  });

  it("解释完整性：used 非空且 kind/hints 全部派生自 used", () => {
    const k = scene(), c = topCam();
    const C = buildConstraints({ k, plane: GROUND.plane, anchor: { x: 30, y: 20, z: 0 } });
    const s = c.angularPx({ x: 0.3, y: 20.2, z: 0 }, VP); // 靠近顶边端点/共轴区
    const sol = solvePoint({ pf: c, vp: VP }, s, C)!;
    assert(sol.used.length >= 1 && sol.used.length <= 2, "参与约束 1-2 个");
    for (const u of sol.used) assert(C.includes(u), "used ⊆ C");
  });

  it("字典序：维度优先（合成 0-D 压过单 1-D）、同维 rank 优先（端点压过更近的中点）", () => {
    const k = scene(), c = topCam();
    // 光标凑在端点 (20,0) 与其边中点之间偏中点侧——rank 裁决仍取端点
    const near = c.angularPx({ x: 19.4, y: 0.2, z: 0 }, VP);
    const C = buildConstraints({ k, plane: GROUND.plane });
    const sol = solvePoint({ pf: c, vp: VP }, near, C)!;
    eq(sol.used[0].tag.kind, "endpoint", "端点 rank 压过距离");
    // On Edge from Point：边 × 过 anchor 的轴 → 0-D 合成压过单 on-edge
    const C2 = buildConstraints({ k, plane: GROUND.plane, anchor: { x: 30, y: 8, z: 0 } });
    const s2 = c.angularPx({ x: 20.2, y: 8.3, z: 0 }, VP); // 右边界边上、anchor 的 X 轴线附近
    const sol2 = solvePoint({ pf: c, vp: VP }, s2, C2)!;
    eq(sol2.used.length, 2, "合成解");
    assert(sol2.used.some((u) => u.tag.kind === "edge"), "边参与");
    assert(Math.abs(sol2.p.x - 20) < 1e-9 && Math.abs(sol2.p.y - 8) < 1e-9, "边×轴交点=(20,8)");
  });

  it("秩表哨兵：RANK/EPS 现值锁定（改值必须连测试一起改=有意识决策）", () => {
    eq(JSON.stringify(RANK), JSON.stringify({ endpoint: 90, origin: 80, midpoint: 70, intersection: 65, edge: 60, cross: 55, axisLine: 45, plane: 10 }), "RANK");
    eq(JSON.stringify(EPS), JSON.stringify({ point: 10, edge: 7, line: 3.5, combo: 12 }), "EPS");   // line 5→3.5：「点松线紧」试验（user 2026-09-07；B6）
  });
});

describe("solvePoint: 1-D 遮挡=可见区间钳制（2026-09-03 抖动破案，单元级语义钉）", () => {
  const clampCam = topCam();
  const axisC = [{
    locus: { dim: 1 as const, a: { x: 0, y: 0, z: 0 }, dir: { x: 1, y: 0, z: 0 } },
    rank: RANK.axisLine, eps: EPS.line, tag: { kind: "axis" as const, src: { x: 0, y: 0, z: 0 }, axis: "x" as const },
  }];
  const spans = (): [number, number][] => [[10, 30]];   // x∈[10,30] 被挡
  const at2 = (wx: number): { x: number; y: number } => clampCam.angularPx({ x: wx, y: 0, z: 0 }, VP);
  it("光标在被挡段内、离边界 ε 内 → 钳到最近可见边界点（不否决）", () => {
    const s2 = at2(10.3);   // 离边界 x=10 0.3 world unit=2.4px < EPS.line 3.5px（2026-09-07 线 ε 收紧后随改；语义不变）
    const sol = solvePoint({ pf: clampCam, vp: VP }, s2, axisC, { spans1D: spans });
    assert(sol !== null && sol.dim === 1, "应有 1-D 解");
    assert(Math.abs(sol!.p.x - 10) < 1e-6, `p 应钳在边界 x=10，实际 ${sol!.p.x.toFixed(3)}`);
  });
  it("深入被挡段（边界出 ε）→ 干净掉出，无候选", () => {
    const sol = solvePoint({ pf: clampCam, vp: VP }, at2(20), axisC, { spans1D: spans });
    assert(sol === null || sol.dim !== 1, `深处不应还有 1-D 解（实际 dim=${sol?.dim}）`);
  });
  it("被挡段两侧边界各自钳制：靠右侧钳到 x=30", () => {
    const sol = solvePoint({ pf: clampCam, vp: VP }, at2(29.6), axisC, { spans1D: spans });
    assert(sol !== null && Math.abs(sol!.p.x - 30) < 1e-6, `应钳到右边界 x=30，实际 ${sol?.p.x.toFixed(3)}`);
  });
  it("可见段照常：候选点跟随光标", () => {
    const sol = solvePoint({ pf: clampCam, vp: VP }, at2(40), axisC, { spans1D: spans });
    assert(sol !== null && Math.abs(sol!.p.x - 40) < 0.5, `可见段应跟随光标，实际 ${sol?.p.x.toFixed(3)}`);
  });
});
