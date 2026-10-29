// 软选择的权重（mesh/soft-select.ts；created 2026-10-28 by Claude Opus 5.5）：选中的点不在表里（它们走满）、半径外 = 0、中间平滑、越远越小。
import { describe, it, eq, assert } from "./runner.mjs";
import { softDistances, softFalloff, softWeights } from "../src/mesh/soft-select.ts";

describe("软选择权重（soft-select.ts）", () => {
  it("衰减曲线 = Blender Smooth：d = 0 → 1，d ≥ R → 0，正中 = 0.5，单调降、两头平", () => {
    eq(softFalloff(0, 2), 1); eq(softFalloff(2, 2), 0); eq(softFalloff(5, 2), 0); eq(softFalloff(1, 2), 0.5); eq(softFalloff(1, 0), 0);
    let prev = 2; for (let d = 0; d <= 2; d += 0.05) { const w = softFalloff(d, 2); assert(w <= prev + 1e-12, "要单调降"); prev = w; }
    assert(softFalloff(0.01, 2) > 0.999 && softFalloff(1.99, 2) < 0.001, "两头平（不突变）");
  });
  it("距离：到最近一个选中点；选中的不在表里；maxD 以外不留", () => {
    const pts = new Map([[0, { x: 0, y: 0, z: 0 }], [1, { x: 1, y: 0, z: 0 }], [2, { x: 3, y: 0, z: 0 }], [3, { x: 10, y: 0, z: 0 }]]);
    const d = softDistances(pts.keys(), new Set([0, 2]), (v) => pts.get(v)!, 5);
    eq([...d.keys()].join(","), "1"); eq(d.get(1), 1);
    const w = softWeights(softDistances(pts.keys(), new Set([0]), (v) => pts.get(v)!), 2);
    eq(w.has(1), true); eq(w.has(2), false); eq(w.has(0), false);
  });
});
