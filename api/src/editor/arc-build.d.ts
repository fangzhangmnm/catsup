import type { CurveSpec, Pt3 } from "../kernel/kernel.ts";
import type { DrawPlane } from "./pick.ts";
import type { Op } from "./ops.ts";
import type { PoolRef } from "../scene/scene.ts";
export type ArcMode = "two" | "center" | "three" | "pie";
export declare const ARC_MODES: readonly {
    id: ArcMode;
    label: string;
    hint: string;
}[];
/** 一个弧手势的量（世界坐标）：two / three 用 a b p；center / pie 用 center a sweep。 */
export interface ArcGesture {
    mode: ArcMode;
    plane: DrawPlane;
    a: Pt3;
    b?: Pt3;
    p?: Pt3;
    center?: Pt3;
    sweep?: number;
    segments: number;
}
export interface BuiltArc {
    segs: [Pt3, Pt3][];
    radii: [Pt3, Pt3][];
    spec: CurveSpec;
    center: Pt3;
    radius: number;
    sweep: number;
    end: Pt3;
}
export declare function buildArc(g: ArcGesture): BuiltArc | null;
/** 落定 op：弧段带曲线规格；扇面另加两条半径（普通边）→ 两个 op 一个 batch（一次撤销）。 */
export declare function arcOp(toLocal: (p: Pt3) => Pt3, at: PoolRef, built: BuiltArc): Op;
