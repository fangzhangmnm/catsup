import type { Kernel } from "../../kernel/kernel.ts";
import type { FaceEvent, Pt3 } from "../../kernel/kernel.ts";
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
    /** 从给定锚点开始一次移动（变换工具的中心点 / 拖已选中的东西代驾用，2026-10-26 user「变换的中间应该有一个可以拖动的点…按move的逻辑snap」）：
     *  目标 = 当前选区，锚点就是这一点（不再拾取）；之后 track / live / finish 和移动工具自己一模一样。选区为空 → false。 */
    startAt(ctx: ToolCtx, anchor: Pt3, copy: boolean): boolean;
    /** 落定（代驾用；和点第二下 / 松手一样）。 */
    finish(ctx: ToolCtx): void;
    down(ctx: ToolCtx, ev: ToolPointer): void;
    track(ctx: ToolCtx, s: {
        x: number;
        y: number;
    }, travel?: number): void;
    live(ctx: ToolCtx, run: (fn: (c: Kernel) => FaceEvent[]) => void): string;
    private commit;
}
