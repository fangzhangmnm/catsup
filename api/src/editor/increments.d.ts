import type { Pt3 } from "../kernel/geom.ts";
/** 整角的档（度）。量纲：度。 */
export declare const INCREMENT_DEG = 15;
/** 格点吸附的有效开关：右上锁钮的状态，按住 Shift 反过来。 */
export declare const gridEffective: (on: boolean, shift: boolean) => boolean;
/** t0 最近的整格（step 的整数倍）。 */
export declare const nearestStep: (t0: number, step: number) => number;
/** 平面内（u / v 正交单位基）从 anchor 指向 p 的方向咬到 stepDeg 的整数倍（参考方向 = u）：返回同半径的点 + 角度（度）。 */
export declare function snapDirectionInPlane(anchor: Pt3, p: Pt3, basis: {
    u: Pt3;
    v: Pt3;
}, stepDeg?: number): {
    p: Pt3;
    deg: number;
};
/**
 * 一个标量（推拉高度 / 偏移距离 / 旋转角 / 倍率…）咬到 step 的整数倍——**有捕捉阈**：咬过去的点离光标在 near 判定里才咬，否则原样。
 * at(v) = 这个值对应的世界点（用来量屏距）；near(p) = 屏距在吸附半径内。
 */
export declare function snapScalar(v: number, step: number, at: (v: number) => Pt3, near: (p: Pt3) => boolean): number | null;
