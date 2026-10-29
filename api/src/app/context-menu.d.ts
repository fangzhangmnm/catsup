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
