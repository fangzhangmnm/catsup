import type { Kernel } from "../../kernel/kernel.ts";
import type { FaceEvent } from "../../kernel/kernel.ts";
import type { ToolPointer } from "../editor.ts";
import type { ToolCtx, ToolHandler } from "../tool-handler.ts";
import type { ViewState } from "../render3.ts";
export declare class ProtractorTool implements ToolHandler {
    readonly tool: "protractor";
    readonly grammar: "steps";
    hover(ctx: ToolCtx, s: {
        x: number;
        y: number;
    }): void;
    private stage;
    private plane;
    private center;
    private ref;
    private angle;
    private snappedDetent;
    active(): boolean;
    cancel(): void;
    sample(): Record<string, number>;
    private axis;
    private snapAt;
    down(ctx: ToolCtx, ev: ToolPointer): void;
    track(ctx: ToolCtx, s: {
        x: number;
        y: number;
    }): void;
    live(_ctx: ToolCtx, _run: (fn: (c: Kernel) => FaceEvent[]) => void): string;
    /** 旋转工具的量角器圆环 + 候选参考线。 */
    viewExtras(): Partial<ViewState>;
}
