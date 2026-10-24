import type { Kernel } from "../../kernel/kernel.ts";
import type { FaceEvent } from "../../kernel/kernel.ts";
import type { ToolPointer } from "../editor.ts";
import type { ToolCtx, ToolHandler, ToolSample } from "../tool-handler.ts";
import type { ViewState } from "../render3.ts";
export declare class EraseTool implements ToolHandler {
    readonly tool: "erase";
    readonly grammar: "direct";
    private scrubbing;
    private acc;
    private guides;
    private mode;
    private hoverEdge;
    active(): boolean;
    cancel(): void;
    sample(): Record<string, number>;
    live(_ctx: ToolCtx, _run: (fn: (c: Kernel) => FaceEvent[]) => void): string;
    hover(ctx: ToolCtx, s: {
        x: number;
        y: number;
    }): void;
    down(ctx: ToolCtx, ev: ToolPointer): void;
    track(ctx: ToolCtx, s: {
        x: number;
        y: number;
    }): void;
    up(ctx: ToolCtx, _ev: ToolPointer, _settle: () => ToolSample | null): void;
    /** 刮集高亮（擦一段 = 整条曲线）+ 刮过的参考几何先从画面消失。 */
    viewExtras(ctx: ToolCtx): Partial<ViewState>;
    private scrubAt;
}
