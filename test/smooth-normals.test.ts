// 平滑边法向（纪元账本 DT11）：bake 的平滑组法向在圆柱侧面上 = 每个角点的径向（以前膜存的规范法向一半朝里，直接加在交界处抵消）。
// 渲染那一份（render3.smoothNormals）同算法，由 test/probes/probe-smooth-normals.mjs 拍像素守。created 2026-10-26 by Claude Opus 5.5
import { describe, it, assert } from "./runner.mjs";
import { Kernel } from "../src/kernel/kernel.ts";
import { smoothNormalsOf } from "../src/format/bake.ts";

describe("平滑边法向（DT11）", () => {
  it("24 边圆柱：侧面每个角点的平滑法向都是那一点的径向（±，和本膜同侧）", () => {
    const N = 24, pts = Array.from({ length: N }, (_, i) => ({ x: Math.cos((i / N) * 2 * Math.PI), y: Math.sin((i / N) * 2 * Math.PI), z: 0 }));
    const k = new Kernel();
    k.addEdges(pts.map((p, i) => [p, pts[(i + 1) % N]] as const), { curve: true });
    k.pushPull(k.faces()[0].id, 1);
    const snap = k.toBrep(), sm = smoothNormalsOf(snap);
    let checked = 0;
    snap.faces.forEach((f, fi) => {
      const m = sm.get(fi);
      if (!m) return;
      for (const [vi, n] of m) {
        const p = snap.vertices[vi], l = Math.hypot(p.x, p.y);
        const radial = Math.abs(n[0] * p.x / l + n[1] * p.y / l);
        assert(radial > 0.995 && Math.abs(n[2]) < 0.01, `面 ${fi} 顶点 ${vi}：法向 ${n.map((x) => x.toFixed(3)).join(",")} 不是径向`);
        checked++;
      }
    });
    assert(checked >= 4 * N, `检查了 ${checked} 个角点`);
  });
});
