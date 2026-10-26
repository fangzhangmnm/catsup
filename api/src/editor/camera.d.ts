import type { Pt3 } from "../kernel/kernel.ts";
import type { PointerFrame, Ray, ScreenPt, Viewport } from "./pointer-frame.ts";
export type { Viewport } from "./pointer-frame.ts";
export type Projection = "ortho" | "persp";
/** 默认视野半高（米）：人体尺度——target 深度处看到约 8 m 高的世界（SU 开场那个人影的量级）。
 *  2026-09-07 VR 首轮反馈（user：「尺寸错了，进 vr 之后一格有可能 10 米甚至更大」）：此前 220 m 半高 + 50 m 网格是 lab 时代的
 *  无单位遗产，PC 上看着正常只因为相机站得远；VR 1:1 才露馅。内部单位米（A10 纪律），PC/VR 同一份网格 1 m。edited by Claude Fable 5.1 */
export declare const DEFAULT_HALF_H = 4;
/** zoom 下限（米）：SU 也常拿来做小零件 CAD（user 2026-09-07「下限还可以更小，很多人用 sketchup 做 cad 的」）。 */
export declare const HALF_H_MIN = 0.001;
export declare const HALF_H_MAX = 100000;
export declare class OrbitCamera implements PointerFrame {
    target: Pt3;
    yaw: number;
    pitch: number;
    halfH: number;
    projection: Projection;
    fovY: number;
    nearMin: number;
    /** target→eye 方向（单位）。 */
    eyeDir(): Pt3;
    /** 眼到 target 的距离（透视=由 halfH 与 fov 推出；正交=常数）。 */
    eyeDist(): number;
    eye(): Pt3;
    forward(): Pt3;
    right(): Pt3;
    up(): Pt3;
    /** 从 p 望向眼睛的单位方向（遮挡判定用；正交=eyeDir 常向量）。PointerFrame.viewDir。 */
    viewDir(p: Pt3): Pt3;
    orbit(dxPx: number, dyPx: number): void;
    pan(dxPx: number, dyPx: number, vp: Viewport): void;
    zoomBy(f: number): void;
    /** 透视的眼前钳位深度：nearMin 与眼距 5% 取小——贴近小零件时 near 跟着缩，投影/拾取不退化，渲染 near 也用它。 */
    nearClamp(): number;
    /** 朝光标缩放：target 深度平面上光标下的世界点保持钉在光标下（两制同式）。 */
    zoomAt(f: number, sx: number, sy: number, vp: Viewport): void;
    halfW(vp: Viewport): number;
    /** 世界 → 屏幕 px（桌面专属：框选与本类度量的内部算术；**不在 PointerFrame 契约里**——A17 后求解器只认度量）。透视：眼前 near 之内的点按 near 深度投影（有限值，不 NaN）。 */
    /** PointerFrame.project：屏幕索引用（= angularPx）。 */
    project(p: Pt3, vp: Viewport): {
        x: number;
        y: number;
    } | null;
    angularPx(p: Pt3, vp: Viewport): ScreenPt;
    distTo(x: number, y: number, p: Pt3, vp: Viewport): number;
    /**
     * 光标到线段 [a,b]（infinite = 过 a、b 的无限直线）的屏距 + 最近点在**原线段上的参数** t（0 = a、1 = b）。
     * 透视下精确（2026-10-26，user「还有哪些不精确的算法也一起查一下」「不应该写死特征长度」）：
     *   ① 线段先按近平面裁掉相机背后的那截（以前背后的点按近平面深度硬投，屏上方向是错的）；整段在背后 = 无穷远；
     *   ② 无限直线任取它在眼前的两点（深度 = 眼距、两倍眼距——随相机走，不写死长度）：屏上那条线和取哪两点无关，精确；
     *   ③ 屏上参数 → 线段参数做透视校正（屏上线性变化的是 1/深度）——以前直接把屏上参数当线段参数，拾取的遮挡判在偏了的点上。
     */
    distToSeg(x: number, y: number, a0: Pt3, b0: Pt3, vp: Viewport, infinite?: boolean): {
        d: number;
        t: number;
    };
    distBetween(p: Pt3, q: Pt3, vp: Viewport): number;
    distToRing(x: number, y: number, ring: readonly Pt3[], vp: Viewport): number;
    dirCos(x: number, y: number, anchor: Pt3, dirs: readonly Pt3[], vp: Viewport): (number | null)[];
    /** 屏幕 px → 世界拾取射线（PointerFrame.ray；正交：方向恒为 forward；透视：过眼点的发散射线）。 */
    ray(x: number, y: number, vp: Viewport): Ray;
    /** 视图预置（SU 视图菜单同款；yaw 以 +X 为 0、逆时针；pitch 正=俯视）。 */
    setView(name: "iso" | "top" | "bottom" | "front" | "right" | "back" | "left"): void;
    /** 缩放到包住一组点（空集=回原点默认尺度）。 */
    fitPoints(pts: readonly Pt3[], vp: Viewport, fallbackHalfH?: number): void;
}
/** 射线∩平面（n·p=d）；近平行 → null。 */
export declare function rayPlane(origin: Pt3, dir: Pt3, n: Pt3, d: number): Pt3 | null;
/** 过 anchor 沿 axisDir 的直线上，最接近射线 (r0,rd) 的点（两线公垂）；近平行 → null。 */
export declare function closestOnAxis(anchor: Pt3, axisDir: Pt3, r0: Pt3, rd: Pt3): Pt3 | null;
