import { type AxisConstraint, type AxisKey, type Vec3 } from "../controller/axis-constraint.ts";
export interface AxisFrame {
    readonly x: Vec3;
    readonly y: Vec3;
    readonly z: Vec3;
}
/** 编辑器给的口子（全是现问）。 */
export interface AxisKeysPorts {
    /** 动作在不在（手势进行中 / 键盘起手的模态中）。 */
    gestureActive(): boolean;
    /** 这把工具要几个方向（ToolHandler.axisWants，缺 = 1）。 */
    wants(): 1 | 2;
    /** 上下文坐标架的三根轴（世界）。 */
    axes(): AxisFrame;
    /** 按键这一刻光标下最近的那张面（法线 + 身份）/ 那条边（方向 + 身份）；没有 = null。 */
    faceUnder(): {
        readonly n: Vec3;
        readonly ref: string;
    } | null;
    edgeUnder(): {
        readonly dir: Vec3;
        readonly ref: string;
    } | null;
    /** 按钮锁着没有（全取消时说「回到按钮锁着的那个」还是「不限制」）。 */
    buttonLocked(): boolean;
}
export type AxisPressResult = {
    readonly ok: true;
    readonly say: string;
} | {
    readonly ok: false;
    readonly why: string;
};
export declare class AxisKeys {
    private readonly p;
    private s;
    private said;
    constructor(p: AxisKeysPorts);
    /** 按了一下：记进语法模块，回一句给人看的话（say 空 = 全取消了）；取不到方向 = 不变、说为什么。 */
    press(key: AxisKey, shift: boolean): AxisPressResult;
    /** 挂在手势读数后面的那句（这一下按过轴键才有；动作不在 = 空，顺手丢掉）。 */
    note(): string;
    /** 快捷键那份现在把动作限制成什么；动作不在 = 丢掉；没按过 / 全取消了 = null（调用方退回按钮锁着的那份）。 */
    now(): AxisConstraint | null;
    /** 这一下按着哪些轴键（右上角锁钮画空心框用：X / Y / Z = 方向钮，加 Shift = 面锁钮；N / T 没有钮）。动作不在 = 丢掉、空。 */
    keys(): readonly {
        readonly key: AxisKey;
        readonly shift: boolean;
    }[];
    /** 动作做完 / 取消 / 新的动作开始：丢掉。 */
    drop(): void;
}
