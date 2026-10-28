import type { Kernel } from "../../kernel/kernel.ts";
import type { FaceEvent } from "../../kernel/kernel.ts";
import type { ToolPointer } from "../editor.ts";
import type { ToolCtx, ToolHandler, ToolSample } from "../tool-handler.ts";
import type { SelMode } from "../tools.ts";
export declare class SelectTool implements ToolHandler {
    readonly tool: "select";
    readonly grammar: "direct";
    private box;
    active(): boolean;
    /** 这一下怎么合进选区（两档 + 修饰键）：归 selecting.ts（「会选的工具」共用）。 */
    static modeOf(ctx: ToolCtx, ev: ToolPointer, box: boolean): SelMode;
    static multi(ctx: ToolCtx): boolean;
    cancel(): void;
    sample(): Record<string, number>;
    live(_ctx: ToolCtx, _run: (fn: (c: Kernel) => FaceEvent[]) => void): string;
    down(ctx: ToolCtx, ev: ToolPointer): void;
    track(ctx: ToolCtx, s: {
        x: number;
        y: number;
    }): void;
    up(ctx: ToolCtx, ev: ToolPointer, _settle: () => ToolSample | null): void;
}
