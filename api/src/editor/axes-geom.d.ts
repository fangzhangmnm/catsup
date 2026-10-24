import type { Pt3 } from "../kernel/kernel.ts";
import type { Frame } from "../scene/xform.ts";
export declare const AXES_MIN = 0.01;
/**
 * SU Axes 三下：原点 o → x 方向点 px → y 方向点 py。x = o→px；z = x × (o→py)（右手系）；y = z × x（把 py 正交化到 x 的垂面）。
 * py 与 x 共线时用 fallbackZ（通常 = 手势平面法向）定 z；fallbackZ 也与 x 共线 → null。
 */
export declare function frameFrom3(o: Pt3, px: Pt3, py: Pt3 | null, fallbackZ: Pt3): Frame | null;
