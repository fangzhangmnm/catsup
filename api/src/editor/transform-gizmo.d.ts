import { type Pt3 } from "../kernel/geom.ts";
import type { PointerFrame, Viewport } from "./pointer-frame.ts";
export type AxisName = "x" | "y" | "z";
export type XformHandle = "mx" | "my" | "mz" | "rx" | "ry" | "rz" | "sx" | "sy" | "sz" | "su";
/** 等比缩放块：轴心在屏上的位置往右、往上各这么多（CSS px）。 */
export declare const XG_UNIFORM_OFFSET_PX = 34;
export declare const AXIS_NAMES: readonly AxisName[];
/** 箭头长（CSS px）。 */
export declare const XG_ARROW_PX = 72;
/** 箭头从原点外多少开始算把手（CSS px；里面那段让给缩放块）。 */
export declare const XG_ARROW_START_PX = 44;
/** 单轴缩放块在轴上离原点多远（CSS px）（2026-10-26，user「我们也需要scale的手柄」）。中心点 = 移动、等比缩放块在中心右上方（屏幕把手，工具自己拾）。 */
export declare const XG_SCALE_PX = 28;
/** 缩放块半边长（CSS px，画用；拾取按点）。 */
export declare const XG_CUBE_PX = 5;
/** 旋转环半径（CSS px）：大过箭头（Blender 同款，环在外圈）——环和箭头不相交，抓的时候不含糊。 */
export declare const XG_RING_PX = 92;
/** 环画多少段。 */
export declare const XG_RING_SEGS = 48;
/** 一个变换 gizmo：原点 + 三根单位轴（上下文帧）。 */
export interface XformGizmo {
    origin: Pt3;
    axes: Readonly<Record<AxisName, Pt3>>;
}
/** 这一帧的几何（世界）：箭头长、环半径、箭头起点、缩放块位置 / 半边长。 */
export interface XformGizmoGeom extends XformGizmo {
    arrow: number;
    ring: number;
    start: number;
    cube: number;
    cubeHalf: number;
}
export declare function xformGizmoGeom(g: XformGizmo, pf: PointerFrame, vp: Viewport): XformGizmoGeom;
/** 绕 axis 的环上的点（闭合：首尾相同）。 */
export declare function ringPoints(G: XformGizmoGeom, ax: AxisName): Pt3[];
/** 光标下每个把手的屏距（箭头 = 到箭杆、环 = 到环线）+ 离相机的深度（叠在一起时近的赢）。 */
export declare function hitXformGizmo(g: XformGizmo, pf: PointerFrame, vp: Viewport, sx: number, sy: number): {
    handle: XformHandle;
    d: number;
    z: number;
}[];
/** 拖动开始时记下的东西：移动 / 单轴缩放 = 抓点沿轴的参数；转动 = 起始方向；等比缩放 = 抓点离原点的屏距。 */
export interface XformGrab {
    handle: XformHandle;
    g0: XformGizmo;
    axis: Pt3;
    t0: number;
    dir0: Pt3 | null;
}
/** 把手的那根轴（等比缩放块 su 没有轴，给 x 占位）。 */
export declare const axisOf: (h: XformHandle) => AxisName;
export declare function grabXform(g: XformGizmo, handle: XformHandle, pf: PointerFrame, vp: Viewport, sx: number, sy: number): XformGrab;
/** 移动：沿轴从抓点算起走了多远（世界长度）；射线和轴平行 → null。 */
export declare function dragMove(grab: XformGrab, pf: PointerFrame, vp: Viewport, sx: number, sy: number): number | null;
/** 转动：从起始方向转到光标方向的有向角（弧度，(−π, π]，右手绕轴）；看不出来 → null。连续化归调用方（unwrapAngle）。 */
export declare function dragRotate(grab: XformGrab, pf: PointerFrame, vp: Viewport, sx: number, sy: number): number | null;
/** 缩放：单轴块 = 抓点沿轴到原点的距离比（过了原点 = 负数，镜像）；等比块 = 光标离原点的屏距比（≥ 0）。看不出来 → null。 */
export declare function dragScale(grab: XformGrab, pf: PointerFrame, vp: Viewport, sx: number, sy: number): number | null;
