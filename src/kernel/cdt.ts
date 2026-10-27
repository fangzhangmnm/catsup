// cdt.ts —— 三角剖分的质量整理：Lawson 翻边 → 约束 Delaunay（CDT）。
// created 2026-10-27 by Claude Fable 5.1；user 同日：「耳切三角化 复杂多边形concave, holeful会很丑，而且对游戏引擎也不友好，游戏引擎讨厌sketchup的东西
// 这个就是一个比较大的因素，能不能用一个更均匀，regular的triangulation？」
// 做法：任意一个合法三角剖分起步（耳切 / earcut 都行），反复把「不是约束边、两侧三角形的并是严格凸四边形、且不满足空圆准则」的对角线翻过来，
// 直到没有可翻的。Lawson 定理：每次翻边严格增大「角向量」的字典序（最小角不减），所以有限步终止，终点 = 约束 Delaunay 三角剖分
// （最大化最小角——没有能避免的细长条）。约束边 = 多边形本身的边（外环 + 洞），永远不翻。
// 消费方：autofold.ts（折缝 = 翻完的对角线）、format/triangulate.ts（渲染 / 导出的三角汤——引擎看到的）。
// 性能：每轮扫全部内部对角线 O(E)，典型几轮收敛；上限 PASSES 轮兜底（数值退化时不死循环）。确定性：边按键排序扫。

import type { Pt } from "./geom.ts";
import { orient2dD } from "./exact/predicates.ts";

export type Tri = [number, number, number];

const key = (a: number, b: number): string => (a < b ? `${a}-${b}` : `${b}-${a}`);
const PASSES = 64;

/**
 * q = 顶点的 2D 坐标（投影后）；tris = 顶点下标三元组（同一绕向）；constrained = 不许翻的边（键 = 小下标-大下标）。
 * 返回翻完的三角形列表（顺序 / 绕向尽量沿用输入）。
 */
export function delaunayFlips(q: readonly Pt[], tris: readonly Tri[], constrained: ReadonlySet<string>): Tri[] {
  const T: Tri[] = tris.map((t) => [t[0], t[1], t[2]]);
  for (let pass = 0; pass < PASSES; pass++) {
    // 边 → 两侧三角形
    const byEdge = new Map<string, number[]>();
    T.forEach((t, ti) => { for (let i = 0; i < 3; i++) { const k = key(t[i], t[(i + 1) % 3]); const l = byEdge.get(k); if (l) l.push(ti); else byEdge.set(k, [ti]); } });
    let flipped = 0;
    for (const k of [...byEdge.keys()].sort()) {
      if (constrained.has(k)) continue;
      const owners = byEdge.get(k)!;
      if (owners.length !== 2) continue;
      const [ta, tb] = owners.map((i) => T[i]);
      const [a, b] = k.split("-").map(Number);
      const c = ta.find((v) => v !== a && v !== b), d = tb.find((v) => v !== a && v !== b);
      if (c === undefined || d === undefined || c === d) continue;
      // 四边形 a-c-b-d 要严格凸（否则翻了会重叠）：c、d 在 ab 两侧，且 a、b 在 cd 两侧
      if (orient2dD(q[a], q[b], q[c]) * orient2dD(q[a], q[b], q[d]) >= 0) continue;
      if (orient2dD(q[c], q[d], q[a]) * orient2dD(q[c], q[d], q[b]) >= 0) continue;
      // 空圆：d 在 (a, b, c) 外接圆内 → 翻。用相对量纲判，带一点余量，避免共圆时来回翻
      if (inCircle(q[a], q[b], q[c], q[d]) <= 0) continue;
      // 翻：ab → cd。保持两侧三角形的绕向和原来一致（原三角形 ta 含 a,b,c；tb 含 a,b,d）
      const orientA = orient2dD(q[ta[0]], q[ta[1]], q[ta[2]]);
      const mk = (x: number, y: number, z: number): Tri => (orient2dD(q[x], q[y], q[z]) === orientA ? [x, y, z] : [x, z, y]);
      T[owners[0]] = mk(c, d, a);
      T[owners[1]] = mk(c, d, b);
      // 这条翻过的边和四条外边在本轮的索引都变了：重建索引最简单——跳出本轮重扫
      flipped++;
      break;
    }
    if (!flipped) return T;
  }
  return T;
}

/** d 在过 a, b, c 的圆内 → 正；圆上 ≈ 0；外 → 负。按 |abc| 的尺度归一（绝对量不随单位变）。 */
function inCircle(a: Pt, b: Pt, c: Pt, d: Pt): number {
  const ax = a.x - d.x, ay = a.y - d.y, bx = b.x - d.x, by = b.y - d.y, cx = c.x - d.x, cy = c.y - d.y;
  const det = (ax * ax + ay * ay) * (bx * cy - cx * by) - (bx * bx + by * by) * (ax * cy - cx * ay) + (cx * cx + cy * cy) * (ax * by - bx * ay);
  const o = orient2dD(a, b, c);
  const scale = (ax * ax + ay * ay + bx * bx + by * by + cx * cx + cy * cy) * Math.hypot(bx - ax, by - ay) * Math.hypot(cx - ax, cy - ay);
  const rel = scale > 0 ? det / scale : 0;
  // 余量 1e-9：共圆（矩形的两条对角线）不翻来翻去
  return o > 0 ? (rel > 1e-9 ? rel : 0) : o < 0 ? (-rel > 1e-9 ? -rel : 0) : 0;
}
