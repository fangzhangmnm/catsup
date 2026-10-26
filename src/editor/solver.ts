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

import { fmtLen } from "./units.ts";
import type { Edge, EdgeId, Face, FaceId, Pt3, VertexId } from "../kernel/kernel.ts";
import type { GeomView } from "../scene/world-view.ts";
import { ringVidsTolerant } from "../kernel/face-lifecycle.ts";
import type { Ring } from "../kernel/facefind.ts";
import { type Pt, type PlaneParams, COPLANAR_TOL_DEFAULT, add3, canonicalPlane, cross3, dist3, distToPlane, dot3, liftFromPlane, planeBasis, pointInRing, projectToPlane, ptKey3, scale3, sub3 } from "../kernel/geom.ts";
import { closestOnAxis, rayPlane } from "./camera.ts";
import type { EpsSet, PointerFrame, Ray, Viewport } from "./pointer-frame.ts";
import { perf } from "./perf-stats.ts";
import { ScreenIndex } from "./screen-index.ts";
import { INCREMENT_DEG, nearestStep, snapDirectionInPlane } from "./increments.ts";
import { type Frame, WORLD_FRAME } from "../scene/xform.ts";
import { circleCircle, lineCircle, lineSphere, nearestOnCircle, raySphereFront, spherePlane } from "./guide-curves.ts";
import { DisjointSet } from "../kernel/dsu.ts";

/** 绘图平面；face 有值 = 这张平面来自一张膜（首点面锁 / 含点膜），裸落其内报「面上」（SU On Face，2026-09-06 user：「还没有落笔的时候也应该显示面上的吸附」）。 */
export interface DrawPlane { plane: PlaneParams; basis: { u: Pt3; v: Pt3 }; face?: FaceId; }


export interface View { pf: PointerFrame; vp: Viewport; }
export type AxName = "x" | "y" | "z" | "u" | "v";

export interface ConTag {
  kind: "endpoint" | "origin" | "midpoint" | "intersection" | "edge" | "cross" | "axis" | "align" | "plane" | "guide" | "guidePoint" | "grid" | "edgeExt" | "tool" | "center" | "poolOrigin" | "axisCross";
  src?: Pt3;
  axis?: AxName;
  /** 工具目标的人话标签（「正方形」「黄金分割」「半圆」…），直接进光标提示。 */
  label?: string;
}
/**
 * 工具自带的推断目标（B22，user 2026-10-24「rect, 2 point arc 这些是不是正方形，半圆，你忘了做 snap？这些工具提供的 snap 点你想一下怎么设计接口」）：
 * SU 的「正方形 / 黄金分割」= 第二点落在从首点出发的对角线上（1-D），「半圆」= 凸度点落在弦中垂线上离弦 |AB|/2 处（0-D），
 * 「平行 / 垂直于边」= 从首点出发的两条线（1-D）。它们和端点、轴线一样是约束，只是由**工具按当前手势状态造**出来——
 * 一个口：AlignQuery.toolTargets；求解器当普通约束一起字典序裁决（能与轴线合成交点），标签进提示。
 */
export interface ToolTarget { locus: Locus; rank: number; label: string; src?: Pt3; eps?: "point" | "line"; }
export type Locus =
  | { dim: 0; p: Pt3 }
  | { dim: 1; a: Pt3; dir: Pt3; len?: number }   // len 有=线段 [a, a+dir·len]；无=无限直线
  | { dim: 2; plane: PlaneParams };
export interface Constraint { locus: Locus; rank: number; eps: number; tag: ConTag; /** 透视（DT15）：被膜挡住也算（选中的组 / 组件的轴原点埋在几何里也吸得到）。 */ xray?: boolean; /** 层级档（#30）：0 自己 / 1 近亲 / 2 其他；缺省 0。ε 按 TIER_EPS 缩、排序距离按 TIER_DIST 放大 = 近亲优先、远亲照样能吸。 */ tier?: 0 | 1 | 2; }
/** #30 捕获半径按层级加权（user 2026-10-24「4听你的」「同组优先就是捕获半径之类的？」）：不是排除——远亲的圈小一点、排序里远一点。 */
export const TIER_EPS = [1, 0.85, 0.7] as const, TIER_DIST = [1, 1.25, 1.6] as const;

/** 秩（0.11 尺规纪元加参考几何：参考点在端点与中点之间，参考线与边同秩「线上」；线 × 线交点由合成器涌现、0-D 先于 1-D 胜出）。 */
export const RANK = { endpoint: 90, origin: 80, poolOrigin: 80, guidePoint: 75, midpoint: 70, center: 70, intersection: 65, edge: 60, guide: 60, cross: 55, axisLine: 45, grid: 20, plane: 10 } as const;
export const EPS = { point: 10, edge: 7, line: 3.5, combo: 12 } as const;
/** 取点基准容差 / 实体拾取容差（单位同 EPS：fovY 的 1/800；编辑器与 frameEps 共用这一份）。 */
export const SNAP_PX = 8, HIT_PX = 6;
/** 第二点平面「近擦」容差（CSS px @800 高）：光标离含锚点膜的剪影这么近 = 仍算在那张膜上（滑出底边不翻面）。 */
export const PLANE_NEAR_PX = 24;   // line 5→3.5：「点松线紧」试验（user 2026-09-07「可以试试」；B6）
/**
 * ε 语义（user 2026-09-06「吸附的语义还是屏幕大小…height+aspect 这个老 gl convention」）：
 * 所有 ε 常量按 **800 px 高的视口**标定，实际使用按 `vp.h / 800` 等比缩放——等价于「fovY 的角度分数」
 * （透视：ε_px = θ/fovY·vp.h；正交拿 halfH 当"角度"换算，同一个式子）。屏幕越大圈越大，high-DPI 无关，
 * 宽屏/竖屏只看高度（aspect 只管横向裁剪）。测试/探针全用 h=800，数值一字不变。VR 把射线周围的角度空间
 * 当 800 px 高的虚拟屏即可复用。
 */
/** 1-D 轨迹与指针射线近平行（夹角 < 10°）→ 公垂点病态（射线每动 1° 点飞 1/sin ≈ 6×），该轨迹不参赛。
 *  2026-09-08 user「小屋子的侧面上画线的时候 z 轴对齐不见了」：朝北看时 Y 轴线与 Z 轴线在视线里重合、并列取 Y、点飞到 18 m 外。单位：度。 */
export const RAY_PARALLEL_DEG = 10;
const RAY_PARALLEL_COS = Math.cos((RAY_PARALLEL_DEG * Math.PI) / 180);
export const REF_VP_H = 800;
export const epsScale = (vp: Viewport): number => vp.h / REF_VP_H;
/**
 * 本帧的容差集（A17）：帧自带 eps → 用它（VR：度常量，独立）；否则桌面 = EPS × (tolPx/8)，单位 = fovY 的 1/800（tolPx = SNAP·vp.h/800，
 * 即等比 epsScale——数值与旧「scale = tolPx/8」路径逐字相同）。planeNear/hit/tap/drag 同理。
 */
export function frameEps(pf: PointerFrame, vp: Viewport, tolPx: number): EpsSet {
  const own = pf.eps?.(vp);
  if (own) return own;
  const k = tolPx / SNAP_PX;
  return { point: EPS.point * k, edge: EPS.edge * k, line: EPS.line * k, combo: EPS.combo * k, hit: HIT_PX * k, snap: SNAP_PX * k, planeNear: PLANE_NEAR_PX * epsScale(vp), tap: 4, drag: 16 * epsScale(vp) };
}
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
  const { pf, vp } = view;
  const comboEps = opts?.comboEps ?? EPS.combo;
  const ray = pf.ray(s.x, s.y, vp);
  // 度量（A17）：桌面 = px、VR = 度；求解器不再看坐标
  const sd = (p: Pt3): number => pf.distTo(s.x, s.y, p, vp);
  const lineScreenDist = (a: Pt3, dir: Pt3, len?: number): number => {
    const b = len !== undefined ? add3(a, scale3(dir, len)) : add3(a, dir);   // 无限直线：相机那边精确处理（不再截成写死的 100 m；2026-10-26 user「不应该写死特征长度」）
    return pf.distToSeg(s.x, s.y, a, b, vp, len === undefined).d;
  };

  const cands: Solution[] = [];
  const act1: { c: Constraint; l: { a: Pt3; dir: Pt3; len?: number } }[] = [];
  const hid = opts?.hidden;
  for (const c of C) {
    const L = c.locus;
    const tw = TIER_EPS[c.tier ?? 0], td = TIER_DIST[c.tier ?? 0];   // #30：远亲圈小、排序靠后
    if (L.dim === 0) {
      const d = sd(L.p);
      if (d <= c.eps * tw && !(hid && !c.xray && hid(L.p))) cands.push({ p: L.p, dim: 0, rank: c.rank, d: d * td, used: [c] });
    } else if (L.dim === 1) {
      const d = lineScreenDist(L.a, L.dir, L.len);
      if (d > c.eps * tw) continue;
      if (Math.abs(dot3(L.dir, ray.dir)) > RAY_PARALLEL_COS) continue;   // 近平行：解病态，不参赛
      const q = closestOnAxis(L.a, L.dir, ray.origin, ray.dir);
      if (!q) continue;
      let t = dot3(sub3(q, L.a), L.dir);
      if (L.len !== undefined) t = Math.max(0, Math.min(L.len, t));
      let dEff = d;
      if (opts?.spans1D) {
        // 遮挡=裁可见区间：候选 t 落在被挡段 → 钳到最近可见边界（不否决——否决会在剪影边界横跳）
        const lo = L.len !== undefined ? 0 : -Infinity, hi = L.len !== undefined ? L.len : Infinity;   // 无限直线 = 真的无界（以前 t ± 1e5 m）
        const occ = opts.spans1D(L.a, L.dir, lo, hi);
        // 落在被挡段里：段内部，或正好在段的边界上、而那个边界是线段的端点（不是轮廓）。2026-10-26：以前一律严格不等号——
        // 候选先被钳到线段端点、整段都被挡时端点恰在边界上 → 当成可见 → 隔着炮塔吸到后面车身边的一小段（user「面上面拖的时候…有时候突然弹到下面」）
        const E9 = 1e-9;
        let inside: [number, number] | null = null;
        for (const sp of occ) {
          const inLo = t > sp[0] + E9 || (sp[0] <= lo + E9 && t >= sp[0] - E9);
          const inHi = t < sp[1] - E9 || (sp[1] >= hi - E9 && t <= sp[1] + E9);
          if (inLo && inHi) { inside = sp; break; }
        }
        if (inside) {
          const cl = [inside[0], inside[1]].filter((x) => x > lo + 1e-9 && x < hi - 1e-9);
          if (!cl.length) continue;                                   // 整段可达范围全被挡
          t = cl.reduce((b, x) => (Math.abs(x - t) < Math.abs(b - t) ? x : b));
          const pc = { x: L.a.x + L.dir.x * t, y: L.a.y + L.dir.y * t, z: L.a.z + L.dir.z * t };
          dEff = sd(pc);
          if (dEff > c.eps * tw) continue;                            // 边界点已滑出吸附圈=干净掉出
        }
      } else if (hid) {
        const pt0 = { x: L.a.x + L.dir.x * t, y: L.a.y + L.dir.y * t, z: L.a.z + L.dir.z * t };
        if (hid(pt0)) continue;
      }
      const p = { x: L.a.x + L.dir.x * t, y: L.a.y + L.dir.y * t, z: L.a.z + L.dir.z * t };
      cands.push({ p, dim: 1, rank: c.rank, d: dEff * td, used: [c] });
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
      const tj = Math.max(act1[i].c.tier ?? 0, act1[j].c.tier ?? 0) as 0 | 1 | 2;
      if (d > comboEps * TIER_EPS[tj]) continue;
      cands.push({ p: q, dim: 0, rank: Math.max(act1[i].c.rank, act1[j].c.rank), d: d * TIER_DIST[tj], used: [act1[i].c, act1[j].c] });
    }
  }
  perf.last["snap.act1"] = act1.length; perf.last["snap.cands"] = cands.length;
  if (!cands.length) return null;
  // ③ 字典序选择
  // 重叠轨迹稳定裁决（user 2026-09-03：两条一直重叠的轴不许来回翻）：
  // dist 量化 0.5px 桶——同线候选精确同距，浮点噪声不换桶；同桶再按 tag 确定性排序
  const KIND_PRI: Record<string, number> = { endpoint: 0, origin: 0, poolOrigin: 0, midpoint: 0, center: 0, axis: 1, align: 2, "edge-align": 3, edge: 4 };
  const tagKey = (x: Solution): string => {
    const t = x.used[0]?.tag as { kind?: string; axis?: string; src?: Pt3 } | undefined;
    return `${KIND_PRI[t?.kind ?? ""] ?? 9}|${t?.kind ?? ""}|${t?.axis ?? ""}|${t?.src ? ptKey3(t.src) : ""}`;
  };
  // 秩序（D16，2026-10-24）：强 0-D（实几何 / 参考点 / 交点 / 合成交点）> 1-D（边上 / 轴线 / 参考线）> 格点（地板：只在没别的时才赢）> 平面。
  // 之前是纯「维度优先」——网格一开满屏格点（秩 20 的 0-D）压过锚点的轴线，竖直拖屋脊永远落到地面格点（user「开了吸附之后move没法把屋脊抬起来了」）。
  // 显式 > 隐式（user 2026-10-24「正方形的时候格点吸附被覆盖了。我估计背后有系统性问题」）：用户开的网格是显式意图，工具自带的软目标**线**
  // （正方形 / 黄金分割对角线）是隐式提示 → 软目标线排在格点之后；软目标**点**（半圆）与合成交点仍是强 0-D。网格关着时一切照旧。
  const softLine = (x: Solution): boolean => x.dim === 1 && (x.used[0]?.tag as { kind?: string } | undefined)?.kind === "tool";
  const cls = (x: Solution): number => (x.dim === 0 ? (x.rank <= RANK.grid ? 2 : 0) : x.dim === 1 ? (softLine(x) ? 2.5 : 1) : 3);
  cands.sort((a, b) =>
    cls(a) - cls(b) || b.rank - a.rank ||
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
  chargedEdges?: readonly { a: Pt3; b: Pt3 }[] | null;   // 充能边（0.11.6）：出延长线 + 延长线与附近边 / 另一条充能延长线的交点
  toolTargets?: readonly ToolTarget[] | null;             // 工具自带目标（B22）：正方形 / 黄金分割 / 半圆…
  xrayPoints?: readonly Pt3[] | null;                     // 透视点（DT15）：选中的组 / 组件的轴原点——被几何挡住也能吸；调用方负责不给「在手里」的（免得自己吸自己）
  lines?: boolean;                         // false = 不注册轴/共轴 1-D 线（pp：不吸 xyz 轴）
  hand: AlignHand;                         // 手中集，**必填**（表态制：空手写 NO_HAND）——对齐引擎永远不吸手里的东西
}
export interface SnapContext {
  k: GeomView;
  plane: PlaneParams;
  basis?: { u: Pt3; v: Pt3 } | null;
  pf?: PointerFrame | null;               // 提供则启用膜遮挡过滤
  anchor?: Pt3 | null;
  alignSources?: readonly Pt3[] | null;
  chargedEdges?: readonly { a: Pt3; b: Pt3 }[] | null;
  toolTargets?: readonly ToolTarget[] | null;
  xrayPoints?: readonly Pt3[] | null;
  lines?: boolean;
  hand?: AlignHand | null;
  /** 候选 ε（本帧量纲）；缺省 = solver.EPS（桌面 px @800）。 */
  eps?: { point: number; edge: number; line: number } | null;
  /**
   * 局部性（2026-10-21 #14）：给了指针位置，候选只从指针 radiusPx 以内长出来——点 / 中点 / 边 / 载线交点 / 面交线都按屏距筛，
   * 远处的根本进不了约束集（它们本来也赢不了：求解按屏距 ≤ ε 取，radius ≥ 最大 ε 就是无损的）。
   * 不给 = 全场景（旧行为，测试 / 离线用）。轴线 / 对齐线（无限长）不筛。
   */
  cursor?: { x: number; y: number; vp: Viewport; radiusPx: number } | null;
}

/** 膜环是否触手（任一环顶点 ∈ hand）。 */
function faceTouchesHand(k: GeomView, f: { outer: Ring; holes: Ring[]; id: FaceId }, hand?: AlignHand | null): boolean {
  if (!hand) return false;
  return [...ringVidsTolerant(k.graph, f.outer), ...f.holes.flatMap((h) => ringVidsTolerant(k.graph, h))]
    .some((v) => hand.has(v));
}
/** 膜在手里：hand.faces 表态优先；否则由顶点推（触手膜）。 */
function faceInHand(k: GeomView, f: { outer: Ring; holes: Ring[]; id: FaceId }, hand?: AlignHand | null): boolean {
  if (!hand) return false;
  if (hand.faces) return hand.faces(f.id);
  return faceTouchesHand(k, f, hand);
}
/** 遮挡豁免集：hand 透明时=手中膜；opaque 或无 hand 时=无豁免。 */
function handFaceSkip(k: GeomView, hand?: AlignHand | null): ((fid: FaceId) => boolean) | undefined {
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
function edgeTargets(k: GeomView, ex: (vid: VertexId) => boolean, edgesIn?: readonly Edge[]): { a: Pt3; b: Pt3; id: EdgeId }[] {
  const edges = (edgesIn ?? k.edges()).filter((e) => !k.isFold(e.id));   // 折线（DT87）不是边：不当吸附目标（它的端点照样是顶点目标）
  const dsu = new DisjointSet<EdgeId>();   // kernel/dsu.ts（路径压缩）
  const find = (e: EdgeId): EdgeId => dsu.find(e);
  const union = (x: EdgeId, y: EdgeId): void => dsu.union(x, y);
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
  const out: { a: Pt3; b: Pt3; id: EdgeId }[] = [];
  for (const es of comp.values()) {
    const cnt = new Map<VertexId, number>();
    for (const e of es) for (const v of [e.a, e.b]) cnt.set(v, (cnt.get(v) ?? 0) + 1);
    const ends = [...cnt].filter(([, c]) => c === 1).map(([v]) => v);
    if (ends.length !== 2) continue;                 // 退化（不应发生）
    if (ex(ends[0]) || ex(ends[1])) continue;        // 手势边：整链退赛
    out.push({ a: k.graph.pt(ends[0]), b: k.graph.pt(ends[1]), id: es[0].id });   // id 给层级档用（同链一池）
  }
  return out;
}

/** 膜遮挡：p 与眼睛之间隔着某膜（射线命中膜区域内部、t>ε）→ 被挡。贴在膜面上的点不算。（拾取 pick.ts 同用） */
export function occludedBy(k: GeomView, pf: PointerFrame, p: Pt3, skip?: (fid: FaceId) => boolean, faces?: readonly Face[]): boolean {
  const dir = pf.viewDir(p);   // 透视=p→眼；正交=常向量（2026-09-06 透视化，edited by Claude Fable 5.1）
  for (const f of faces ?? k.faces()) {
    if (skip?.(f.id)) continue;   // 手中膜不遮挡（2026-09-03：追光标的膜反复遮住目标=振荡假吸）
    const rec = k.planeOf(f.id);
    const face = k.face(f.id);
    if (!rec || !face) continue;
    const denom = dot3(rec.plane.n, dir);
    if (Math.abs(denom) < 1e-9) continue;
    const t = (rec.plane.d - dot3(rec.plane.n, p)) / denom;
    if (t <= COPLANAR_TOL_DEFAULT) continue;   // 贴在膜上（同一平面容差内）不算被它挡——以前写死 0.1 mm，对毫米级小零件不准（2026-10-26）
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
 * **精确分割（2026-10-26 重写，user「面上面拖的时候为什么会有时候突然弹到下面…在炮塔顶面上随便拖一下，有时候会抖动」）**：
 * 点被一张多边形膜挡住 ⇔ 它在「眼睛 → 多边形」的棱锥里、且在膜平面的另一侧。棱锥侧面 = 过多边形一条边、含该处视线方向的平面
 * （透视 = 过眼睛；正交 = 平行视向），膜本身也是平面——直线和每个平面只交一次，分割点全是一次方程的精确根；
 * 每段取中点按**该点自己的视线**判内外（= occludedBy 的单膜判定）。以前整条线段只用中点那一处的视向当常量：透视下长边（车身边几米长）
 * 误差大，光标附近那截被挡的线被判成可见 → 隔着炮塔吸到后面低半米的车身边。
 * 返回 [tMin,tMax] 内的**被挡**区间（升序、已合并）。
 */
export function occludedSpansOnLine(
  k: GeomView, pf: PointerFrame, a: Pt3, dir: Pt3, tMin: number, tMax: number,
  skip?: (fid: FaceId) => boolean, faces?: readonly Face[],
): [number, number][] {
  const spans: [number, number][] = [];
  const at = (t: number): Pt3 => add3(a, scale3(dir, t));
  for (const f of faces ?? k.faces()) {
    if (skip?.(f.id)) continue;
    const rec = k.planeOf(f.id);
    const face = k.face(f.id);
    if (!rec || !face) continue;
    const { n, d } = rec.plane, { u, v } = rec.basis;
    const to3 = (q: Pt): Pt3 => liftFromPlane(q, rec.plane, rec.basis);
    const cuts: number[] = [];
    const cutPlane = (m: Pt3, p0: Pt3): void => { const den = dot3(m, dir); if (Math.abs(den) > 1e-12) cuts.push(dot3(m, sub3(p0, a)) / den); };
    cutPlane(n, scale3(n, d));                                           // 穿过膜平面（点到了膜前 / 膜后）
    for (const ring of [face.outer.pts, ...face.holes.map((h) => h.pts)]) {
      for (let i = 0; i < ring.length; i++) {
        const p1 = to3(ring[i]), p2 = to3(ring[(i + 1) % ring.length]);
        cutPlane(cross3(sub3(p2, p1), pf.viewDir(p1)), p1);             // 棱锥侧面：过这条边、含这里的视线
      }
    }
    // 区间端点：有限的 tMin / tMax + 落在范围里的分割点；两头无界（无限直线）也行——每段里「挡不挡」不变，段里任取一点判就精确
    const ts = [...new Set(cuts.filter((t) => Number.isFinite(t) && t > tMin + 1e-9 && t < tMax - 1e-9))].sort((x, y) => x - y);
    const ends = [tMin, ...ts, tMax];
    for (let i = 0; i + 1 < ends.length; i++) {
      const lo = ends[i], hi = ends[i + 1];
      if (hi - lo < 1e-9) continue;
      const tm = Number.isFinite(lo) && Number.isFinite(hi) ? (lo + hi) / 2 : Number.isFinite(lo) ? lo + Math.max(1, Math.abs(lo)) : Number.isFinite(hi) ? hi - Math.max(1, Math.abs(hi)) : 0;
      const p = at(tm), e = pf.viewDir(p);                               // 段里那一点按它自己的视线判（透视下视向随点变）
      const den = dot3(n, e);
      if (Math.abs(den) < 1e-9) continue;                               // 膜侧对视线，不遮
      const s = (d - dot3(n, p)) / den;
      if (s <= COPLANAR_TOL_DEFAULT) continue;                          // 膜在点前方才算挡（同 occludedBy：同一平面容差，不写死 0.1 mm）
      const q = add3(p, scale3(e, s)), q2 = { x: dot3(q, u), y: dot3(q, v) };
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
  const E = ctx.eps ?? EPS;
  // 上下文的帧（0.11 尺规纪元 ①）：原点与三轴来自世界视图（根 = 绘图轴；进组 = 组的轴），裸 Kernel 当世界 = 世界帧
  const F: Frame = ctx.k.frame?.() ?? WORLD_FRAME;
  const O = F.origin;
  const ex = (vid: VertexId): boolean => ctx.hand?.has(vid) ?? false;
  const skip = handFaceSkip(k, ctx.hand);
  // 局部性筛（ctx.cursor）：屏距超过 radius 的候选不进集（遮挡测试是 O(膜数)，只给近处候选做）
  const cur = ctx.cursor && ctx.pf ? { pf: ctx.pf, ...ctx.cursor } : null;
  // 屏幕索引（screen-index.ts）：相机不动就复用；只拿指针附近的格（超集，精确判定照旧）。
  // 遮挡不在这里做：solvePoint 只对 ε 内的 0-D 候选调 hidden（懒而不漏）；这里先前对每个近候选都做一遍 O(膜) 遮挡是重复的（#14 第二轮）。
  const idx = cur ? ScreenIndex.for(k, cur.pf, cur.vp) : null;
  const hidden = (p: Pt3): boolean => (cur ? false : (ctx.pf ? occludedBy(k, ctx.pf, p, skip) : false));   // 无指针（离线 / 测试）保留旧的即时遮挡
  const nearPt = (p: Pt3): boolean => !cur || cur.pf.distTo(cur.x, cur.y, p, cur.vp) <= cur.radiusPx;
  const nearSeg = (a: Pt3, b: Pt3, infinite = false): boolean => !cur || cur.pf.distToSeg(cur.x, cur.y, a, b, cur.vp, infinite).d <= cur.radiusPx;
  const nearFace = (fid: FaceId): boolean => {
    if (!cur) return true;
    const rings = k.faceRings3(fid), rec = k.planeOf(fid), face = k.face(fid);
    if (!rings || !rec || !face) return false;
    if (cur.pf.distToRing(cur.x, cur.y, rings.outer, cur.vp) <= cur.radiusPx) return true;
    const ray = cur.pf.ray(cur.x, cur.y, cur.vp);
    const hit = rayPlane(ray.origin, ray.dir, rec.plane.n, rec.plane.d);
    if (!hit) return false;
    const p2 = projectToPlane(hit, rec.basis);
    return pointInRing(p2, face.outer.pts) && !face.holes.some((h) => pointInRing(p2, h.pts));
  };
  let tq = performance.now();
  const lap = (name: string): void => { const t = performance.now(); perf.last[`snap.${name}`] = t - tq; tq = t; };
  const tierOf = (id: number): 0 | 1 | 2 => k.tierOf?.(id) ?? 0;
  for (const v of idx && cur ? idx.verticesNear(cur.x, cur.y, cur.radiusPx + 1) : k.vertices()) {
    if (ex(v.id)) continue;
    const p = { x: v.x, y: v.y, z: v.z };
    if (!nearPt(p) || hidden(p)) continue;
    out.push({ locus: { dim: 0, p }, rank: RANK.endpoint, eps: E.point, tag: { kind: "endpoint" }, tier: tierOf(v.id) });
  }
  lap("vertices");
  if (nearPt(O) && !hidden(O)) {
    out.push({ locus: { dim: 0, p: O }, rank: RANK.origin, eps: E.point, tag: { kind: "origin" } });
  }
  const segsAll = edgeTargets(k, ex, idx && cur ? idx.edgesNear(cur.x, cur.y, cur.radiusPx * 2 + 8) : undefined);
  lap("edgeTargets");
  const segs = segsAll.filter(({ a, b }) => nearSeg(a, b));   // 手中切点两侧共线并链；链端在手里 → 退赛；远离指针的不进集
  lap("nearSeg");
  for (const { a, b, id } of segs) {
    const len = dist3(a, b);
    if (len <= 0) continue;
    const tier = tierOf(id);
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: (a.z + b.z) / 2 };
    // （旧「两端全被挡整条退赛」粗筛已撤：1-D 遮挡统一走 solve 层可见区间裁剪）
    if (!hidden(mid)) {
      out.push({ locus: { dim: 0, p: mid }, rank: RANK.midpoint, eps: E.point, tag: { kind: "midpoint" }, tier });
    }
    out.push({ locus: { dim: 1, a, dir: scale3(sub3(b, a), 1 / len), len }, rank: RANK.edge, eps: E.edge, tag: { kind: "edge" }, tier });
  }
  // 轴对齐 1-D：源 = anchor（axis 标签）+ 原点（永久）+ 充能点（align 标签）；充能制=幽灵 align 定理的前置条件
  // 方向集 = 世界三轴 ∪ 非轴对齐画面的面内基（倾斜平面共轴——方向集显式化后的一行注册）
  const dirs: { axis: AxName; dir: Pt3 }[] = [{ axis: "x", dir: F.x }, { axis: "y", dir: F.y }, { axis: "z", dir: F.z }];
  if (ctx.basis) {
    const axisAligned = (d: Pt3): boolean =>
      Math.abs(dot3(d, F.x)) > 0.999 || Math.abs(dot3(d, F.y)) > 0.999 || Math.abs(dot3(d, F.z)) > 0.999;
    if (!axisAligned(ctx.basis.u)) dirs.push({ axis: "u", dir: ctx.basis.u });
    if (!axisAligned(ctx.basis.v)) dirs.push({ axis: "v", dir: ctx.basis.v });
  }
  const seen = new Set<string>();
  const addLines = (src: Pt3, kind: "axis" | "align"): void => {
    const key = ptKey3(src);
    if (seen.has(key)) return;
    seen.add(key);
    for (const { axis, dir } of dirs) {
      out.push({ locus: { dim: 1, a: src, dir }, rank: RANK.axisLine, eps: E.line, tag: { kind, src, axis } });
    }
  };
  if (ctx.lines !== false) {
    if (ctx.anchor) addLines(ctx.anchor, "axis");
    addLines(O, "align");
    for (const src of ctx.alignSources ?? []) addLines(src, "align");
    // 坐标轴穿过面 / 和边相交的点（2026-10-26，user「轴和面的交点能加入吸附判定吗」「轴和线也一样」）：显式 0-D、交点同秩。
    // 以前只有「轴线 × 边」靠 1-D×1-D 合成器涌现——光标得同时落进两条线各自的窄圈（轴 5 px、边 7 px）才有，几乎吸不到；轴 × 面则根本没有。
    const AX: { axis: "x" | "y" | "z"; dir: Pt3 }[] = [{ axis: "x", dir: F.x }, { axis: "y", dir: F.y }, { axis: "z", dir: F.z }];
    for (const f of idx && cur ? idx.facesNear(cur.x, cur.y, cur.radiusPx) : k.faces()) {
      if (skip?.(f.id)) continue;
      const rec = k.planeOf(f.id), face = k.face(f.id);
      if (!rec || !face) continue;
      for (const { axis, dir } of AX) {
        const den = dot3(rec.plane.n, dir);
        if (Math.abs(den) < 1e-9) continue;   // 轴躺在面里 / 平行：没有穿透点
        const q = add3(O, scale3(dir, (rec.plane.d - dot3(rec.plane.n, O)) / den));
        if (!nearPt(q)) continue;
        const q2 = projectToPlane(q, rec.basis);
        if (!pointInRing(q2, face.outer.pts) || face.holes.some((h) => pointInRing(q2, h.pts))) continue;
        out.push({ locus: { dim: 0, p: q }, rank: RANK.intersection, eps: E.point, tag: { kind: "axisCross", axis, label: `${axis.toUpperCase()} 轴 × 面` }, tier: tierOf(f.id) });
      }
    }
    for (const { a, b, id } of segs) {
      const len = dist3(a, b);
      if (len <= 0) continue;
      for (const { axis, dir } of AX) {
        const q = intersect1D({ a: O, dir }, { a, dir: scale3(sub3(b, a), 1 / len), len });
        if (!q || !nearPt(q)) continue;
        out.push({ locus: { dim: 0, p: q }, rank: RANK.intersection, eps: E.point, tag: { kind: "axisCross", axis, label: `${axis.toUpperCase()} 轴 × 边` }, tier: tierOf(id) });
      }
    }
  }
  lap("edges");
  // 参考几何（0.11 尺规纪元 ②）：参考点 = 0-D；参考线 = 无限 1-D（屏距局部性同边）。线 × 线 / 线 × 边 / 线 × 轴的交点由 1-D×1-D 合成器涌现。
  const G = ctx.k.guides?.();
  if (G) {
    for (const q of G.points) { if (!nearPt(q.p) || hidden(q.p)) continue; out.push({ locus: { dim: 0, p: q.p }, rank: RANK.guidePoint, eps: E.point, tag: { kind: "guidePoint" } }); }
    for (const l of G.lines) { if (!nearSeg(l.p, add3(l.p, l.dir), true)) continue; out.push({ locus: { dim: 1, a: l.p, dir: l.dir }, rank: RANK.guide, eps: E.line, tag: { kind: "guide" } }); }
  }
  lap("guides");
  // 圆心（DT15，user 2026-10-25「选不到轮子的圆心。这个最要命」）：圆 / 弧曲线实体记着的圆心 = 0-D 目标（SU Center），秩同中点；被挡照常判遮挡。
  for (const p of ctx.k.centers?.() ?? []) { if (!nearPt(p) || hidden(p)) continue; out.push({ locus: { dim: 0, p }, rank: RANK.center, eps: E.point, tag: { kind: "center" } }); }
  // 透视点（DT15）：选中的组 / 组件的轴原点——轴埋在几何里也要装得上（「装配炮塔的时候即使轴都打好了，还是装不进去」），所以不判遮挡。
  for (const p of ctx.xrayPoints ?? []) { if (!nearPt(p)) continue; out.push({ locus: { dim: 0, p }, rank: RANK.poolOrigin, eps: E.point, tag: { kind: "poolOrigin" }, xray: true }); }
  // 工具自带目标（B22）：按工具给的秩 / 轨迹原样登记；0-D 用点 ε，1-D 用线 ε
  for (const t of ctx.toolTargets ?? []) {
    if (t.locus.dim === 0 && (!nearPt(t.locus.p) || hidden(t.locus.p))) continue;
    out.push({ locus: t.locus, rank: t.rank, eps: t.eps === "point" || t.locus.dim === 0 ? E.point : E.line, tag: { kind: "tool", label: t.label, ...(t.src ? { src: t.src } : {}) } });
  }
  // 绝对网格（0.11 ⑤；A10「几何推断优先于网格」= 最低秩 0-D）：格点是帧坐标下 step/sub 的格子点，只取离光标自由点（射线 ∩ 画面）最近的那一个，
  // 且它得真落在画面平面上（轴对齐的墙 / 地面才有；斜面没有格点）。O(1)，不枚举。
  const GR = ctx.k.grid?.();
  if (GR && cur) {
    const ray = cur.pf.ray(cur.x, cur.y, cur.vp);
    const free = rayPlane(ray.origin, ray.dir, ctx.plane.n, ctx.plane.d);
    if (free) {
      const s = GR.step / GR.sub, F0 = GR.frame, d = sub3(free, F0.origin);
      const u = Math.round(dot3(d, F0.x) / s) * s, v = Math.round(dot3(d, F0.y) / s) * s, w = Math.round(dot3(d, F0.z) / s) * s;
      const q = add3(F0.origin, add3(add3(scale3(F0.x, u), scale3(F0.y, v)), scale3(F0.z, w)));
      if (distToPlane(q, ctx.plane) <= 1e-6 && nearPt(q) && !hidden(q)) out.push({ locus: { dim: 0, p: q }, rank: RANK.grid, eps: E.point, tag: { kind: "grid" } });
    }
  }
  // 延长线（0.11.6；user 2026-10-24 退役清单「载线交点 充能」）：只有**充能过的边**（悬停 ≥ 300 ms）才出延长线——
  // 它的无限载线 = 1-D 目标（SU「On Line」），它与附近真实边段的交点 / 两条充能载线的交点 = 0-D 目标（SU「Intersection」）。
  // 之前「附近任意两条边两两延长求交」= 满屏幽灵点且秩高，退役。user 2026-09-01「snap 时生成线和点用户可以描」仍成立：描到才成真几何。
  {
    const CE = (ctx.chargedEdges ?? []).map(({ a, b }) => { const l = dist3(a, b); return l > 0 ? { a, b, dir: scale3(sub3(b, a), 1 / l) } : null; }).filter((x) => x !== null);
    for (const ce of CE) {
      if (nearSeg(ce.a, ce.b, true)) out.push({ locus: { dim: 1, a: ce.a, dir: ce.dir }, rank: RANK.axisLine, eps: E.line, tag: { kind: "edgeExt", src: ce.a } });
      for (const { a, b, id } of segs) {
        const l = dist3(a, b);
        if (l <= 0) continue;
        const p = intersect1D({ a: ce.a, dir: ce.dir }, { a, dir: scale3(sub3(b, a), 1 / l), len: l });
        if (!p || !nearPt(p) || hidden(p)) continue;
        if ([ce.a, ce.b, a, b].some((q) => dist3(p, q) <= 1e-6)) continue;   // 落在端点上 = 已是端点目标
        out.push({ locus: { dim: 0, p }, rank: RANK.intersection, eps: E.point, tag: { kind: "intersection" }, tier: tierOf(id) });
      }
    }
    for (let i = 0; i < CE.length; i++) for (let j = i + 1; j < CE.length; j++) {
      const p = carrierIntersect(CE[i]!, CE[j]!);
      if (!p || !nearPt(p) || hidden(p)) continue;
      if ([CE[i]!.a, CE[i]!.b, CE[j]!.a, CE[j]!.b].some((q) => dist3(p, q) <= 1e-6)) continue;
      out.push({ locus: { dim: 0, p }, rank: RANK.intersection, eps: E.point, tag: { kind: "intersection" } });
    }
  }
  lap("carriers");
  // 参考圆 / 参考球（圆规 / 球规，DT50，2026-10-26 Claude Opus 5.5）：弯的轨迹不进 1-D 合成器，每帧只在光标附近产 0-D 目标（guide-curves.ts）——
  //   圆：圆上离光标最近的点（秩 = 参考线「线上」）；圆 × 参考线 / 附近的边 / 别的共面圆（秩 = 交点）。
  //   球：球 ∩ 画图平面那一圈上离光标最近的点（秩 = 参考线；= 地上「绳子够得到的那一圈」）；球 × 参考线 / 附近的边（秩 = 交点）；
  //       光标在球的轮廓里、且球面在画图平面前面时，射线先碰到的球面点（秩只比画图平面高一点，不老把人拽到球上）。
  const GC = G?.circles ?? [], GS = G?.spheres ?? [];
  if (cur && (GC.length || GS.length)) {
    const ray = cur.pf.ray(cur.x, cur.y, cur.vp);
    const pt0 = (p: Pt3, rank: number, eps: number, kind: "guide" | "intersection", label: string): void => { if (!nearPt(p) || hidden(p)) return; out.push({ locus: { dim: 0, p }, rank, eps, tag: { kind, label } }); };
    const lines = (G?.lines ?? []).filter((l) => nearSeg(l.p, add3(l.p, l.dir), true));
    for (const c of GC) {
      const q = nearestOnCircle(c.c, c.n, c.r, ray.origin, ray.dir);
      if (q) pt0(q, RANK.guide, E.line, "guide", "参考圆上");
      for (const l of lines) for (const x of lineCircle(l.p, l.dir, c.c, c.n, c.r)) pt0(x, RANK.intersection, E.point, "intersection", "参考圆 × 参考线");
      for (const { a, b } of segs) { const L = dist3(a, b); if (L > 0) for (const x of lineCircle(a, scale3(sub3(b, a), 1 / L), c.c, c.n, c.r, L)) pt0(x, RANK.intersection, E.point, "intersection", "参考圆 × 边"); }
      for (const c2 of GC) if (c2.id > c.id) for (const x of circleCircle(c.c, c.n, c.r, c2.c, c2.n, c2.r)) pt0(x, RANK.intersection, E.point, "intersection", "参考圆 × 参考圆");
    }
    const planeHit = rayPlane(ray.origin, ray.dir, ctx.plane.n, ctx.plane.d);
    for (const sp of GS) {
      const ring = spherePlane(sp.c, sp.r, ctx.plane.n, ctx.plane.d);
      if (ring) { const q = nearestOnCircle(ring.c, ctx.plane.n, ring.r, ray.origin, ray.dir); if (q) pt0(q, RANK.guide, E.line, "guide", "参考球 × 画面"); }
      for (const l of lines) for (const x of lineSphere(l.p, l.dir, sp.c, sp.r)) pt0(x, RANK.intersection, E.point, "intersection", "参考球 × 参考线");
      for (const { a, b } of segs) { const L = dist3(a, b); if (L > 0) for (const x of lineSphere(a, scale3(sub3(b, a), 1 / L), sp.c, sp.r, L)) pt0(x, RANK.intersection, E.point, "intersection", "参考球 × 边"); }
      const front = raySphereFront(sp.c, sp.r, ray.origin, ray.dir);
      if (front && (!planeHit || front.t < dot3(sub3(planeHit, ray.origin), ray.dir))) pt0(front.p, RANK.plane + 2, E.point, "guide", "参考球上");
    }
  }
  lap("guideCurves");
  // 派生 1-D：面×面交线（平面∩平面裁到两张膜区域；SU 摆烂处的 snap 升级——可描不改图）
  {
    const faces = (idx && cur ? idx.facesNear(cur.x, cur.y, cur.radiusPx + 1) : k.faces()).filter((f) => !faceInHand(k, f, ctx.hand) && nearFace(f.id));   // 手中膜不产面交线；交线裁在两膜区域里，所以两膜都得在指针附近
    lap("nearFace");
    for (let i = 0; i < faces.length; i++) {
      for (let j = i + 1; j < faces.length; j++) {
        for (const seg of faceCrossSegments(k, faces[i].id, faces[j].id)) {
          out.push({ locus: { dim: 1, a: seg.a, dir: seg.dir, len: seg.len }, rank: RANK.cross, eps: E.line, tag: { kind: "cross" } });
        }
      }
    }
  }
  lap("cross");
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
export function faceCrossSegments(k: GeomView, f1: import("../kernel/kernel.ts").FaceId, f2: import("../kernel/kernel.ts").FaceId): { a: Pt3; dir: Pt3; len: number }[] {
  const r1 = k.planeOf(f1), r2 = k.planeOf(f2);
  const F1 = k.face(f1), F2 = k.face(f2);
  if (!r1 || !r2 || !F1 || !F2) return [];
  const n3 = cross3(r1.plane.n, r2.plane.n);
  const nn = dot3(n3, n3);
  if (nn < 1e-12) return []; // 平行/共面（共面由 sticky 世界处理）
  // p0 = (d1·(n2×n3) + d2·(n3×n1)) / |n3|²（三平面求交，第三面取 n3·p=0）
  const p0 = scale3(add3(scale3(cross3(r2.plane.n, n3), r1.plane.d), scale3(cross3(n3, r1.plane.n), r2.plane.d)), 1 / nn);
  const dir = scale3(n3, 1 / Math.sqrt(nn));
  const proj = (rec: NonNullable<ReturnType<GeomView["planeOf"]>>): { p2: Pt; d2: Pt } => ({
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
  | "center" | "pool-origin"   // 圆心 / 选中的组·组件的轴原点（DT15）
  | "axis-x" | "axis-y" | "axis-z"
  | "align" | "align-combo" | "edge-align"
  | "on-extension"   // 充能边的延长线上（0.11.6）
  | "intersection" | "cross-line"
  | "on-guide" | "guide-point" | "guide-cross"   // 参考线上 / 参考点 / 参考线交点（0.11 尺规纪元）
  | "grid-point" | "increment"                    // 格点 / 整数长度（0.11 ⑤ 绝对网格）
  | "tool"                                        // 工具自带目标（B22）：标签在 Snap3.label
  | "on-face"   // 裸落在膜内（2-D 目标；仅当平面来自膜且点在环内）
  | "h-stop";   // pp 高度通道咬合（标量吸附，非光标目标）
/** 1-DOF 约束的视觉提示：从源点到吸附点的虚线（SU from-point 同款）。 */
export interface SnapHint { a: Pt3; b: Pt3; axis: "x" | "y" | "z" | "u" | "v" | "i"; }
export interface Snap3 { p: Pt3; kind: SnapKind | null; hints?: SnapHint[]; /** 工具目标的人话标签（kind = "tool" 时）。 */ label?: string; }


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
  k: GeomView,
  pf: PointerFrame,
  vp: Viewport,
  sx: number,
  sy: number,
  tolPx: number,
  q: AlignQuery,
): Snap3 {
  // === 兼容壳（2026-09-01 阶段二求解器手术）：真身 = solver.solvePoint 纯函数 ===
  // ε 分层住 solver.EPS（点10/边7/线5/合成12 @ 基准 tolPx=8）；tolPx 只做等比缩放。
  // 本壳仅做 Constraint→Snap3 的叙事映射；待调用方全部迁到 solver 后删除。
  const E = frameEps(pf, vp, tolPx);
  const skip = handFaceSkip(k, q.hand);
  const radiusPx = E.combo * 2;   // 局部性：候选只从指针 2·ε_combo 以内长出来（≥ 最大 ε，无损）
  // 遮挡只对指针附近的膜做（挡得住附近候选的膜，自己也在指针附近；屏幕索引给超集）
  const idx = ScreenIndex.for(k, pf, vp);
  // 0-D 候选：只对「屏上盖住候选点的那一格」里的膜做遮挡（缩远时指针周围 32 px 内有几百张膜，逐候选只看它自己那格 ≈ 1/10）；
  // 1-D 可见区间：只需要候选 t 附近（ε 内）的遮挡，取指针 ε_combo 内的膜
  const occluders = idx ? idx.facesNear(sx, sy, E.combo + 8) : undefined;
  perf.last["snap.occluders"] = occluders?.length ?? -1;
  perf.last["snap.hidCalls"] = 0; perf.last["snap.spanCalls"] = 0;
  const occHidden = (p: Pt3): boolean => {
    perf.last["snap.hidCalls"]++;
    if (idx && pf.project) { const q = pf.project(p, vp); if (q) return occludedBy(k, pf, p, skip, idx.facesNear(q.x, q.y, 0)); }
    return occludedBy(k, pf, p, skip, occluders);
  };
  const C = buildConstraints({ k, plane: q.plane.plane, basis: q.plane.basis, anchor: q.anchor,
    alignSources: q.alignSources, chargedEdges: q.chargedEdges, toolTargets: q.toolTargets, xrayPoints: q.xrayPoints, pf, lines: q.lines, hand: q.hand, eps: E,
    cursor: { x: sx, y: sy, vp, radiusPx } });
  const sol = perf.time("snap.solve", () => solvePoint({ pf, vp }, { x: sx, y: sy }, C, {
    comboEps: E.combo,
    hidden: occHidden,
    spans1D: (a, dirL, tMin, tMax) => { perf.last["snap.spanCalls"]++; return occludedSpansOnLine(k, pf, a, dirL, tMin, tMax, skip, occluders); },
  }));
  perf.last["snap.constraints"] = C.length;
  if (!sol) return { p: q.anchor ?? { x: 0, y: 0, z: 0 }, kind: null };
  const GR = k.grid?.();
  // 网格开着 = 世界是格子（user 2026-10-24「当我想在边上找点的时候，grid snap也没了」「你想想游戏里面我们需要画格子，比如dnd那种格子地图」）：
  // 几何推断管方向（赢的 1-D 轨迹：边上 / 轴线 / 参考线 / 延长线 / 工具线），格子管落在哪。GR 是**有效**开关（右上锁钮；按住 Shift 反过来——编辑器递进来时已算好）。
  // 2026-10-25（user「同时snap absolute和incremental没关系吧」「以及沿着一根线走一个grid，这个怎么得到？」「snap to incremental应该还要有一个捕捉阈」）：
  //   沿线的候选 = ① 绝对格点（线 ∩ 帧的 x / y / z = m·s）+ ② 整格增量（从线上的起点量 k·s：锚点在这条线上 = 从锚点量；线是一条边 = 从两头量）；
  //   屏距最近的那个、在吸附圈内才咬（不是硬取整）；强 0-D（端点 / 中点 / 交点）照旧赢。
  if (GR && sol.dim === 1 && sol.used.length === 1 && sol.used[0].locus.dim === 1) {
    const L = sol.used[0].locus, s0 = GR.step / GR.sub, F = GR.frame;
    const tk = sol.used[0].tag as { kind: string; src?: Pt3; axis?: string; label?: string };
    const dl = Math.hypot(L.dir.x, L.dir.y, L.dir.z) || 1, dir = scale3(L.dir, 1 / dl);
    const t0 = dot3(sub3(sol.p, L.a), dir), lenW = L.len !== undefined ? L.len * dl : undefined;
    const onLine = (t: number): boolean => lenW === undefined || (t >= -1e-9 && t <= lenW + 1e-9);
    const cands: { t: number; step?: number }[] = [];
    for (const ax of [F.x, F.y, F.z]) {
      const dd = dot3(dir, ax);
      if (Math.abs(dd) < 1e-6) continue;
      const c0 = dot3(sub3(L.a, F.origin), ax);
      const t = (nearestStep(c0 + t0 * dd, s0) - c0) / dd;
      if (onLine(t)) cands.push({ t });
    }
    const origins: number[] = [];
    if (q.anchor) { const w = sub3(q.anchor, L.a), ta = dot3(w, dir); if (dist3(q.anchor, add3(L.a, scale3(dir, ta))) < 1e-6) origins.push(ta); }
    if (tk.kind === "edge" && lenW !== undefined) origins.push(0, lenW);
    for (const o of origins) { const t = o + nearestStep(t0 - o, s0); if (Math.abs(t - o) > 1e-9 && onLine(t)) cands.push({ t, step: Math.abs(t - o) }); }
    // 裁决：线和帧的某根轴平行 → 绝对格点先（2026-10-24 定稿「方向归轴线、位置归格子」；锚点在格上时两者重合），没有才整格；
    //       斜线（斜边 / 对角线 / 斜参考线）→ 两种里屏距最近的（斜边上找格线交点 和 沿斜边走整格 都要）
    const axial = [F.x, F.y, F.z].some((ax) => Math.abs(Math.abs(dot3(dir, ax)) - 1) < 1e-9);
    const pickBest = (cs: readonly { t: number; step?: number }[]): { p: Pt3; d: number; step?: number } | null => {
      let b: { p: Pt3; d: number; step?: number } | null = null;
      for (const c of cs) { const p2 = add3(L.a, scale3(dir, c.t)), d = pf.distTo(sx, sy, p2, vp); if (d <= E.point && (!b || d < b.d - 1e-9)) b = { p: p2, d, ...(c.step !== undefined ? { step: c.step } : {}) }; }
      return b;
    };
    const best = axial ? (pickBest(cands.filter((c) => c.step === undefined)) ?? pickBest(cands.filter((c) => c.step !== undefined))) : pickBest(cands);
    if (best) {
      const under = tk.kind === "edge" ? "边上" : tk.kind === "axis" ? (tk.axis === "u" || tk.axis === "v" ? "共轴" : `${String(tk.axis ?? "").toUpperCase()} 轴`) : tk.kind === "guide" ? "参考线" : tk.kind === "edgeExt" ? "延长线" : tk.kind === "tool" ? (tk.label ?? "工具") : tk.kind === "align" ? "共轴" : "线上";
      const hs: SnapHint[] = tk.src ? [{ a: tk.src, b: best.p, axis: ((tk.axis as SnapHint["axis"] | undefined) ?? "i") }] : [];
      return best.step !== undefined
        ? { p: best.p, kind: "increment", label: `整格 ${fmtLen(best.step)} · ${under}`, ...(hs.length ? { hints: hs } : {}) }
        : { p: best.p, kind: "grid-point", label: `格点 · ${under}`, ...(hs.length ? { hints: hs } : {}) };
    }
  }
  // 自由（只落在画面平面上）：先咬整角（15° 一档，user「15是grid合理」），再咬整格长度——都在吸附圈内才咬
  if (GR && q.anchor && sol.dim === 2) {
    const n = q.plane.plane.n, F = GR.frame, s0 = GR.step / GR.sub;
    let u = sub3(F.x, scale3(n, dot3(F.x, n)));
    if (dot3(u, u) < 1e-9) u = sub3(F.y, scale3(n, dot3(F.y, n)));
    const ul = Math.hypot(u.x, u.y, u.z);
    let p = sol.p, deg: number | null = null, len: number | null = null;
    if (ul > 1e-9) {
      const uu = scale3(u, 1 / ul), a = snapDirectionInPlane(q.anchor, sol.p, { u: uu, v: cross3(n, uu) }, INCREMENT_DEG);
      if (pf.distTo(sx, sy, a.p, vp) <= E.point) { p = a.p; deg = a.deg; }
    }
    const v = sub3(p, q.anchor), d = dist3(p, q.anchor), kd = nearestStep(d, s0);
    if (d > 1e-9 && kd > 0) { const p2 = add3(q.anchor, scale3(v, kd / d)); if (pf.distTo(sx, sy, p2, vp) <= E.point) { p = p2; len = kd; } }
    if (deg !== null || len !== null) return { p, kind: "increment", label: [deg !== null ? `${deg}°` : "", len !== null ? `整格 ${fmtLen(len)}` : ""].filter(Boolean).join(" · "), hints: [{ a: q.anchor, b: p, axis: "i" }] };
  }
  const hints: SnapHint[] = [];
  for (const c of sol.used) {
    if (c.locus.dim === 1 && (c.tag.kind === "axis" || c.tag.kind === "align") && c.tag.src && c.tag.axis) {
      hints.push({ a: c.tag.src, b: sol.p, axis: c.tag.axis });
    } else if (c.locus.dim === 1 && c.tag.kind === "edgeExt" && c.tag.src) {
      hints.push({ a: c.tag.src, b: sol.p, axis: "i" });   // 延长线：从充能边的端点到吸附点
    } else if (c.locus.dim === 1 && c.tag.kind === "tool" && c.tag.src) {
      hints.push({ a: c.tag.src, b: sol.p, axis: "i" });   // 工具目标线（正方形对角线…）：从首点到吸附点
    } else if (c.locus.dim === 1 && c.tag.kind === "cross" && c.locus.len !== undefined) {
      // 交线：整段高亮（可描的虚拟轨迹）
      const L = c.locus;
      hints.push({ a: L.a, b: { x: L.a.x + L.dir.x * L.len!, y: L.a.y + L.dir.y * L.len!, z: L.a.z + L.dir.z * L.len! }, axis: "i" });
    }
  }
  let kind: SnapKind | null;
  const toolUsed = sol.used.find((c) => c.tag.kind === "tool");
  if (toolUsed) {
    kind = "tool";
  } else if (sol.used.length === 2) {
    kind = sol.used.some((c) => c.tag.kind === "guide") ? "guide-cross" : sol.used.some((c) => c.tag.kind === "edge") ? "edge-align" : "align-combo";
  } else {
    const t = sol.used[0].tag;
    kind = t.kind === "endpoint" ? "endpoint"
      : t.kind === "origin" ? "origin"
      : t.kind === "midpoint" ? "midpoint"
      : t.kind === "center" ? "center"
      : t.kind === "poolOrigin" ? "pool-origin"
      : t.kind === "intersection" || t.kind === "axisCross" ? "intersection"
      : t.kind === "cross" ? "cross-line"
      : t.kind === "edge" ? "on-edge"
      : t.kind === "axis" ? ((t.axis === "u" || t.axis === "v") ? "align" : (("axis-" + t.axis) as SnapKind))
      : t.kind === "align" ? "align"
      : t.kind === "edgeExt" ? "on-extension"
      : t.kind === "guide" ? "on-guide"
      : t.kind === "guidePoint" ? "guide-point"
      : t.kind === "grid" ? "grid-point"
      : (t.kind === "plane" && insideFace(k, q.plane, sol.p)) ? "on-face"
      : null;
  }
  // 单个目标带了说法（轴 × 面、参考圆上、参考球 × 边…）就显示它
  const label = toolUsed ? `${toolUsed.tag.label ?? "工具"}${sol.used.length === 2 ? "·交点" : ""}` : sol.used.length === 1 && sol.used[0].tag.label ? sol.used[0].tag.label : undefined;
  return { p: sol.p, kind, ...(hints.length ? { hints } : {}), ...(label ? { label } : {}) };
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

/**
 * 宽锥三轴三选一（SU move 的方向推断；user 2026-09-07：「effectively 就是三个轴三选一，因为 360 度去掉六个 60 度的吸附 cone 也没剩下
 * 太多东西了。也许这样的话我们能做的纯激光笔，不需要手势」）：光标相对锚点在角度尺上的方向，与三条世界轴在锚点处的投影方向比，
 * 最小夹角 ≤ coneDeg（默认 30° = 六个 60° 锥）的轴胜出；点 = 射线到该轴的公垂点。射线与轴近平行（|cos| > 0.985）或轴在角度尺上
 * 投影退化 → 该轴不参赛。edited by Claude Fable 5.1 2026-09-07
 */
export function inferAxisByDirection(pf: PointerFrame, vp: Viewport, anchor: Pt3, sx: number, sy: number, coneDeg = 30, keep?: { axis: AxName; coneDeg: number }): { axis: AxName; p: Pt3 } | null {
  const ray = pf.ray(sx, sy, vp);
  const minCos = Math.cos((coneDeg * Math.PI) / 180);
  const AX: { axis: AxName; dir: Pt3 }[] = [{ axis: "x", dir: { x: 1, y: 0, z: 0 } }, { axis: "y", dir: { x: 0, y: 1, z: 0 } }, { axis: "z", dir: { x: 0, y: 0, z: 1 } }];
  const cos = pf.dirCos(sx, sy, anchor, AX.map((a) => a.dir), vp);   // 图向夹角：桌面 = 屏幕向量；VR = 锚点方向切平面
  let best: { axis: AxName; dir: Pt3; c: number } | null = null;
  // 轴锁迟滞（D17，2026-10-24）：上一帧已经锁在某根轴上 → 这一帧只要还在更宽的退出锥内就继续锁它（进 30° / 出 keep.coneDeg）——
  // 抬笔前的飘、手腕的小弧线不再把锁甩掉（甩掉 = 落定帧退回相机平面自由点 = 屋脊两端带着侧墙一起折）。
  if (keep) {
    const i = AX.findIndex((a) => a.axis === keep.axis), c = i >= 0 ? cos[i] : null;
    if (i >= 0 && c !== null && c >= Math.cos((keep.coneDeg * Math.PI) / 180) && Math.abs(dot3(AX[i].dir, ray.dir)) <= 0.985) best = { axis: AX[i].axis, dir: AX[i].dir, c };
  }
  if (!best) AX.forEach(({ axis, dir }, i) => {
    if (Math.abs(dot3(dir, ray.dir)) > 0.985) return;   // 射线与轴近平行：公垂点病态，不参赛
    const c = cos[i];
    if (c === null) return;
    if (c >= minCos && (!best || c > best.c)) best = { axis, dir, c };
  });
  if (!best) return null;
  const b: { axis: AxName; dir: Pt3; c: number } = best;
  const p = closestOnAxis(anchor, b.dir, ray.origin, ray.dir);
  return p ? { axis: b.axis, p } : null;
}

/** 擦射线：射线与平面夹角 < minDeg → 交点会甩到无穷远，调用方保持上一帧（user 2026-09-07「最后会甩到顶面平面无限远的地方。这个是 bug」）。 */
export function grazing(plane: DrawPlane, ray: Ray, minDeg = 6): boolean {
  return Math.abs(dot3(plane.plane.n, ray.dir)) < Math.sin((minDeg * Math.PI) / 180);
}

/** 唯一平面挑选器：底面偏置 > 面向度。 */
function pickByFacing(pf: PointerFrame, arr: readonly DrawPlane[]): DrawPlane {
  const fwd = pf.forward();
  if (Math.abs(fwd.z) >= 0.34) {
    const ground = arr.find((c) => Math.abs(c.plane.n.z) > 0.999);
    if (ground) return ground;
  }
  return arr.reduce((a, b) => (Math.abs(dot3(b.plane.n, fwd)) > Math.abs(dot3(a.plane.n, fwd)) ? b : a));
}

/** 轴系平面本体（d=0）——自由落点兜底。 */
export function axisPlane(pf: PointerFrame): DrawPlane {
  return pickByFacing(pf, axisPlanesThrough({ x: 0, y: 0, z: 0 }));
}
/** 网格开着时的「空处落点平面」= 网格面（user 2026-10-24「grid可以配置成xy yz xz，这样方便我吸附画立面」）；网格关着 = null。 */
export function gridDrawPlane(k: GeomView, through?: Pt3): DrawPlane | null {
  const g = k.grid?.();
  if (!g) return null;
  const n = g.frame.z, o = through ?? g.frame.origin;
  return { plane: { n, d: dot3(n, o) }, basis: { u: g.frame.x, v: g.frame.y } };
}

/** 过 through 的轴向平面（锚定在几何上的点用）。 */
export function cameraPlane(pf: PointerFrame, through: Pt3): DrawPlane {
  return pickByFacing(pf, axisPlanesThrough(through));
}

/** 平面来自膜且 p 落在该膜环内（含洞判定）→ 「面上」；平面不带 face 或点在环外 → false。 */
function insideFace(k: GeomView, plane: DrawPlane, p: Pt3): boolean {
  if (plane.face === undefined) return false;
  const f = k.face(plane.face);
  if (!f) return false;
  const q2 = { x: dot3(p, plane.basis.u), y: dot3(p, plane.basis.v) };
  if (!pointInRing(q2, f.outer.pts)) return false;
  return !f.holes.some((h) => pointInRing(q2, h.pts));
}

/** 光标射线命中的第一张膜（最近者）的平面；没命中 → null。零 three、不经 pick.ts（避免环形 import）。 */
export function faceUnderCursor(k: GeomView, pf: PointerFrame, vp: Viewport, sx: number, sy: number): DrawPlane | null {
  const ray = pf.ray(sx, sy, vp);
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

/** 含锚点的膜里，剪影（屏幕多边形）离光标 ≤ tolPx 的最近一张 → 其平面；没有 → null。
 *  无历史、纯几何：滑出底边几个像素仍在那张墙上（2026-09-06 侧面拖矩形案），远离了就自然放手
 *  （2026-09-07 仓库角点案：此前「黏住上一帧平面」把擦过的竖墙一路黏到空地上——黏性是错的一般化，撤）。 */
function nearFaceContaining(k: GeomView, pf: PointerFrame, vp: Viewport, sx: number, sy: number, p1: Pt3, tol: number): DrawPlane | null {
  let best: { d: number; plane: DrawPlane } | null = null;
  for (const f of k.faces()) {
    const rec = k.planeOf(f.id);
    if (!rec || distToPlane(p1, rec.plane) > k.coplanarTol) continue;
    const ring = k.faceRings3(f.id)?.outer;
    if (!ring || ring.length < 3) continue;
    const d = pf.distToRing(sx, sy, ring, vp);   // 环内 = 0；否则到剪影最近边（桌面 px / VR 度）
    if (d <= tol && (!best || d < best.d)) best = { d, plane: { plane: rec.plane, basis: rec.basis, face: f.id } };
  }
  return best?.plane ?? null;
}

/**
 * 平面求解（字典序见文件头）。p1 无 = 首点查询（facePlane=调用方 raycast 的面锁候选）；
 * p1 有 = 第二点查询（含点平面拉动）。fixed=面锁成立（裸落膜内）。
 */
export function resolvePlane(
  k: GeomView,
  pf: PointerFrame,
  vp: Viewport,
  sx: number,
  sy: number,
  tolPx: number,
  opts: { p1?: Pt3 | null; facePlane?: DrawPlane | null; alignSources?: readonly Pt3[] | null; hand: AlignHand;
    /** 首点所在平面（如地面）：无膜承接时的兜底平面——不再按指针面向度挑轴平面（2026-09-07 VR：站着画远处地面俯仰 < 20° 就翻成竖直面 =「画线突然跳到空中」）。 */
    basePlane?: DrawPlane | null;
    /** 工具自带目标（B22；按平面基算的话由调用方按上一帧平面给）。 */
    toolTargets?: readonly ToolTarget[] | null },
): { plane: DrawPlane; fixed: boolean; snap: Snap3 } {
  const { p1, facePlane, alignSources, hand, basePlane, toolTargets } = opts;
  if (p1) {
    // 含点（膜）：光标射线命中的膜若也含锚点 → 该膜平面胜出（SU：从共享边拖进哪张面，矩形/线就躺哪张面）。
    // 2026-09-06 修（user：「一个 cube，我从侧面的底边开始往上拖 rect，结果没有吸附在侧面上，反而一直显示边上」）——
    // 此前第二点只在过锚点的三个轴平面里挑且先按俯视偏置取地面，光标穿过侧面落到地面底边附近 → 永远「边上」。
    const under = faceUnderCursor(k, pf, vp, sx, sy);
    if (under && distToPlane(p1, under.plane) <= k.coplanarTol) {
      const snap = snapPoint(k, pf, vp, sx, sy, tolPx, { plane: under, anchor: p1, alignSources, hand, toolTargets });
      return { plane: under, fixed: false, snap };
    }
    // 近擦（2026-09-06 侧面拖矩形案）：光标滑出含锚点膜的剪影几个像素（如底边下方）仍算在那张膜上，
    // 否则按落底偏置挑过锚点轴平面会把矩形翻到水平面、角点飞走。纯几何无历史（黏性版 2026-09-07 撤）。
    const near = nearFaceContaining(k, pf, vp, sx, sy, p1, frameEps(pf, vp, tolPx).planeNear);
    if (near) {
      const snap = snapPoint(k, pf, vp, sx, sy, tolPx, { plane: near, anchor: p1, alignSources, hand, toolTargets });
      return { plane: near, fixed: false, snap };
    }
    const candidates = axisPlanesThrough(p1);
    const base = basePlane ?? gridDrawPlane(k, p1) ?? pickByFacing(pf, candidates);   // 网格开着：第二点默认落网格面（画立面）
    const snap = snapPoint(k, pf, vp, sx, sy, tolPx, { plane: base, anchor: p1, alignSources, hand, toolTargets });
    if (basePlane && distToPlane(snap.p, basePlane.plane) <= k.coplanarTol) return { plane: basePlane, fixed: false, snap };   // 黏在首点平面上
    const containing = candidates.filter((c) => distToPlane(snap.p, c.plane) <= k.coplanarTol);
    return { plane: containing.length ? pickByFacing(pf, containing) : base, fixed: false, snap };
  }
  const base = facePlane ?? gridDrawPlane(k) ?? axisPlane(pf);   // 网格开着：空处首点落网格面
  const snap = snapPoint(k, pf, vp, sx, sy, tolPx, { plane: base, alignSources, hand });
  if (snap.kind === null || snap.kind === "on-face") return { plane: base, fixed: !!facePlane, snap };   // 裸落（含「面上」）= 面锁成立
  // 首点被低维吸附赢走：面锁作废（延迟承诺），平面挂到解析点上
  return { plane: pickByFacing(pf, axisPlanesThrough(snap.p)), fixed: false, snap };
}

/** 薄壳（历史 API；语义=resolvePlane 第二点查询）。 */
export function resolveRectPlane(
  k: GeomView,
  pf: PointerFrame,
  vp: Viewport,
  p1: Pt3,
  sx: number,
  sy: number,
  tolPx: number,
  alignSources: readonly Pt3[] | undefined,
  hand: AlignHand,
  basePlane?: DrawPlane | null,
  toolTargets?: readonly ToolTarget[] | null,
): { plane: DrawPlane; snap: Snap3 } {
  // hand = 手中集（预演里新生的顶点/工具自报的移动集）：不传 = 矩形/线会吸到自己上一帧的角点（2026-09-06 user「一 snap 一 snap」真凶，
  // lab 时代就有、ε 放大后显形；线第二点当日改走本函数被拖下水）
  const r = resolvePlane(k, pf, vp, sx, sy, tolPx, { p1, alignSources, hand, basePlane, toolTargets });
  return { plane: r.plane, snap: r.snap };
}
