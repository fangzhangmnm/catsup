// 轴工具纯几何（0.11 尺规纪元 ④，2026-10-24 Claude Fable 5.1）：三点定帧 = 右手系、Y 正交化、共线退回手势平面法向。
import { describe, it, eq, assert } from "./runner.mjs";
import type { Pt3 } from "../src/kernel/kernel.ts";
import { frameFrom3 } from "../src/editor/axes-geom.ts";

const P = (x: number, y: number, z = 0): Pt3 => ({ x, y, z });
const near = (a: Pt3, b: Pt3, tol = 1e-9): boolean => Math.abs(a.x - b.x) < tol && Math.abs(a.y - b.y) < tol && Math.abs(a.z - b.z) < tol;
const Z = P(0, 0, 1);

describe("axes: 三点定帧", () => {
  it("原点 + X 点 + Y 点 → 右手系；Y 点不垂直也行（正交化到 X 的垂面）", () => {
    const f = frameFrom3(P(1, 2, 0), P(3, 2, 0), P(2, 5, 0), Z)!;
    assert(f, "有帧");
    assert(near(f.origin, P(1, 2, 0)) && near(f.x, P(1, 0, 0)) && near(f.y, P(0, 1, 0)) && near(f.z, P(0, 0, 1)), "世界同向");
    const g = frameFrom3(P(0, 0, 0), P(1, 1, 0), P(0, 1, 0), Z)!;
    const c = Math.SQRT1_2;
    assert(near(g.x, P(c, c, 0)) && near(g.y, P(-c, c, 0)) && near(g.z, Z), "转 45°：y 正交化");
    const h = frameFrom3(P(0, 0, 0), P(1, 0, 0), P(0, -1, 0), Z)!;
    assert(near(h.z, P(0, 0, -1)) && near(h.y, P(0, -1, 0)), "Y 点在右手边 → Z 朝下（右手系不翻 X）");
  });
  it("Y 与 X 共线 → 用手势平面法向定 Z；X 太近 / 全退化 → null", () => {
    const f = frameFrom3(P(0, 0, 0), P(2, 0, 0), P(5, 0, 0), Z)!;
    assert(f && near(f.z, Z) && near(f.y, P(0, 1, 0)), "退回平面法向");
    eq(frameFrom3(P(0, 0, 0), P(0.001, 0, 0), null, Z), null, "X 太近");
    eq(frameFrom3(P(0, 0, 0), P(0, 0, 2), null, Z), null, "X 沿 Z 且备用法向也是 Z → 退化");
    const g = frameFrom3(P(0, 0, 0), P(0, 0, 2), null, P(1, 0, 0))!;
    assert(g && near(g.x, Z) && near(g.z, P(1, 0, 0)) && near(g.y, P(0, -1, 0)), "只有 X 点（预演态）：Z 取备用法向、Y = Z × X 补齐（右手系：X × Y = Z）");
  });
});
