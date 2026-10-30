import type { OverlayCtx, OverlayItem, OverlayLines, OverlayMarker, Vec3 } from "../minccino/index.ts";
/** 标准色板：每个颜色角色一个值（0xRRGGBB，sRGB）。画风覆盖其中几项（STYLE_AUX.palette）。 */
declare const STANDARD_PALETTE: {
    readonly ink: 1118481;
    readonly neutral: 8947848;
    readonly disabled: 9079434;
    readonly edge: 2763306;
    readonly selected: 2845872;
    readonly scrub: 13382451;
    readonly warn: 14251782;
    readonly axisX: 13382451;
    readonly axisY: 3050327;
    readonly axisZ: 2845872;
    readonly gizmoX: 13382451;
    readonly gizmoY: 3050327;
    readonly gizmoZ: 2845872;
    readonly construct: 9133302;
    readonly chargedExt: 13947125;
    readonly mirror: 9133302;
    readonly guide: 7041664;
    readonly softEdge: 7237230;
    readonly vert: 2763306;
    readonly faceDotOn: 5663941;
    readonly faceDotOff: 5526612;
    readonly gizmo: 2845872;
    readonly gizmoHot: 14251782;
    readonly gizmoUniform: 7829367;
    readonly gizmoCenter: 3355443;
    readonly angle: 14251782;
    readonly handle: 3050327;
    readonly handleHot: 14251782;
    readonly ok: 3050327;
    readonly bad: 13382451;
    readonly snapEndpoint: 3050327;
    readonly snapMid: 42405;
    readonly snapEdge: 13382451;
    readonly snapFace: 2845872;
    readonly snapInfer: 9133302;
    readonly snapIntersect: 1118481;
    readonly snapStep: 14251782;
    readonly snapGuide: 7041664;
    readonly snapGrid: 10265519;
    readonly labelInk: 8025967;
    readonly paper: 15921386;
};
export type AuxColor = keyof typeof STANDARD_PALETTE;
/** 每行 = 小栗鼠认的 GL 量；stage / resolution 缺省（= 跟内容一起、主分辨率）就不写——写了就是白名单上的一行（守卫测试逐行打印）。 */
type LineLook = Pick<OverlayLines, "widthPx" | "depth" | "alpha" | "layer" | "depthWrite" | "shared" | "stage" | "resolution">;
declare const LINE_LOOKS: {
    readonly snapHint: LineLook;
    readonly teleportArc: LineLook;
    readonly capsule: {
        readonly widthPx: 2.5;
        readonly depth: "through";
        readonly depthWrite: true;
        readonly layer: 9;
    };
    readonly protractor: LineLook;
    readonly guide: LineLook;
    readonly tape: LineLook;
    readonly knife: LineLook;
    readonly charged: LineLook;
    readonly softEdge: {
        readonly widthPx: 1;
        readonly depth: "visible";
    };
    /** 断口小垂线 / 轴刻度：线宽跟线稿粗细走（鼓包，不是另一种线）。 */
    readonly tick: {
        readonly widthPx: "edge";
        readonly depth: "visible";
    };
    readonly poolAxes: LineLook;
    readonly emptyAxes: LineLook;
    readonly originAxes: LineLook;
    readonly lock: LineLook;
    readonly planeGizmo: LineLook;
    readonly xformGizmo: LineLook;
    /** 线块里没有的高亮边（被刮擦 / 检查标的软边）：后端边线自己的材质（shared），定死最后画（layer 2）。 */
    readonly markedEdge: {
        readonly widthPx: 1.6;
        readonly depth: "visible";
        readonly layer: 2;
        readonly shared: "edge";
    };
    /** 世界里的字（折线；排版在 translateAux 里）。 */
    readonly text: {
        readonly widthPx: 1;
        readonly depth: "visible";
        readonly layer: 3;
    };
};
declare const POINT_LOOKS: {
    readonly selVert: {
        readonly sizePx: 9;
        readonly shape: "round";
        readonly pull: 0.994;
        readonly depth: "visible";
        readonly layer: 4;
        readonly stage: 1;
    };
    readonly vert: {
        readonly sizePx: 5;
        readonly shape: "round";
        readonly pull: 0.996;
        readonly depth: "visible";
        readonly layer: 3;
        readonly stage: 1;
    };
    readonly faceDot: {
        readonly sizePx: 6;
        readonly shape: "square";
        readonly pull: null;
        readonly depth: "through";
        readonly alpha: 0.9;
        readonly layer: 5;
        readonly stage: 1;
    };
    readonly seam: {
        readonly sizePx: 7;
        readonly shape: "round";
        readonly pull: 0.995;
        readonly depth: "visible";
        readonly layer: 3.5;
        readonly stage: 1;
    };
};
declare const MARKER_LOOKS: {
    readonly snap: {
        readonly geom: "sphere";
        readonly depth: "visible";
    };
    readonly landing: {
        readonly geom: "ring";
        readonly depth: "through";
        readonly depthWrite: true;
        readonly alpha: 0.85;
        readonly doubleSide: true;
        readonly layer: 9;
    };
    readonly handle: {
        readonly geom: "box";
        readonly depth: "through";
        readonly layer: 10;
    };
    readonly xgCube: {
        readonly geom: "box";
        readonly depth: "through";
        readonly layer: 12;
    };
    readonly xgCenter: {
        readonly geom: "sphereHalf";
        readonly depth: "through";
        readonly layer: 12;
    };
    readonly xgCone: {
        readonly geom: "cone";
        readonly depth: "through";
        readonly layer: 12;
    };
    readonly xgPlane: {
        readonly geom: "plane";
        readonly depth: "through";
        readonly alpha: 0.85;
        readonly doubleSide: true;
        readonly layer: 12;
    };
};
declare const TRI_LOOKS: {
    readonly gizmoQuad: {
        readonly alpha: 0.12;
        readonly doubleSide: true;
        readonly depth: "through";
        readonly layer: 10;
    };
    /** 字的底板。 */
    readonly textPlate: {
        readonly doubleSide: true;
        readonly depth: "visible";
        readonly layer: 2.9;
    };
};
declare const TEXT_LOOKS: {
    /** 空场景 X 轴上一格处的「1 m」（以前的位图字样式 scale：11 px、#7a776f、底色 = 背景、留白 3 / 1）。 */
    readonly unitLabel: {
        readonly emPx: 11;
        readonly minMainPx: 8;
        readonly padX: 3;
        readonly padY: 1;
        readonly ink: "labelInk";
        readonly plate: "paper";
    };
};
export type LineRole = keyof typeof LINE_LOOKS;
export type PointRole = keyof typeof POINT_LOOKS;
export type MarkerRole = keyof typeof MARKER_LOOKS;
export type TriRole = keyof typeof TRI_LOOKS;
export type TextRole = keyof typeof TEXT_LOOKS;
/** 一组线段（世界坐标，a b 成对）：colors = 每段一个颜色角色；没给 = 整组 color。 */
export interface AuxLines {
    readonly kind: "lines";
    readonly role: LineRole;
    readonly id: string;
    readonly key: string;
    readonly positions: readonly number[];
    readonly colors?: readonly AuxColor[];
    readonly color?: AuxColor;
}
/** 一组点：colors = 每点一个颜色角色；没给 = 整组 color。 */
export interface AuxPoints {
    readonly kind: "points";
    readonly role: PointRole;
    readonly id: string;
    readonly key: string;
    readonly positions: readonly number[];
    readonly colors?: readonly AuxColor[];
    readonly color?: AuxColor;
}
export interface AuxMarker {
    readonly kind: "marker";
    readonly role: MarkerRole;
    readonly id: string;
    readonly at: OverlayMarker["at"];
    readonly scale: OverlayMarker["scale"];
    readonly color: AuxColor;
    readonly orient?: OverlayMarker["orient"];
}
export interface AuxTris {
    readonly kind: "tris";
    readonly role: TriRole;
    readonly id: string;
    readonly key: string;
    readonly positions: readonly number[];
    readonly color: AuxColor;
}
/** 世界里的一行字：挂在 at、面朝相机、固定屏幕大小；anchor = 字在点的哪一侧，gapPx = 和点之间留几 CSS px。 */
export interface AuxText {
    readonly kind: "text";
    readonly role: TextRole;
    readonly id: string;
    readonly text: string;
    readonly at: Vec3;
    readonly anchor: "below" | "above" | "left" | "right" | "center";
    readonly gapPx?: number;
}
export type AuxItem = AuxLines | AuxPoints | AuxMarker | AuxTris | AuxText;
/** 这个画风里一个颜色角色的值（底板色没被覆盖时跟画风的背景色走）。选中 / 将删 / 检查不在这：引擎每帧算好放在 ctx.status（视口设置 > 画风 > 全局默认、闪已换好），translateAux 直接用。 */
export declare function auxColor(style: string, c: AuxColor): number;
/** 编辑器的语义项 → 小栗鼠的辅助几何项（按 ctx.style 这个画风查表；字按 ctx 的量尺排）。键带上画风：换画风 = 颜色可能变了，后端重建。 */
export declare function translateAux(items: readonly AuxItem[], ctx: OverlayCtx): OverlayItem[];
export {};
