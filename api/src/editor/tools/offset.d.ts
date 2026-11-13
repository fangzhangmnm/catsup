import type { ToolPointer } from "../editor.ts";
import type { ToolCtx, ToolHandler, PreviewOp } from "../tool-handler.ts";
import type { ScaleGeom } from "../scale-ref.ts";
export declare class OffsetTool implements ToolHandler {
    readonly tool: "offset";
    readonly grammar: "steps";
    private zeroSay;
    private face;
    private plane;
    private inward;
    private dist;
    active(): boolean;
    cancel(): void;
    sample(): Record<string, number>;
    scaleGeom(): ScaleGeom | null;
    down(ctx: ToolCtx, ev: ToolPointer): void;
    track(ctx: ToolCtx, s: {
        x: number;
        y: number;
    }, travel?: number): void;
    /** 这次偏移的那条 op（预演 / 提交共用）：外环恰是一条闭合圆曲线 → 偏移环登记成同心圆（半径 r − d；0.10）。 */
    private opFor;
    live(ctx: ToolCtx, preview: PreviewOp): string;
    /** 落定：用 track 跟到的距离（底座在松手时已先 track 到抬笔结算帧）。 */
    private commit;
    /** 偏移环（世界坐标线段）：活动池里 face 的外环投到面基 → offsetRing（SU 只外环）→ 抬回 3D。 */
    private segs;
}
