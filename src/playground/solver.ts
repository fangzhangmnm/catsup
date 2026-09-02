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
import { type Pt, type PlaneParams, add3, cross3, dist3, dot3, ptKey3, scale3, sub3 } from "../kernel/geom.ts";
import { OrbitCamera, type Viewport, closestOnAxis, rayPlane } from "./camera.ts";

export interface View { cam: OrbitCamera; vp: Viewport; }
export type AxName = "x" | "y" | "z" | "u" | "v";

export interface ConTag {
  kind: "endpoint" | "origin" | "midpoint" | "intersection" | "edge" | "cross" | "axis" | "align" | "plane";
  src?: Pt3;
  axis?: AxName;
}
export type Locus =
  | { dim: 0; p: Pt3 }
  | { dim: 1; a: Pt3; dir: Pt3; len?: number }   // len 有=线段 [a, a+dir·len]；无=无限直线
  | { dim: 2; plane: PlaneParams };
export interface Constraint { locus: Locus; rank: number; eps: number; tag: ConTag; }

export const RANK = { endpoint: 90, origin: 80, midpoint: 70, intersection: 65, edge: 60, cross: 55, axisLine: 45, plane: 10 } as const;
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
  // 派生 0-D：线×线载线交点（段外延长；段内相交早被 planarize 焊成顶点）。
  // user 2026-09-01：「snap 时生成线和点用户可以描」——虚拟目标，描到才成真几何。
  {
    const es = k.edges().map((e) => {
      const a = k.graph.pt(e.a), b = k.graph.pt(e.b);
      const l = dist3(a, b);
      return l > 0 ? { a, dir: scale3(sub3(b, a), 1 / l), ea: a, eb: b } : null;
    }).filter((x) => x !== null);
    for (let i = 0; i < es.length; i++) {
      for (let j = i + 1; j < es.length; j++) {
        const p = carrierIntersect(es[i]!, es[j]!);
        if (!p) continue;
        // 与既有端点重合（含共享顶点）→ 已是 endpoint 目标，跳过
        if ([es[i]!.ea, es[i]!.eb, es[j]!.ea, es[j]!.eb].some((q) => dist3(p, q) <= 1e-6)) continue;
        out.push({ locus: { dim: 0, p }, rank: RANK.intersection, eps: EPS.point, tag: { kind: "intersection" } });
      }
    }
  }
  // 派生 1-D：面×面交线（平面∩平面裁到两张膜区域；SU 摆烂处的 snap 升级——可描不改图）
  {
    const faces = k.faces();
    for (let i = 0; i < faces.length; i++) {
      for (let j = i + 1; j < faces.length; j++) {
        for (const seg of faceCrossSegments(k, faces[i].id, faces[j].id)) {
          out.push({ locus: { dim: 1, a: seg.a, dir: seg.dir, len: seg.len }, rank: RANK.cross, eps: EPS.line, tag: { kind: "cross" } });
        }
      }
    }
  }
  out.push({ locus: { dim: 2, plane: ctx.plane }, rank: RANK.plane, eps: Infinity, tag: { kind: "plane" } });
  return out;
}

/** 两载线（无限直线）真相交点；平行/异面 → null。 */
function carrierIntersect(A: { a: Pt3; dir: Pt3 }, B: { a: Pt3; dir: Pt3 }): Pt3 | null {
  const bb = dot3(A.dir, B.dir);
  const denom = 1 - bb * bb;
  if (Math.abs(denom) < 1e-9) return null;
  const w0 = sub3(A.a, B.a);
  const e = dot3(A.dir, w0), f = dot3(B.dir, w0);
  const tA = (bb * f - e) / denom, tB = (f - bb * e) / denom;
  const qA = { x: A.a.x + A.dir.x * tA, y: A.a.y + A.dir.y * tA, z: A.a.z + A.dir.z * tA };
  const qB = { x: B.a.x + B.dir.x * tB, y: B.a.y + B.dir.y * tB, z: B.a.z + B.dir.z * tB };
  if (dist3(qA, qB) > GAP_WORLD) return null;
  return qA;
}

/** 直线 p(t)=p0+t·d 与膜区域（外环−洞，even-odd）的相交 t 区间。环 pts 为该面基下 2D。 */
export function lineFaceIntervals(p0: Pt, d: Pt, rings: readonly (readonly Pt[])[]): [number, number][] {
  const ts: number[] = [];
  for (const ring of rings) {
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i], b = ring[(i + 1) % ring.length];
      const ex = b.x - a.x, ey = b.y - a.y;
      const denom = ex * d.y - ey * d.x;   // cross(e, d)
      if (Math.abs(denom) < 1e-12) continue;
      const s = ((p0.x - a.x) * d.y - (p0.y - a.y) * d.x) / denom;   // cross(p0−a, d)/cross(e, d)
      if (s < 0 || s >= 1) continue;
      const t = Math.abs(d.x) > Math.abs(d.y)
        ? (a.x + s * ex - p0.x) / d.x
        : (a.y + s * ey - p0.y) / d.y;
      ts.push(t);
    }
  }
  ts.sort((x, y) => x - y);
  const out: [number, number][] = [];
  for (let i = 0; i + 1 < ts.length; i += 2) out.push([ts[i], ts[i + 1]]);
  return out;
}

/** 面×面交线段（平面∩平面裁到两区域再取区间交）。 */
export function faceCrossSegments(k: Kernel, f1: import("../kernel/kernel.ts").FaceId, f2: import("../kernel/kernel.ts").FaceId): { a: Pt3; dir: Pt3; len: number }[] {
  const r1 = k.planeOf(f1), r2 = k.planeOf(f2);
  const F1 = k.face(f1), F2 = k.face(f2);
  if (!r1 || !r2 || !F1 || !F2) return [];
  const n3 = cross3(r1.plane.n, r2.plane.n);
  const nn = dot3(n3, n3);
  if (nn < 1e-12) return []; // 平行/共面（共面由 sticky 世界处理）
  // p0 = (d1·(n2×n3) + d2·(n3×n1)) / |n3|²（三平面求交，第三面取 n3·p=0）
  const p0 = scale3(add3(scale3(cross3(r2.plane.n, n3), r1.plane.d), scale3(cross3(n3, r1.plane.n), r2.plane.d)), 1 / nn);
  const dir = scale3(n3, 1 / Math.sqrt(nn));
  const proj = (rec: NonNullable<ReturnType<Kernel["planeOf"]>>): { p2: Pt; d2: Pt } => ({
    p2: { x: dot3(p0, rec.basis.u), y: dot3(p0, rec.basis.v) },
    d2: { x: dot3(dir, rec.basis.u), y: dot3(dir, rec.basis.v) },
  });
  const g1 = proj(r1), g2 = proj(r2);
  const iv1 = lineFaceIntervals(g1.p2, g1.d2, [F1.outer.pts, ...F1.holes.map((h) => h.pts)]);
  const iv2 = lineFaceIntervals(g2.p2, g2.d2, [F2.outer.pts, ...F2.holes.map((h) => h.pts)]);
  const segs: { a: Pt3; dir: Pt3; len: number }[] = [];
  for (const [a1, b1] of iv1) {
    for (const [a2, b2] of iv2) {
      const lo = Math.max(a1, a2), hi = Math.min(b1, b2);
      if (hi - lo < 1e-9) continue;
      segs.push({
        a: { x: p0.x + dir.x * lo, y: p0.y + dir.y * lo, z: p0.z + dir.z * lo },
        dir,
        len: hi - lo,
      });
    }
  }
  return segs;
}
