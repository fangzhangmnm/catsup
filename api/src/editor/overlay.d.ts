import type { OverlayCtx } from "../minccino/index.ts";
import type { AuxItem } from "../look/aux.ts";
import type { ViewState } from "./view-state.ts";
/** 这一帧的全部辅助几何（没有的组不出现 = 后端藏起来）。 */
export declare function overlayItems(view: ViewState, ctx: OverlayCtx): AuxItem[];
