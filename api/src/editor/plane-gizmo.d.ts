import { type Pt3 } from "../kernel/geom.ts";
import type { PointerFrame, Viewport } from "./pointer-frame.ts";
import { type Frame } from "../scene/xform.ts";
export interface PlaneGizmo {
    origin: Pt3;
    normal: Pt3;
}
export type GizmoHandle = "move" | "push" | "rotU" | "rotV";
import { GIZMO_PX, HANDLE_PX, ROT_STEP_DEG, AXIS_SNAP_DEG } from "../controller/feel.ts";
export { GIZMO_PX, HANDLE_PX, ROT_STEP_DEG, AXIS_SNAP_DEG };
/** 面内两根轴（右手：u × v = n）；u 尽量水平。 */
export declare function gizmoBasis(n0: Pt3): {
    u: Pt3;
    v: Pt3;
};
/**
 * 世界长度 / 屏幕 px（在 p 处）：沿垂直于视线的方向投两点量。投不出来 → null。变换 gizmo / 空组件标记共用（2026-10-26）。
 * 量尺方向不由调用方给（2026-10-28 user「硬表面的镜像的gizmos大小不应该随着视口乱动」：以前镜像面把手沿面内的轴量，
 * 那根轴斜着朝镜头时投影变短 → 算出来的把手巨大、转一下视角就忽大忽小；变换 gizmo 10-26 修过同一个坑，这回收进函数里）。
 */
export declare function worldPerPx(pf: PointerFrame, vp: Viewport, p: Pt3): number | null;
export interface GizmoGeom {
    origin: Pt3;
    normal: Pt3;
    u: Pt3;
    v: Pt3;
    size: number;
    handles: Record<GizmoHandle, Pt3>;
}
/** 这一帧的几何（世界）：方块半边长 size、四个把手的位置。 */
export declare function gizmoGeom(g: PlaneGizmo, pf: PointerFrame, vp: Viewport): GizmoGeom;
/** 光标下是哪个把手（屏距最近、在捕获半径内）；没有 → null。 */
export declare function hitGizmo(g: PlaneGizmo, pf: PointerFrame, vp: Viewport, sx: number, sy: number): GizmoHandle | null;
/** 拖动开始时记下的东西（推：抓点沿法线离原点多远；转：起始方向）。 */
export interface GizmoGrab {
    handle: GizmoHandle;
    g0: PlaneGizmo;
    t0?: number;
    dir0?: Pt3;
    axis?: Pt3;
}
export declare function grabGizmo(g: PlaneGizmo, handle: GizmoHandle, pf: PointerFrame, vp: Viewport, sx: number, sy: number): GizmoGrab;
/**
 * 拖动中：按把手算新平面。move 由调用方给吸附点（snap）——平面平移到那点；push 沿法线、snap 给了就推到和它齐平；
 * rot 绕面内轴转、ROT_STEP_DEG 一档、靠近帧三轴吸正。
 */
export declare function dragGizmo(grab: GizmoGrab, pf: PointerFrame, vp: Viewport, sx: number, sy: number, opts?: {
    snap?: Pt3 | null;
    frame?: Frame;
}): PlaneGizmo;
