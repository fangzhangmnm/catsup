// transform-gizmo.ts —— 变换工具的移动箭头 + 旋转环（纯数学、零 DOM）：三根箭头 = 沿上下文帧的 X / Y / Z 移动，三个环 = 绕它们转。
// user 2026-10-25「或者其实scale改名就是move rotate scale全家？我们没必要学sketchup的麻烦的地方」「以后有move rotate了也这样」（= 和缩放柄一样透视画、埋在几何里也点得中）。
// 尺寸按屏幕像素定（不随缩放变）；坐标一律世界系；渲染在 render3（ViewState.xformGizmo，透视画）。缩放柄仍在 tools/transform.ts（包围盒角 / 面心）。
// created 2026-10-26 by Claude Opus 5.5
import { type Pt3, add3, cross3, dot3, normalize3, scale3, sub3 } from "../kernel/geom.ts";
import type { PointerFrame, Viewport } from "./pointer-frame.ts";
import { closestOnAxis, rayPlane } from "./camera.ts";
import { worldPerPx } from "./plane-gizmo.ts";

export type AxisName = "x" | "y" | "z";
/** 把手：m 移动箭头 / r 旋转环 / s 单轴缩放块 / su 等比缩放块 / p 平面（双轴）缩放块（2026-10-26，user「以及变换你还是没给我xy yz xz的手柄」）。 */
export type XformHandle = "mx" | "my" | "mz" | "rx" | "ry" | "rz" | "sx" | "sy" | "sz" | "su" | "pxy" | "pyz" | "pxz";
/** 等比缩放块：轴心在屏上的位置往右、往上各这么多（CSS px）。 */
export const XG_UNIFORM_OFFSET_PX = 34;
// 比例（2026-10-26 改，user「然后比例也不对，看的好难受」+ 坦克截图：环套住整辆车、箭头细短、方块过大）：照 Blender 合在一起的样子——
// 环小（56）、箭头在环外（64 → 100，实心锥头）、轴上缩放块在环里（32，半边 3.5）；环和箭头不相交，抓的时候不含糊。
export const AXIS_NAMES: readonly AxisName[] = ["x", "y", "z"];
/** 箭头尖离原点多远（CSS px）。 */
export const XG_ARROW_PX = 100;
/** 箭头从原点外多少开始（CSS px；在环外面）。 */
export const XG_ARROW_START_PX = 64;
/** 单轴缩放块在轴上离原点多远（CSS px）（2026-10-26，user「我们也需要scale的手柄」）。中心点 = 移动、等比缩放块在中心右上方（屏幕把手，工具自己拾）。 */
export const XG_SCALE_PX = 32;
/** 缩放块半边长（CSS px，画用；拾取按点）。 */
export const XG_CUBE_PX = 3.5;
/** 旋转环半径（CSS px）：箭头在环外、缩放块在环里（Blender 合在一起时的布局）——环和箭头不相交，抓的时候不含糊。 */
export const XG_RING_PX = 56;
/** 平面缩放块：中心离轴心沿两根轴各这么远（CSS px）/ 方块半边长（CSS px）。在缩放块和环之间。 */
export const XG_PLANE_PX = 20;
export const XG_PLANE_HALF_PX = 4.5;
export const PLANE_HANDLES = ["pxy", "pyz", "pxz"] as const;
/** 平面块的两根轴 + 垂直于它的那根（上色用，Blender 同款：xy 块 = 蓝）。 */
export const planeAxes = (h: XformHandle): { a: AxisName; b: AxisName; n: AxisName } => (h === "pxy" ? { a: "x", b: "y", n: "z" } : h === "pyz" ? { a: "y", b: "z", n: "x" } : { a: "x", b: "z", n: "y" });
export const isPlaneHandle = (h: XformHandle): boolean => h[0] === "p";
/** 环画多少段。 */
export const XG_RING_SEGS = 48;

/** 一个变换 gizmo：原点 + 三根单位轴（上下文帧）。 */
export interface XformGizmo { origin: Pt3; axes: Readonly<Record<AxisName, Pt3>>; }
/** 这一帧的几何（世界）：箭头长、环半径、箭头起点、缩放块位置 / 半边长。 */
export interface XformGizmoGeom extends XformGizmo { arrow: number; ring: number; start: number; cube: number; cubeHalf: number; plane: number; planeHalf: number; }
/** 平面块中心（世界）。 */
export function planeHandleCenter(G: XformGizmoGeom, h: XformHandle): Pt3 { const { a, b } = planeAxes(h); return add3(G.origin, scale3(add3(G.axes[a], G.axes[b]), G.plane)); }

export function xformGizmoGeom(g: XformGizmo, pf: PointerFrame, vp: Viewport): XformGizmoGeom {
  // 量尺的方向要垂直于视线（2026-10-26）：沿红轴量的话，红轴斜着时别的轴箭头在屏上短一截，红轴正对镜头时整个手柄被算得巨大
  const w = pf.viewDir(g.origin), side = normalize3(cross3(w, Math.abs(w.z) < 0.9 ? { x: 0, y: 0, z: 1 } : { x: 1, y: 0, z: 0 }));
  const wpp = worldPerPx(pf, vp, g.origin, side) ?? 0.01;
  return { ...g, arrow: XG_ARROW_PX * wpp, ring: XG_RING_PX * wpp, start: XG_ARROW_START_PX * wpp, cube: XG_SCALE_PX * wpp, cubeHalf: XG_CUBE_PX * wpp, plane: XG_PLANE_PX * wpp, planeHalf: XG_PLANE_HALF_PX * wpp };
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
    const cp = add3(G.origin, scale3(G.axes[ax], G.cube));
    if (pf.project) { const q = pf.project(cp, vp); if (q) out.push({ handle: `s${ax}` as XformHandle, d: Math.hypot(q.x - sx, q.y - sy), z: depth(cp) }); }
  }
  for (const h of PLANE_HANDLES) { const pc = planeHandleCenter(G, h), q = pf.project?.(pc, vp); if (q) out.push({ handle: h, d: Math.hypot(q.x - sx, q.y - sy), z: depth(pc) }); }
  return out;   // 中心点（= 移动，按移动工具的吸附）和等比缩放块（屏幕上中心右上方）是屏幕把手，归工具自己拾
}

/** 拖动开始时记下的东西：移动 / 单轴缩放 = 抓点沿轴的参数；转动 = 起始方向；等比缩放 = 抓点离原点的屏距。 */
export interface XformGrab { handle: XformHandle; g0: XformGizmo; axis: Pt3; t0: number; dir0: Pt3 | null; }
/** 把手的那根轴（等比缩放块 su 没有轴，给 x 占位）。 */
export const axisOf = (h: XformHandle): AxisName => (h === "su" ? "x" : (h[1] as AxisName));
export function grabXform(g: XformGizmo, handle: XformHandle, pf: PointerFrame, vp: Viewport, sx: number, sy: number): XformGrab {
  const axis = g.axes[axisOf(handle)], ray = pf.ray(sx, sy, vp);
  if (handle === "su") { const q = pf.project?.(g.origin, vp); return { handle, g0: g, axis, t0: q ? Math.max(Math.hypot(q.x - sx, q.y - sy), 6) : 6, dir0: null }; }
  if (isPlaneHandle(handle)) {   // 平面块：抓点落在那个平面上，倍率按沿两轴对角线的距离比量（axis = 对角线方向）
    const { a, b, n } = planeAxes(handle), diag = normalize3(add3(g.axes[a], g.axes[b])), nn = g.axes[n];
    const q = rayPlane(ray.origin, ray.dir, nn, dot3(nn, g.origin)), t = q ? dot3(sub3(q, g.origin), diag) : 0;
    return { handle, g0: g, axis: diag, t0: Math.abs(t) < 1e-9 ? 1e-9 : t, dir0: null };
  }
  if (handle[0] === "m" || handle[0] === "s") { const q = closestOnAxis(g.origin, axis, ray.origin, ray.dir); const t = q ? dot3(sub3(q, g.origin), axis) : 0; return { handle, g0: g, axis, t0: handle[0] === "s" && Math.abs(t) < 1e-9 ? 1e-9 : t, dir0: null }; }
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
/** 缩放：单轴块 = 抓点沿轴到原点的距离比（过了原点 = 负数，镜像）；等比块 = 光标离原点的屏距比（≥ 0）。看不出来 → null。 */
export function dragScale(grab: XformGrab, pf: PointerFrame, vp: Viewport, sx: number, sy: number): number | null {
  if (grab.handle === "su") { const q = pf.project?.(grab.g0.origin, vp); return q ? Math.hypot(q.x - sx, q.y - sy) / grab.t0 : null; }
  const ray = pf.ray(sx, sy, vp);
  if (isPlaneHandle(grab.handle)) { const nn = grab.g0.axes[planeAxes(grab.handle).n], q = rayPlane(ray.origin, ray.dir, nn, dot3(nn, grab.g0.origin)); return q ? dot3(sub3(q, grab.g0.origin), grab.axis) / grab.t0 : null; }
  const q = closestOnAxis(grab.g0.origin, grab.axis, ray.origin, ray.dir);
  return q ? dot3(sub3(q, grab.g0.origin), grab.axis) / grab.t0 : null;
}

