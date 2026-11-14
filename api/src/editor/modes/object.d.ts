import type { Mode } from "../mode.ts";
import type { ToolHandler } from "../tool-handler.ts";
import type { Tool } from "../tool-ids.ts";
export declare class ObjectMode implements Mode {
    readonly id: "object";
    readonly label = "\u6446\u653E";
    readonly kinds: readonly ["empty"];
    readonly tools: readonly Tool[];
    readonly defaultTool: Tool;
    readonly whenLocked: Mode["whenLocked"];
    readonly handlers: Partial<Record<Tool, ToolHandler>>;
}
