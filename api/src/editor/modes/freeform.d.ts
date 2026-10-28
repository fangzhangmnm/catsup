import type { Mode } from "../mode.ts";
import type { ToolHandler } from "../tool-handler.ts";
import type { Tool } from "../tool-ids.ts";
export declare class FreeformMode implements Mode {
    readonly id: "freeform";
    readonly label = "\u81EA\u7531\u5EFA\u6A21";
    readonly kinds: readonly ["mesh"];
    readonly tools: readonly Tool[];
    readonly defaultTool: Tool;
    readonly handlers: Partial<Record<Tool, ToolHandler>>;
}
