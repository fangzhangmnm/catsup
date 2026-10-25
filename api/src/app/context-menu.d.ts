import type { Editor } from "../editor/editor.ts";
import type { HudModel } from "./ui/hud-model.ts";
/** 在画布点 (x, y)（client 坐标 cx, cy）弹菜单。没有可做的动作就不弹。 */
export declare function openContextMenuAt(editor: Editor, hud: HudModel, x: number, y: number, cx: number, cy: number): void;
