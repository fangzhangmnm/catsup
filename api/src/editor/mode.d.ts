import type { BodyKind } from "../scene/body-kind.ts";
import type { Tool } from "./tool-ids.ts";
import type { EditorCore, ToolHandler } from "./tool-handler.ts";
import type { ViewState } from "./render3.ts";
export type ModeId = "object" | "geometry" | "surface";
export interface Mode {
    readonly id: ModeId;
    /** 左上下拉框里显示的名字。 */
    readonly label: string;
    /** 这个模式管哪些 kind 的物体（物体模式 = 全部）。 */
    readonly kinds: readonly BodyKind[];
    /** 这个模式有哪些工具（别的模式的工具在这里不存在）。 */
    readonly tools: readonly Tool[];
    readonly defaultTool: Tool;
    /** 工具 → 手势模块（没有模块的工具暂由 Editor 内建 switch 处理——刀 ② 逐个搬进来）。 */
    readonly handlers: Partial<Record<Tool, ToolHandler>>;
    /** 切进来 / 切出去（清模式专属状态；选区能保留就保留）。 */
    enter?(core: EditorCore): void;
    leave?(core: EditorCore): void;
    /** 模式自己的叠加层（表面模式：贴图投影预览；物体模式：锁定框…）；底座每帧并进 ViewState。 */
    viewExtras?(): Partial<ViewState>;
}
