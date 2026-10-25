import type { EdgeId } from "../../kernel/kernel.ts";
import type { ToolCtx } from "../tool-handler.ts";
import { EdgeScrubTool } from "./scrub.ts";
export declare class SoftEraseTool extends EdgeScrubTool {
    readonly tool: "softErase";
    protected readonly wholeCurve = false;
    protected commit(ctx: ToolCtx, ids: EdgeId[]): void;
}
