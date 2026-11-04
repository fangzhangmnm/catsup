import type { ToolPointer } from "../editor.ts";
import type { ToolCtx, ToolHandler, ToolSample, PreviewOp } from "../tool-handler.ts";
export declare class MeshEraseTool implements ToolHandler {
    readonly tool: "erase";
    readonly grammar: "direct";
    private hit;
    private dissolve;
    active(): boolean;
    cancel(): void;
    sample(): Record<string, number>;
    describe(): Record<string, unknown>;
    down(ctx: ToolCtx, ev: ToolPointer): void;
    track(ctx: ToolCtx, s: {
        x: number;
        y: number;
    }): void;
    private collect;
    private count;
    /** 这一刮的那条 op（预演 / 提交共用）。 */
    private opFor;
    live(ctx: ToolCtx, preview: PreviewOp): string;
    up(ctx: ToolCtx, _ev: ToolPointer, _settle: () => ToolSample | null): void;
}
