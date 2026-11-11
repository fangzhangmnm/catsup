import type { Mode } from "../mode.ts";
import type { ToolHandler } from "../tool-handler.ts";
import type { Tool } from "../tool-ids.ts";
export declare class PaintMode implements Mode {
    readonly id: "paint";
    readonly label = "\u753B\u753B";
    readonly kinds: readonly ["mesh"];
    readonly tools: readonly Tool[];
    readonly defaultTool: Tool;
    readonly handlers: Partial<Record<Tool, ToolHandler>>;
}
