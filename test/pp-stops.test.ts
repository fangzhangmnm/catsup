// 推拉高度通道停靠集（2026-10-24 Claude Fable 5.1；user 退役清单④「改成『光标下的点 + 参考点 + 整数长度』」「好，先做」）：
// 只留 0 + 同柱子里的平行面 + 参考几何的高度；别的顶点高度不再进来。
import { describe, it, eq, assert } from "./runner.mjs";
import { Kernel } from "../src/kernel/kernel.ts";
import type { Pt3 } from "../src/kernel/kernel.ts";
import { ppStopsOf } from "../src/editor/pp-stops.ts";

const P = (x: number, y: number, z = 0): Pt3 => ({ x, y, z });
const box = (k: Kernel, x0: number, y0: number, w: number, h: number, z0: number, up: number): void => {
  k.addEdges([[P(x0, y0, z0), P(x0 + w, y0, z0)], [P(x0 + w, y0, z0), P(x0 + w, y0 + h, z0)], [P(x0 + w, y0 + h, z0), P(x0, y0 + h, z0)], [P(x0, y0 + h, z0), P(x0, y0, z0)]]);
  const f = k.faces().find((f) => k.faceRings3(f.id)!.outer.every((p) => Math.abs(p.z - z0) < 1e-9 && p.x >= x0 - 1e-9 && p.x <= x0 + w + 1e-9 && p.y >= y0 - 1e-9 && p.y <= y0 + h + 1e-9))!;
  k.pushPull(f.id, up);
};

describe("pp-stops: 停靠集 = 0 + 柱子里的平行面 + 参考几何", () => {
  it("两个盒子：推 A 的顶面，停靠点 = 0、A 自己的底、同柱子里 B 的顶 / 底；旁边 C 的高度不进来", () => {
    const k = new Kernel();
    box(k, 0, 0, 2, 2, 0, 1);        // A：0..1 高，脚印 [0,2]²
    box(k, 0.5, 0.5, 1, 1, 3, 0.5);  // B：3..3.5 高，脚印在 A 柱子里
    box(k, 10, 10, 1, 1, 0, 7);      // C：远处，高 7（旧实现会把 7 塞进来）
    const top = k.faces().find((f) => k.faceRings3(f.id)!.outer.every((p) => Math.abs(p.z - 1) < 1e-9 && p.x <= 2.01))!;
    const anchor = P(1, 1, 1);
    const stops = ppStopsOf(k, top.id, anchor, P(0, 0, 1));
    const has = (h: number): boolean => stops.some((s) => Math.abs(s - h) < 1e-9);
    assert(has(0), "0"); assert(has(-1), "A 自己的底（穿透）"); assert(has(2), "B 的底 3−1"); assert(has(2.5), "B 的顶 3.5−1");
    assert(!has(6) && !has(-1 + 7), `C 的高度不进来：${stops.join(",")}`);
    assert(!has(0.5) && !has(-0.5), "侧面不是平行面");
    eq(stops.length, 4, `恰四个：${stops.join(",")}`);
  });
  it("参考点的高度进来；与面平行的参考线进来、斜的不进来", () => {
    const k = new Kernel();
    box(k, 0, 0, 2, 2, 0, 1);
    const top = k.faces().find((f) => k.faceRings3(f.id)!.outer.every((p) => Math.abs(p.z - 1) < 1e-9))!;
    const view = Object.assign(k, { guides: () => ({ points: [{ p: P(5, 5, 4.25) }], lines: [{ p: P(0, 0, 2.5), dir: P(1, 0, 0) }, { p: P(0, 0, 9), dir: P(0, 0, 1) }] }) });
    const stops = ppStopsOf(view, top.id, P(1, 1, 1), P(0, 0, 1));
    const has = (h: number): boolean => stops.some((s) => Math.abs(s - h) < 1e-9);
    assert(has(3.25), "参考点 4.25−1"); assert(has(1.5), "平行参考线 2.5−1"); assert(!has(8), "竖直参考线不给高度");
  });
});
