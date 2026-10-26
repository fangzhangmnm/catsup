import type { EdgeId } from "../../kernel/kernel.ts";
import type { ToolCtx } from "../tool-handler.ts";
import type { ToolPointer } from "../editor.ts";
import { EdgeScrubTool } from "./scrub.ts";
export declare class WeldEraseTool extends EdgeScrubTool {
    readonly tool: "weldErase";
    protected readonly wholeCurve = true;
    /** 这一刮是拆开（选项「拆开」XOR 按住 Shift；user 10-26「焊边也一样」）。 */
    private split;
    protected begin(ctx: ToolCtx, ev: ToolPointer): void;
    protected commit(ctx: ToolCtx, ids: EdgeId[]): void;
}
