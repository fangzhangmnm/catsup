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

import type { Edge, EdgeId, FaceId, Kernel, Pt3, VertexId } from "../kernel/kernel.ts";
import { ringVidsTolerant } from "../kernel/face-lifecycle.ts";
import type { Ring } from "../kernel/facefind.ts";
import { type Pt, type PlaneParams, add3, canonicalPlane, cross3, dist3, distToPlane, dot3, planeBasis, pointInRing, ptKey3, scale3, sub3 } from "../kernel/geom.ts";
import { OrbitCamera, type Viewport, closestOnAxis, rayPlane } from "./camera.ts";

/** 绘图平面；face 有值 = 这张平面来自一张膜（首点面锁 / 含点膜），裸落其内报「面上」（SU On Face，2026-09-06 user：「还没有落笔的时候也应该显示面上的吸附」）。 */
export interface DrawPlane { plane: PlaneParams; basis: { u: Pt3; v: Pt3 }; face?: FaceId; }


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
/**
 * ε 语义（user 2026-09-06「吸附的语义还是屏幕大小…height+aspect 这个老 gl convention」）：
 * 所有 ε 常量按 **800 px 高的视口**标定，实际使用按 `vp.h / 800` 等比缩放——等价于「fovY 的角度分数」
 * （透视：ε_px = θ/fovY·vp.h；正交拿 halfH 当"角度"换算，同一个式子）。屏幕越大圈越大，high-DPI 无关，
 * 宽屏/竖屏只看高度（aspect 只管横向裁剪）。测试/探针全用 h=800，数值一字不变。VR 把射线周围的角度空间
 * 当 800 px 高的虚拟屏即可复用。
 */
export const REF_VP_H = 800;
export const epsScale = (vp: Viewport): number => vp.h / REF_VP_H;
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
  opts?: {
    comboEps?: number;
    hidden?: (p: Pt3) => boolean;
    /** 1-D 轨迹遮挡裁剪：返回 [tMin,tMax] 内的被挡区间（见 occludedSpansOnLine）；不给=不裁 */
    spans1D?: (a: Pt3, dir: Pt3, tMin: number, tMax: number) => [number, number][];
  },
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
  const hid = opts?.hidden;
  for (const c of C) {
    const L = c.locus;
    if (L.dim === 0) {
      const d = sd(L.p);
      if (d <= c.eps && !(hid && hid(L.p))) cands.push({ p: L.p, dim: 0, rank: c.rank, d, used: [c] });
    } else if (L.dim === 1) {
      const d = lineScreenDist(L.a, L.dir, L.len);
      if (d > c.eps) continue;
      const q = closestOnAxis(L.a, L.dir, ray.origin, ray.dir);
      if (!q) continue;
      let t = dot3(sub3(q, L.a), L.dir);
      if (L.len !== undefined) t = Math.max(0, Math.min(L.len, t));
      let dEff = d;
      if (opts?.spans1D) {
        // 遮挡=裁可见区间：候选 t 落在被挡段 → 钳到最近可见边界（不否决——否决会在剪影边界横跳）
        const R = L.len !== undefined ? 0 : Math.abs(t) + 1e5;
        const lo = L.len !== undefined ? 0 : t - R, hi = L.len !== undefined ? L.len : t + R;
        const occ = opts.spans1D(L.a, L.dir, lo, hi);
        let inside: [number, number] | null = null;
        for (const sp of occ) if (t > sp[0] + 1e-9 && t < sp[1] - 1e-9) { inside = sp; break; }
        if (inside) {
          const cl = [inside[0], inside[1]].filter((x) => x > lo + 1e-9 && x < hi - 1e-9);
          if (!cl.length) continue;                                   // 整段可达范围全被挡
          t = cl.reduce((b, x) => (Math.abs(x - t) < Math.abs(b - t) ? x : b));
          const pc = { x: L.a.x + L.dir.x * t, y: L.a.y + L.dir.y * t, z: L.a.z + L.dir.z * t };
          dEff = sd(pc);
          if (dEff > c.eps) continue;                                 // 边界点已滑出吸附圈=干净掉出
        }
      } else if (hid) {
        const pt0 = { x: L.a.x + L.dir.x * t, y: L.a.y + L.dir.y * t, z: L.a.z + L.dir.z * t };
        if (hid(pt0)) continue;
      }
      const p = { x: L.a.x + L.dir.x * t, y: L.a.y + L.dir.y * t, z: L.a.z + L.dir.z * t };
      cands.push({ p, dim: 1, rank: c.rank, d: dEff, used: [c] });
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
      if (hid && hid(q)) continue;
      const d = sd(q);
      if (d > comboEps) continue;
      cands.push({ p: q, dim: 0, rank: Math.max(act1[i].c.rank, act1[j].c.rank), d, used: [act1[i].c, act1[j].c] });
    }
  }
  if (!cands.length) return null;
  // ③ 字典序选择
  // 重叠轨迹稳定裁决（user 2026-09-03：两条一直重叠的轴不许来回翻）：
  // dist 量化 0.5px 桶——同线候选精确同距，浮点噪声不换桶；同桶再按 tag 确定性排序
  const KIND_PRI: Record<string, number> = { endpoint: 0, origin: 0, midpoint: 0, axis: 1, align: 2, "edge-align": 3, edge: 4 };
  const tagKey = (x: Solution): string => {
    const t = x.used[0]?.tag as { kind?: string; axis?: string; src?: Pt3 } | undefined;
    return `${KIND_PRI[t?.kind ?? ""] ?? 9}|${t?.kind ?? ""}|${t?.axis ?? ""}|${t?.src ? ptKey3(t.src) : ""}`;
  };
  cands.sort((a, b) =>
    a.dim - b.dim || b.rank - a.rank ||
    Math.round(a.d * 2) - Math.round(b.d * 2) ||
    (tagKey(a) < tagKey(b) ? -1 : tagKey(a) > tagKey(b) ? 1 : 0));
  return cands[0];
}

/** 手中集：拖拽中属于「手」的顶点谓词 + 手中膜的遮挡性（pp=opaque：光标在帽上背后无目标=SU 连续；
 *  move=transparent：落点必须可见）。触手膜/触手边/由它们派生的目标一律不参赛。 */
export interface AlignHand {
  has(vid: VertexId): boolean;             // 顶点在手里（0-D 退赛；边/链的端点在手里 → 整链退赛）
  opaque: boolean;                         // 手中膜是否遮挡（pp 帽=不透明；move/draw=透明）
  /** 膜在手里（透明时豁免遮挡、不产面交线）。不给 = 由顶点推（触手膜）。draw 类工具应只报 BIRTH 出来的膜：
   *  DIVIDE 子膜与母膜同影柱，豁免它=母膜消失=背后几何露出来（2026-09-06 侧面拖矩形吸到背后底边案）。 */
  faces?(fid: FaceId): boolean;
}
/** 「空手」：没有任何手中集（首点查询、无手势的悬停、测试）。**必须显式表态**，不许省略——省略就是 2026-09-06「一 snap 一 snap」自吸事故的根。 */
export const NO_HAND: AlignHand = { has: () => false, opaque: false };
/** 对齐查询（2026-09-03 整改收敛：exclude/skipFace/hiddenOverride/occluder/axes 五补丁参数退役）。
 *  世界 W 只有一个 = 调用方的现实（壳的 liveWorld()；旧 snapshot 结构性禁入——snap-model SSoT 立法节）。 */
export interface AlignQuery {
  plane: DrawPlane;                        // 2-D 兜底（画面平面，含基）
  anchor?: Pt3 | null;                     // 轴线源
  alignSources?: readonly Pt3[] | null;    // 充能源
  lines?: boolean;                         // false = 不注册轴/共轴 1-D 线（pp：不吸 xyz 轴）
  hand: AlignHand;                         // 手中集，**必填**（表态制：空手写 NO_HAND）——对齐引擎永远不吸手里的东西
}
export interface SnapContext {
  k: Kernel;
  plane: PlaneParams;
  basis?: { u: Pt3; v: Pt3 } | null;
  cam?: OrbitCamera | null;               // 提供则启用膜遮挡过滤
  anchor?: Pt3 | null;
  alignSources?: readonly Pt3[] | null;
  lines?: boolean;
  hand?: AlignHand | null;
}

const DIRS: { axis: AxName; dir: Pt3 }[] = [
  { axis: "x", dir: { x: 1, y: 0, z: 0 } },
  { axis: "y", dir: { x: 0, y: 1, z: 0 } },
  { axis: "z", dir: { x: 0, y: 0, z: 1 } },
];

/** 膜环是否触手（任一环顶点 ∈ hand）。 */
function faceTouchesHand(k: Kernel, f: { outer: Ring; holes: Ring[]; id: FaceId }, hand?: AlignHand | null): boolean {
  if (!hand) return false;
  return [...ringVidsTolerant(k.graph, f.outer), ...f.holes.flatMap((h) => ringVidsTolerant(k.graph, h))]
    .some((v) => hand.has(v));
}
/** 膜在手里：hand.faces 表态优先；否则由顶点推（触手膜）。 */
function faceInHand(k: Kernel, f: { outer: Ring; holes: Ring[]; id: FaceId }, hand?: AlignHand | null): boolean {
  if (!hand) return false;
  if (hand.faces) return hand.faces(f.id);
  return faceTouchesHand(k, f, hand);
}
/** 遮挡豁免集：hand 透明时=手中膜；opaque 或无 hand 时=无豁免。 */
function handFaceSkip(k: Kernel, hand?: AlignHand | null): ((fid: FaceId) => boolean) | undefined {
  if (!hand || hand.opaque) return undefined;
  const skip = new Set<FaceId>();
  for (const f of k.faces()) if (faceInHand(k, f, hand)) skip.add(f.id);
  return skip.size ? (fid) => skip.has(fid) : undefined;
}

/**
 * 1-D 边目标集（2026-09-06 侧面拖矩形吸底边案，edited by Claude Fable 5.1）：
 * 手中顶点若只是把旧边**切开**（切点两侧两边共线反向）→ 两侧并成一条载线段——旧边整条仍是目标，
 * 不因切点在手里退赛（此前「任一端在手里整条退赛」：上一帧矩形一吸到底边、底边就被切成三段全部退赛，
 * 下一帧又回来 → 反复横跳「很难吸附」）。链的两端任一端在手里 → 该链是手势边（追光标）→ 整链退赛。
 */
function edgeTargets(k: Kernel, ex: (vid: VertexId) => boolean): { a: Pt3; b: Pt3 }[] {
  const edges = k.edges();
  const parent = new Map<EdgeId, EdgeId>();
  const find = (e: EdgeId): EdgeId => {
    let r = e;
    while (parent.has(r) && parent.get(r) !== r) r = parent.get(r)!;
    return r;
  };
  const union = (x: EdgeId, y: EdgeId): void => { const rx = find(x), ry = find(y); if (rx !== ry) parent.set(rx, ry); };
  const inc = new Map<VertexId, Edge[]>();
  for (const e of edges) for (const v of [e.a, e.b]) {
    if (!ex(v)) continue;
    const l = inc.get(v); if (l) l.push(e); else inc.set(v, [e]);
  }
  for (const [v, es] of inc) {
    const pv = k.graph.pt(v);
    const dirs = es.map((e) => { const o = k.graph.pt(e.a === v ? e.b : e.a); const d = sub3(o, pv); const l = dist3(o, pv); return l > 0 ? scale3(d, 1 / l) : null; });
    const used = new Set<number>();
    for (let i = 0; i < es.length; i++) {
      if (used.has(i) || !dirs[i]) continue;
      for (let j = i + 1; j < es.length; j++) {
        if (used.has(j) || !dirs[j]) continue;
        if (dot3(dirs[i]!, dirs[j]!) < -(1 - 1e-9)) { union(es[i].id, es[j].id); used.add(i); used.add(j); break; }
      }
    }
  }
  // 链端点 = 分量内只出现一次的顶点
  const comp = new Map<EdgeId, Edge[]>();
  for (const e of edges) { const r = find(e.id); const l = comp.get(r); if (l) l.push(e); else comp.set(r, [e]); }
  const out: { a: Pt3; b: Pt3 }[] = [];
  for (const es of comp.values()) {
    const cnt = new Map<VertexId, number>();
    for (const e of es) for (const v of [e.a, e.b]) cnt.set(v, (cnt.get(v) ?? 0) + 1);
    const ends = [...cnt].filter(([, c]) => c === 1).map(([v]) => v);
    if (ends.length !== 2) continue;                 // 退化（不应发生）
    if (ex(ends[0]) || ex(ends[1])) continue;        // 手势边：整链退赛
    out.push({ a: k.graph.pt(ends[0]), b: k.graph.pt(ends[1]) });
  }
  return out;
}

/** 膜遮挡：p 与眼睛之间隔着某膜（射线命中膜区域内部、t>ε）→ 被挡。贴在膜面上的点不算。 */
function occludedBy(k: Kernel, cam: OrbitCamera, p: Pt3, skip?: (fid: FaceId) => boolean): boolean {
  const dir = cam.viewDirAt(p);   // 透视=p→眼；正交=常向量（2026-09-06 透视化，edited by Claude Fable 5.1）
  for (const f of k.faces()) {
    if (skip?.(f.id)) continue;   // 手中膜不遮挡（2026-09-03：追光标的膜反复遮住目标=振荡假吸）
    const rec = k.planeOf(f.id);
    const face = k.face(f.id);
    if (!rec || !face) continue;
    const denom = dot3(rec.plane.n, dir);
    if (Math.abs(denom) < 1e-9) continue;
    const t = (rec.plane.d - dot3(rec.plane.n, p)) / denom;
    if (t <= 1e-4) continue;
    const q = add3(p, scale3(dir, t));
    const q2 = { x: dot3(q, rec.basis.u), y: dot3(q, rec.basis.v) };
    if (!pointInRing(q2, face.outer.pts)) continue;
    if (face.holes.some((h) => pointInRing(q2, h.pts))) continue;
    return true;
  }
  return false;
}

/**
 * 1-D 轨迹的膜遮挡 = **可见区间裁剪**（2026-09-03 抖动破案：逐点二值判会在剪影边界随光标横跳；
 * 0-D 点的可见性不随光标变所以二值判无害——user 直觉「边是一个 range」正解）。
 * 对每张膜求「影柱∩直线」：s(t)=到膜平面的视向距离是 t 的线性函数，q2(t)=命中点在膜基下的 2D 坐标
 * 是 t 的仿射函数 → 遮挡边界 = s(t)=ε 的根 ∪ q2(t) 与多边形边的交 → 子区间中点采样定内外。
 * 返回 [tMin,tMax] 内的**被挡**区间（升序、已合并）。
 */
export function occludedSpansOnLine(
  k: Kernel, cam: OrbitCamera, a: Pt3, dir: Pt3, tMin: number, tMax: number,
  skip?: (fid: FaceId) => boolean,
): [number, number][] {
  // 透视下视向沿线变化，区间代数取线段中点的视向作常向量近似（短线段误差可忽略；正交=精确）
  const e = cam.viewDirAt(add3(a, scale3(dir, (tMin + tMax) / 2)));
  const spans: [number, number][] = [];
  for (const f of k.faces()) {
    if (skip?.(f.id)) continue;
    const rec = k.planeOf(f.id);
    const face = k.face(f.id);
    if (!rec || !face) continue;
    const n = rec.plane.n, d = rec.plane.d;
    const den = dot3(n, e);
    if (Math.abs(den) < 1e-9) continue;                 // 膜侧对视线，不遮
    const s0 = (d - dot3(n, a)) / den, s1 = -dot3(n, dir) / den;   // s(t)=s0+s1·t
    const { u, v } = rec.basis;
    const Ax = dot3(a, u) + s0 * dot3(e, u), Bx = dot3(dir, u) + s1 * dot3(e, u);
    const Ay = dot3(a, v) + s0 * dot3(e, v), By = dot3(dir, v) + s1 * dot3(e, v);
    const cuts: number[] = [tMin, tMax];
    if (Math.abs(s1) > 1e-12) cuts.push((1e-4 - s0) / s1);
    for (const ring of [face.outer.pts, ...face.holes.map((h) => h.pts)]) {
      for (let i = 0; i < ring.length; i++) {
        const p1 = ring[i], p2 = ring[(i + 1) % ring.length];
        const ex = p2.x - p1.x, ey = p2.y - p1.y;
        const det = -Bx * ey + By * ex;                 // [Bx −ex; By −ey]
        if (Math.abs(det) < 1e-12) continue;
        const rx = p1.x - Ax, ry = p1.y - Ay;
        const t = (-rx * ey + ry * ex) / det;
        const w = (Bx * ry - By * rx) / det;
        if (w >= -1e-9 && w <= 1 + 1e-9) cuts.push(t);
      }
    }
    const ts = cuts.filter((t) => t >= tMin - 1e-9 && t <= tMax + 1e-9).sort((x, y) => x - y);
    for (let i = 0; i + 1 < ts.length; i++) {
      const lo = ts[i], hi = ts[i + 1];
      if (hi - lo < 1e-9) continue;
      const tm = (lo + hi) / 2;
      if (s0 + s1 * tm <= 1e-4) continue;               // 膜在点前方才算挡
      const q2 = { x: Ax + Bx * tm, y: Ay + By * tm };
      if (!pointInRing(q2, face.outer.pts)) continue;
      if (face.holes.some((h) => pointInRing(q2, h.pts))) continue;
      spans.push([lo, hi]);
    }
  }
  spans.sort((x, y) => x[0] - y[0]);
  const merged: [number, number][] = [];
  for (const sp of spans) {
    const last = merged[merged.length - 1];
    if (last && sp[0] <= last[1] + 1e-9) last[1] = Math.max(last[1], sp[1]);
    else merged.push([sp[0], sp[1]]);
  }
  return merged;
}

/** 情境构建器：把内核现状 + 工具情境枚举成约束集（单一供餐律的物理化）。 */
export function buildConstraints(ctx: SnapContext): Constraint[] {
  const out: Constraint[] = [];
  const { k } = ctx;
  const ex = (vid: VertexId): boolean => ctx.hand?.has(vid) ?? false;
  const skip = handFaceSkip(k, ctx.hand);
  const hidden = (p: Pt3): boolean => (ctx.cam ? occludedBy(k, ctx.cam, p, skip) : false);
  for (const v of k.vertices()) {
    if (ex(v.id)) continue;
    const p = { x: v.x, y: v.y, z: v.z };
    if (hidden(p)) continue;
    out.push({ locus: { dim: 0, p }, rank: RANK.endpoint, eps: EPS.point, tag: { kind: "endpoint" } });
  }
  if (!hidden({ x: 0, y: 0, z: 0 })) {
    out.push({ locus: { dim: 0, p: { x: 0, y: 0, z: 0 } }, rank: RANK.origin, eps: EPS.point, tag: { kind: "origin" } });
  }
  const segs = edgeTargets(k, ex);         // 手中切点两侧共线并链；链端在手里 → 退赛
  for (const { a, b } of segs) {
    const len = dist3(a, b);
    if (len <= 0) continue;
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: (a.z + b.z) / 2 };
    // （旧「两端全被挡整条退赛」粗筛已撤：1-D 遮挡统一走 solve 层可见区间裁剪）
    if (!hidden(mid)) {
      out.push({ locus: { dim: 0, p: mid }, rank: RANK.midpoint, eps: EPS.point, tag: { kind: "midpoint" } });
    }
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
  if (ctx.lines !== false) {
    if (ctx.anchor) addLines(ctx.anchor, "axis");
    addLines({ x: 0, y: 0, z: 0 }, "align");
    for (const src of ctx.alignSources ?? []) addLines(src, "align");
  }
  // 派生 0-D：线×线载线交点（段外延长；段内相交早被 planarize 焊成顶点）。
  // user 2026-09-01：「snap 时生成线和点用户可以描」——虚拟目标，描到才成真几何。
  {
    const es = segs                          // 手中边不产派生目标（帽边载线交点会追 h/离体十万八千里）
      .map(({ a, b }) => {
        const l = dist3(a, b);
        return l > 0 ? { a, dir: scale3(sub3(b, a), 1 / l), ea: a, eb: b } : null;
      }).filter((x) => x !== null);
    for (let i = 0; i < es.length; i++) {
      for (let j = i + 1; j < es.length; j++) {
        const p = carrierIntersect(es[i]!, es[j]!);
        if (!p) continue;
        // 与既有端点重合（含共享顶点）→ 已是 endpoint 目标，跳过
        if ([es[i]!.ea, es[i]!.eb, es[j]!.ea, es[j]!.eb].some((q) => dist3(p, q) <= 1e-6)) continue;
        if (hidden(p)) continue;
        out.push({ locus: { dim: 0, p }, rank: RANK.intersection, eps: EPS.point, tag: { kind: "intersection" } });
      }
    }
  }
  // 派生 1-D：面×面交线（平面∩平面裁到两张膜区域；SU 摆烂处的 snap 升级——可描不改图）
  {
    const faces = k.faces().filter((f) => !faceInHand(k, f, ctx.hand));   // 手中膜不产面交线
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

// ===== Snap3 表现层与平面挑选（2026-09-02 自 pick.ts 并机迁入） =====

export type SnapKind =
  | "endpoint" | "midpoint" | "on-edge" | "origin"
  | "axis-x" | "axis-y" | "axis-z"
  | "align" | "align-combo" | "edge-align"
  | "intersection" | "cross-line"
  | "on-face"   // 裸落在膜内（2-D 目标；仅当平面来自膜且点在环内）
  | "h-stop";   // pp 高度通道咬合（标量吸附，非光标目标）
/** 1-DOF 约束的视觉提示：从源点到吸附点的虚线（SU from-point 同款）。 */
export interface SnapHint { a: Pt3; b: Pt3; axis: "x" | "y" | "z" | "u" | "v" | "i"; }
export interface Snap3 { p: Pt3; kind: SnapKind | null; hints?: SnapHint[]; }


/**
 * 取点吸附（脚手架，spec 级 snap 体系 parked）：
 * 点吸附赢者通吃：endpoint > midpoint > on-edge > 原点；
 * 其下 = **轴对齐 1-DOF 约束层**（2026-09-01 QoL 波，user 拍板设计）：
 *   源点 = anchor + 原点（永久源=坐标轴本体）+ 全部模型顶点（from-point「和点共轴」）；
 *   方向 = 画线平面基 u/v（+过 anchor 的世界 Z——竖直几何入口）；
 *   **正交双约束合成**（画笔手画矩形的闭合角点）> 单约束（屏距最近，anchor 源优先）。
 * 全约束组合（垂线/平行等）仍 parked——这里只开轴对齐子集，不碰通用求解器。
 * exclude：谓词=「这个顶点在手里/是预演新生的动态点」——它与它的边不参与吸附（WYSIWYG：吸静态世界）。
 * edited by Claude Fable 5 2026-09-01
 */
export function snapPoint(
  k: Kernel,
  cam: OrbitCamera,
  vp: Viewport,
  sx: number,
  sy: number,
  tolPx: number,
  q: AlignQuery,
): Snap3 {
  // === 兼容壳（2026-09-01 阶段二求解器手术）：真身 = solver.solvePoint 纯函数 ===
  // ε 分层住 solver.EPS（点10/边7/线5/合成12 @ 基准 tolPx=8）；tolPx 只做等比缩放。
  // 本壳仅做 Constraint→Snap3 的叙事映射；待调用方全部迁到 solver 后删除。
  const scale = tolPx / 8;
  const skip = handFaceSkip(k, q.hand);
  const occHidden = (p: Pt3): boolean => occludedBy(k, cam, p, skip);
  const C = buildConstraints({ k, plane: q.plane.plane, basis: q.plane.basis, anchor: q.anchor,
    alignSources: q.alignSources, cam, lines: q.lines, hand: q.hand });
  if (scale !== 1) for (const c of C) { if (c.eps !== Infinity) c.eps *= scale; }
  const sol = solvePoint({ cam, vp }, { x: sx, y: sy }, C, {
    comboEps: EPS.combo * scale,
    hidden: occHidden,
    spans1D: (a, dirL, tMin, tMax) => occludedSpansOnLine(k, cam, a, dirL, tMin, tMax, skip),
  });
  if (!sol) return { p: q.anchor ?? { x: 0, y: 0, z: 0 }, kind: null };
  const hints: SnapHint[] = [];
  for (const c of sol.used) {
    if (c.locus.dim === 1 && (c.tag.kind === "axis" || c.tag.kind === "align") && c.tag.src && c.tag.axis) {
      hints.push({ a: c.tag.src, b: sol.p, axis: c.tag.axis });
    } else if (c.locus.dim === 1 && c.tag.kind === "cross" && c.locus.len !== undefined) {
      // 交线：整段高亮（可描的虚拟轨迹）
      const L = c.locus;
      hints.push({ a: L.a, b: { x: L.a.x + L.dir.x * L.len!, y: L.a.y + L.dir.y * L.len!, z: L.a.z + L.dir.z * L.len! }, axis: "i" });
    }
  }
  let kind: SnapKind | null;
  if (sol.used.length === 2) {
    kind = sol.used.some((c) => c.tag.kind === "edge") ? "edge-align" : "align-combo";
  } else {
    const t = sol.used[0].tag;
    kind = t.kind === "endpoint" ? "endpoint"
      : t.kind === "origin" ? "origin"
      : t.kind === "midpoint" ? "midpoint"
      : t.kind === "intersection" ? "intersection"
      : t.kind === "cross" ? "cross-line"
      : t.kind === "edge" ? "on-edge"
      : t.kind === "axis" ? ((t.axis === "u" || t.axis === "v") ? "align" : (("axis-" + t.axis) as SnapKind))
      : t.kind === "align" ? "align"
      : (t.kind === "plane" && insideFace(k, q.plane, sol.p)) ? "on-face"
      : null;
  }
  return hints.length ? { p: sol.p, kind, hints } : { p: sol.p, kind };
}

// ===== 平面求解器（2026-09-02 收敛手术：与点求解器同族字典序，一台挑选器吃所有平面决定） =====
// 秩：面锁（裸落膜内，调用方探测）> 含点平面（第二点拉动）> 过锚点轴向平面 > 轴系平面（d=0 兜底）；
// 同秩多候选 = 底面偏置（|fwd.z|≥0.34≈非贴地 20° 时底面优先——SU 手感：45° 仍落底）> 面向度。
// 历史：偏置逻辑曾抄三份，两次翻车（0.5 门槛头发丝、resolveRectPlane 漏偏置）皆同源漂移——此为唯一出处。

const AXIS_NORMALS: readonly Pt3[] = [{ x: 0, y: 0, z: 1 }, { x: 0, y: 1, z: 0 }, { x: 1, y: 0, z: 0 }];

function mkAxisPlane(n: Pt3, through: Pt3): DrawPlane {
  const pl = canonicalPlane(n, dot3(n, through));
  return { plane: pl, basis: planeBasis(pl) };
}
const axisPlanesThrough = (p: Pt3): DrawPlane[] => AXIS_NORMALS.map((n) => mkAxisPlane(n, p));

/** 唯一平面挑选器：底面偏置 > 面向度。 */
function pickByFacing(cam: OrbitCamera, arr: readonly DrawPlane[]): DrawPlane {
  const fwd = cam.forward();
  if (Math.abs(fwd.z) >= 0.34) {
    const ground = arr.find((c) => Math.abs(c.plane.n.z) > 0.999);
    if (ground) return ground;
  }
  return arr.reduce((a, b) => (Math.abs(dot3(b.plane.n, fwd)) > Math.abs(dot3(a.plane.n, fwd)) ? b : a));
}

/** 轴系平面本体（d=0）——自由落点兜底。 */
export function axisPlane(cam: OrbitCamera): DrawPlane {
  return pickByFacing(cam, axisPlanesThrough({ x: 0, y: 0, z: 0 }));
}

/** 过 through 的轴向平面（锚定在几何上的点用）。 */
export function cameraPlane(cam: OrbitCamera, through: Pt3): DrawPlane {
  return pickByFacing(cam, axisPlanesThrough(through));
}

/** 平面来自膜且 p 落在该膜环内（含洞判定）→ 「面上」；平面不带 face 或点在环外 → false。 */
function insideFace(k: Kernel, plane: DrawPlane, p: Pt3): boolean {
  if (plane.face === undefined) return false;
  const f = k.face(plane.face);
  if (!f) return false;
  const q2 = { x: dot3(p, plane.basis.u), y: dot3(p, plane.basis.v) };
  if (!pointInRing(q2, f.outer.pts)) return false;
  return !f.holes.some((h) => pointInRing(q2, h.pts));
}

/** 光标射线命中的第一张膜（最近者）的平面；没命中 → null。零 three、不经 pick.ts（避免环形 import）。 */
export function faceUnderCursor(k: Kernel, cam: OrbitCamera, vp: Viewport, sx: number, sy: number): DrawPlane | null {
  const ray = cam.screenRay(sx, sy, vp);
  let best: { t: number; plane: DrawPlane } | null = null;
  for (const f of k.faces()) {
    const rec = k.planeOf(f.id);
    if (!rec) continue;
    const denom = dot3(rec.plane.n, ray.dir);
    if (Math.abs(denom) < 1e-9) continue;
    const t = (rec.plane.d - dot3(rec.plane.n, ray.origin)) / denom;
    if (t <= 0 || (best && t >= best.t)) continue;
    const q = add3(ray.origin, scale3(ray.dir, t));
    const q2 = { x: dot3(q, rec.basis.u), y: dot3(q, rec.basis.v) };
    if (!pointInRing(q2, f.outer.pts)) continue;
    if (f.holes.some((h) => pointInRing(q2, h.pts))) continue;
    best = { t, plane: { plane: rec.plane, basis: rec.basis, face: f.id } };
  }
  return best?.plane ?? null;
}

/**
 * 平面求解（字典序见文件头）。p1 无 = 首点查询（facePlane=调用方 raycast 的面锁候选）；
 * p1 有 = 第二点查询（含点平面拉动）。fixed=面锁成立（裸落膜内）。
 */
export function resolvePlane(
  k: Kernel,
  cam: OrbitCamera,
  vp: Viewport,
  sx: number,
  sy: number,
  tolPx: number,
  opts: { p1?: Pt3 | null; facePlane?: DrawPlane | null; alignSources?: readonly Pt3[] | null; hand: AlignHand; prev?: DrawPlane | null },
): { plane: DrawPlane; fixed: boolean; snap: Snap3 } {
  const { p1, facePlane, alignSources, hand, prev } = opts;
  if (p1) {
    // 含点（膜）：光标射线命中的膜若也含锚点 → 该膜平面胜出（SU：从共享边拖进哪张面，矩形/线就躺哪张面）。
    // 2026-09-06 修（user：「一个 cube，我从侧面的底边开始往上拖 rect，结果没有吸附在侧面上，反而一直显示边上」）——
    // 此前第二点只在过锚点的三个轴平面里挑且先按俯视偏置取地面，光标穿过侧面落到地面底边附近 → 永远「边上」。
    const under = faceUnderCursor(k, cam, vp, sx, sy);
    if (under && distToPlane(p1, under.plane) <= 1e-3) {
      const snap = snapPoint(k, cam, vp, sx, sy, tolPx, { plane: under, anchor: p1, alignSources, hand });
      return { plane: under, fixed: false, snap };
    }
    // 平面黏性（2026-09-06 侧面拖矩形案）：光标离开膜（滑出底边）时不重挑——上一帧的平面只要含锚点就沿用，
    // 否则按落底偏置挑过锚点轴平面会把矩形翻到水平面、角点飞走。换平面只走「含锚点的膜在光标下」或「解析点落到别的候选面上」。
    const candidates = axisPlanesThrough(p1);
    const sticky = prev && distToPlane(p1, prev.plane) <= 1e-3 ? prev : null;
    const base = sticky ?? pickByFacing(cam, candidates);
    const snap = snapPoint(k, cam, vp, sx, sy, tolPx, { plane: base, anchor: p1, alignSources, hand });
    if (sticky && distToPlane(snap.p, sticky.plane) <= 1e-3) return { plane: sticky, fixed: false, snap };
    const containing = candidates.filter((c) => distToPlane(snap.p, c.plane) <= 1e-3);
    return { plane: containing.length ? pickByFacing(cam, containing) : base, fixed: false, snap };
  }
  const base = facePlane ?? axisPlane(cam);
  const snap = snapPoint(k, cam, vp, sx, sy, tolPx, { plane: base, alignSources, hand });
  if (snap.kind === null || snap.kind === "on-face") return { plane: base, fixed: !!facePlane, snap };   // 裸落（含「面上」）= 面锁成立
  // 首点被低维吸附赢走：面锁作废（延迟承诺），平面挂到解析点上
  return { plane: pickByFacing(cam, axisPlanesThrough(snap.p)), fixed: false, snap };
}

/** 薄壳（历史 API；语义=resolvePlane 第二点查询）。 */
export function resolveRectPlane(
  k: Kernel,
  cam: OrbitCamera,
  vp: Viewport,
  p1: Pt3,
  sx: number,
  sy: number,
  tolPx: number,
  alignSources: readonly Pt3[] | undefined,
  hand: AlignHand,
  prev?: DrawPlane | null,
): { plane: DrawPlane; snap: Snap3 } {
  // hand = 手中集（预演里新生的顶点/工具自报的移动集）：不传 = 矩形/线会吸到自己上一帧的角点（2026-09-06 user「一 snap 一 snap」真凶，
  // lab 时代就有、ε 放大后显形；线第二点当日改走本函数被拖下水）
  // prev = 上一帧的手势平面（黏性；首帧不传）
  const r = resolvePlane(k, cam, vp, sx, sy, tolPx, { p1, alignSources, hand, prev });
  return { plane: r.plane, snap: r.snap };
}
