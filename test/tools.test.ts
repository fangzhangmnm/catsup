import { describe, it, eq, assert } from "./runner.mjs";
import { Kernel } from "../src/kernel/kernel.ts";
import type { Pt } from "../src/kernel/kernel.ts";
import { marqueeOf, marqueePick, moveTargets, rectSegments, scrubHits, translateMoves } from "../src/playground/tools.ts";
import { inferPoint } from "../src/playground/inference.ts";

const P = (x: number, y: number): Pt => ({ x, y });

describe("tools: Rect", () => {
  it("对角两点 → 4 段；经 addEdges 生一面（验收①工具层闭环）", () => {
    const k = new Kernel();
    const segs = rectSegments(P(0, 0), P(10, 8));
    eq(segs.length, 4, "四段");
    const ev = k.addEdges(segs);
    eq(ev.length, 1, "一个事件");
    eq(ev[0].type, "BIRTH", "BIRTH");
    eq(k.faces().length, 1, "一面");
  });

  it("零宽/零高退化 → 空", () => {
    eq(rectSegments(P(0, 0), P(0, 8)).length, 0, "零宽");
    eq(rectSegments(P(0, 0), P(8, 0)).length, 0, "零高");
  });

  it("矩形横跨已填面 → 照常急切分割（工具无特判）", () => {
    const k = new Kernel();
    k.addEdges(rectSegments(P(0, 0), P(10, 10)));
    const ev = k.addEdges(rectSegments(P(5, -5), P(15, 15)));
    assert(ev.some((e) => e.type === "DIVIDE"), "有分割");
    assert(k.faces().length >= 3, "多面");
  });
});

describe("tools: 框选 + 批量删", () => {
  it("window 语义：全在框内才选中；Delete = 批量 eraseEdges+eraseFaces", () => {
    const k = new Kernel();
    k.addEdges(rectSegments(P(0, 0), P(10, 10)));
    k.addEdges(rectSegments(P(20, 0), P(30, 10)));
    const sel = marqueePick(k, marqueeOf(P(-5, -5), P(15, 15)));
    eq(sel.edges.size, 4, "只选左方的边");
    eq(sel.faces.size, 1, "只选左面");
    k.eraseFaces([...sel.faces]);
    k.eraseEdges([...sel.edges]);
    eq(k.faces().length, 1, "右面还在");
    eq(k.edges().length, 4, "右方四边还在");
  });

  it("批量删日字全部边 → 一次批，面全灭无假 MERGE 泄漏", () => {
    const k = new Kernel();
    k.addEdges([...rectSegments(P(0, 0), P(10, 10)), [P(0, 5), P(10, 5)]]);
    const sel = marqueePick(k, marqueeOf(P(-1, -1), P(11, 11)));
    const ev = k.eraseEdges([...sel.edges]);
    eq(k.faces().length, 0, "全灭");
    eq(k.edges().length, 0, "边全灭");
    eq(ev.filter((e) => e.type === "MERGE").length, 0, "无假 MERGE");
  });
});

describe("tools: Move 目标展开", () => {
  it("顶点/边/面 → 对应顶点集", () => {
    const k = new Kernel();
    k.addEdges(rectSegments(P(0, 0), P(10, 10)));
    const v = k.vertices()[0];
    eq(moveTargets(k, { vertex: v.id }).length, 1, "顶点=1");
    eq(moveTargets(k, { edge: k.edges()[0].id }).length, 2, "边=2");
    eq(moveTargets(k, { face: k.faces()[0].id }).length, 4, "面=外环4顶点");
  });

  it("整面平移 = 一批 moveVertices → STRETCH，膜守恒", () => {
    const k = new Kernel();
    k.addEdges(rectSegments(P(0, 0), P(10, 10)));
    const fid = k.faces()[0].id;
    const vids = moveTargets(k, { face: fid });
    const ev = k.moveVertices(translateMoves(k, vids, P(100, 50)));
    eq(ev.length, 1, "一个事件");
    eq(ev[0].type, "STRETCH", "STRETCH");
    eq(k.faces()[0].id, fid, "id 稳定");
    assert(k.hitTest(P(105, 55), 0.1).face === fid, "面到了新位置");
  });
});

describe("tools: 橡皮刮擦", () => {
  it("轨迹扫过多边 → 收集去重，一批擦", () => {
    const k = new Kernel();
    k.addEdges([...rectSegments(P(0, 0), P(10, 10)), [P(0, 5), P(10, 5)]]);
    const acc = new Set<number>();
    scrubHits(k, P(5, -2), P(5, 12), 1.5, acc); // 竖着扫过上下横边+中线
    assert(acc.size >= 3, `至少扫中 3 条，实得 ${acc.size}`);
    k.eraseEdges([...acc]);
    eq(k.faces().length, 0, "两格面没了");
  });
});

describe("inference: 平面版四标本", () => {
  function square(): Kernel {
    const k = new Kernel();
    k.addEdges(rectSegments(P(0, 0), P(10, 10)));
    return k;
  }

  it("endpoint 优先于 midpoint（同时在容差内时）", () => {
    const k = square();
    const r = inferPoint(k, P(0.5, 0.5), null, 6);
    eq(r.kind, "endpoint", "endpoint 赢");
    eq(r.pt.x, 0, "吸到 (0,0)");
    eq(r.pt.y, 0, "吸到 (0,0)");
  });

  it("midpoint：边中点吸附", () => {
    const k = square();
    const r = inferPoint(k, P(5.4, -0.8), null, 2);
    eq(r.kind, "midpoint", "midpoint");
    eq(r.pt.x, 5, "吸到 (5,0)");
    eq(r.pt.y, 0, "吸到 (5,0)");
  });

  it("on-edge：投影到边上", () => {
    const k = square();
    const r = inferPoint(k, P(3, 0.9), null, 1.5);
    eq(r.kind, "on-edge", "on-edge");
    eq(r.pt.y, 0, "投到底边");
    assert(Math.abs(r.pt.x - 3) < 1e-9, "x 保持");
  });

  it("axis：有 anchor 时水平/垂直锁；无 anchor 不锁", () => {
    const k = square();
    const rx = inferPoint(k, P(50, 20.9), P(30, 20), 2);
    eq(rx.kind, "axis-x", "水平锁");
    eq(rx.pt.y, 20, "y 对齐 anchor");
    const ry = inferPoint(k, P(30.9, 50), P(30, 20), 2);
    eq(ry.kind, "axis-y", "垂直锁");
    eq(ry.pt.x, 30, "x 对齐 anchor");
    eq(inferPoint(k, P(50, 20.9), null, 2).kind, null, "无 anchor 不锁");
  });

  it("全都不命中 → 原样返回", () => {
    const k = square();
    const r = inferPoint(k, P(55, 55), P(30, 30), 2);
    eq(r.kind, null, "无吸附");
    eq(r.pt.x, 55, "原样");
  });
});
