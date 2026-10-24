import type { Pt3 } from "../kernel/kernel.ts";
import type { Frame } from "../scene/xform.ts";
/** 与旋转工具同一套手感：15° 一档，离档 ≤ 1.5° 吸上去；参考点离圆心至少 1 cm。 */
export declare const PROT_STEP_DEG = 15, PROT_SNAP_DEG = 1.5, PROT_MIN = 0.01;
/** 点 q 相对参考方向（center→ref）绕 axis 的有向角（弧度，右手）。 */
export declare function angleAbout(center: Pt3, axis: Pt3, ref: Pt3, q: Pt3): number;
/** 咬合到 step 的整数倍（只在 |差| ≤ snap 时）。 */
export declare function detent(ang: number, stepDeg?: number, snapDeg?: number): {
    ang: number;
    snapped: boolean;
};
/** 参考方向绕 axis 转 ang 后的单位方向（Rodrigues；ref 先投到轴的垂面）。 */
export declare function rotateDir(center: Pt3, axis: Pt3, ref: Pt3, ang: number): Pt3;
/**
 * 轴向咬合（user 2026-10-24「旋转的时候坐标轴方向也有snap」）：参考方向转到与上下文某轴（±x / ±y / ±z 投到转动平面）平行时吸住。
 * 返回吸住后的角与那根轴；离最近轴向 > snapDeg → null。
 */
export declare function axisAlignAngle(center: Pt3, axis: Pt3, ref: Pt3, frame: Frame, ang: number, snapDeg?: number): {
    ang: number;
    axis: "x" | "y" | "z";
} | null;
/** 把点投到过 center、法向 axis 的平面上。 */
export declare function projectToAxisPlane(p: Pt3, center: Pt3, axis: Pt3): Pt3;
