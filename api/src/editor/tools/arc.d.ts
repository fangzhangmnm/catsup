import type { Kernel } from "../../kernel/kernel.ts";
import type { FaceEvent } from "../../kernel/kernel.ts";
import type { ToolPointer } from "../editor.ts";
import type { ToolCtx, ToolHandler } from "../tool-handler.ts";
export declare class ArcTool implements ToolHandler {
    readonly tool: "arc";
    readonly grammar: "steps";
    hover(ctx: ToolCtx, s: {
        x: number;
        y: number;
    }): void;
    private stage;
    private plane;
    private a;
    private b;
    private p;
    active(): boolean;
    cancel(): void;
    sample(): Record<string, number>;
    /** 指针在手势平面上的点（吸附过；吸不到就射线落面）。 */
    private pointOnPlane;
    down(ctx: ToolCtx, ev: ToolPointer): void;
    track(ctx: ToolCtx, s: {
        x: number;
        y: number;
    }): void;
    live(ctx: ToolCtx, run: (fn: (c: Kernel) => FaceEvent[]) => void): string;
}
