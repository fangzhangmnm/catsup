import type { GuidesWorld } from "../scene/guides.ts";
import type { PointerFrame, Viewport } from "./pointer-frame.ts";
export type GuidePick = {
    kind: "point" | "line";
    id: number;
    d: number;
};
export declare function pickGuide(G: GuidesWorld, pf: PointerFrame, vp: Viewport, sx: number, sy: number, tol: number): GuidePick | null;
/** 擦掉 ids 之后的参考几何（预演用：刮过的先从画面上消失）。 */
export declare function withoutGuides(G: GuidesWorld, ids: ReadonlySet<number>): GuidesWorld;
