// plane-gizmo.ts —— 场景里的「平面」操纵器（纯数学、零 DOM）。镜像面先用（user 2026-10-25「能不能做一个深模块gizmos……同时有一个gizmos确定mirror的轴。
// 拖动gizmos可以snap，然后也有把手for rotate and move」）；以后剖切面 / 对称面 / 光照方向都能用同一个。
// 把手：中心「移」（拖到吸附点上，平面跟着平移）/ 法线箭头「推」（沿法线推，悬停在点上就推到和那点齐平）/ 两条边中点「转」（绕面内的轴转，15° 一档、靠近帧的三轴吸正）。
// 尺寸按屏幕像素定（不随缩放变）；坐标一律世界系。渲染在 render3（ViewState.planeGizmo，透视画）。created 2026-10-25 by Claude Opus 5.5
import { type Pt3, add3, cross3, dot3, normalize3, scale3, sub3 } from "../kernel/geom.ts";
import type { PointerFrame, Viewport } from "./pointer-frame.ts";
import { closestOnAxis, rayPlane } from "./camera.ts";
import { type Frame, applyDir, rotationAbout } from "../scene/xform.ts";

export interface PlaneGizmo { origin: Pt3; normal: Pt3; }
export type GizmoHandle = "move" | "push" | "rotU" | "rotV";
/** 方块半边长（CSS px）。 */
export const GIZMO_PX = 64;
/** 把手捕获半径（CSS px）。 */
export const HANDLE_PX = 16;
/** 转动的档（度）。 */
export const ROT_STEP_DEG = 15;
/** 法线离帧的某根轴这么近（度）就吸正。 */
export const AXIS_SNAP_DEG = 4;

/** 面内两根轴（右手：u × v = n）；u 尽量水平。 */
export function gizmoBasis(n0: Pt3): { u: Pt3; v: Pt3 } {
  const n = normalize3(n0);
  const ref = Math.abs(n.z) < 0.9 ? { x: 0, y: 0, z: 1 } : { x: 1, y: 0, z: 0 };
  const u = normalize3(cross3(ref, n));
  return { u, v: cross3(n, u) };
}

/** 世界长度 / 屏幕 px（在 p 处）：投两点量。投不出来 → null。 */
export function worldPerPx(pf: PointerFrame, vp: Viewport, p: Pt3, u: Pt3): number | null {   // 变换 gizmo 共用（2026-10-26）
  if (!pf.project) return null;
  const a = pf.project(p, vp), b = pf.project(add3(p, u), vp);
  if (!a || !b) return null;
  const d = Math.hypot(a.x - b.x, a.y - b.y);
  return d > 1e-9 ? 1 / d : null;
}

export interface GizmoGeom { origin: Pt3; normal: Pt3; u: Pt3; v: Pt3; size: number; handles: Record<GizmoHandle, Pt3>; }
/** 这一帧的几何（世界）：方块半边长 size、四个把手的位置。 */
export function gizmoGeom(g: PlaneGizmo, pf: PointerFrame, vp: Viewport): GizmoGeom {
  const n = normalize3(g.normal), { u, v } = gizmoBasis(n);
  const wpp = worldPerPx(pf, vp, g.origin, u) ?? 0.01;
  const size = GIZMO_PX * wpp;
  return { origin: g.origin, normal: n, u, v, size, handles: { move: g.origin, push: add3(g.origin, scale3(n, size * 1.3)), rotU: add3(g.origin, scale3(v, size)), rotV: add3(g.origin, scale3(u, size)) } };
}

/** 光标下是哪个把手（屏距最近、在捕获半径内）；没有 → null。 */
export function hitGizmo(g: PlaneGizmo, pf: PointerFrame, vp: Viewport, sx: number, sy: number): GizmoHandle | null {
  const G = gizmoGeom(g, pf, vp);
  let best: GizmoHandle | null = null, bd = HANDLE_PX;
  for (const h of ["push", "rotU", "rotV", "move"] as GizmoHandle[]) {
    const d = pf.distTo(sx, sy, G.handles[h], vp);
    if (d <= bd) { bd = d; best = h; }
  }
  return best;
}

/** 拖动开始时记下的东西（推：抓点沿法线离原点多远；转：起始方向）。 */
export interface GizmoGrab { handle: GizmoHandle; g0: PlaneGizmo; t0?: number; dir0?: Pt3; axis?: Pt3; }
export function grabGizmo(g: PlaneGizmo, handle: GizmoHandle, pf: PointerFrame, vp: Viewport, sx: number, sy: number): GizmoGrab {
  const G = gizmoGeom(g, pf, vp), ray = pf.ray(sx, sy, vp);
  if (handle === "push") {
    const q = closestOnAxis(G.origin, G.normal, ray.origin, ray.dir);
    return { handle, g0: g, t0: q ? dot3(sub3(q, G.origin), G.normal) : 0 };
  }
  if (handle === "rotU" || handle === "rotV") {
    const axis = handle === "rotU" ? G.u : G.v;
    const q = rayPlane(ray.origin, ray.dir, axis, dot3(axis, G.origin));
    const dir0 = q ? normalize3(sub3(q, G.origin)) : (handle === "rotU" ? G.v : G.u);
    return { handle, g0: g, axis, dir0 };
  }
  return { handle, g0: g };
}

/**
 * 拖动中：按把手算新平面。move 由调用方给吸附点（snap）——平面平移到那点；push 沿法线、snap 给了就推到和它齐平；
 * rot 绕面内轴转、ROT_STEP_DEG 一档、靠近帧三轴吸正。
 */
export function dragGizmo(grab: GizmoGrab, pf: PointerFrame, vp: Viewport, sx: number, sy: number, opts: { snap?: Pt3 | null; frame?: Frame } = {}): PlaneGizmo {
  const g0 = grab.g0, n0 = normalize3(g0.normal);
  if (grab.handle === "move") return opts.snap ? { origin: opts.snap, normal: n0 } : g0;
  if (grab.handle === "push") {
    if (opts.snap) return { origin: add3(g0.origin, scale3(n0, dot3(sub3(opts.snap, g0.origin), n0))), normal: n0 };
    const ray = pf.ray(sx, sy, vp);
    const q = closestOnAxis(g0.origin, n0, ray.origin, ray.dir);
    if (!q) return g0;
    const t = dot3(sub3(q, g0.origin), n0) - (grab.t0 ?? 0);
    return { origin: add3(g0.origin, scale3(n0, t)), normal: n0 };
  }
  // 转
  const axis = grab.axis!, ray = pf.ray(sx, sy, vp);
  const q = rayPlane(ray.origin, ray.dir, axis, dot3(axis, g0.origin));
  if (!q) return g0;
  const d1 = normalize3(sub3(q, g0.origin)), d0 = grab.dir0!;
  let ang = Math.atan2(dot3(cross3(d0, d1), axis), dot3(d0, d1));
  const step = (ROT_STEP_DEG * Math.PI) / 180;
  ang = Math.round(ang / step) * step;
  let n = normalize3(applyDir(rotationAbout(g0.origin, axis, ang), n0));
  const F = opts.frame;
  if (F) {
    const cs = Math.cos((AXIS_SNAP_DEG * Math.PI) / 180);
    for (const a of [F.x, F.y, F.z]) { const c = dot3(n, a); if (Math.abs(c) >= cs) { n = c > 0 ? normalize3(a) : scale3(normalize3(a), -1); break; } }
  }
  return { origin: g0.origin, normal: n };
}
