// 约束 Delaunay 翻边（2026-10-27 Claude Fable 5.1；user「耳切三角化……很丑……能不能用一个更均匀，regular的triangulation」）。
// 性质：① 翻完后没有「可翻」的内部对角线（局部 Delaunay）② 覆盖不变：三角形数、带符号面积和、约束边全在 ③ 最小角不降 ④ 确定性。
import { describe, it, eq, assert } from "./runner.mjs";
import { delaunayFlips, type Tri } from "../src/kernel/cdt.ts";
import { triangulateRings } from "../src/format/triangulate.ts";
import type { Pt, Pt3 } from "../src/kernel/geom.ts";

const key = (a: number, b: number): string => (a < b ? `${a}-${b}` : `${b}-${a}`);
const area2 = (q: readonly Pt[], t: Tri): number => (q[t[1]].x - q[t[0]].x) * (q[t[2]].y - q[t[0]].y) - (q[t[1]].y - q[t[0]].y) * (q[t[2]].x - q[t[0]].x);
const minAngle = (q: readonly Pt[], tris: readonly Tri[]): number => {
  let m = Infinity;
  for (const t of tris) for (let i = 0; i < 3; i++) {
    const a = q[t[i]], b = q[t[(i + 1) % 3]], c = q[t[(i + 2) % 3]];
    const v1 = { x: b.x - a.x, y: b.y - a.y }, v2 = { x: c.x - a.x, y: c.y - a.y };
    const ang = Math.acos((v1.x * v2.x + v1.y * v2.y) / (Math.hypot(v1.x, v1.y) * Math.hypot(v2.x, v2.y)));
    m = Math.min(m, ang);
  }
  return m;
};
const ringKeys = (ids: readonly number[]): Set<string> => { const s = new Set<string>(); for (let i = 0; i < ids.length; i++) s.add(key(ids[i], ids[(i + 1) % ids.length])); return s; };
/** 简单扇形三角化（凸多边形）——故意的坏起点：细长条一堆。 */
const fan = (n: number): Tri[] => Array.from({ length: n - 2 }, (_, i) => [0, i + 1, i + 2] as Tri);

describe("约束 Delaunay 翻边", () => {
  it("细长矩形 + 密点的一边：扇形起点 → 翻完最小角变大、三角数 / 面积不变、边上的点仍在约束边上", () => {
    // 10 × 1 的矩形，底边上 9 个中间点：扇形从左上角切 = 全是细长条
    const q: Pt[] = [{ x: 0, y: 1 }, { x: 0, y: 0 }];
    for (let i = 1; i <= 9; i++) q.push({ x: i, y: 0 });
    q.push({ x: 10, y: 0 }, { x: 10, y: 1 });
    const n = q.length, ids = q.map((_, i) => i);
    const t0 = fan(n), t1 = delaunayFlips(q, t0, ringKeys(ids));
    eq(t1.length, t0.length, "三角数不变");
    const A = (ts: Tri[]): number => ts.reduce((s, t) => s + area2(q, t), 0);
    assert(Math.abs(A(t1) - A(t0)) < 1e-9, "面积和不变");
    assert(t1.every((t) => area2(q, t) > 0), "绕向不变、没有翻面");
    assert(minAngle(q, t1) > minAngle(q, t0) + 1e-6, `最小角变大：${minAngle(q, t0)} → ${minAngle(q, t1)}`);
    // 局部 Delaunay：没有一条内部对角线还可翻（再跑一遍不变）
    eq(JSON.stringify(delaunayFlips(q, t1, ringKeys(ids))), JSON.stringify(t1), "不动点");
  });
  it("约束边永远不翻：凹 L 形的边界边全在；带洞的三角汤洞边全在", () => {
    const L: Pt3[] = [{ x: 0, y: 0, z: 0 }, { x: 3, y: 0, z: 0 }, { x: 3, y: 1, z: 0 }, { x: 1, y: 1, z: 0 }, { x: 1, y: 3, z: 0 }, { x: 0, y: 3, z: 0 }];
    const tris = triangulateRings(L, { n: { x: 0, y: 0, z: 1 }, d: 0 }, [0, 1, 2, 3, 4, 5], []);
    const have = new Set<string>(); for (const t of tris) for (let i = 0; i < 3; i++) have.add(key(t[i], t[(i + 1) % 3]));
    for (const k of ringKeys([0, 1, 2, 3, 4, 5])) assert(have.has(k), `边界边 ${k} 还在`);
    eq(tris.length, 4, "六边形 = 4 个三角");
    const sq: Pt3[] = [{ x: 0, y: 0, z: 0 }, { x: 4, y: 0, z: 0 }, { x: 4, y: 4, z: 0 }, { x: 0, y: 4, z: 0 }, { x: 1, y: 1, z: 0 }, { x: 3, y: 1, z: 0 }, { x: 3, y: 3, z: 0 }, { x: 1, y: 3, z: 0 }];
    const tris2 = triangulateRings(sq, { n: { x: 0, y: 0, z: 1 }, d: 0 }, [0, 1, 2, 3], [[4, 5, 6, 7]]);
    const have2 = new Set<string>(); for (const t of tris2) for (let i = 0; i < 3; i++) have2.add(key(t[i], t[(i + 1) % 3]));
    for (const k of [...ringKeys([0, 1, 2, 3]), ...ringKeys([4, 5, 6, 7])]) assert(have2.has(k), `环边 ${k} 还在`);
    eq(tris2.length, 8, "方环 = 8 个三角");
    assert(tris2.every((t) => { const q = sq.map((p) => ({ x: p.x, y: p.y })); return Math.abs(area2(q, t)) > 1e-9; }), "没有退化三角");
  });
  it("共圆不翻来翻去（正方形的两条对角线等价）：一次就收敛", () => {
    const q: Pt[] = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }];
    const t0: Tri[] = [[0, 1, 2], [0, 2, 3]];
    eq(JSON.stringify(delaunayFlips(q, t0, ringKeys([0, 1, 2, 3]))), JSON.stringify(t0), "共圆保持原样");
  });
});
