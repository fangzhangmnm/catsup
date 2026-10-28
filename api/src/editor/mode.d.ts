import type { BodyKind } from "../scene/body-kind.ts";
import type { Tool } from "./tool-ids.ts";
import type { EditorCore, ToolHandler } from "./tool-handler.ts";
import type { ViewState } from "./render3.ts";
export type ModeId = "object" | "geometry" | "surface" | "freeform";
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
    /**
     * 工作流亚种（DT87，2026-10-26 Claude Opus 5.5；user「是否折还是破就是看是哪个版本的工具。如果复用代码也得看是哪个工作流的亚种。护栏做好」）：
     * 同一套橡皮 / 自动折面代码按它分叉。eraseNonCoplanar：擦掉两张不共面的膜之间的边 = burst（SketchUp：两张面破掉）/ fold（Blender：变折线，两块算一个面）；
     * autofold：挪点把面拉不平时自动折出的折缝 = hard（硬线，看得见；SketchUp 同款；user 2026-10-27「还是折硬边」「披露原则」）/ fold（折线）。缺 = burst / hard；折线亚种随折边退役一起收（Fable 账单）。
     */
    readonly workflow?: {
        readonly eraseNonCoplanar?: "burst" | "fold";
        readonly autofold?: "hard" | "fold";
    };
    /** 模式自己的叠加层（表面模式：贴图投影预览；物体模式：锁定框…）；底座每帧并进 ViewState。 */
    viewExtras?(): Partial<ViewState>;
}
