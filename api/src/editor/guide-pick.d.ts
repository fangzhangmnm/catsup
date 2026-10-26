import type { Pt3 } from "../kernel/kernel.ts";
import type { GuidesWorld } from "../scene/guides.ts";
import type { PointerFrame, Viewport } from "./pointer-frame.ts";
export type GuidePick = {
    kind: "point" | "line" | "circle" | "sphere";
    id: number;
    d: number;
};
/** 圆在屏上的折线（拾取 / 画都用这么多段；量纲：段）。 */
export declare const CIRCLE_SEGS = 72;
/** 圆周上的点：圆心 c、法向 n、半径 r，第 i / segs 圈。 */
export declare function circlePoints(c: Pt3, n: Pt3, r: number, segs?: number): Pt3[];
/** 参考球画成三圈（过球心、分别垂直于 x / y / z）——拾取按离这三圈的屏距。 */
export declare const SPHERE_RINGS: readonly Pt3[];
export declare function pickGuide(G: GuidesWorld, pf: PointerFrame, vp: Viewport, sx: number, sy: number, tol: number): GuidePick | null;
/** 擦掉 ids 之后的参考几何（预演用：刮过的先从画面上消失）。 */
export declare function withoutGuides(G: GuidesWorld, ids: ReadonlySet<number>): GuidesWorld;
