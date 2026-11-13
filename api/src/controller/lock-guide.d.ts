import type { AxisConstraint } from "./axis-constraint.ts";
export interface V3 {
    readonly x: number;
    readonly y: number;
    readonly z: number;
}
export type LockAxisId = "x" | "y" | "z";
/** 编辑器现在的锁（同一时刻只有一种：轴锁和面锁互斥）。planeN = 面锁的法向（世界、单位长）。 */
export interface LockNow {
    readonly axis: LockAxisId | null;
    readonly plane: LockAxisId | "face" | null;
    readonly planeN: V3 | null;
}
/** 上下文坐标架的三根轴（世界；可能带缩放，这里归一）。 */
export interface LockFrame {
    readonly x: V3;
    readonly y: V3;
    readonly z: V3;
}
/** 一根线：过 through、沿 dir（单位长，两头都画）；color = 哪根轴的颜色（dir = 锁住的方向不和任何一根轴平行；n = 中性：斜面里撑开的另一根）。 */
export interface LockLine {
    readonly through: V3;
    readonly dir: V3;
    readonly color: LockAxisId | "dir" | "n";
}
/** 线过哪一点：手势进行中 = 锚点（没有锚点的工具退到变换中心）；没在手势里 = 变换中心（调用方只在「这把工具对选区做事且有选区」时给）；都没有 = null（不画）。 */
export declare function lockThrough(gesture: boolean, anchor: V3 | null, pivot: V3 | null): V3 | null;
/** 按钮锁（编辑器每把工具记着的那份）读成约束：锁轴 = 沿坐标架那根轴；锁轴面 = 法向是那根轴的面；锁「按下那张面」= 那张面；没锁 = 不限制。 */
export declare function lockConstraint(lock: LockNow, frame: LockFrame): AxisConstraint;
/** 现在被限制成什么 → 画哪几根线（不限制 / 没有过的点 = []）。沿线 = 一根；在面里 = 面里两根；面里一个方向 = 那个方向一根 + 面里和它垂直的一根。 */
export declare function constraintLines(c: AxisConstraint, frame: LockFrame, through: V3 | null): LockLine[];
