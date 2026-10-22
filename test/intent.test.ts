// 意图门（2026-10-21，Claude Fable 5.1）：一维 / 三维纯函数 + 死区语义。
import { describe, it, eq } from "./runner.mjs";
import { intentAllows1D, intentAllows3D, hasIntent } from "../src/editor/intent.ts";

describe("intent: 反方向的吸附不合法", () => {
  it("一维：拉（free > 0）时推侧候选不合法、零点也不合法（推拉了个 0 = 滑掉）、同侧合法；推时对称；死区内全合法", () => {
    eq(intentAllows1D(0.3, -0.5, 0.01), false, "拉着，候选在推侧");
    eq(intentAllows1D(0.3, 0, 0.01), false, "有意图了，吸回零位不合法（user：推拉距离为 0 的面）");
    eq(intentAllows1D(0.004, 0, 0.01), true, "没意图时零位合法");
    eq(intentAllows1D(0.3, 1.2, 0.01), true, "同侧");
    eq(intentAllows1D(-0.3, 0.5, 0.01), false, "推着，候选在拉侧");
    eq(intentAllows1D(-0.3, -2, 0.01), true);
    eq(intentAllows1D(0.004, -0.5, 0.01), true, "没走出死区 = 还没意图");
    eq(intentAllows1D(NaN, -0.5, 0.01), true, "自由值不可用 → 不拦");
  });
  it("三维：候选在锚点另一侧（点积 < 0）不合法；垂直 / 同侧合法；死区内全合法", () => {
    const f = { x: 1, y: 0, z: 0 };
    eq(intentAllows3D(f, { x: -0.2, y: 0, z: 0 }, 0.01), false);
    eq(intentAllows3D(f, { x: 0, y: 3, z: 0 }, 0.01), true, "垂直 = 边界，保留");
    eq(intentAllows3D(f, { x: 0, y: 0, z: 0 }, 0.01), false, "吸回锚点 = 零位移，不合法");
    eq(intentAllows3D(f, { x: 2, y: 1, z: -1 }, 0.01), true);
    eq(intentAllows3D({ x: 0.001, y: 0, z: 0 }, { x: -5, y: 0, z: 0 }, 0.01), true, "死区");
  });
  it("hasIntent：屏上拖够 eps.drag 才算", () => {
    eq(hasIntent(3, 16), false); eq(hasIntent(17, 16), true);
  });
});
