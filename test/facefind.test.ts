import { describe, it, eq, assert } from "./runner.mjs";
import { PlanarGraph } from "../src/kernel/topology.ts";
import { insertSegment } from "../src/kernel/subdivide.ts";
import { findRegions, regionContains, representativePoint } from "../src/kernel/facefind.ts";

const P = (x: number, y: number) => ({ x, y, z: 0 });

function poly(g: PlanarGraph, pts: [number, number][], close = true): void {
  for (let i = 0; i + 1 < pts.length; i++) insertSegment(g, P(...pts[i]), P(...pts[i + 1]));
  if (close) insertSegment(g, P(...pts[pts.length - 1]), P(...pts[0]));
}

describe("facefind: 区域提取", () => {
  it("方形 → 1 个区域，面积正确", () => {
    const g = new PlanarGraph();
    poly(g, [[0, 0], [10, 0], [10, 10], [0, 10]]);
    const rs = findRegions(g);
    eq(rs.length, 1, "区域数");
    assert(Math.abs(rs[0].area - 100) < 1e-6, `面积 100，实得 ${rs[0].area}`);
    assert(regionContains(rs[0], P(5, 5)), "中心在内");
    assert(!regionContains(rs[0], P(15, 5)), "外点不在内");
  });

  it("日字 → 2 个区域", () => {
    const g = new PlanarGraph();
    poly(g, [[0, 0], [10, 0], [10, 10], [0, 10]]);
    insertSegment(g, P(0, 5), P(10, 5));
    const rs = findRegions(g);
    eq(rs.length, 2, "两格");
    const areas = rs.map((r) => r.area).sort();
    assert(areas.every((a) => Math.abs(a - 50) < 1e-6), "各 50");
  });

  it("回字（不连通嵌套）→ 环带带洞 + 内方，面积各正确", () => {
    const g = new PlanarGraph();
    poly(g, [[0, 0], [12, 0], [12, 12], [0, 12]]);
    poly(g, [[4, 4], [8, 4], [8, 8], [4, 8]]);
    const rs = findRegions(g);
    eq(rs.length, 2, "环带 + 内方");
    const annulus = rs.find((r) => r.holes.length === 1);
    const inner = rs.find((r) => r.holes.length === 0);
    assert(!!annulus && !!inner, "一个带洞一个不带");
    assert(Math.abs(annulus!.area - (144 - 16)) < 1e-6, "环带面积 128");
    assert(Math.abs(inner!.area - 16) < 1e-6, "内方面积 16");
    assert(regionContains(annulus!, P(2, 2)), "环带区含外圈点");
    assert(!regionContains(annulus!, P(6, 6)), "环带区不含洞内点");
    assert(regionContains(inner!, P(6, 6)), "内方含中心");
  });

  it("三层回字 → 洞挂最小包含面（嵌套树）", () => {
    const g = new PlanarGraph();
    poly(g, [[0, 0], [20, 0], [20, 20], [0, 20]]);
    poly(g, [[4, 4], [16, 4], [16, 16], [4, 16]]);
    poly(g, [[8, 8], [12, 8], [12, 12], [8, 12]]);
    const rs = findRegions(g);
    eq(rs.length, 3, "外环带 + 中环带 + 内方");
    const byArea = [...rs].sort((a, b) => a.area - b.area);
    eq(byArea[0].holes.length, 0, "内方无洞");
    eq(byArea[1].holes.length, 1, "中环带 1 洞");
    eq(byArea[2].holes.length, 1, "外环带 1 洞（挂中方不挂内方）");
  });

  it("悬挂边不成面（filament 剥离）", () => {
    const g = new PlanarGraph();
    insertSegment(g, P(0, 0), P(10, 0));
    insertSegment(g, P(10, 0), P(10, 10));
    eq(findRegions(g).length, 0, "开折线无面");
    // 方形 + 内部胡须：面不受胡须影响
    const g2 = new PlanarGraph();
    poly(g2, [[0, 0], [10, 0], [10, 10], [0, 10]]);
    insertSegment(g2, P(0, 0), P(3, 3)); // 从角伸进去的胡须
    const rs = findRegions(g2);
    eq(rs.length, 1, "仍 1 面");
    assert(Math.abs(rs[0].area - 100) < 1e-6, "面积不变");
  });

  it("带桥环带（连通洞）→ 1 个简单多边形区域 + 内方", () => {
    const g = new PlanarGraph();
    poly(g, [[0, 0], [12, 0], [12, 12], [0, 12]]);
    poly(g, [[4, 4], [8, 4], [8, 8], [4, 8]]);
    insertSegment(g, P(0, 6), P(4, 6)); // 桥：外环连内环
    const rs = findRegions(g);
    eq(rs.length, 2, "开槽环带 + 内方");
    const slit = rs.find((r) => Math.abs(r.area - 128) < 1e-6);
    assert(!!slit, "开槽环带面积 128");
    eq(slit!.holes.length, 0, "桥接后不再是分离洞");
  });

  it("representativePoint 落在区域内（含带洞）", () => {
    const g = new PlanarGraph();
    poly(g, [[0, 0], [12, 0], [12, 12], [0, 12]]);
    poly(g, [[4, 4], [8, 4], [8, 8], [4, 8]]);
    for (const r of findRegions(g)) {
      assert(regionContains(r, representativePoint(r)), "代表点在区域内");
    }
  });

  it("相邻共享边的两方形 → 2 区域（共享边两侧各有面）", () => {
    const g = new PlanarGraph();
    poly(g, [[0, 0], [10, 0], [10, 10], [0, 10]]);
    poly(g, [[10, 0], [20, 0], [20, 10], [10, 10]]);
    const rs = findRegions(g);
    eq(rs.length, 2, "两方");
  });
});
