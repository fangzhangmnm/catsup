// 贴图默认铺法（自动 UV 的方向，geom.ts textureBasis；user 10-30「顺便自动生成的uv没有y up对齐」→「不用念旧」）：
// 竖着的面 v 朝世界 +Z；从法向那侧看不镜像（u × v = n）；水平面 u = +X。created 2026-10-30 by Claude Opus 5.5
import { describe, it, assert } from "./runner.mjs";
import { textureBasis, cross3, dot3, type Pt3 } from "../src/kernel/geom.ts";

const near = (a: number, b: number): boolean => Math.abs(a - b) < 1e-9;
describe("textureBasis: 贴图上 = 上、不镜像", () => {
  it("四面墙 + 斜面：v 朝上、u 水平、u × v = n", () => {
    for (const n of [{ x: 0, y: 1, z: 0 }, { x: 0, y: -1, z: 0 }, { x: 1, y: 0, z: 0 }, { x: -1, y: 0, z: 0 }, { x: 0.6, y: 0, z: 0.8 }, { x: 0, y: -0.6, z: -0.8 }] as Pt3[]) {
      const { u, v } = textureBasis(n), c = cross3(u, v);
      assert(v.z > 0, `v 朝上：n=${JSON.stringify(n)} v.z=${v.z}`);
      assert(near(u.z, 0), "u 水平");
      assert(near(c.x, n.x) && near(c.y, n.y) && near(c.z, n.z), `u × v = n（从这侧看不镜像）：${JSON.stringify(c)}`);
      assert(near(dot3(u, u), 1) && near(dot3(v, v), 1) && near(dot3(u, v), 0), "单位正交");
    }
  });
  it("水平面：u = +X；顶面 v = +Y、底面 v = −Y（各自从外面看不镜像）", () => {
    const top = textureBasis({ x: 0, y: 0, z: 1 }), bot = textureBasis({ x: 0, y: 0, z: -1 });
    assert(near(top.u.x, 1) && near(top.v.y, 1), "顶面 X / Y");
    assert(near(bot.u.x, 1) && near(bot.v.y, -1), "底面 X / −Y");
  });
});
