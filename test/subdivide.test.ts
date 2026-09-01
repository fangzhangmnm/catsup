import { describe, it, eq, assert } from "./runner.mjs";
import { PlanarGraph } from "../src/kernel/topology.ts";
import { insertSegment } from "../src/kernel/subdivide.ts";

const P = (x: number, y: number) => ({ x, y, z: 0 });

describe("subdivide: sticky 插入", () => {
  it("两段共享端点 → 顶点合一（重合即同一）", () => {
    const g = new PlanarGraph();
    insertSegment(g, P(0, 0), P(10, 0));
    insertSegment(g, P(10, 0), P(10, 10));
    eq(g.vertexCount(), 3, "顶点数");
    eq(g.edgeCount(), 2, "边数");
  });

  it("X 交叉 → 双方都在交点切开", () => {
    const g = new PlanarGraph();
    insertSegment(g, P(0, 0), P(10, 10));
    const r = insertSegment(g, P(0, 10), P(10, 0));
    eq(g.vertexCount(), 5, "4 端点 + 1 交点");
    eq(g.edgeCount(), 4, "两条各切成两半");
    eq(r.created.length, 2, "新段被交点分成两条");
    eq(r.retraced.length, 0, "无重合");
  });

  it("T 交（端点落既有边内部）→ 既有边切开", () => {
    const g = new PlanarGraph();
    insertSegment(g, P(0, 0), P(10, 0));
    insertSegment(g, P(5, 0), P(5, 8));
    eq(g.vertexCount(), 4, "顶点");
    eq(g.edgeCount(), 3, "横边切两半 + 竖边");
  });

  it("共线部分重叠 → 重叠段去重为同一条边并报 retraced", () => {
    const g = new PlanarGraph();
    insertSegment(g, P(0, 0), P(20, 0));
    const r = insertSegment(g, P(10, 0), P(30, 0));
    eq(g.edgeCount(), 3, "0-10 / 10-20 / 20-30");
    eq(r.retraced.length, 1, "10-20 段是 retrace");
    eq(r.created.length, 1, "20-30 段新生");
  });

  it("完全 retrace → 不新建，报 retraced", () => {
    const g = new PlanarGraph();
    insertSegment(g, P(0, 0), P(10, 0));
    const r = insertSegment(g, P(0, 0), P(10, 0));
    eq(g.edgeCount(), 1, "仍是一条边");
    eq(r.created.length, 0, "无新建");
    eq(r.retraced.length, 1, "整段 retrace");
  });

  it("新段穿过既有顶点 → 在该顶点断开", () => {
    const g = new PlanarGraph();
    insertSegment(g, P(5, 0), P(5, 5)); // 底端点 (5,0)
    insertSegment(g, P(0, 0), P(10, 0)); // 水平穿过 (5,0)
    eq(g.edgeCount(), 3, "水平段在 (5,0) 断成两条 + 竖边");
    eq(g.vertexCount(), 4, "顶点");
  });

  it("onSplit 回调让手势边身份跨切割存活", () => {
    const g = new PlanarGraph();
    const gesture = new Set<number>();
    const r1 = insertSegment(g, P(0, 0), P(10, 0));
    for (const e of r1.created) gesture.add(e);
    insertSegment(g, P(5, -5), P(5, 5), (parent, c1, c2) => {
      if (gesture.delete(parent)) { gesture.add(c1); gesture.add(c2); }
    });
    eq(gesture.size, 2, "被切开的手势边换成两个子边");
    for (const id of gesture) assert(g.hasEdge(id), "子边存在");
  });

  it("零长段 no-op", () => {
    const g = new PlanarGraph();
    const r = insertSegment(g, P(1, 1), P(1, 1));
    eq(g.edgeCount(), 0, "无边");
    eq(r.created.length + r.retraced.length, 0, "无产出");
  });
});
