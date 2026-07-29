// pick.ts —— 屏幕空间拾取 + 3D 吸附推断（DOM-free、不经 three；node 可测）。
// 取代 M2 的 2D inference.ts。定位不变（验收③的门）：inference 是所有取点动作共用的
// **输入前置层**；SU 的吸附判定本来就是屏幕空间的（px 容差），所以拾取围着相机转。
// 优先级：endpoint > midpoint > on-edge > axis（画线平面内的世界轴锁）> 落到画线平面。
// 吸附产出的点**精确落在画线平面上**——coplanarity τ 在输入侧被消费，内核几何保持精确共面。

import type { EdgeId, FaceId, Kernel, Pt3, VertexId } from "../kernel/kernel.ts";
import {
  type PlaneParams,
  canonicalPlane,
  dist3,
  dot3,
  planeBasis,
  pointInRing,
  projectToPlane,
  scale3,
  sub3,
} from "../kernel/geom.ts";
import { OrbitCamera, type Viewport, closestOnAxis, rayPlane } from "./camera.ts";

export interface DrawPlane { plane: PlaneParams; basis: { u: Pt3; v: Pt3 }; }

export const GROUND: DrawPlane = (() => {
  const plane = canonicalPlane({ x: 0, y: 0, z: 1 }, 0);
  return { plane, basis: planeBasis(plane) };
})();

export type SnapKind = "endpoint" | "midpoint" | "on-edge" | "axis-x" | "axis-y" | "axis-z";
export interface Snap3 { p: Pt3; kind: SnapKind | null; }

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

const AXES: { kind: SnapKind; dir: Pt3 }[] = [
  { kind: "axis-x", dir: { x: 1, y: 0, z: 0 } },
  { kind: "axis-y", dir: { x: 0, y: 1, z: 0 } },
  { kind: "axis-z", dir: { x: 0, y: 0, z: 1 } },
];

/**
 * 取点吸附：endpoint > midpoint > on-edge > axis > 落到 plane。
 * axis 候选 = 落在画线平面内的世界轴（地面 X/Y、竖墙含 Z）——锁完仍在平面上。
 * excludeVid：移动中被抓顶点（它与它的边不参与吸附）。
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
): Snap3 {
  const cursor = { x: sx, y: sy };
  // 1. endpoint
  let bestV: { p: Pt3; d: number } | null = null;
  for (const v of k.vertices()) {
    if (v.id === excludeVid) continue;
    const p3 = { x: v.x, y: v.y, z: v.z };
    const d = sdist(cursor, cam.worldToScreen(p3, vp));
    if (d <= tolPx && (!bestV || d < bestV.d)) bestV = { p: p3, d };
  }
  if (bestV) return { p: bestV.p, kind: "endpoint" };

  const edges = k.edges().filter((e) => e.a !== excludeVid && e.b !== excludeVid);
  // 2. midpoint
  let bestM: { p: Pt3; d: number } | null = null;
  for (const e of edges) {
    const a = k.graph.pt(e.a), b = k.graph.pt(e.b);
    const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: (a.z + b.z) / 2 };
    const d = sdist(cursor, cam.worldToScreen(m, vp));
    if (d <= tolPx && (!bestM || d < bestM.d)) bestM = { p: m, d };
  }
  if (bestM) return { p: bestM.p, kind: "midpoint" };

  const ray = cam.screenRay(sx, sy, vp);
  // 3. on-edge：屏幕距离过滤，取边上最接近拾取射线的点（clamp 在边内）
  let bestE: { p: Pt3; d: number } | null = null;
  for (const e of edges) {
    const a = k.graph.pt(e.a), b = k.graph.pt(e.b);
    const d = sdistToSeg(cursor, cam.worldToScreen(a, vp), cam.worldToScreen(b, vp));
    if (d > tolPx || (bestE && d >= bestE.d)) continue;
    const len = dist3(a, b);
    if (len <= 0) continue;
    const dir = scale3(sub3(b, a), 1 / len);
    const q = closestOnAxis(a, dir, ray.origin, ray.dir);
    if (!q) continue;
    let t = dot3(sub3(q, a), dir);
    t = Math.max(0, Math.min(len, t));
    bestE = { p: { x: a.x + dir.x * t, y: a.y + dir.y * t, z: a.z + dir.z * t }, d };
  }
  if (bestE) return { p: bestE.p, kind: "on-edge" };

  // 4. axis（画线平面内的世界轴，过 anchor）
  if (anchor) {
    let bestA: { p: Pt3; d: number; kind: SnapKind } | null = null;
    for (const ax of AXES) {
      if (Math.abs(dot3(plane.plane.n, ax.dir)) > 1e-6) continue; // 轴不在平面内
      const q = closestOnAxis(anchor, ax.dir, ray.origin, ray.dir);
      if (!q) continue;
      const a1 = cam.worldToScreen(anchor, vp);
      const a2 = cam.worldToScreen({ x: anchor.x + ax.dir.x * 100, y: anchor.y + ax.dir.y * 100, z: anchor.z + ax.dir.z * 100 }, vp);
      const d = sdistToSeg2Line(cursor, a1, a2);
      if (d <= tolPx && (!bestA || d < bestA.d)) bestA = { p: q, d, kind: ax.kind };
    }
    if (bestA) return { p: bestA.p, kind: bestA.kind };
  }

  // 5. 落到画线平面
  const p = rayPlane(ray.origin, ray.dir, plane.plane.n, plane.plane.d);
  return { p: p ?? (anchor ?? { x: 0, y: 0, z: 0 }), kind: null };
}

/** 点到（屏幕投影后的）无限直线距离。 */
function sdistToSeg2Line(p: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = b.x - a.x, dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  if (len === 0) return sdist(p, a);
  return Math.abs((p.x - a.x) * dy - (p.y - a.y) * dx) / len;
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
