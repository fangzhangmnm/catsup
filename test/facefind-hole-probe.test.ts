// facefind-hole-probe.test.ts —— findRegions 挂洞的包含判定不许拿「壳环的某个顶点」当探针。created by Claude Fable 5.1, 2026-10-24
// 来历：800 件随机场景第 379 步（浮点 / 精确内核同样）守恒断言响——一个被两张面围着的小面 739，它的 CCW 环和整个连通组件的 CW 外壳
// 共享顶点、不共享边；外壳的 pts[0] 恰是 739 的角 → pointInRing（点在环边界上，判定无定义）说「在里面」→ 外壳被挂成 739 的洞 →
// 代表点落到洞那边 → 739 的身份像一个胞腔都认领不到。修法 = 探针取壳环第一条边的中点（PSLG 里不与任何别的环边界重合）。
import { describe, it, assert } from "./runner.mjs";
import { PlanarGraph } from "../src/kernel/topology.ts";
import { insertSegment } from "../src/kernel/subdivide.ts";
import { findRegions } from "../src/kernel/facefind.ts";
import type { Pt3 } from "../src/kernel/geom.ts";

const P = (x: number, y: number): Pt3 => ({ x, y, z: 0 });
const sig = (regions: ReturnType<typeof findRegions>): string => regions.map((r) => `${r.outer.edges.length}e/${r.holes.length}h`).sort().join(" ");

describe("findRegions：壳环与面环只共享顶点时的挂洞判定", () => {
  it("方框左边中点接一个菱形（共享顶点 (0,2)，不共享边）；外壳从 (0,2) 起手 → 菱形不许得到洞", () => {
    // 手搓边序：第一条边 = (0,2)→(0,4)，它的正向半边就是外壳（左侧是外部），trace 从它起手 → 壳环 pts[0] = (0,2) = 菱形的角
    const g = new PlanarGraph();
    const V = (x: number, y: number) => g.ensureVertex(P(x, y));
    const a = V(0, 2), b = V(0, 4), c = V(4, 4), d = V(4, 0), e = V(0, 0);
    g.addEdge(a, b); g.addEdge(b, c); g.addEdge(c, d); g.addEdge(d, e); g.addEdge(e, a);
    const t1 = V(1, 1), t2 = V(2, 2), t3 = V(1, 3);
    g.addEdge(a, t1); g.addEdge(t1, t2); g.addEdge(t2, t3); g.addEdge(t3, a);
    const regions = findRegions(g);
    assert(regions.length === 2, `两张面（菱形 + 带菱形缺口的方框），实得 ${regions.length}：${sig(regions)}`);
    const diamond = regions.find((r) => r.outer.edges.length === 4)!;
    assert(diamond && diamond.holes.length === 0, `菱形不许有洞（外壳不是任何面的洞）：${sig(regions)}`);
    assert(regions.every((r) => r.holes.length === 0), `谁都不该有洞：${sig(regions)}`);
  });
  it("同一图经 insertSegment 任意边序（方框四种起手 × 两种朝向 × 菱形先后）：都两张面、零洞", () => {
    const S: [Pt3, Pt3][] = [[P(0, 0), P(4, 0)], [P(4, 0), P(4, 4)], [P(4, 4), P(0, 4)], [P(0, 4), P(0, 0)]];
    const T: [Pt3, Pt3][] = [[P(0, 2), P(1, 1)], [P(1, 1), P(2, 2)], [P(2, 2), P(1, 3)], [P(1, 3), P(0, 2)]];
    for (let rot = 0; rot < 4; rot++) for (const flip of [false, true]) for (const tFirst of [false, true]) {
      const g = new PlanarGraph();
      const sq = [...S.slice(rot), ...S.slice(0, rot)].map(([p, q]) => (flip ? [q, p] : [p, q]) as [Pt3, Pt3]);
      for (const [p, q] of tFirst ? [...T, ...sq] : [...sq, ...T]) insertSegment(g, p, q);
      const regions = findRegions(g);
      assert(regions.length === 2 && regions.every((r) => r.holes.length === 0), `rot ${rot} flip ${flip} tFirst ${tFirst}: ${sig(regions)}`);
    }
  });
  it("真洞照旧：方框里一个不相接的小方块 → 大面 1 洞、小面 0 洞", () => {
    const g = new PlanarGraph();
    for (const [p, q] of [[P(0, 0), P(4, 0)], [P(4, 0), P(4, 4)], [P(4, 4), P(0, 4)], [P(0, 4), P(0, 0)], [P(1, 1), P(2, 1)], [P(2, 1), P(2, 2)], [P(2, 2), P(1, 2)], [P(1, 2), P(1, 1)]] as [Pt3, Pt3][]) insertSegment(g, p, q);
    const regions = findRegions(g);
    assert(sig(regions) === "4e/0h 4e/1h", sig(regions));
  });
});
