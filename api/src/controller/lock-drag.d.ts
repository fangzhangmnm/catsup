import type { Pt3 } from "../kernel/geom.ts";
export interface DragRay {
    readonly origin: Pt3;
    readonly dir: Pt3;
}
/** 射线和「过 through、法向 n 的平面」的交点；贴着面（|cos| ≤ minCos）或交在眼睛后面 = null。 */
export declare function rayOnPlane(r: DragRay, through: Pt3, n: Pt3, minCos?: number): Pt3 | null;
/** 锁面拖动一下最远走多少（世界长度）：rTop / rBottom = 画面上缘 / 下缘、和抓住的点同一列的两条射线；在「过 P0、垂直于 r0」的平面上量画面高 × LOCK_DRAG_MAX_SCREENS。 */
export declare function dragMaxLen(r0: DragRay, rTop: DragRay, rBottom: DragRay, p0: Pt3): number;
export interface DragResult {
    readonly d: Pt3;
    /** 锁面时视线贴着面（或交在眼睛后面）：退回了投影。 */
    readonly graze: boolean;
    /** 锁面时交点太远：夹在 maxLen。 */
    readonly clamped: boolean;
}
/**
 * 拖动的位移（见文件头）。r0 = 按下时光标的射线、r1 = 现在的；p0 = 抓住的点（世界）；axis / plane = 锁（单位长；都没有 = 不锁；axis 优先）；
 * maxLen = 锁面时位移最长多少（世界长度；调用方按画面大小给）。
 */
export declare function dragDelta(r0: DragRay, r1: DragRay, p0: Pt3, lock: {
    readonly axis: Pt3 | null;
    readonly plane: Pt3 | null;
}, maxLen: number): DragResult;
