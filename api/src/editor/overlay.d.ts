import type { OverlayCtx, OverlayItem } from "../minccino/index.ts";
import type { ViewState } from "./view-state.ts";
/** 这一帧的全部叠加层（没有的组不出现 = 后端藏起来）。 */
export declare function overlayItems(view: ViewState, ctx: OverlayCtx): OverlayItem[];
