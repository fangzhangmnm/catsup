import type { Kernel } from "../../kernel/kernel.ts";
import type { FaceEvent } from "../../kernel/kernel.ts";
import type { ToolPointer } from "../editor.ts";
import type { ToolCtx, ToolHandler } from "../tool-handler.ts";
import type { ViewState } from "../render3.ts";
export { frameFrom3 } from "../axes-geom.ts";
export declare class AxesTool implements ToolHandler {
    readonly tool: "axes";
    readonly grammar: "steps";
    hover(ctx: ToolCtx, s: {
        x: number;
        y: number;
    }): void;
    private stage;
    private plane;
    private o;
    private px;
    private cur;
    active(): boolean;
    cancel(): void;
    sample(): Record<string, number>;
    private snapAt;
    private candidate;
    down(ctx: ToolCtx, ev: ToolPointer): void;
    track(ctx: ToolCtx, s: {
        x: number;
        y: number;
    }): void;
    live(_ctx: ToolCtx, _run: (fn: (c: Kernel) => FaceEvent[]) => void): string;
    /** 候选帧直接画成上下文轴。 */
    viewExtras(): Partial<ViewState>;
}
