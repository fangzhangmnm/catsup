import type { AxisConstraint, Vec3 } from "./axis-constraint.ts";
/** 工具认的那一对：axis = 只沿这根线；plane = 只在法向是它的面里。两个最多有一个。 */
export interface AxisPlaneLock {
    readonly axis: Vec3 | null;
    readonly plane: Vec3 | null;
}
/** 一维的工具（移动、挤出、偏移、画线）。 */
export declare function moveLock(c: AxisConstraint): AxisPlaneLock;
/** 旋转：转轴。 */
export declare function rotateLock(c: AxisConstraint): AxisPlaneLock;
/** 缩放。 */
export declare function scaleLock(c: AxisConstraint): AxisPlaneLock;
export interface AxisTriad {
    readonly x: Vec3;
    readonly y: Vec3;
    readonly z: Vec3;
}
/** 这根方向和坐标架哪根轴平行（同向反向都算；门槛 = feel.ts AXIS_PARALLEL_DEG，和语法模块同一个）；都不平行 = null。锁线的颜色、吸附种类叫 axis-x 还是 axis-dir 都问它。 */
export declare function frameAxisOf(d: Vec3, frame: AxisTriad): "x" | "y" | "z" | null;
/** 二维工具（矩形、圆、弧……）拿到约束 → 图形躺的那个面：法向 + 面里第一条边的方向（u = null = 边照默认）；null = 不限制（照默认的面）。
 *  plane = 那个面、边照默认；planeDir = 那个面、一条边顺着那个方向；line = 含这条线、最正对视线的面、一条边顺着这条线（这条线几乎正对视线 = 照默认）。
 *  toViewer = 从这里朝着看的人的方向（单位长）。设计稿 2.3 二维那一行 + 第一个边角。 */
export declare function shapePlane(c: AxisConstraint, toViewer: Vec3): {
    readonly normal: Vec3;
    readonly u: Vec3 | null;
} | null;
/** 旋转那一族（旋转、量角器）：转的那个面的法向 = rotateLock 给的转轴；null = 不限制。 */
export declare function rotatePlane(c: AxisConstraint): {
    readonly normal: Vec3;
    readonly u: null;
} | null;
