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
