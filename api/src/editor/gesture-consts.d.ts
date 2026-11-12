import type { Pt3 } from "../kernel/geom.ts";
import type { EpsSet, PointerFrame, Viewport } from "./pointer-frame.ts";
export declare const SNAP_LABELS: Record<string, string>;
/** 手势最短长度（米）：短于它 = 没动。**正在退役**（统筹 11-12，做小零件：写死 1 厘米 = 放大做毫米零件时什么都拖不出来）——新代码问 gestureMinLen；
 *  剩下的四十来处在下一版逐个换掉（先分类：「手势动没动」→ gestureMinLen；「几何太小不成立」→ 几何容差）。没有屏幕的帧（VR）gestureMinLen 自己退回它。 */
export declare const MIN_GESTURE_LEN = 0.01;
/**
 * 这一处手势最短算多长（统筹 11-12 定的规矩：拖出来的东西「动没动」按屏幕像素判，不按世界长度）：拖动门槛（eps.drag，屏幕像素）换成 p 这一点的世界长度。
 * 放大看（一格几百像素）它很小，做毫米零件拖得出来；缩小看它大，手抖不会拖出一截。没有屏幕投影的帧（VR）= 退回 MIN_GESTURE_LEN。
 * 只管「拖的这一下算不算动了」；吸到的、取整出来的、键入的数不看它（只要几何上成立）。
 */
export declare function gestureMinLen(ctx: {
    frame(): PointerFrame;
    vp(): Viewport;
    eps(): EpsSet;
}, p: Pt3): number;
/** 几何上成立的最短长度 = 内核的身份分辨率（STICKY_R = 3 µm：再短内核也会把两个点并成一个）。吸到的、取整出来的、键入的数只看它（统筹 11-12）。 */
export declare const GEOM_MIN_LEN: number;
/**
 * 这一下够不够长（统筹 11-12 的规矩，B）：光标这一下有吸附结果（点 / 边 / 格点 / 整格……）= 只要几何上成立；自由拖的 = 不到这一处的手势门槛就当没动。
 * snapped 不给 = 问 ctx.currentSnap()（工具都把这一下的吸附结果写进 setSnap）。
 */
export declare function longEnough(ctx: {
    frame(): PointerFrame;
    vp(): Viewport;
    eps(): EpsSet;
    currentSnap(): {
        kind: string | null;
    } | null;
}, at: Pt3, len: number, snapped?: boolean): boolean;
