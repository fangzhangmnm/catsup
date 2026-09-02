// autofold.ts —— 公理 1（平面性）的执行机构：非平面环 → 最少折缝分解。
// created by Claude Fable 5, 2026-09-01 · user 同日拍板规则：「十边形对折应该只出一条折缝」
// ——不切三角雨，找**极大共面段**（runs）：k 段 → 段边界（结点）间连折缝弦，每段自成平面膜。
// 拉单顶角 = k=2 特例（[A,B,C]+[C,D,A]，一条缝）。结点多边形 k≥3 时自成一片（三角必平面；
// k≥4 非平面 → null=分解失败，调用方 BURST 兜底诚实退路）。
// 消费方 = kernel.moveVertices（sticky 协议自愈步第二员：planarize 治交叉，本机治非平面）。

import { type PlaneParams, type Pt3, distToPlane, planeFromPoints } from "./geom.ts";

export interface FoldResult {
  pieces: number[][];          // 每片 = 环索引列表（顺环序，首尾即折缝弦两端）
  creases: [number, number][]; // 折缝 = 环索引对
}

export function foldDecompose(pts: readonly Pt3[], tol: number): FoldResult | null {
  const n = pts.length;
  if (n < 4) return null;
  const fitOf = (idxs: readonly number[]): PlaneParams | null => {
    for (let a = 1; a + 1 < idxs.length; a++) {
      const pl = planeFromPoints(pts[idxs[0]], pts[idxs[a]], pts[idxs[a + 1]]);
      if (pl) return pl;
    }
    return null;
  };
  const coplanar = (idxs: readonly number[]): boolean => {
    const pl = fitOf(idxs);
    if (!pl) return true; // 全共线段并入任意面
    return idxs.every((i) => distToPlane(pts[i], pl) <= tol);
  };
  // 贪心极大段（起点 0 规范化；首尾段共面则并环）
  const runs: number[][] = [];
  let cur = [0, 1];
  for (let i = 2; i < n; i++) {
    const trial = [...cur, i];
    if (coplanar(trial)) cur = trial;
    else { runs.push(cur); cur = [cur[cur.length - 1], i]; }
  }
  // 闭环：末段接回起点
  const wrapTrial = [...cur, 0];
  if (runs.length && coplanar([...cur, ...runs[0]])) {
    runs[0] = [...cur, ...runs[0]];
  } else if (coplanar(wrapTrial)) {
    runs.push(wrapTrial);
  } else {
    runs.push(cur);
    runs.push([cur[cur.length - 1], 0]);  // 兜底二点段（无面积，只贡献结点）
  }
  if (runs.length < 2) return null; // 整环共面：不该被调用
  // 结点 = 各段首元素（=前段末元素）
  const junctions = runs.map((r) => r[0]);
  const k = junctions.length;
  const pieces = runs.filter((r) => new Set(r).size >= 3);
  const creases: [number, number][] = [];
  if (k === 2) {
    creases.push([junctions[0], junctions[1]]);
  } else {
    for (let i = 0; i < k; i++) creases.push([junctions[i], junctions[(i + 1) % k]]);
    if (k >= 3) {
      if (!coplanar(junctions)) return null; // 结点多边形非平面：v1 不递归，交还 BURST 兜底
      if (new Set(junctions).size >= 3) pieces.push([...junctions]);
    }
  }
  if (!pieces.length) return null;
  return { pieces, creases };
}
