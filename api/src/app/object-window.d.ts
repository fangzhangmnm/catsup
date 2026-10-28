import type { Editor, MenuTarget } from "../editor/editor.ts";
import type { HudModel } from "./ui/hud-model.ts";
import { type PopupMenuItem } from "./ui/popup-menu.ts";
export type ObjectTarget = Exclude<MenuTarget, "selection">;
/** 开物体窗口：target = 当前指向谁；anchor = 窗口的家（右边「物体」钮；self 从钮上开 = 再点一下关）；after = 改完刷 UI（main.ts syncUi）。 */
export declare function openObjectWindow(editor: Editor, hud: HudModel, target: ObjectTarget, anchor: HTMLElement, after: () => void, align?: "start" | "end"): void;
/** 窗口里显示什么（纯函数：探针 / 测试也能问）。 */
export declare function objectWindowItems(editor: Editor, target: ObjectTarget): PopupMenuItem<string>[];
