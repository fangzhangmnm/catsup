// pick.ts —— 屏幕空间拾取 + 3D 吸附推断（DOM-free、不经 three；node 可测）。
// 取代 M2 的 2D inference.ts。定位不变（验收③的门）：inference 是所有取点动作共用的
// **输入前置层**；SU 的吸附判定本来就是屏幕空间的（px 容差），所以拾取围着相机转。
// 优先级：endpoint > midpoint > on-edge > axis（画线平面内的世界轴锁）> 落到画线平面。
// 吸附产出的点**精确落在画线平面上**——coplanarity τ 在输入侧被消费，内核几何保持精确共面。

import type { EdgeId, FaceId, Kernel, Pt3, VertexId } from "../kernel/kernel.ts";
import {
  type PlaneParams,
  canonicalPlane,
  distToPlane,
  dot3,
  planeBasis,
  pointInRing,
  projectToPlane,
  sub3,
} from "../kernel/geom.ts";
import { OrbitCamera, type Viewport, rayPlane } from "./camera.ts";
import { EPS as SOLVER_EPS, buildConstraints, solvePoint } from "./solver.ts";

export interface DrawPlane { plane: PlaneParams; basis: { u: Pt3; v: Pt3 }; }

export const GROUND: DrawPlane = (() => {
  const plane = canonicalPlane({ x: 0, y: 0, z: 1 }, 0);
  return { plane, basis: planeBasis(plane) };
})();

export type SnapKind =
  | "endpoint" | "midpoint" | "on-edge" | "origin"
  | "axis-x" | "axis-y" | "axis-z"
  | "align" | "align-combo" | "edge-align"
  | "intersection" | "cross-line";
/** 1-DOF 约束的视觉提示：从源点到吸附点的虚线（SU from-point 同款）。 */
export interface SnapHint { a: Pt3; b: Pt3; axis: "x" | "y" | "z" | "u" | "v" | "i"; }
export interface Snap3 { p: Pt3; kind: SnapKind | null; hints?: SnapHint[]; }

export interface HitResult3 { vertex?: VertexId; edge?: EdgeId; face?: FaceId; }

const sdist = (a: { x: number; y: number }, b: { x: number; y: number }): number => Math.hypot(a.x - b.x, a.y - b.y);
function sdistToSeg(p: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }): number {
  const len2 = (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
  if (len2 === 0) return sdist(p, a);
  let t = ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / len2;
  t = Math.max(0, Math.min(1, t));
  return sdist(p, { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) });
}

/** 实体拾取：顶点 > 边（屏幕距离）> 面（射线求交，取沿射线最近者——正确遮挡序）。 */
export function pickEntity(k: Kernel, cam: OrbitCamera, vp: Viewport, sx: number, sy: number, tolPx: number): HitResult3 {
  const cursor = { x: sx, y: sy };
  let bestV: VertexId | undefined, bestVd = tolPx;
  for (const v of k.vertices()) {
    const d = sdist(cursor, cam.worldToScreen({ x: v.x, y: v.y, z: v.z }, vp));
    if (d <= bestVd) { bestVd = d; bestV = v.id; }
  }
  if (bestV !== undefined) return { vertex: bestV };

  let bestE: EdgeId | undefined, bestEd = tolPx;
  for (const e of k.edges()) {
    const d = sdistToSeg(cursor, cam.worldToScreen(k.graph.pt(e.a), vp), cam.worldToScreen(k.graph.pt(e.b), vp));
    if (d <= bestEd) { bestEd = d; bestE = e.id; }
  }
  if (bestE !== undefined) return { edge: bestE };

  const ray = cam.screenRay(sx, sy, vp);
  let bestF: FaceId | undefined, bestT = Infinity;
  for (const f of k.faces()) {
    const rec = k.planeOf(f.id);
    if (!rec) continue;
    const p = rayPlane(ray.origin, ray.dir, rec.plane.n, rec.plane.d);
    if (!p) continue;
    const p2 = projectToPlane(p, rec.basis);
    if (!pointInRing(p2, f.outer.pts)) continue;
    if (f.holes.some((h) => pointInRing(p2, h.pts))) continue;
    const t = dot3(sub3(p, ray.origin), ray.dir);
    if (t < bestT) { bestT = t; bestF = f.id; }
  }
  if (bestF !== undefined) return { face: bestF };
  return {};
}

/** 画线平面：光标下的面 → 它的平面；否则地面。 */
export function drawPlaneAt(k: Kernel, cam: OrbitCamera, vp: Viewport, sx: number, sy: number): DrawPlane {
  const hit = pickEntity(k, cam, vp, sx, sy, 0.5); // 面命中不需要 px 容差
  if (hit.face !== undefined) {
    const rec = k.planeOf(hit.face)!;
    return { plane: rec.plane, basis: rec.basis };
  }
  return GROUND;
}

/**
 * 取点吸附（脚手架，spec 级 snap 体系 parked）：
 * 点吸附赢者通吃：endpoint > midpoint > on-edge > 原点；
 * 其下 = **轴对齐 1-DOF 约束层**（2026-09-01 QoL 波，user 拍板设计）：
 *   源点 = anchor + 原点（永久源=坐标轴本体）+ 全部模型顶点（from-point「和点共轴」）；
 *   方向 = 画线平面基 u/v（+过 anchor 的世界 Z——竖直几何入口）；
 *   **正交双约束合成**（画笔手画矩形的闭合角点）> 单约束（屏距最近，anchor 源优先）。
 * 全约束组合（垂线/平行等）仍 parked——这里只开轴对齐子集，不碰通用求解器。
 * excludeVid：移动中被抓顶点（它与它的边不参与吸附）。
 * edited by Claude Fable 5 2026-09-01
 */
export function snapPoint(
  k: Kernel,
  cam: OrbitCamera,
  vp: Viewport,
  sx: number,
  sy: number,
  tolPx: number,
  plane: DrawPlane,
  anchor: Pt3 | null = null,
  excludeVid: VertexId | null = null,
  alignSources?: readonly Pt3[],
): Snap3 {
  // === 兼容壳（2026-09-01 阶段二求解器手术）：真身 = solver.solvePoint 纯函数 ===
  // ε 分层住 solver.EPS（点10/边7/线5/合成12 @ 基准 tolPx=8）；tolPx 只做等比缩放。
  // 本壳仅做 Constraint→Snap3 的叙事映射；待调用方全部迁到 solver 后删除。
  const scale = tolPx / 8;
  const C = buildConstraints({ k, plane: plane.plane, basis: plane.basis, anchor, excludeVid, alignSources });
  if (scale !== 1) for (const c of C) { if (c.eps !== Infinity) c.eps *= scale; }
  const sol = solvePoint({ cam, vp }, { x: sx, y: sy }, C, { comboEps: SOLVER_EPS.combo * scale });
  if (!sol) return { p: anchor ?? { x: 0, y: 0, z: 0 }, kind: null };
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
      : null;
  }
  return hints.length ? { p: sol.p, kind, hints } : { p: sol.p, kind };
}

/** 摄像机托底平面：过 through 的世界轴平面里最面向相机者。 */
export function cameraPlane(cam: OrbitCamera, through: Pt3): DrawPlane {
  const fwd = cam.forward();
  const ns: Pt3[] = [{ x: 0, y: 0, z: 1 }, { x: 0, y: 1, z: 0 }, { x: 1, y: 0, z: 0 }];
  let bestN = ns[0];
  for (const n of ns) if (Math.abs(dot3(n, fwd)) > Math.abs(dot3(bestN, fwd))) bestN = n;
  const pl = canonicalPlane(bestN, dot3(bestN, through));
  return { plane: pl, basis: planeBasis(pl) };
}

/**
 * 矩形首点的平面裁决（元逻辑 2026-09-01：维度优先+延迟承诺+工具不自己 raycast）：
 * 首点吸附若被任何低维目标（顶点/边/轴线…kind≠null）赢走 → 这次点击**没有**表达平面意图，
 * fixed=null 延迟给第二点（resolveRectPlane）；只有裸落面内部（kind=null 且面命中）才锁面平行。
 * 修案出处：墙角起笔被私自 raycast 锁进墙平面、拉不出屋顶矩形。added by Claude Fable 5 2026-09-01
 */
export function rectFirstPlane(
  k: Kernel,
  cam: OrbitCamera,
  vp: Viewport,
  sx: number,
  sy: number,
  tolPx: number,
  alignSources?: readonly Pt3[],
): { fixed: DrawPlane | null; snap: Snap3 } {
  const hit = pickEntity(k, cam, vp, sx, sy, 0.5);
  let facePl: DrawPlane | null = null;
  if (hit.face !== undefined) {
    const rec = k.planeOf(hit.face)!;
    facePl = { plane: rec.plane, basis: rec.basis };
  }
  const snap = snapPoint(k, cam, vp, sx, sy, tolPx, facePl ?? cameraPlane(cam, cam.target), null, null, alignSources);
  return { fixed: snap.kind === null ? facePl : null, snap };
}

/**
 * 矩形工具的画面平面决定（user 2026-09-01 口述 SU 行为）：
 * ①首点在面上 = 与面平行（调用方直接锁面平面，不进本函数）；
 * ②空处 = 摄像机托底（过首点的三张世界轴平面里最面向相机者）；
 * ③**主要看第二点**：第二点解析出的 3D 点若落进某候选平面 → 该平面胜出
 *   （吸到高处端点/Z 轴锁 → 矩形自动立起来；多个含之取面向相机者）。
 * 返回本帧用的平面 + 第二点吸附结果（调用方勿重复吸附）。added by Claude Fable 5 2026-09-01
 */
export function resolveRectPlane(
  k: Kernel,
  cam: OrbitCamera,
  vp: Viewport,
  p1: Pt3,
  sx: number,
  sy: number,
  tolPx: number,
  alignSources?: readonly Pt3[],
  coplanarTol = 1e-3,
): { plane: DrawPlane; snap: Snap3 } {
  const mk = (n: Pt3): DrawPlane => {
    const pl = canonicalPlane(n, dot3(n, p1));
    return { plane: pl, basis: planeBasis(pl) };
  };
  const candidates = [mk({ x: 0, y: 0, z: 1 }), mk({ x: 0, y: 1, z: 0 }), mk({ x: 1, y: 0, z: 0 })];
  const fwd = cam.forward();
  const facing = (arr: DrawPlane[]): DrawPlane =>
    arr.reduce((a, b) => (Math.abs(dot3(b.plane.n, fwd)) > Math.abs(dot3(a.plane.n, fwd)) ? b : a));
  const camPlane = facing(candidates);
  const snap = snapPoint(k, cam, vp, sx, sy, tolPx, camPlane, p1, null, alignSources);
  const containing = candidates.filter((c) => distToPlane(snap.p, c.plane) <= Math.max(coplanarTol, 1e-6));
  return { plane: containing.length ? facing(containing) : camPlane, snap };
}

/** 屏幕空间框选（window 语义）：边=两端投影都在框内；面=外环全部顶点投影在框内。 */
export function marqueeScreen(
  k: Kernel,
  cam: OrbitCamera,
  vp: Viewport,
  m: { minX: number; minY: number; maxX: number; maxY: number },
): { edges: Set<EdgeId>; faces: Set<FaceId> } {
  const inBox = (p: { x: number; y: number }): boolean => p.x >= m.minX && p.x <= m.maxX && p.y >= m.minY && p.y <= m.maxY;
  const sel = { edges: new Set<EdgeId>(), faces: new Set<FaceId>() };
  for (const e of k.edges()) {
    if (inBox(cam.worldToScreen(k.graph.pt(e.a), vp)) && inBox(cam.worldToScreen(k.graph.pt(e.b), vp))) sel.edges.add(e.id);
  }
  for (const f of k.faces()) {
    const rings = k.faceRings3(f.id);
    if (rings && rings.outer.every((p) => inBox(cam.worldToScreen(p, vp)))) sel.faces.add(f.id);
  }
  return sel;
}
