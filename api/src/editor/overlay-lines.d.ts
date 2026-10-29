import type { OverlayCtx, OverlayLines } from "../minccino/index.ts";
/** 每组线的画法 = 引擎认的几个 GL 参数（线宽 CSS px / 深度模式 / 透明度 / 叠放次序）；**名字留在这里**，引擎那边没有样式表（刀 a，v0.17.17）。值 = 以前 LINE_STYLES 逐字搬来。 */
export type Look = Pick<OverlayLines, "widthPx" | "depth" | "alpha" | "layer" | "depthWrite" | "shared">;
export declare const LOOK: {
    readonly hint: Look;
    readonly arc: Look;
    readonly capsule: {
        readonly widthPx: 2.5;
        readonly depth: "through";
        readonly depthWrite: true;
        readonly layer: 9;
    };
    readonly protractor: Look;
    readonly guide: Look;
    readonly tape: Look;
    readonly knife: Look;
    readonly charged: Look;
    readonly soft: Look;
    /** 断口小垂线：线宽跟线稿粗细走（鼓包，不是另一种线）。 */
    readonly tick: {
        readonly widthPx: "edge";
        readonly depth: "visible";
    };
    readonly poolAxes: Look;
    readonly emptyAxes: Look;
    readonly originAxes: Look;
    readonly lock: Look;
    readonly gizmo: Look;
    readonly xg: Look;
    /** 选中 / 刮擦 / 悬停 / 检查的边（6c）：后端边线自己的材质（shared），定死最后画（layer 2）= 盖得住底下同材质的黑边。 */
    readonly edge: {
        readonly widthPx: 1.6;
        readonly depth: "visible";
        readonly layer: 2;
        readonly shared: "edge";
    };
    /** X 光下的选中边：透过面画（= 以前后端的 xrayOverlayMat：边线宽 + 1、不测深度）。 */
    readonly edgeXray: {
        readonly widthPx: 2.6;
        readonly depth: "through";
        readonly layer: 2;
    };
};
import type { ViewState } from "./view-state.ts";
/** DT15 选中的组 / 组件的轴：每根短轴的屏幕长度（CSS px）。6c 从 render3 搬来（编辑器的内容，引擎不认识）。 */
export declare const POOL_AXES_PX = 22;
/** 锁着时画的轴线（controller/lock-guide.ts）两头各伸多长（屏幕 px，按线过的那一点的一像素多长换算）：够横穿画面，像 Blender 的无限长线。 */
export declare const LOCK_LINE_SPAN_PX = 2400;
/** 这一帧的线段族叠加层（没有的组不出现 = 后端藏起来）。 */
export declare function overlayLines(view: ViewState, ctx: OverlayCtx): OverlayLines[];
/** 吸附种类 → 颜色（和 render3 的小球同一张表；提示线只用「axis」那几种和 hint 自带的轴）。 */
export declare const SNAP_COLORS: Record<string, number>;
