import type { Editor } from "../editor/editor.ts";
export interface ToolStrip {
    render(): void;
}
/** 工具自己的动作（user 2026-10-24「轴是工具，轴不归汉堡管，归工具管，工具的上下文菜单该开始做了」）：轴 → 重置轴；卷尺 / 量角器 → 删除所有参考线。 */
export interface StripAction {
    id: string;
    label: string;
    disabled?: boolean;
    onClick(): void;
}
export declare function mountToolStrip(root: HTMLElement, editor: Editor, opts?: {
    actions?(tool: string): StripAction[];
}): ToolStrip;
