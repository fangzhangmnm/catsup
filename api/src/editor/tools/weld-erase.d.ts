import type { EdgeId } from "../../kernel/kernel.ts";
import type { ToolCtx } from "../tool-handler.ts";
import { EdgeScrubTool } from "./scrub.ts";
export declare class WeldEraseTool extends EdgeScrubTool {
    readonly tool: "weldErase";
    protected readonly wholeCurve = true;
    protected commit(ctx: ToolCtx, ids: EdgeId[]): void;
}
