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
/** 一根线：过 through、沿 dir（单位长，两头都画）；color = 哪根轴的颜色（n = 中性：锁的是一张斜面）。 */
export interface LockLine {
    readonly through: V3;
    readonly dir: V3;
    readonly color: LockAxisId | "n";
}
/** 线过哪一点：手势进行中 = 锚点（没有锚点的工具退到变换中心）；没在手势里 = 变换中心（调用方只在「这把工具对选区做事且有选区」时给）；都没有 = null（不画）。 */
export declare function lockThrough(gesture: boolean, anchor: V3 | null, pivot: V3 | null): V3 | null;
/** 锁着什么 → 画哪几根线（没锁 / 没有过的点 = []）。 */
export declare function lockLines(lock: LockNow, frame: LockFrame, through: V3 | null): LockLine[];
