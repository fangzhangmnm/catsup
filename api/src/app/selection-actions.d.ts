import type { Editor } from "../editor/editor.ts";
import type { HudItem, HudModel } from "./ui/hud-model.ts";
export type MenuPlace = "empty" | "selection";
/** 显示什么（表的唯一出口）。groups = 选区里有组（组的进入 / 炸开 / 锁 / 藏照旧在几何层菜单里）。 */
export declare function menuItems(hud: HudModel, place: MenuPlace, opts?: {
    groups?: boolean;
}): HudItem[];
/** 子组件的物体菜单：对这几个物体的动词 + 「物体设置…」（开物体窗口、当前 = 它们）。 */
export declare function objectMenuItems(hud: HudModel): HudItem[];
/** 浮条（笔 / 手指）：和右键同一套读法——选中的只有组件 = 物体菜单；否则几何层（含组的那几项）。 */
export declare function barItems(editor: Editor, hud: HudModel): HudItem[];
export type SelectionRoute = "menu" | "bar";
/** 鼠标 → 菜单（右键就在手边）；笔 / 手指 → 浮条（零长按可发现）。 */
export declare function selectionRoute(lastPointerType: string): SelectionRoute;
