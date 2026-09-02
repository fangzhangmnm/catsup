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
import { OrbitCamera, type Viewport, rayPlane } from "./camera.ts";
import { type DrawPlane, type Snap3, axisPlane, snapPoint } from "./solver.ts";

// 兼容 re-export（调用方历史入口；新码请直接 import solver）
export { type DrawPlane, type Snap3, type SnapHint, type SnapKind, axisPlane, cameraPlane, resolveRectPlane, snapPoint } from "./solver.ts";

export const GROUND: DrawPlane = (() => {
  const plane = canonicalPlane({ x: 0, y: 0, z: 1 }, 0);
  return { plane, basis: planeBasis(plane) };
})();

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
  const snap = snapPoint(k, cam, vp, sx, sy, tolPx, facePl ?? axisPlane(cam), null, null, alignSources);
  return { fixed: snap.kind === null ? facePl : null, snap };
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
