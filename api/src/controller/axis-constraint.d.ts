export interface Vec3 {
    readonly x: number;
    readonly y: number;
    readonly z: number;
}
export type AxisKey = "x" | "y" | "z" | "n" | "t";
/** 一次按键。dir = 这个键此刻指的方向（调用方解析好；长度不要求是 1，这里归一）；ref = 它指的是谁（哪根轴 / 哪张面 / 哪条边的身份），只用来判「是不是同一个」。 */
export interface AxisPress {
    readonly key: AxisKey;
    readonly shift: boolean;
    readonly dir: Vec3;
    readonly ref: string;
}
declare const AXIS_STATE: unique symbol;
/** 模块自己的状态。不透明：外面只存、只传回来。 */
export type AxisState = {
    readonly [AXIS_STATE]: true;
};
/** 现在被限制成什么。工具只认这四种。 */
export type AxisConstraint = {
    readonly kind: "free";
} | {
    readonly kind: "line";
    readonly dir: Vec3;
} | {
    readonly kind: "plane";
    readonly normal: Vec3;
} | {
    readonly kind: "planeDir";
    readonly normal: Vec3;
    readonly dir: Vec3;
};
/** 一个动作开始时拿一份空的状态。wants = 这把工具要几个方向（画线 / 移动 / 挤出 / 旋转 / 缩放 = 1；矩形 / 圆 = 2）。 */
export declare function axisBegin(wants: 1 | 2): AxisState;
/** 按了一下之后的状态。换 / 加 / 取消 / 最多几条 / 谁盖谁，都在这里。 */
export declare function axisPress(s: AxisState, p: AxisPress): AxisState;
/** 现在被限制成什么。 */
export declare function axisConstraint(s: AxisState): AxisConstraint;
/** 给人看的：亮哪几个键（带不带 Shift，按先后）、一句话（提示行）。axes = 现在的坐标架（交线和某根轴平行时直接说「沿 Z」）。 */
export declare function axisDescribe(s: AxisState, axes?: {
    readonly x: Vec3;
    readonly y: Vec3;
    readonly z: Vec3;
}): {
    readonly keys: readonly {
        key: AxisKey;
        shift: boolean;
    }[];
    readonly say: string;
};
export {};
