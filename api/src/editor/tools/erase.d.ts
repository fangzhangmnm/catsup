import type { EdgeId } from "../../kernel/kernel.ts";
import type { WorldView } from "../../scene/world-view.ts";
import type { ToolPointer } from "../editor.ts";
import type { ToolCtx, ToolSample } from "../tool-handler.ts";
import type { ViewState } from "../render3.ts";
import { EdgeScrubTool } from "./scrub.ts";
export declare class EraseTool extends EdgeScrubTool {
    readonly tool: "erase";
    protected readonly wholeCurve = true;
    private guides;
    private toErase;
    private mode;
    cancel(): void;
    protected begin(ctx: ToolCtx, ev: ToolPointer): void;
    protected scrubAt(ctx: ToolCtx, view: WorldView, sx: number, sy: number): void;
    /** 抬笔：先把刮过的参考几何单子拿出来——底座的 up 是「先 cancel 再 commit」，cancel 会把 guides 清空。
     *  （v0.13.16 搬进橡皮家族共用底座时这里读的是已经清空的 guides = 参考线 / 参考点从此擦不掉；user 2026-10-25「bug：橡皮擦不了辅助线了」。探针 probe-erase-guides。） */
    up(ctx: ToolCtx, ev: ToolPointer, settle: () => ToolSample | null): void;
    protected commit(ctx: ToolCtx, ids: EdgeId[]): void;
    /** 刮集高亮 + 刮过的参考几何先从画面消失。 */
    viewExtras(ctx: ToolCtx): Partial<ViewState>;
}
