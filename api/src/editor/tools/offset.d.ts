import type { Kernel } from "../../kernel/kernel.ts";
import type { FaceEvent } from "../../kernel/kernel.ts";
import type { ToolPointer } from "../editor.ts";
import type { ToolCtx, ToolHandler } from "../tool-handler.ts";
export declare class OffsetTool implements ToolHandler {
    readonly tool: "offset";
    readonly grammar: "steps";
    private face;
    private plane;
    private inward;
    private dist;
    active(): boolean;
    cancel(): void;
    sample(): Record<string, number>;
    down(ctx: ToolCtx, ev: ToolPointer): void;
    track(ctx: ToolCtx, s: {
        x: number;
        y: number;
    }, travel?: number): void;
    live(ctx: ToolCtx, run: (fn: (c: Kernel) => FaceEvent[]) => void): string;
    /** 落定：用 track 跟到的距离（底座在松手时已先 track 到抬笔结算帧）。 */
    private commit;
    /** 偏移环（世界坐标线段）：活动池里 face 的外环投到面基 → offsetRing（SU 只外环）→ 抬回 3D。 */
    private segs;
}
