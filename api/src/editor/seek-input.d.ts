import type { ToolPointer } from "./editor.ts";
import type { ToolCtx } from "./tool-handler.ts";
/** 工具那一头：找位置（标记跟到屏幕上这一点）/ 在现在的标记上下一点 / 抬笔。 */
export interface SeekVerbs {
    seek(ctx: ToolCtx, s: {
        x: number;
        y: number;
    }): void;
    place(ctx: ToolCtx): void;
    lift(ctx: ToolCtx): void;
}
export declare class SeekInput {
    /** 按着没松（这一下的找位置还在走）。 */
    private downAt;
    private moved;
    private readonly tool;
    constructor(tool: SeekVerbs);
    pressing(): boolean;
    down(ctx: ToolCtx, ev: ToolPointer): void;
    move(ctx: ToolCtx, s: {
        x: number;
        y: number;
    }, ev?: ToolPointer): void;
    up(ctx: ToolCtx, ev: ToolPointer): void;
    cancel(): void;
    /** 一次重按：在压力猛升之前那一点下点，然后回到笔现在的位置接着找。 */
    private hard;
}
