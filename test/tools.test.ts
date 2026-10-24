import { describe, it, eq, assert } from "./runner.mjs";
import { Kernel } from "../src/kernel/kernel.ts";
import type { Pt } from "../src/kernel/kernel.ts";
import { moveTargets, rectSegments, rectSegmentsOnPlane, translateMoves } from "../src/editor/tools.ts";
import { canonicalPlane, planeBasis } from "../src/kernel/geom.ts";

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

  it("任意平面版：竖墙上画矩形 → BIRTH 在墙平面", () => {
    const k = new Kernel();
    const plane = canonicalPlane({ x: 0, y: 1, z: 0 }, 0); // y=0 竖墙
    const basis = planeBasis(plane);
    const segs = rectSegmentsOnPlane(plane, basis, { x: 0, y: 0, z: 0 }, { x: 10, y: 0, z: 8 });
    eq(segs.length, 4, "四段");
    const ev = k.addEdges(segs);
    eq(ev[0].type, "BIRTH", "墙面诞生");
    assert(k.vertices().every((v) => Math.abs(v.y) < 1e-9), "全部点精确落在 y=0 平面");
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

// ---- 弧（0.10，2026-10-24）
import { arcSegmentsOnPlane, curveSpecToLocal } from "../src/editor/tools.ts";
describe("tools: arcSegmentsOnPlane（SU 两点 + 凸度）", () => {
  const Z = { x: 0, y: 0, z: 1 }, X = { x: 1, y: 0, z: 0 }, Y = { x: 0, y: 1, z: 0 };
  const plane = { n: Z, d: 0 }, basis = { u: X, v: Y };
  it("A=(-1,0) B=(1,0) 凸度点 (0,1) → 半圆 12 段，经过凸度点，圆心原点半径 1；凸度在另一侧 → 走另一边", () => {
    const up = arcSegmentsOnPlane(plane, basis, { x: -1, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }, 12)!;
    assert(up, "有弧");
    eq(up.segs.length, 12);
    assert(Math.abs(up.radius - 1) < 1e-9 && Math.abs(up.center.x) < 1e-9 && Math.abs(up.center.y) < 1e-9, "圆心原点半径 1");
    assert(Math.abs(Math.abs(up.sweep) - Math.PI) < 1e-9, "半圆");
    assert(up.segs[6][0].y > 0.99, "中点在上面（经过凸度点那一侧）");
    const down = arcSegmentsOnPlane(plane, basis, { x: -1, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, { x: 0, y: -1, z: 0 }, 12)!;
    assert(down.segs[6][0].y < -0.99, "凸度在下面 → 走下面");
    assert(Math.sign(down.sweep) !== Math.sign(up.sweep), "方向相反");
  });
  it("三点共线 → null；优弧（凸度点离弦远）扫过 > 180°", () => {
    eq(arcSegmentsOnPlane(plane, basis, { x: 0, y: 0, z: 0 }, { x: 2, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, 12), null);
    const major = arcSegmentsOnPlane(plane, basis, { x: -1, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, { x: 0, y: 3, z: 0 }, 12)!;
    assert(Math.abs(major.sweep) > Math.PI, "优弧");
  });
  it("curveSpecToLocal：平移 + 均匀缩放的池里，圆心跟着走、半径按比例、方向不变", () => {
    const spec = { kind: "circle" as const, closed: true, params: { center: { x: 1, y: 1, z: 0 }, radius: 2, normal: Z, xaxis: X, segments: 24 } };
    const local = curveSpecToLocal((p) => ({ x: (p.x - 1) * 0.5, y: (p.y - 1) * 0.5, z: p.z * 0.5 }), spec);
    assert(Math.abs(local.params!.center.x) < 1e-9 && Math.abs(local.params!.radius - 1) < 1e-9, "圆心 (0,0) 半径 1");
    assert(Math.abs(local.params!.normal.z - 1) < 1e-9 && Math.abs(local.params!.xaxis.x - 1) < 1e-9, "方向不变");
  });
});
