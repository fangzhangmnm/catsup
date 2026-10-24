// 表面指派的面集（刀 ③，2026-10-24，Claude Fable 5.1；原 0.9 油漆桶五模式 → user 定稿三档：平滑组 / 到锐角为止 / 连通体 ↔ 单 / 双 / 三击）。
// 到锐角 floodfill 过边条件 = 软边 ∨ 二面角 ≤ 阈值（user「AB是同一个平滑组，不共面，AC共面，BD共面，那么floodfill的时候ABCD连坐」）。
import { describe, it, eq, assert } from "./runner.mjs";
import { Kernel } from "../src/kernel/kernel.ts";
import type { Pt3 } from "../src/kernel/kernel.ts";
import { facesForAssign, tierMax, tierOfClicks } from "../src/editor/surface-assign.ts";
import { circleSegmentsOnPlane } from "../src/editor/tools.ts";
import { GROUND } from "../src/editor/pick.ts";

const P = (x: number, y: number, z = 0): Pt3 => ({ x, y, z });
const near = (a: number, b: number): boolean => Math.abs(a - b) < 1e-6;

describe("surface-assign: 三档面集", () => {
  it("圆柱：smooth = 侧面 24（平滑组 = 一张逻辑面）/ sharp(20°) = 侧面 24（15° 棱可跨、顶圈 90° 不跨）/ sharp(95°) = 26 / connected = 26", () => {
    const k = new Kernel();
    k.addEdges(circleSegmentsOnPlane(GROUND.plane, GROUND.basis, P(0, 0, 0), P(1, 0, 0), 24), { curve: true });
    k.pushPull(k.faces()[0].id, 2);
    eq(k.faces().length, 26);
    const side = k.faces().find((f) => k.faceRings3(f.id)!.outer.some((p) => !near(p.z, 0)) && k.faceRings3(f.id)!.outer.some((p) => !near(p.z, 2)))!.id;
    eq(facesForAssign(k, side, "smooth", 20).length, 24, "平滑组 = 24 张侧面");
    eq(facesForAssign(k, side, "sharp", 20).length, 24, "15° 侧棱可跨、90° 顶圈是锐角墙");
    eq(facesForAssign(k, side, "sharp", 95).length, 26, "阈值放到 95° → 顶底也跨");
    eq(facesForAssign(k, side, "connected", 20).length, 26);
    const top = k.faces().find((f) => k.faceRings3(f.id)!.outer.every((p) => near(p.z, 2)))!.id;
    eq(facesForAssign(k, top, "smooth", 20).length, 1, "从顶面出发：顶圈不是软边 → 只有自己");
  });
  it("盒子：smooth 只有自己；sharp 90° 以内跨不过直角；connected 全 6；不存在的面 → []", () => {
    const k = new Kernel();
    k.addEdges([[P(0, 0), P(2, 0)], [P(2, 0), P(2, 2)], [P(2, 2), P(0, 2)], [P(0, 2), P(0, 0)]]);
    k.pushPull(k.faces()[0].id, 2);
    const any = k.faces()[0].id;
    eq(facesForAssign(k, any, "smooth", 20).length, 1);
    eq(facesForAssign(k, any, "sharp", 89).length, 1);
    eq(facesForAssign(k, any, "sharp", 90).length, 6, "阈值 = 90° 时直角不算锐");
    eq(facesForAssign(k, any, "connected", 20).length, 6);
    assert(facesForAssign(k, 999999, "connected", 20).length === 0, "不存在的面 → []");
  });
  it("到锐角过边 = 软边 ∨ 夹角 ≤ 阈值：盒子顶面与一侧面之间的棱软化后，sharp(20°) 从顶面出发连坐那张侧面（再往下的直角仍挡）", () => {
    const k = new Kernel();
    k.addEdges([[P(0, 0), P(2, 0)], [P(2, 0), P(2, 2)], [P(2, 2), P(0, 2)], [P(0, 2), P(0, 0)]]);
    k.pushPull(k.faces()[0].id, 2);
    const top = k.faces().find((f) => k.faceRings3(f.id)!.outer.every((p) => near(p.z, 2)))!.id;
    const topEdges = k.face(top)!.outer.edges.map((d) => d.edge);
    k.setEdgeLayer("soft", [topEdges[0]], true);   // 顶面的一条棱软化
    const got = facesForAssign(k, top, "sharp", 20);
    eq(got.length, 2, "顶面 + 软棱那边的侧面（90° 直角本身挡不住软边）");
    eq(facesForAssign(k, top, "smooth", 20).length, 2, "平滑组同样连坐");
  });
  it("档位代数：选项档 = 下限；点击次数 1 / 2 / 3+", () => {
    eq(tierMax("smooth", "sharp"), "sharp"); eq(tierMax("connected", "smooth"), "connected"); eq(tierMax("sharp", "sharp"), "sharp");
    eq(tierOfClicks(1), "smooth"); eq(tierOfClicks(2), "sharp"); eq(tierOfClicks(3), "connected"); eq(tierOfClicks(7), "connected");
  });
});
