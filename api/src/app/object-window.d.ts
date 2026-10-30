import type { Editor, MenuTarget } from "../editor/editor.ts";
import type { HudModel } from "./ui/hud-model.ts";
import { type PopupMenuItem } from "./ui/popup-menu.ts";
import { type Machine } from "./machine-window.ts";
import type { MenuSpec } from "./ui/menu-window.ts";
export type ObjectTarget = Exclude<MenuTarget, "selection">;
/** 窗口要的（main.ts 给）：after = 改完刷 UI（syncUi）；openMachine = 开那台机器的板（修复页的「修复面板…」）。 */
export interface ObjectWindowDeps {
    after(): void;
    openMachine(m: Machine): void;
}
/** 物件窗口的菜单（弹出版和浮窗版共用一份）：页签（这一层 = 属性 + 露着的机器）+ 内容 + 点了做什么。 */
export declare function objectWindowMenu(editor: Editor, hud: HudModel, target: ObjectTarget, deps: ObjectWindowDeps): MenuSpec<string>;
/** 弹出版物件窗口（选中的子组件：物体菜单 / 浮条的「物体设置…」）。「这一层」常驻在浮窗里（main.ts objectWin = ui/menu-window.ts）。 */
export declare function openObjectWindow(editor: Editor, hud: HudModel, target: ObjectTarget, anchor: HTMLElement, deps: ObjectWindowDeps, align?: "start" | "end"): void;
/** 窗口里显示什么（纯函数：探针 / 测试也能问）。 */
export declare function objectWindowItems(editor: Editor, target: ObjectTarget): PopupMenuItem<string>[];
