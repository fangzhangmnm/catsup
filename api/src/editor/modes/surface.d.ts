import type { Mode } from "../mode.ts";
import type { ToolHandler } from "../tool-handler.ts";
import type { Tool } from "../tool-ids.ts";
export declare class SurfaceMode implements Mode {
    readonly id: "surface";
    readonly label = "\u8868\u9762";
    readonly kinds: readonly ["brep"];
    readonly tools: readonly Tool[];
    readonly defaultTool: Tool;
    readonly handlers: Partial<Record<Tool, ToolHandler>>;
}
