import type { EdgeId, FaceId, Pt3, VertexId } from "../kernel/kernel.ts";
import type { GeomView } from "../scene/world-view.ts";
import type { PointerFrame, Viewport } from "./pointer-frame.ts";
import { type DrawPlane, type Snap3 } from "./solver.ts";
export { type AlignHand, type AlignQuery, type DrawPlane, type Snap3, type SnapHint, type SnapKind, NO_HAND, axisPlane, cameraPlane, grazing, inferAxisByDirection, resolvePlane, resolveRectPlane, snapPoint } from "./solver.ts";
export declare const GROUND: DrawPlane;
export interface HitResult3 {
    vertex?: VertexId;
    edge?: EdgeId;
    face?: FaceId;
}
/** 实体拾取：顶点 > 边（度量距离：桌面 px / VR 度）> 面（射线求交，取沿射线最近者——正确遮挡序）。tolPx = 本帧量纲的容差。 */
export declare function pickEntity(k: GeomView, pf: PointerFrame, vp: Viewport, sx: number, sy: number, tolPx: number): HitResult3;
/** 只拾膜（射线最近命中）：推拉/删面这类「面动词」用——不走顶点>边>面优先级，否则细面（屏上几像素宽）
 *  任何位置都在边的 HIT 圈内、边永远赢、面永远拾不到（2026-09-07 user「推拉的时候拾取不到细的面」）。SU 推拉同款只认面。 */
export declare function pickFace(k: GeomView, pf: PointerFrame, vp: Viewport, sx: number, sy: number): FaceId | undefined;
/** 画线平面：光标下的面 → 它的平面；否则地面。 */
export declare function drawPlaneAt(k: GeomView, pf: PointerFrame, vp: Viewport, sx: number, sy: number): DrawPlane;
/**
 * 首点平面裁决（薄壳：face raycast 探测 + resolvePlane 首点查询；元逻辑三律见 solver 头注释）。
 * 返回 plane=本帧用平面、fixed=面锁候选（裸落膜内才非 null）。
 */
export declare function rectFirstPlane(k: GeomView, pf: PointerFrame, vp: Viewport, sx: number, sy: number, tolPx: number, alignSources?: readonly Pt3[]): {
    fixed: DrawPlane | null;
    plane: DrawPlane;
    snap: Snap3;
};
