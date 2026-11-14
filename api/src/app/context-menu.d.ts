import type { Editor } from "../editor/editor.ts";
import type { HudItem, HudModel } from "./ui/hud-model.ts";
import { type PopupMenuItem } from "./ui/popup-menu.ts";
/**
 * 在画布点 (x, y)（client 坐标 cx, cy）右键（2026-10-28 按层分，UX 心智模型 §2.2）：点在空处且没选区 = 新建 / 回上一层；点在几何上 = 几何层动词（不在选区就先选它）；
 * 点在空处但有选区 = 选区的菜单；点到 / 选着的只有组件 = 它们的物体菜单（动词 + 「物体设置…」）。没有可做的就不弹。
 */
export declare function openContextMenuAt(editor: Editor, hud: HudModel, x: number, y: number, cx: number, cy: number): void;
/** 表 → 右键菜单的行：带 submenu 的几项按子菜单名并成一行（摆在第一项的位置），其余原样。 */
export declare function foldSubmenus(items: readonly HudItem[]): PopupMenuItem[];
/** 选区的菜单（和右键同一份），挂在一个按钮上弹（笔 / 手指的右下「更多…」；user 10-28 夜「可选操作应该放到右键菜单里而不是全堆在马后炮」）。 */
export declare function openSelectionMenu(editor: Editor, hud: HudModel, anchor: HTMLElement): void;
/**
 * 右键菜单里某个子菜单那几项，单独挂在一个按钮旁边弹（缩放工具右下角「压平…」= 右键「压平 ›」同一份；W-5 2026-11-10 Claude Opus 5.5）。
 * 工具条点完会整条重画、按钮换掉，所以不挂在按钮上：把右键用的那个 0×0 锚点（ctxAnchor）摆到按钮的位置再弹。没有可做的就不弹。
 */
/** 右键菜单里某个子菜单现在有哪几项（露不露 = 放置表的工作台 + 指令数出来的个数，app 层不另判工作台；W-5）。 */
export declare function submenuItems(hud: HudModel, label: string): PopupMenuItem[];
export declare function openSubmenuAt(hud: HudModel, btn: HTMLElement, label: string): void;
/**
 * 动作外按 X（键表 delete.menu；统筹 11-13 按 user「动作里外」那条线定，锁的一轮第二步）：在光标处弹「删除 / 溶解」，不立刻删、也不是不做。
 * 溶解只在网格体里选着边 / 点（没有面）时露：网格体面的溶解、硬表面的溶解都没有现成的命令（照统筹「没有现成的就先不放那一项」，已报统筹）。没有选区 = 不弹（main.ts 先说一句）。
 */
export declare function openDeleteMenuAt(editor: Editor, cx: number, cy: number): void;
