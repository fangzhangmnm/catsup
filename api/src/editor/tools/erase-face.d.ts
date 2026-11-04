import type { ToolPointer } from "../editor.ts";
import type { ToolCtx, ToolHandler, ToolSample, PreviewOp } from "../tool-handler.ts";
export declare class EraseFaceTool implements ToolHandler {
    readonly tool: "eraseFace";
    readonly grammar: "direct";
    readonly previewOnHover = true;
    private pressed;
    private hover_;
    active(): boolean;
    cancel(): void;
    sample(): Record<string, number>;
    hover(ctx: ToolCtx, s: {
        x: number;
        y: number;
    }): void;
    down(): void;
    track(): void;
    live(ctx: ToolCtx, preview: PreviewOp): string;
    up(ctx: ToolCtx, ev: ToolPointer, _settle: () => ToolSample | null): void;
}
