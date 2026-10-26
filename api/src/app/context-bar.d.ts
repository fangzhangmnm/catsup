import type { Editor } from "../editor/editor.ts";
import type { HudItem } from "./ui/hud-model.ts";
/** 工具自己的动作 / chip（轴 → 重置轴；卷尺 / 量角器 / 圆规 → 删除所有参考几何；油漆桶 → 当前材质 / 吸色）。 */
export interface BarAction {
    id: string;
    label: string;
    disabled?: boolean;
    onClick(): void; /** 色块（CSS background；材质 chip）。 */
    swatch?: string; /** 开关态。 */
    active?: boolean;
    title?: string;
}
export interface ContextBarProviders {
    /** 排在工具选项前面的 chip（表面工具：当前材质 → 吸色，user 10-24 定的顺序）。 */
    leading?(tool: string): BarAction[];
    /** 排在工具选项后面的动作。 */
    actions?(tool: string): BarAction[];
    /** 选区动作（已按路由 / 有无选区 / 手势中筛过；空 = 不显示这一段）。 */
    selection?(): HudItem[];
    /** 选区动作被点（宿主路由到 hud.pick）。 */
    pickSelection?(id: string): void;
    /** 每次重画完（这一段住在右下参数小窗里：宿主据此重算整个面板藏不藏，2026-10-25）。 */
    afterRender?(): void;
}
export interface ContextBar {
    render(): void;
}
export declare function mountContextBar(root: HTMLElement, editor: Editor, p: ContextBarProviders): ContextBar;
