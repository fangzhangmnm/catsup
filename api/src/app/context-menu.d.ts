import type { Editor } from "../editor/editor.ts";
import type { HudModel } from "./ui/hud-model.ts";
import { type SelectionRoute } from "./selection-actions.ts";
/** 在画布点 (x, y)（client 坐标 cx, cy）弹菜单。没有可做的动作就不弹。 */
export declare function openContextMenuAt(editor: Editor, hud: HudModel, x: number, y: number, cx: number, cy: number): void;
export interface SelectionBar {
    render(): void;
}
/** 顶部选区浮条（触屏路由）：选中东西且没在手势中且当前输入是笔 / 手指 → 显示可用动作；鼠标走右键菜单，不浮。 */
export declare function mountSelectionBar(root: HTMLElement, editor: Editor, hud: HudModel, route: () => SelectionRoute): SelectionBar;
