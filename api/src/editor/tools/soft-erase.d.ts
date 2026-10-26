import type { EdgeId } from "../../kernel/kernel.ts";
import type { ToolCtx } from "../tool-handler.ts";
import type { ToolPointer } from "../editor.ts";
import { EdgeScrubTool } from "./scrub.ts";
export declare class SoftEraseTool extends EdgeScrubTool {
    readonly tool: "softErase";
    protected readonly wholeCurve = false;
    /** 这一刮是硬化（选项「硬化」XOR 按住 Shift；user 10-26「快捷键和马前炮可以变成相反操作（就是标记硬边）」）。 */
    private harden;
    protected begin(ctx: ToolCtx, ev: ToolPointer): void;
    /** 硬化时软边也要拾得到；没按下时按选项看（悬停高亮）。 */
    protected pickSoft(ctx: ToolCtx): boolean;
    protected commit(ctx: ToolCtx, ids: EdgeId[]): void;
}
