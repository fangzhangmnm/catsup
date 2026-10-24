import type { Kernel } from "../../kernel/kernel.ts";
import type { FaceEvent } from "../../kernel/kernel.ts";
import type { ToolPointer } from "../editor.ts";
import type { ToolCtx, ToolHandler } from "../tool-handler.ts";
import type { ViewState } from "../render3.ts";
export declare class RotateTool implements ToolHandler {
    readonly tool: "rotate";
    readonly grammar: "steps";
    private stage;
    private plane;
    private center;
    private axis;
    private ref;
    private angle;
    active(): boolean;
    cancel(): void;
    sample(): Record<string, number>;
    describe(): Record<string, unknown>;
    hover(ctx: ToolCtx, s: {
        x: number;
        y: number;
    }): void;
    down(ctx: ToolCtx, ev: ToolPointer): void;
    track(ctx: ToolCtx, s: {
        x: number;
        y: number;
    }, travel?: number): void;
    live(ctx: ToolCtx, run: (fn: (c: Kernel) => FaceEvent[]) => void): string;
    /** 量角器圆环 + 当前角。 */
    viewExtras(): Partial<ViewState>;
    private commit;
}
