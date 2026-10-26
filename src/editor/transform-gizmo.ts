// transform-gizmo.ts —— 变换工具的移动箭头 + 旋转环（纯数学、零 DOM）：三根箭头 = 沿上下文帧的 X / Y / Z 移动，三个环 = 绕它们转。
// user 2026-10-25「或者其实scale改名就是move rotate scale全家？我们没必要学sketchup的麻烦的地方」「以后有move rotate了也这样」（= 和缩放柄一样透视画、埋在几何里也点得中）。
// 尺寸按屏幕像素定（不随缩放变）；坐标一律世界系；渲染在 render3（ViewState.xformGizmo，透视画）。缩放柄仍在 tools/transform.ts（包围盒角 / 面心）。
// created 2026-10-26 by Claude Opus 5.5
import { type Pt3, add3, cross3, dot3, normalize3, scale3, sub3 } from "../kernel/geom.ts";
import type { PointerFrame, Viewport } from "./pointer-frame.ts";
import { closestOnAxis, rayPlane } from "./camera.ts";
import { worldPerPx } from "./plane-gizmo.ts";

export type AxisName = "x" | "y" | "z";
export type XformHandle = "mx" | "my" | "mz" | "rx" | "ry" | "rz";
export const AXIS_NAMES: readonly AxisName[] = ["x", "y", "z"];
/** 箭头长（CSS px）。 */
export const XG_ARROW_PX = 64;
/** 箭头从原点外多少开始算把手（CSS px；中心让给别的柄）。 */
export const XG_ARROW_START_PX = 14;
/** 旋转环半径（CSS px）：大过箭头（Blender 同款，环在外圈）——环和箭头不相交，抓的时候不含糊。 */
export const XG_RING_PX = 84;
/** 环画多少段。 */
export const XG_RING_SEGS = 48;

/** 一个变换 gizmo：原点 + 三根单位轴（上下文帧）。 */
export interface XformGizmo { origin: Pt3; axes: Readonly<Record<AxisName, Pt3>>; }
/** 这一帧的几何（世界）：箭头长、环半径。 */
export interface XformGizmoGeom extends XformGizmo { arrow: number; ring: number; start: number; }

export function xformGizmoGeom(g: XformGizmo, pf: PointerFrame, vp: Viewport): XformGizmoGeom {
  const wpp = worldPerPx(pf, vp, g.origin, g.axes.x) ?? worldPerPx(pf, vp, g.origin, g.axes.y) ?? 0.01;
  return { ...g, arrow: XG_ARROW_PX * wpp, ring: XG_RING_PX * wpp, start: XG_ARROW_START_PX * wpp };
}
/** 绕 axis 的环上的点（闭合：首尾相同）。 */
export function ringPoints(G: XformGizmoGeom, ax: AxisName): Pt3[] {
  const n = G.axes[ax], ref = ax === "z" ? G.axes.x : ax === "x" ? G.axes.y : G.axes.z;
  const u = normalize3(sub3(ref, scale3(n, dot3(ref, n)))), v = cross3(n, u), out: Pt3[] = [];
  for (let i = 0; i <= XG_RING_SEGS; i++) { const a = (2 * Math.PI * i) / XG_RING_SEGS; out.push(add3(G.origin, add3(scale3(u, G.ring * Math.cos(a)), scale3(v, G.ring * Math.sin(a))))); }
  return out;
}

/** 屏幕上点到线段的距离 + 最近点的参数 t∈[0,1]；投不出来 → null。 */
function screenSeg(pf: PointerFrame, vp: Viewport, sx: number, sy: number, a: Pt3, b: Pt3): { d: number; t: number } | null {
  if (!pf.project) return null;
  const A = pf.project(a, vp), B = pf.project(b, vp);
  if (!A || !B) return null;
  const dx = B.x - A.x, dy = B.y - A.y, L2 = dx * dx + dy * dy;
  const t = L2 > 1e-12 ? Math.min(1, Math.max(0, ((sx - A.x) * dx + (sy - A.y) * dy) / L2)) : 0;
  return { d: Math.hypot(sx - (A.x + dx * t), sy - (A.y + dy * t)), t };
}

/** 光标下每个把手的屏距（箭头 = 到箭杆、环 = 到环线）+ 离相机的深度（叠在一起时近的赢）。 */
export function hitXformGizmo(g: XformGizmo, pf: PointerFrame, vp: Viewport, sx: number, sy: number): { handle: XformHandle; d: number; z: number }[] {
  const G = xformGizmoGeom(g, pf, vp), ray = pf.ray(sx, sy, vp), out: { handle: XformHandle; d: number; z: number }[] = [];
  const depth = (p: Pt3): number => dot3(sub3(p, ray.origin), ray.dir);
  for (const ax of AXIS_NAMES) {
    const a = add3(G.origin, scale3(G.axes[ax], G.start)), b = add3(G.origin, scale3(G.axes[ax], G.arrow));
    const h = screenSeg(pf, vp, sx, sy, a, b);
    if (h) out.push({ handle: `m${ax}` as XformHandle, d: h.d, z: depth(add3(a, scale3(sub3(b, a), h.t))) });
    const pts = ringPoints(G, ax);
    let best: { d: number; z: number } | null = null;
    for (let i = 0; i < pts.length - 1; i++) { const r = screenSeg(pf, vp, sx, sy, pts[i], pts[i + 1]); if (r && (!best || r.d < best.d)) best = { d: r.d, z: depth(add3(pts[i], scale3(sub3(pts[i + 1], pts[i]), r.t))) }; }
    if (best) out.push({ handle: `r${ax}` as XformHandle, d: best.d, z: best.z });
  }
  return out;
}

/** 拖动开始时记下的东西：移动 = 抓点沿轴的参数；转动 = 起始方向。 */
export interface XformGrab { handle: XformHandle; g0: XformGizmo; axis: Pt3; t0: number; dir0: Pt3 | null; }
export const axisOf = (h: XformHandle): AxisName => h[1] as AxisName;
export function grabXform(g: XformGizmo, handle: XformHandle, pf: PointerFrame, vp: Viewport, sx: number, sy: number): XformGrab {
  const axis = g.axes[axisOf(handle)], ray = pf.ray(sx, sy, vp);
  if (handle[0] === "m") { const q = closestOnAxis(g.origin, axis, ray.origin, ray.dir); return { handle, g0: g, axis, t0: q ? dot3(sub3(q, g.origin), axis) : 0, dir0: null }; }
  const q = rayPlane(ray.origin, ray.dir, axis, dot3(axis, g.origin));
  return { handle, g0: g, axis, t0: 0, dir0: q ? normalize3(sub3(q, g.origin)) : null };
}
/** 移动：沿轴从抓点算起走了多远（世界长度）；射线和轴平行 → null。 */
export function dragMove(grab: XformGrab, pf: PointerFrame, vp: Viewport, sx: number, sy: number): number | null {
  const ray = pf.ray(sx, sy, vp), q = closestOnAxis(grab.g0.origin, grab.axis, ray.origin, ray.dir);
  return q ? dot3(sub3(q, grab.g0.origin), grab.axis) - grab.t0 : null;
}
/** 转动：从起始方向转到光标方向的有向角（弧度，(−π, π]，右手绕轴）；看不出来 → null。连续化归调用方（unwrapAngle）。 */
export function dragRotate(grab: XformGrab, pf: PointerFrame, vp: Viewport, sx: number, sy: number): number | null {
  if (!grab.dir0) return null;
  const ray = pf.ray(sx, sy, vp), q = rayPlane(ray.origin, ray.dir, grab.axis, dot3(grab.axis, grab.g0.origin));
  if (!q) return null;
  const d1 = sub3(q, grab.g0.origin);
  if (dot3(d1, d1) < 1e-18) return null;
  const n1 = normalize3(d1);
  return Math.atan2(dot3(cross3(grab.dir0, n1), grab.axis), dot3(grab.dir0, n1));
}
