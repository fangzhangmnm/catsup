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
/**
 * 「这个点被挡住了吗」——单击拾取和框选共用一台（2026-10-28 抽出来；纪元账本 FM44「X 光关着时框选只选看得见的」）。
 * 遮挡（2026-09-07 user「high：有时候选择会选到面后面的东西」）：与对齐引擎同一台 occludedBy（贴在膜面上的点不算挡）。
 * 屏幕索引（#22）：遮挡只看盖住这一点那一格的膜（超集，判定照旧）。X 光（DT17）= 永远不挡。
 * own = 这个点自己所在的面（点 = 连着的边两侧的面；边上的点 = 这条边两侧的面）：一个点不会被自己所在的面挡住。
 * 以前靠「贴在膜平面上」几何地判，网格体的面不平时角点不在那张面的拟合平面上，会被自己的邻面挡掉 = 点不中（user 10-27「有些侧面的点选不中」）；改按拓扑判。
 */
export declare function occlusionTest(k: GeomView, pf: PointerFrame, vp: Viewport, xray: boolean): (p: Pt3, own?: ReadonlySet<FaceId>) => boolean;
/** 一个点所在的面（连着的边两侧的面）。 */
export declare function facesAtVertex(k: GeomView, vid: VertexId): Set<FaceId>;
/** vertexPx = 点自己的半径（缺 = tolPx；自由建模给 MESH_VERT_HIT_PX 换算过的常量）。 */
export declare function pickEntity(k: GeomView, pf: PointerFrame, vp: Viewport, sx: number, sy: number, tolPx: number, opts?: {
    soft?: boolean;
    xray?: boolean;
    softActive?: boolean;
    vertexPx?: number;
}): HitResult3;
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
