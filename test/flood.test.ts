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

// 弯折角（2026-10-26）：坐标按 1 µm 存储格量化，角度断言容差 1e−3°。0 = 平展连续，180 = 对折回去；旧的二面角取法向点积绝对值，尖屋脊（弯 160°）会被当成 20°
describe("kernel: 弯折角 bendDeg", () => {
  /** 屋脊：两张矩形面沿 y 轴的脊线相接，各自从脊往下斜 slopeDeg（0 = 平展）。 */
  const roof = (slopeDeg: number): { k: Kernel; ridge: number } => {
    const k = new Kernel(), s = (slopeDeg * Math.PI) / 180, w = 1, dz = -Math.tan(s) * w;
    const L = P(-w, 0, dz), R = P(w, 0, dz), L2 = P(-w, 2, dz), R2 = P(w, 2, dz), A = P(0, 0, 0), B = P(0, 2, 0);
    k.addEdges([[A, B], [B, L2], [L2, L], [L, A], [B, R2], [R2, R], [R, A]] as [Pt3, Pt3][]);
    const ridge = k.graph.edgeBetween(k.vertices().find((v) => v.x === 0 && v.y === 0 && v.z === 0)!.id, k.vertices().find((v) => v.x === 0 && v.y === 2 && v.z === 0)!.id)!;
    return { k, ridge };
  };
  it("平展 = 0；两面各斜 5° = 10；各陡 80°（尖屋脊）= 160——旧二面角会说 20", () => {
    { const { k, ridge } = roof(0); assert(Math.abs(k.bendDeg(ridge)!) < 1e-3, `平展 ${k.bendDeg(ridge)}`); }
    { const { k, ridge } = roof(5); eq(k.faces().length, 2); assert(Math.abs(k.bendDeg(ridge)! - 10) < 1e-3, `${k.bendDeg(ridge)}`); }
    { const { k, ridge } = roof(80); assert(Math.abs(k.bendDeg(ridge)! - 160) < 1e-3, `${k.bendDeg(ridge)}`); assert(Math.abs(k.dihedralDeg(ridge)! - 20) < 1e-3, "旧二面角 = 20（分不清）"); }
  });
  it("盒子的棱 = 90；拍平候选（硬边、弯折 < 20°）不含尖屋脊", () => {
    const { k, ridge } = roof(80);
    assert(!gates.hardBelow(k, 20)(ridge), "尖屋脊不是拍平候选");
    const { k: k2, ridge: r2 } = roof(5);
    assert(gates.hardBelow(k2, 20)(r2), "平缓屋脊（弯 10°）是候选");
    const kb = new Kernel(), B = [[0, 0], [1, 0], [1, 1], [0, 1]], loop = (pts: Pt3[]): void => { kb.addEdges(pts.map((p, i) => [p, pts[(i + 1) % pts.length]] as [Pt3, Pt3])); };
    loop(B.map(([x, y]) => P(x, y, 0))); loop(B.map(([x, y]) => P(x, y, 1)));
    for (let i = 0; i < 4; i++) { const [ax, ay] = B[i], [bx, by] = B[(i + 1) % 4]; loop([P(ax, ay, 0), P(bx, by, 0), P(bx, by, 1), P(ax, ay, 1)]); }
    for (const e of kb.edges()) assert(Math.abs(kb.bendDeg(e.id)! - 90) < 1e-3, `盒棱 ${kb.bendDeg(e.id)}`);
  });
});
