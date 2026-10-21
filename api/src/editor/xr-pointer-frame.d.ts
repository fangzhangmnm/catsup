import type { Pt3 } from "../kernel/kernel.ts";
import type { EpsSet, PointerFrame, Ray, ScreenPt, Viewport } from "./pointer-frame.ts";
/** 光标坐标的名义载体（不是屏幕）：编辑器把指针位置存成 (x, y)，VR 里恒为正中。 */
export declare const XR_NOMINAL_VP: Viewport;
/** VR 容差集（度）。独立常量，各自 playtest；手柄姿态抖动量级 ≈ 0.5°。 */
export declare const EPS_VR_DEG: EpsSet;
export declare class XRPointerFrame implements PointerFrame {
    private origin;
    private dir;
    private headDir;
    private downDir;
    /** 每帧喂手柄射线（世界坐标）；headDir = 头显前向（只喂 forward() = 选对齐平面；命中/角距/遮挡全从手）。 */
    set(ray: Ray, _upHint?: Pt3, headDir?: Pt3): void;
    current(): Ray;
    cursor(): ScreenPt;
    markDown(): void;
    /** 自落笔以来射线转过的角度（度）——编辑器的「动没动」判据（与 eps.tap / eps.drag 同量纲）。 */
    travel(): number;
    private u;
    private angDeg;
    ray(_x: number, _y: number, _vp: Viewport): Ray;
    distTo(_x: number, _y: number, p: Pt3, _vp?: Viewport): number;
    distToSeg(_x: number, _y: number, a: Pt3, b: Pt3, _vp: Viewport, infinite?: boolean): {
        d: number;
        t: number;
    };
    distBetween(p: Pt3, q: Pt3, _vp?: Viewport): number;
    distToRing(_x: number, _y: number, ring: readonly Pt3[], vp: Viewport): number;
    dirCos(_x: number, _y: number, anchor: Pt3, dirs: readonly Pt3[], _vp?: Viewport): (number | null)[];
    viewDir(p: Pt3): Pt3;
    /** 平面挑选用的前向 = 头（没有头显姿态时退回手）。 */
    forward(): Pt3;
    eps(): EpsSet;
}
