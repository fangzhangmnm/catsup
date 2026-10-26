// 缩放柄的拾取（user 2026-10-25「缩放的gizmos如果卡几何里面应该能点中」）：柄透视拾；屏上叠在一起 = 离相机近的赢。created 2026-10-25 by Claude Opus 5.5
import { describe, it, eq } from "./runner.mjs";
import { pickHandle } from "../src/editor/handle-pick.ts";

describe("缩放柄拾取", () => {
  it("屏距最近的赢；超出 1.5 × 捕获半径 = 没抓到", () => {
    eq(pickHandle([{ d: 5, z: 1 }, { d: 2, z: 9 }], 6), 1);
    eq(pickHandle([{ d: 10, z: 1 }], 6), -1);
  });
  it("屏上叠在一起（正对着看时前后两个面心柄）= 离相机近的赢，不看谁先谁后、不看 1e-13 的浮点差", () => {
    eq(pickHandle([{ d: 0, z: 5 }, { d: 1e-13, z: 4 }], 6), 1, "后面那个排前面、屏距还小一丁点：照样抓前面的");
    eq(pickHandle([{ d: 1e-13, z: 4 }, { d: 0, z: 5 }], 6), 0);
    eq(pickHandle([{ d: 1, z: 3 }, { d: 2.4, z: 2 }], 6), 1, "差 1.4 px（¼ 半径内）算叠在一起");
    eq(pickHandle([{ d: 1, z: 3 }, { d: 4, z: 2 }], 6), 0, "差 3 px 不算叠：屏距近的赢");
  });
});
