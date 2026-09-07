// pick.ts —— 屏幕空间**拾取**（实体命中/框选/画线平面）。取点求解全在 solver.ts（阶段二并机完成，
// 2026-09-02：snapPoint/resolveRectPlane/平面挑选器移居 solver，本文件只剩 raycast 类职责）。
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
import { rayPlane } from "./camera.ts";
import type { PointerFrame, Viewport } from "./pointer-frame.ts";
import { type DrawPlane, type Snap3, NO_HAND, occludedBy, resolvePlane } from "./solver.ts";

// 兼容 re-export（调用方历史入口；新码请直接 import solver）
export { type AlignHand, type AlignQuery, type DrawPlane, type Snap3, type SnapHint, type SnapKind, NO_HAND, axisPlane, cameraPlane, resolvePlane, resolveRectPlane, snapPoint } from "./solver.ts";

export const GROUND: DrawPlane = (() => {
  const plane = canonicalPlane({ x: 0, y: 0, z: 1 }, 0);
  return { plane, basis: planeBasis(plane) };
})();

export interface HitResult3 { vertex?: VertexId; edge?: EdgeId; face?: FaceId; }

const sdist = (a: { x: number; y: number }, b: { x: number; y: number }): number => Math.hypot(a.x - b.x, a.y - b.y);
/** 屏幕段上离 p 最近点的参数 t∈[0,1]（用来把「最近点」回投到 3D 做遮挡判定）。 */
function segParam(p: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }): number {
  const len2 = (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
  if (len2 === 0) return 0;
  return Math.max(0, Math.min(1, ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / len2));
}
function sdistToSeg(p: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }): number {
  const len2 = (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
  if (len2 === 0) return sdist(p, a);
  let t = ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / len2;
  t = Math.max(0, Math.min(1, t));
  return sdist(p, { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) });
}

/** 实体拾取：顶点 > 边（屏幕距离）> 面（射线求交，取沿射线最近者——正确遮挡序）。 */
export function pickEntity(k: Kernel, pf: PointerFrame, vp: Viewport, sx: number, sy: number, tolPx: number): HitResult3 {
  const cursor = { x: sx, y: sy };
  // 遮挡（2026-09-07 user「high：有时候选择会选到面后面的东西」）：顶点/边只在**看得见**时参赛——
  // 与对齐引擎同一台 occludedBy（贴在膜面上的点不算挡，所以棱/角本身不会被自己的邻膜挡掉）。
  let bestV: VertexId | undefined, bestVd = tolPx;
  for (const v of k.vertices()) {
    const p = { x: v.x, y: v.y, z: v.z };
    const d = sdist(cursor, pf.angularPx(p, vp));
    if (d <= bestVd && !occludedBy(k, pf, p)) { bestVd = d; bestV = v.id; }
  }
  if (bestV !== undefined) return { vertex: bestV };

  let bestE: EdgeId | undefined, bestEd = tolPx;
  for (const e of k.edges()) {
    const a = k.graph.pt(e.a), b = k.graph.pt(e.b);
    const sa = pf.angularPx(a, vp), sb = pf.angularPx(b, vp);
    const d = sdistToSeg(cursor, sa, sb);
    if (d > bestEd) continue;
    const t = segParam(cursor, sa, sb);   // 屏幕最近点回投到边上（透视下参数略偏，仍在边上，遮挡判定够用）
    const q = { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y), z: a.z + t * (b.z - a.z) };
    if (occludedBy(k, pf, q)) continue;
    bestEd = d; bestE = e.id;
  }
  if (bestE !== undefined) return { edge: bestE };

  const bestF = pickFace(k, pf, vp, sx, sy);
  if (bestF !== undefined) return { face: bestF };
  return {};
}

/** 只拾膜（射线最近命中）：推拉/删面这类「面动词」用——不走顶点>边>面优先级，否则细面（屏上几像素宽）
 *  任何位置都在边的 HIT 圈内、边永远赢、面永远拾不到（2026-09-07 user「推拉的时候拾取不到细的面」）。SU 推拉同款只认面。 */
export function pickFace(k: Kernel, pf: PointerFrame, vp: Viewport, sx: number, sy: number): FaceId | undefined {
  const ray = pf.ray(sx, sy, vp);
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
  return bestF;
}

/** 画线平面：光标下的面 → 它的平面；否则地面。 */
export function drawPlaneAt(k: Kernel, pf: PointerFrame, vp: Viewport, sx: number, sy: number): DrawPlane {
  const hit = pickEntity(k, pf, vp, sx, sy, 0.5); // 面命中不需要 px 容差
  if (hit.face !== undefined) {
    const rec = k.planeOf(hit.face)!;
    return { plane: rec.plane, basis: rec.basis, face: hit.face };   // 出身=膜 → 裸落其内报「面上」
  }
  return GROUND;
}

/**
 * 首点平面裁决（薄壳：face raycast 探测 + resolvePlane 首点查询；元逻辑三律见 solver 头注释）。
 * 返回 plane=本帧用平面、fixed=面锁候选（裸落膜内才非 null）。
 */
export function rectFirstPlane(
  k: Kernel,
  pf: PointerFrame,
  vp: Viewport,
  sx: number,
  sy: number,
  tolPx: number,
  alignSources?: readonly Pt3[],
): { fixed: DrawPlane | null; plane: DrawPlane; snap: Snap3 } {
  const hit = pickEntity(k, pf, vp, sx, sy, 0.5);
  let facePlane: DrawPlane | null = null;
  if (hit.face !== undefined) {
    const rec = k.planeOf(hit.face)!;
    facePlane = { plane: rec.plane, basis: rec.basis, face: hit.face };
  }
  const r = resolvePlane(k, pf, vp, sx, sy, tolPx, { facePlane, alignSources, hand: NO_HAND });   // 首点：还没有手
  return { fixed: r.fixed ? r.plane : null, plane: r.plane, snap: r.snap };
}

/** 屏幕空间框选（window 语义）：边=两端投影都在框内；面=外环全部顶点投影在框内。 */
export function marqueeScreen(
  k: Kernel,
  pf: PointerFrame,
  vp: Viewport,
  m: { minX: number; minY: number; maxX: number; maxY: number },
): { edges: Set<EdgeId>; faces: Set<FaceId> } {
  const inBox = (p: { x: number; y: number }): boolean => p.x >= m.minX && p.x <= m.maxX && p.y >= m.minY && p.y <= m.maxY;
  const sel = { edges: new Set<EdgeId>(), faces: new Set<FaceId>() };
  for (const e of k.edges()) {
    if (inBox(pf.angularPx(k.graph.pt(e.a), vp)) && inBox(pf.angularPx(k.graph.pt(e.b), vp))) sel.edges.add(e.id);
  }
  for (const f of k.faces()) {
    const rings = k.faceRings3(f.id);
    if (rings && rings.outer.every((p) => inBox(pf.angularPx(p, vp)))) sel.faces.add(f.id);
  }
  return sel;
}
