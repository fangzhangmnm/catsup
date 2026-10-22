import type { HudItem, HudModel } from "./ui/hud-model.ts";
/** 当前可做的选区动作（表的唯一出口）。 */
export declare function selectionActions(hud: HudModel): HudItem[];
export type SelectionRoute = "menu" | "bar";
/** 鼠标 → 菜单（右键就在手边）；笔 / 手指 → 浮条（零长按可发现）。 */
export declare function selectionRoute(lastPointerType: string): SelectionRoute;
