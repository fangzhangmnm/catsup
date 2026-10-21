// 油漆桶模式（0.9 QoL，2026-10-21，Claude Fable 5.1）：一张面 / 平滑组 / 到锐角为止 / 连通体 / 整池 的面集。
import { describe, it, eq, assert } from "./runner.mjs";
import { Kernel } from "../src/kernel/kernel.ts";
import type { Pt3 } from "../src/kernel/kernel.ts";
import { facesForPaint } from "../src/editor/paint-flood.ts";
import { circleSegmentsOnPlane } from "../src/editor/tools.ts";
import { GROUND } from "../src/editor/pick.ts";

const P = (x: number, y: number, z = 0): Pt3 => ({ x, y, z });
const near = (a: number, b: number): boolean => Math.abs(a - b) < 1e-6;

describe("paint-flood: 油漆桶模式", () => {
  it("圆柱 + 旁边一个盒子（共享底边）：single 1 / smooth = 侧面 24 / sharp(20°) = 侧面 24（15° 棱可跨、顶圈 90° 不跨）/ connected = 全部", () => {
    const k = new Kernel();
    k.addEdges(circleSegmentsOnPlane(GROUND.plane, GROUND.basis, P(0, 0, 0), P(1, 0, 0), 24), { curve: true });
    k.pushPull(k.faces()[0].id, 2);
    eq(k.faces().length, 26);
    const side = k.faces().find((f) => k.faceRings3(f.id)!.outer.some((p) => !near(p.z, 0)) && k.faceRings3(f.id)!.outer.some((p) => !near(p.z, 2)))!.id;
    eq(facesForPaint(k, side, "single", 20).length, 1);
    eq(facesForPaint(k, side, "smooth", 20).length, 24, "平滑组 = 24 张侧面（顶底圈不是 smooth 边）");
    eq(facesForPaint(k, side, "sharp", 20).length, 24, "15° 侧棱可跨、90° 顶圈是锐角墙");
    eq(facesForPaint(k, side, "sharp", 95).length, 26, "阈值放到 95° → 顶底也跨");
    eq(facesForPaint(k, side, "connected", 20).length, 26);
    eq(facesForPaint(k, side, "pool", 20).length, 26);
    const top = k.faces().find((f) => k.faceRings3(f.id)!.outer.every((p) => near(p.z, 2)))!.id;
    eq(facesForPaint(k, top, "smooth", 20).length, 1, "从顶面出发：顶圈不是 smooth → 只有自己");
  });
  it("盒子：硬化后 smooth 只有自己；sharp 90° 以内跨不过直角；connected 全 6", () => {
    const k = new Kernel();
    k.addEdges([[P(0, 0), P(2, 0)], [P(2, 0), P(2, 2)], [P(2, 2), P(0, 2)], [P(0, 2), P(0, 0)]]);
    k.pushPull(k.faces()[0].id, 2);
    const any = k.faces()[0].id;
    eq(facesForPaint(k, any, "smooth", 20).length, 1);
    eq(facesForPaint(k, any, "sharp", 89).length, 1);
    eq(facesForPaint(k, any, "sharp", 90).length, 6, "阈值 = 90° 时直角不算锐");
    eq(facesForPaint(k, any, "connected", 20).length, 6);
    assert(facesForPaint(k, 999999, "connected", 20).length === 0, "不存在的面 → []");
  });
});
