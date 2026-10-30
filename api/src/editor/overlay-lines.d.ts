import type { OverlayCtx } from "../minccino/index.ts";
import type { AuxColor, AuxLines } from "../look/aux.ts";
import type { ViewState } from "./view-state.ts";
/** DT15 选中的组 / 组件的轴：每根短轴的屏幕长度（CSS px）。6c 从 render3 搬来（编辑器的内容，引擎不认识）。 */
export declare const POOL_AXES_PX = 22;
/** 锁着时画的轴线（controller/lock-guide.ts）两头各伸多长（屏幕 px，按线过的那一点的一像素多长换算）：够横穿画面，像 Blender 的无限长线。 */
export declare const LOCK_LINE_SPAN_PX = 2400;
/** 这一帧的线段族叠加层（没有的组不出现 = 后端藏起来）。 */
export declare function overlayLines(view: ViewState, ctx: OverlayCtx): AuxLines[];
/** 吸附种类 → 颜色角色（小球和提示线共用；值在画风表）。 */
export declare const SNAP_COLORS: Record<string, AuxColor>;
