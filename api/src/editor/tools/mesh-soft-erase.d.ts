import type { ToolPointer } from "../editor.ts";
import type { ToolCtx, ToolHandler, ToolSample, PreviewOp } from "../tool-handler.ts";
export declare class MeshSoftEraseTool implements ToolHandler {
    readonly tool: "softErase";
    readonly grammar: "direct";
    private acc;
    private harden;
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
    /** 刮集里真会变的边：恰好挨两张面、现在的样子和要标的不一样。 */
    private changing;
    live(ctx: ToolCtx, preview: PreviewOp): string;
    up(ctx: ToolCtx, _ev: ToolPointer, _settle: () => ToolSample | null): void;
}
