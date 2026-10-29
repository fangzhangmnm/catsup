import type { Kernel } from "../../kernel/kernel.ts";
import type { FaceEvent } from "../../kernel/kernel.ts";
import type { ToolPointer } from "../editor.ts";
import type { ToolCtx, ToolHandler } from "../tool-handler.ts";
import type { ViewState } from "../view-state.ts";
export declare class ProtractorTool implements ToolHandler {
    readonly tool: "protractor";
    readonly grammar: "steps";
    readonly lock: "plane";
    hover(ctx: ToolCtx, s: {
        x: number;
        y: number;
    }): void;
    private stage;
    private plane;
    private plane0;
    private center;
    private ref;
    private angle;
    private snappedDetent;
    active(): boolean;
    cancel(): void;
    sample(): Record<string, number>;
    private axis;
    /** A9 面锁：第二点落定之前随时可锁 / 解锁——平面过首点；解锁回到首点解析出的平面。 */
    private relock;
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
