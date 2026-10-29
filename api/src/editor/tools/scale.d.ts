import type { Kernel } from "../../kernel/kernel.ts";
import type { FaceEvent } from "../../kernel/kernel.ts";
import type { ToolPointer } from "../editor.ts";
import type { ToolCtx, ToolHandler, ToolSample } from "../tool-handler.ts";
import type { ViewState } from "../view-state.ts";
export declare class ScaleTool implements ToolHandler {
    readonly tool: "scale";
    readonly grammar: "direct";
    private h;
    private hIdx;
    private t0;
    private f;
    /** 面心柄按着 Shift = 三轴等比、锚点仍是对面那个面心（账本 UX35，user 10-28「if i hit shift, i should be able to scale uniformly but still use the antipodal as anchor」）。 */
    private uniform;
    active(): boolean;
    cancel(): void;
    sample(): Record<string, number>;
    /** 这一柄 + 倍率的变换（世界）。 */
    private static xform;
    describe(): Record<string, unknown>;
    /** 角柄 8 个（等比）+ 面心柄 6 个（单轴），按选区在 orientFrame 下的包围盒（有朝向）。 */
    private handles;
    down(ctx: ToolCtx, ev: ToolPointer): void;
    track(ctx: ToolCtx, s: {
        x: number;
        y: number;
    }, travel?: number): void;
    live(ctx: ToolCtx, run: (fn: (c: Kernel) => FaceEvent[]) => void): string;
    up(ctx: ToolCtx, _ev: ToolPointer, settle: () => ToolSample | null): void;
    /** 柄跟着预演实时动（user 2026-10-21「缩放的handle应该跟着实时动」）：拖动中按当前倍率把柄过一遍同一个变换。 */
    viewExtras(ctx: ToolCtx): Partial<ViewState>;
}
