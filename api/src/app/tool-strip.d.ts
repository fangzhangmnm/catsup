import type { Editor } from "../editor/editor.ts";
export interface ToolStrip {
    render(): void;
}
/** 工具自己的动作（user 2026-10-24「轴是工具，轴不归汉堡管，归工具管，工具的上下文菜单该开始做了」）：轴 → 重置轴；卷尺 / 量角器 → 删除所有参考线。 */
export interface StripAction {
    id: string;
    label: string;
    disabled?: boolean;
    onClick(): void; /** 色块（CSS background；材质 chip）。 */
    swatch?: string; /** 开关态（吸色锁定）。 */
    active?: boolean;
    title?: string;
}
/** leading = 排在选项前面的 chip（表面工具：当前材质 → 吸色 → 范围 → 阈值，user 2026-10-24 定的顺序）。 */
export declare function mountToolStrip(root: HTMLElement, editor: Editor, opts?: {
    actions?(tool: string): StripAction[];
    leading?(tool: string): StripAction[];
}): ToolStrip;
