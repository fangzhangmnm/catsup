// 「灌」的纯函数模块（纪元排期 T5 / DT10，2026-10-26，Claude Opus 5.5）：三个动词 + 现成判定。
// 以前三份抄写（曲面判定 / 表面模式三档 / 三击连通体）的行为由各自原来的单测守着（paint-modes / selection），这里守新加的「全部分组」和模块本身。
import { describe, it, eq, assert } from "./runner.mjs";
import { Kernel } from "../src/kernel/kernel.ts";
import type { Pt3 } from "../src/kernel/kernel.ts";
import { connectedFrom, floodFaces, gates, partitionFaces, surfaceFaces } from "../src/kernel/flood.ts";
import { circleSegmentsOnPlane } from "../src/editor/tools.ts";
import { GROUND } from "../src/editor/pick.ts";

const P = (x: number, y: number, z = 0): Pt3 => ({ x, y, z });

describe("flood: 灌 / 分组 / 连通体", () => {
  it("盒子：任何边 = 6 面一组；夹角 < 20° 的硬边 = 6 组（直角不是候选）", () => {
    const k = new Kernel();
    const B = [[0, 0], [1, 0], [1, 1], [0, 1]], loop = (pts: Pt3[]): void => { k.addEdges(pts.map((p, i) => [p, pts[(i + 1) % pts.length]] as [Pt3, Pt3])); };
    loop(B.map(([x, y]) => P(x, y, 0))); loop(B.map(([x, y]) => P(x, y, 1)));
    for (let i = 0; i < 4; i++) { const [ax, ay] = B[i], [bx, by] = B[(i + 1) % 4]; loop([P(ax, ay, 0), P(bx, by, 0), P(bx, by, 1), P(ax, ay, 1)]); }
    const all = k.faces().map((f) => f.id);
    eq(floodFaces(k, all[0], gates.any()).length, 6);
    eq(partitionFaces(k, all, gates.any()).length, 1, "任何边：一组");
    eq(partitionFaces(k, all, gates.hardBelow(k, 20)).length, 6, "直角硬边不是拍平候选：各自一组");
    eq(partitionFaces(k, all, gates.hardBelow(k, 91)).length, 1, "阈值放到 91°：直角也算 → 一组");
  });
  it("圆柱：侧面是软边相连的曲面（24 张）；拍平候选（硬边且夹角小）不碰软边 → 侧面 24 张各自一组", () => {
    const k = new Kernel();
    k.addEdges(circleSegmentsOnPlane(GROUND.plane, GROUND.basis, P(0, 0, 0), P(1, 0, 0), 24), { curve: true });
    k.pushPull(k.faces()[0].id, 2);
    const side = k.faces().find((f) => k.faceRings3(f.id)!.outer.length === 4)!.id;
    eq(surfaceFaces(k, side).length, 24, "曲面 = 24 张侧面");
    const groups = partitionFaces(k, k.faces().map((f) => f.id), gates.hardBelow(k, 20));
    eq(groups.length, 26, "软边从来不是拍平候选：26 张各自一组");
    const groupsSoft = partitionFaces(k, k.faces().map((f) => f.id), gates.soft(k));
    eq(groupsSoft.length, 3, "按软边分：侧面一组 + 顶 + 底");
  });
  it("连通体：两块不相连的盒子 → 从一块的一条边出发只拿到那一块；分组按最小面 id 确定排序", () => {
    const k = new Kernel();
    const box = (x0: number): void => {
      const B = [[x0, 0], [x0 + 1, 0], [x0 + 1, 1], [x0, 1]], loop = (pts: Pt3[]): void => { k.addEdges(pts.map((p, i) => [p, pts[(i + 1) % pts.length]] as [Pt3, Pt3])); };
      loop(B.map(([x, y]) => P(x, y, 0))); loop(B.map(([x, y]) => P(x, y, 1)));
      for (let i = 0; i < 4; i++) { const [ax, ay] = B[i], [bx, by] = B[(i + 1) % 4]; loop([P(ax, ay, 0), P(bx, by, 0), P(bx, by, 1), P(ax, ay, 1)]); }
    };
    box(0); box(5);
    const e0 = k.edges().find((e) => k.graph.pt(e.a).x < 2)!.id;
    const c = connectedFrom(k, [e0], []);
    eq(c.faces.size, 6); eq(c.edges.size, 12);
    const groups = partitionFaces(k, k.faces().map((f) => f.id), gates.any());
    eq(groups.length, 2);
    assert(Math.min(...groups[0]) < Math.min(...groups[1]), "组按最小面 id 排");
    eq(floodFaces(k, 999999, gates.any()).length, 0, "种子不存在 → []");
  });
});
