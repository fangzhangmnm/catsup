import type { FaceId, Pt3, VertexId } from "../kernel/kernel.ts";
import type { GeomView } from "../scene/world-view.ts";
import { type Pt, type PlaneParams } from "../kernel/geom.ts";
import type { EpsSet, PointerFrame, Ray, Viewport } from "./pointer-frame.ts";
/** 绘图平面；face 有值 = 这张平面来自一张膜（首点面锁 / 含点膜），裸落其内报「面上」（SU On Face，2026-09-06 user：「还没有落笔的时候也应该显示面上的吸附」）。 */
export interface DrawPlane {
    plane: PlaneParams;
    basis: {
        u: Pt3;
        v: Pt3;
    };
    face?: FaceId;
}
export interface View {
    pf: PointerFrame;
    vp: Viewport;
}
export type AxName = "x" | "y" | "z" | "u" | "v";
export interface ConTag {
    kind: "endpoint" | "origin" | "midpoint" | "intersection" | "edge" | "cross" | "axis" | "align" | "plane";
    src?: Pt3;
    axis?: AxName;
}
export type Locus = {
    dim: 0;
    p: Pt3;
} | {
    dim: 1;
    a: Pt3;
    dir: Pt3;
    len?: number;
} | {
    dim: 2;
    plane: PlaneParams;
};
export interface Constraint {
    locus: Locus;
    rank: number;
    eps: number;
    tag: ConTag;
}
export declare const RANK: {
    readonly endpoint: 90;
    readonly origin: 80;
    readonly midpoint: 70;
    readonly intersection: 65;
    readonly edge: 60;
    readonly cross: 55;
    readonly axisLine: 45;
    readonly plane: 10;
};
export declare const EPS: {
    readonly point: 10;
    readonly edge: 7;
    readonly line: 3.5;
    readonly combo: 12;
};
/** 取点基准容差 / 实体拾取容差（单位同 EPS：fovY 的 1/800；编辑器与 frameEps 共用这一份）。 */
export declare const SNAP_PX = 8, HIT_PX = 6;
/** 第二点平面「近擦」容差（CSS px @800 高）：光标离含锚点膜的剪影这么近 = 仍算在那张膜上（滑出底边不翻面）。 */
export declare const PLANE_NEAR_PX = 24;
/**
 * ε 语义（user 2026-09-06「吸附的语义还是屏幕大小…height+aspect 这个老 gl convention」）：
 * 所有 ε 常量按 **800 px 高的视口**标定，实际使用按 `vp.h / 800` 等比缩放——等价于「fovY 的角度分数」
 * （透视：ε_px = θ/fovY·vp.h；正交拿 halfH 当"角度"换算，同一个式子）。屏幕越大圈越大，high-DPI 无关，
 * 宽屏/竖屏只看高度（aspect 只管横向裁剪）。测试/探针全用 h=800，数值一字不变。VR 把射线周围的角度空间
 * 当 800 px 高的虚拟屏即可复用。
 */
/** 1-D 轨迹与指针射线近平行（夹角 < 10°）→ 公垂点病态（射线每动 1° 点飞 1/sin ≈ 6×），该轨迹不参赛。
 *  2026-09-08 user「小屋子的侧面上画线的时候 z 轴对齐不见了」：朝北看时 Y 轴线与 Z 轴线在视线里重合、并列取 Y、点飞到 18 m 外。单位：度。 */
export declare const RAY_PARALLEL_DEG = 10;
export declare const REF_VP_H = 800;
export declare const epsScale: (vp: Viewport) => number;
/**
 * 本帧的容差集（A17）：帧自带 eps → 用它（VR：度常量，独立）；否则桌面 = EPS × (tolPx/8)，单位 = fovY 的 1/800（tolPx = SNAP·vp.h/800，
 * 即等比 epsScale——数值与旧「scale = tolPx/8」路径逐字相同）。planeNear/hit/tap/drag 同理。
 */
export declare function frameEps(pf: PointerFrame, vp: Viewport, tolPx: number): EpsSet;
export interface Solution {
    p: Pt3;
    dim: number;
    rank: number;
    d: number;
    used: Constraint[];
}
export declare function solvePoint(view: View, s: {
    x: number;
    y: number;
}, C: readonly Constraint[], opts?: {
    comboEps?: number;
    hidden?: (p: Pt3) => boolean;
    /** 1-D 轨迹遮挡裁剪：返回 [tMin,tMax] 内的被挡区间（见 occludedSpansOnLine）；不给=不裁 */
    spans1D?: (a: Pt3, dir: Pt3, tMin: number, tMax: number) => [number, number][];
}): Solution | null;
/** 手中集：拖拽中属于「手」的顶点谓词 + 手中膜的遮挡性（pp=opaque：光标在帽上背后无目标=SU 连续；
 *  move=transparent：落点必须可见）。触手膜/触手边/由它们派生的目标一律不参赛。 */
export interface AlignHand {
    has(vid: VertexId): boolean;
    opaque: boolean;
    /** 膜在手里（透明时豁免遮挡、不产面交线）。不给 = 由顶点推（触手膜）。draw 类工具应只报 BIRTH 出来的膜：
     *  DIVIDE 子膜与母膜同影柱，豁免它=母膜消失=背后几何露出来（2026-09-06 侧面拖矩形吸到背后底边案）。 */
    faces?(fid: FaceId): boolean;
}
/** 「空手」：没有任何手中集（首点查询、无手势的悬停、测试）。**必须显式表态**，不许省略——省略就是 2026-09-06「一 snap 一 snap」自吸事故的根。 */
export declare const NO_HAND: AlignHand;
/** 对齐查询（2026-09-03 整改收敛：exclude/skipFace/hiddenOverride/occluder/axes 五补丁参数退役）。
 *  世界 W 只有一个 = 调用方的现实（壳的 liveWorld()；旧 snapshot 结构性禁入——snap-model SSoT 立法节）。 */
export interface AlignQuery {
    plane: DrawPlane;
    anchor?: Pt3 | null;
    alignSources?: readonly Pt3[] | null;
    lines?: boolean;
    hand: AlignHand;
}
export interface SnapContext {
    k: GeomView;
    plane: PlaneParams;
    basis?: {
        u: Pt3;
        v: Pt3;
    } | null;
    pf?: PointerFrame | null;
    anchor?: Pt3 | null;
    alignSources?: readonly Pt3[] | null;
    lines?: boolean;
    hand?: AlignHand | null;
    /** 候选 ε（本帧量纲）；缺省 = solver.EPS（桌面 px @800）。 */
    eps?: {
        point: number;
        edge: number;
        line: number;
    } | null;
}
/** 膜遮挡：p 与眼睛之间隔着某膜（射线命中膜区域内部、t>ε）→ 被挡。贴在膜面上的点不算。（拾取 pick.ts 同用） */
export declare function occludedBy(k: GeomView, pf: PointerFrame, p: Pt3, skip?: (fid: FaceId) => boolean): boolean;
/**
 * 1-D 轨迹的膜遮挡 = **可见区间裁剪**（2026-09-03 抖动破案：逐点二值判会在剪影边界随光标横跳；
 * 0-D 点的可见性不随光标变所以二值判无害——user 直觉「边是一个 range」正解）。
 * 对每张膜求「影柱∩直线」：s(t)=到膜平面的视向距离是 t 的线性函数，q2(t)=命中点在膜基下的 2D 坐标
 * 是 t 的仿射函数 → 遮挡边界 = s(t)=ε 的根 ∪ q2(t) 与多边形边的交 → 子区间中点采样定内外。
 * 返回 [tMin,tMax] 内的**被挡**区间（升序、已合并）。
 */
export declare function occludedSpansOnLine(k: GeomView, pf: PointerFrame, a: Pt3, dir: Pt3, tMin: number, tMax: number, skip?: (fid: FaceId) => boolean): [number, number][];
/** 情境构建器：把内核现状 + 工具情境枚举成约束集（单一供餐律的物理化）。 */
export declare function buildConstraints(ctx: SnapContext): Constraint[];
/** 直线 p(t)=p0+t·d 与膜区域（外环−洞，even-odd）的相交 t 区间。环 pts 为该面基下 2D。 */
export declare function lineFaceIntervals(p0: Pt, d: Pt, rings: readonly (readonly Pt[])[]): [number, number][];
/** 面×面交线段（平面∩平面裁到两区域再取区间交）。 */
export declare function faceCrossSegments(k: GeomView, f1: import("../kernel/kernel.ts").FaceId, f2: import("../kernel/kernel.ts").FaceId): {
    a: Pt3;
    dir: Pt3;
    len: number;
}[];
export type SnapKind = "endpoint" | "midpoint" | "on-edge" | "origin" | "axis-x" | "axis-y" | "axis-z" | "align" | "align-combo" | "edge-align" | "intersection" | "cross-line" | "on-face" | "h-stop";
/** 1-DOF 约束的视觉提示：从源点到吸附点的虚线（SU from-point 同款）。 */
export interface SnapHint {
    a: Pt3;
    b: Pt3;
    axis: "x" | "y" | "z" | "u" | "v" | "i";
}
export interface Snap3 {
    p: Pt3;
    kind: SnapKind | null;
    hints?: SnapHint[];
}
/**
 * 取点吸附（脚手架，spec 级 snap 体系 parked）：
 * 点吸附赢者通吃：endpoint > midpoint > on-edge > 原点；
 * 其下 = **轴对齐 1-DOF 约束层**（2026-09-01 QoL 波，user 拍板设计）：
 *   源点 = anchor + 原点（永久源=坐标轴本体）+ 全部模型顶点（from-point「和点共轴」）；
 *   方向 = 画线平面基 u/v（+过 anchor 的世界 Z——竖直几何入口）；
 *   **正交双约束合成**（画笔手画矩形的闭合角点）> 单约束（屏距最近，anchor 源优先）。
 * 全约束组合（垂线/平行等）仍 parked——这里只开轴对齐子集，不碰通用求解器。
 * exclude：谓词=「这个顶点在手里/是预演新生的动态点」——它与它的边不参与吸附（WYSIWYG：吸静态世界）。
 * edited by Claude Fable 5 2026-09-01
 */
export declare function snapPoint(k: GeomView, pf: PointerFrame, vp: Viewport, sx: number, sy: number, tolPx: number, q: AlignQuery): Snap3;
/**
 * 宽锥三轴三选一（SU move 的方向推断；user 2026-09-07：「effectively 就是三个轴三选一，因为 360 度去掉六个 60 度的吸附 cone 也没剩下
 * 太多东西了。也许这样的话我们能做的纯激光笔，不需要手势」）：光标相对锚点在角度尺上的方向，与三条世界轴在锚点处的投影方向比，
 * 最小夹角 ≤ coneDeg（默认 30° = 六个 60° 锥）的轴胜出；点 = 射线到该轴的公垂点。射线与轴近平行（|cos| > 0.985）或轴在角度尺上
 * 投影退化 → 该轴不参赛。edited by Claude Fable 5.1 2026-09-07
 */
export declare function inferAxisByDirection(pf: PointerFrame, vp: Viewport, anchor: Pt3, sx: number, sy: number, coneDeg?: number): {
    axis: AxName;
    p: Pt3;
} | null;
/** 擦射线：射线与平面夹角 < minDeg → 交点会甩到无穷远，调用方保持上一帧（user 2026-09-07「最后会甩到顶面平面无限远的地方。这个是 bug」）。 */
export declare function grazing(plane: DrawPlane, ray: Ray, minDeg?: number): boolean;
/** 轴系平面本体（d=0）——自由落点兜底。 */
export declare function axisPlane(pf: PointerFrame): DrawPlane;
/** 过 through 的轴向平面（锚定在几何上的点用）。 */
export declare function cameraPlane(pf: PointerFrame, through: Pt3): DrawPlane;
/** 光标射线命中的第一张膜（最近者）的平面；没命中 → null。零 three、不经 pick.ts（避免环形 import）。 */
export declare function faceUnderCursor(k: GeomView, pf: PointerFrame, vp: Viewport, sx: number, sy: number): DrawPlane | null;
/**
 * 平面求解（字典序见文件头）。p1 无 = 首点查询（facePlane=调用方 raycast 的面锁候选）；
 * p1 有 = 第二点查询（含点平面拉动）。fixed=面锁成立（裸落膜内）。
 */
export declare function resolvePlane(k: GeomView, pf: PointerFrame, vp: Viewport, sx: number, sy: number, tolPx: number, opts: {
    p1?: Pt3 | null;
    facePlane?: DrawPlane | null;
    alignSources?: readonly Pt3[] | null;
    hand: AlignHand;
    /** 首点所在平面（如地面）：无膜承接时的兜底平面——不再按指针面向度挑轴平面（2026-09-07 VR：站着画远处地面俯仰 < 20° 就翻成竖直面 =「画线突然跳到空中」）。 */
    basePlane?: DrawPlane | null;
}): {
    plane: DrawPlane;
    fixed: boolean;
    snap: Snap3;
};
/** 薄壳（历史 API；语义=resolvePlane 第二点查询）。 */
export declare function resolveRectPlane(k: GeomView, pf: PointerFrame, vp: Viewport, p1: Pt3, sx: number, sy: number, tolPx: number, alignSources: readonly Pt3[] | undefined, hand: AlignHand, basePlane?: DrawPlane | null): {
    plane: DrawPlane;
    snap: Snap3;
};
