import type { Mode } from "../mode.ts";
import type { ToolHandler } from "../tool-handler.ts";
import type { Tool } from "../tool-ids.ts";
export declare class VerifyMode implements Mode {
    readonly id: "verify";
    readonly label = "\u9A8C\u8BC1";
    readonly kinds: readonly ["brep"];
    readonly tools: readonly Tool[];
    readonly defaultTool: Tool;
    readonly handlers: Partial<Record<Tool, ToolHandler>>;
}
