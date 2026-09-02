// solver.ts —— 取点求解器：solve(V, s, C) 纯函数（snap 模型 SSoT §阶段二的物理本体）。
// created by Claude Fable 5, 2026-09-01 · spec = ai-docs/20260901-snap-model.md + three-phase-roadmap §二
//
// 模型（user 对齐过的数学形态）：
//   约束 c = { 轨迹 L(c)⊆ℝ³（0/1/2 维）, 语义秩 rank, 捕捉半径 ε(CSS px) }
//   求解三步：①活跃过滤（光标到 π(L) 屏距 ≤ ε）②降维合成（活跃 1-D 两两真相交→涌现 0-D，
//   不级联）③字典序选择（维度升，rank 降，屏距升）。
// 不变量（test/solver.test.ts property 断言）：解点在光标 ε 邻域内；同输入同解；解释（used）完整。
// 状态（充能 LRU/磁滞）全在调用方外层——本文件零状态、零 DOM、node 直测。
// 秩表注：anchor 轴与充能共轴同秩（距离裁决）；合成秩 = max(参与者)——天然排出
// 端点>原点>中点>边×轴>轴×轴 的既定优先级。

import type { Kernel, Pt3, VertexId } from "../kernel/kernel.ts";
import { type PlaneParams, dist3, dot3, ptKey3, scale3, sub3 } from "../kernel/geom.ts";
import { OrbitCamera, type Viewport, closestOnAxis, rayPlane } from "./camera.ts";

export interface View { cam: OrbitCamera; vp: Viewport; }
export type AxName = "x" | "y" | "z" | "u" | "v";

export interface ConTag {
  kind: "endpoint" | "origin" | "midpoint" | "edge" | "axis" | "align" | "plane";
  src?: Pt3;
  axis?: AxName;
}
export type Locus =
  | { dim: 0; p: Pt3 }
  | { dim: 1; a: Pt3; dir: Pt3; len?: number }   // len 有=线段 [a, a+dir·len]；无=无限直线
  | { dim: 2; plane: PlaneParams };
export interface Constraint { locus: Locus; rank: number; eps: number; tag: ConTag; }

export const RANK = { endpoint: 90, origin: 80, midpoint: 70, edge: 60, axisLine: 45, plane: 10 } as const;
export const EPS = { point: 10, edge: 7, line: 5, combo: 12 } as const;
const GAP_WORLD = 1e-5;

export interface Solution { p: Pt3; dim: number; rank: number; d: number; used: Constraint[]; }

/** 两条 1-D 轨迹的真相交（3D 两线一般不交；gap≤δ 才成立；段界须满足）。取段上点（sticky 落边）。 */
function intersect1D(A: { a: Pt3; dir: Pt3; len?: number }, B: { a: Pt3; dir: Pt3; len?: number }): Pt3 | null {
  const bb = dot3(A.dir, B.dir);
  const denom = 1 - bb * bb;
  if (Math.abs(denom) < 1e-9) return null;
  const w0 = sub3(A.a, B.a);
  const e = dot3(A.dir, w0), f = dot3(B.dir, w0);
  const tA = (bb * f - e) / denom;
  const tB = (f - bb * e) / denom;
  if (A.len !== undefined && (tA < -1e-9 || tA > A.len + 1e-9)) return null;
  if (B.len !== undefined && (tB < -1e-9 || tB > B.len + 1e-9)) return null;
  const qA = { x: A.a.x + A.dir.x * tA, y: A.a.y + A.dir.y * tA, z: A.a.z + A.dir.z * tA };
  const qB = { x: B.a.x + B.dir.x * tB, y: B.a.y + B.dir.y * tB, z: B.a.z + B.dir.z * tB };
  if (dist3(qA, qB) > GAP_WORLD) return null;
  return B.len !== undefined ? qB : qA;
}

export function solvePoint(
  view: View,
  s: { x: number; y: number },
  C: readonly Constraint[],
  opts?: { comboEps?: number },
): Solution | null {
  const { cam, vp } = view;
  const comboEps = opts?.comboEps ?? EPS.combo;
  const ray = cam.screenRay(s.x, s.y, vp);
  const scr = (p: Pt3): { x: number; y: number } => cam.worldToScreen(p, vp);
  const sd = (p: Pt3): number => {
    const q = scr(p);
    return Math.hypot(q.x - s.x, q.y - s.y);
  };
  const lineScreenDist = (a: Pt3, dir: Pt3, len?: number): number => {
    const p1 = scr(a);
    const p2 = scr(len !== undefined
      ? { x: a.x + dir.x * len, y: a.y + dir.y * len, z: a.z + dir.z * len }
      : { x: a.x + dir.x * 100, y: a.y + dir.y * 100, z: a.z + dir.z * 100 });
    const dx = p2.x - p1.x, dy = p2.y - p1.y;
    const l2 = dx * dx + dy * dy;
    if (l2 === 0) return Math.hypot(s.x - p1.x, s.y - p1.y);
    if (len !== undefined) {
      let t = ((s.x - p1.x) * dx + (s.y - p1.y) * dy) / l2;
      t = Math.max(0, Math.min(1, t));
      return Math.hypot(s.x - (p1.x + t * dx), s.y - (p1.y + t * dy));
    }
    return Math.abs((s.x - p1.x) * dy - (s.y - p1.y) * dx) / Math.sqrt(l2);
  };

  const cands: Solution[] = [];
  const act1: { c: Constraint; l: { a: Pt3; dir: Pt3; len?: number } }[] = [];
  for (const c of C) {
    const L = c.locus;
    if (L.dim === 0) {
      const d = sd(L.p);
      if (d <= c.eps) cands.push({ p: L.p, dim: 0, rank: c.rank, d, used: [c] });
    } else if (L.dim === 1) {
      const d = lineScreenDist(L.a, L.dir, L.len);
      if (d > c.eps) continue;
      const q = closestOnAxis(L.a, L.dir, ray.origin, ray.dir);
      if (!q) continue;
      let p = q;
      if (L.len !== undefined) {
        let t = dot3(sub3(q, L.a), L.dir);
        t = Math.max(0, Math.min(L.len, t));
        p = { x: L.a.x + L.dir.x * t, y: L.a.y + L.dir.y * t, z: L.a.z + L.dir.z * t };
      }
      cands.push({ p, dim: 1, rank: c.rank, d, used: [c] });
      act1.push({ c, l: L });
    } else {
      const q = rayPlane(ray.origin, ray.dir, L.plane.n, L.plane.d);
      if (q) cands.push({ p: q, dim: 2, rank: c.rank, d: 0, used: [c] });
    }
  }
  // ② 降维合成（不级联）
  for (let i = 0; i < act1.length; i++) {
    for (let j = i + 1; j < act1.length; j++) {
      const q = intersect1D(act1[i].l, act1[j].l);
      if (!q) continue;
      const d = sd(q);
      if (d > comboEps) continue;
      cands.push({ p: q, dim: 0, rank: Math.max(act1[i].c.rank, act1[j].c.rank), d, used: [act1[i].c, act1[j].c] });
    }
  }
  if (!cands.length) return null;
  // ③ 字典序选择
  cands.sort((a, b) => a.dim - b.dim || b.rank - a.rank || a.d - b.d);
  return cands[0];
}

export interface SnapContext {
  k: Kernel;
  plane: PlaneParams;                     // 2-D 兜底（画面平面）
  basis?: { u: Pt3; v: Pt3 } | null;      // 画面平面基（非轴对齐平面时补面内共轴方向）
  anchor?: Pt3 | null;
  alignSources?: readonly Pt3[] | null;
  excludeVid?: VertexId | null;
}

const DIRS: { axis: AxName; dir: Pt3 }[] = [
  { axis: "x", dir: { x: 1, y: 0, z: 0 } },
  { axis: "y", dir: { x: 0, y: 1, z: 0 } },
  { axis: "z", dir: { x: 0, y: 0, z: 1 } },
];

/** 情境构建器：把内核现状 + 工具情境枚举成约束集（单一供餐律的物理化）。 */
export function buildConstraints(ctx: SnapContext): Constraint[] {
  const out: Constraint[] = [];
  const { k } = ctx;
  for (const v of k.vertices()) {
    if (v.id === ctx.excludeVid) continue;
    out.push({ locus: { dim: 0, p: { x: v.x, y: v.y, z: v.z } }, rank: RANK.endpoint, eps: EPS.point, tag: { kind: "endpoint" } });
  }
  out.push({ locus: { dim: 0, p: { x: 0, y: 0, z: 0 } }, rank: RANK.origin, eps: EPS.point, tag: { kind: "origin" } });
  for (const e of k.edges()) {
    if (e.a === ctx.excludeVid || e.b === ctx.excludeVid) continue;
    const a = k.graph.pt(e.a), b = k.graph.pt(e.b);
    const len = dist3(a, b);
    if (len <= 0) continue;
    out.push({
      locus: { dim: 0, p: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: (a.z + b.z) / 2 } },
      rank: RANK.midpoint, eps: EPS.point, tag: { kind: "midpoint" },
    });
    out.push({ locus: { dim: 1, a, dir: scale3(sub3(b, a), 1 / len), len }, rank: RANK.edge, eps: EPS.edge, tag: { kind: "edge" } });
  }
  // 轴对齐 1-D：源 = anchor（axis 标签）+ 原点（永久）+ 充能点（align 标签）；充能制=幽灵 align 定理的前置条件
  // 方向集 = 世界三轴 ∪ 非轴对齐画面的面内基（倾斜平面共轴——方向集显式化后的一行注册）
  const dirs: { axis: AxName; dir: Pt3 }[] = [...DIRS];
  if (ctx.basis) {
    const axisAligned = (d: Pt3): boolean =>
      Math.abs(d.x) > 0.999 || Math.abs(d.y) > 0.999 || Math.abs(d.z) > 0.999;
    if (!axisAligned(ctx.basis.u)) dirs.push({ axis: "u", dir: ctx.basis.u });
    if (!axisAligned(ctx.basis.v)) dirs.push({ axis: "v", dir: ctx.basis.v });
  }
  const seen = new Set<string>();
  const addLines = (src: Pt3, kind: "axis" | "align"): void => {
    const key = ptKey3(src);
    if (seen.has(key)) return;
    seen.add(key);
    for (const { axis, dir } of dirs) {
      out.push({ locus: { dim: 1, a: src, dir }, rank: RANK.axisLine, eps: EPS.line, tag: { kind, src, axis } });
    }
  };
  if (ctx.anchor) addLines(ctx.anchor, "axis");
  addLines({ x: 0, y: 0, z: 0 }, "align");
  for (const src of ctx.alignSources ?? []) addLines(src, "align");
  out.push({ locus: { dim: 2, plane: ctx.plane }, rank: RANK.plane, eps: Infinity, tag: { kind: "plane" } });
  return out;
}
