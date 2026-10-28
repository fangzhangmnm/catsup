import type { Editor } from "../editor/editor.ts";
import type { HudItem, HudModel } from "./ui/hud-model.ts";
import { type PopupMenuItem } from "./ui/popup-menu.ts";
/** 在画布点 (x, y)（client 坐标 cx, cy）弹菜单。没有可做的动作就不弹。 */
export declare function openContextMenuAt(editor: Editor, hud: HudModel, x: number, y: number, cx: number, cy: number): void;
/** 表 → 右键菜单的行：带 submenu 的几项按子菜单名并成一行（摆在第一项的位置），其余原样。 */
export declare function foldSubmenus(items: readonly HudItem[]): PopupMenuItem[];
