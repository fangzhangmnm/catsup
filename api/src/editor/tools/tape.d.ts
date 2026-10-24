import type { Kernel } from "../../kernel/kernel.ts";
import type { FaceEvent } from "../../kernel/kernel.ts";
export { type TapeResult, type TapeStart, classifyStart, tapeResult } from "../tape-geom.ts";
import type { ToolPointer } from "../editor.ts";
import type { ToolCtx, ToolHandler } from "../tool-handler.ts";
import type { ViewState } from "../render3.ts";
export declare class TapeTool implements ToolHandler {
    readonly tool: "tape";
    readonly grammar: "steps";
    hover(ctx: ToolCtx, s: {
        x: number;
        y: number;
    }): void;
    private stage;
    private plane;
    private start;
    private b;
    active(): boolean;
    cancel(): void;
    sample(): Record<string, number>;
    down(ctx: ToolCtx, ev: ToolPointer): void;
    track(ctx: ToolCtx, s: {
        x: number;
        y: number;
    }): void;
    live(_ctx: ToolCtx, _run: (fn: (c: Kernel) => FaceEvent[]) => void): string;
    /** 量线 + 候选参考线 / 参考点（render3 tape 层）。 */
    viewExtras(): Partial<ViewState>;
}
