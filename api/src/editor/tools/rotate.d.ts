import type { Kernel } from "../../kernel/kernel.ts";
import type { FaceEvent } from "../../kernel/kernel.ts";
import type { ToolPointer } from "../editor.ts";
import type { ToolCtx, ToolHandler } from "../tool-handler.ts";
import type { ViewState } from "../view-state.ts";
export declare class RotateTool implements ToolHandler {
    readonly tool: "rotate";
    readonly grammar: "steps";
    readonly lock: "plane";
    private stage;
    private plane;
    private plane0;
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
    /** A9 面锁：第二点落定之前随时可锁 / 解锁——平面过首点；解锁回到首点解析出的平面。 */
    private relock;
    down(ctx: ToolCtx, ev: ToolPointer): void;
    track(ctx: ToolCtx, s: {
        x: number;
        y: number;
    }, travel?: number): void;
    /** 复制（user 2026-10-26「移动旋转也是ctrl复制开关吧」）：底部条「复制」开着，或者此刻按着 Ctrl / Alt。 */
    private copying;
    live(ctx: ToolCtx, run: (fn: (c: Kernel) => FaceEvent[]) => void): string;
    /** 量角器圆环 + 当前角。 */
    viewExtras(): Partial<ViewState>;
    private commit;
}
