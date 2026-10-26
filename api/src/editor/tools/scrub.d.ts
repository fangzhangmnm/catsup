import type { Kernel } from "../../kernel/kernel.ts";
import type { EdgeId, FaceEvent } from "../../kernel/kernel.ts";
import type { WorldView } from "../../scene/world-view.ts";
import type { ToolPointer } from "../editor.ts";
import type { Tool } from "../tool-ids.ts";
import type { ToolCtx, ToolHandler, ToolSample } from "../tool-handler.ts";
import type { ViewState } from "../render3.ts";
export declare abstract class EdgeScrubTool implements ToolHandler {
    abstract readonly tool: Tool;
    readonly grammar: "direct";
    /** 高亮是否整条曲线连坐（橡皮 / 焊边：是——擦 / 焊一段 = 整条；软边：否——一条边一个二面角）。 */
    protected abstract readonly wholeCurve: boolean;
    protected scrubbing: boolean;
    protected acc: Set<number>;
    protected hoverEdge: EdgeId | null;
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
    /** 刮集（+ 悬停边）高亮；wholeCurve 时整条曲线一起亮。 */
    viewExtras(ctx: ToolCtx): Partial<ViewState>;
    /** 按下那一刻（子类读修饰键 / 出提示）。 */
    protected begin(_ctx: ToolCtx, _ev: ToolPointer): void;
    /** 这一刮要不要也拾软边（硬化的时候要：软边平时点不中，不然永远硬化不了）。 */
    protected pickSoft(_ctx: ToolCtx): boolean;
    protected scrubAt(ctx: ToolCtx, view: WorldView, sx: number, sy: number): void;
    /** 抬笔：拿着刮集做事（提交 op、出提示）。 */
    protected abstract commit(ctx: ToolCtx, ids: EdgeId[]): void;
}
