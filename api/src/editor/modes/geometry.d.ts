import type { Mode } from "../mode.ts";
import type { ToolHandler } from "../tool-handler.ts";
import { type Tool } from "../tool-ids.ts";
export declare class GeometryMode implements Mode {
    readonly id: "geometry";
    readonly label = "\u51E0\u4F55";
    readonly kinds: readonly ["brep"];
    readonly tools: readonly Tool[];
    readonly defaultTool: Tool;
    readonly handlers: Partial<Record<Tool, ToolHandler>>;
}
