import type { Kernel } from "../../kernel/kernel.ts";
import type { FaceEvent } from "../../kernel/kernel.ts";
import type { ToolPointer } from "../editor.ts";
import type { ToolCtx, ToolHandler } from "../tool-handler.ts";
import type { ScaleGeom } from "../scale-ref.ts";
export declare class MoveTool implements ToolHandler {
    readonly tool: "move";
    readonly grammar: "steps";
    readonly lock: "axis";
    private vids;
    private pools;
    private copy;
    private entities;
    active(): boolean;
    cancel(): void;
    sample(): Record<string, number>;
    scaleGeom(ctx: ToolCtx): ScaleGeom | null;
    describe(ctx?: ToolCtx): Record<string, unknown>;
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
    private commit;
}
