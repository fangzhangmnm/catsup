import type { Kernel } from "../../kernel/kernel.ts";
import type { FaceEvent, Pt3 } from "../../kernel/kernel.ts";
import { type DrawPlane } from "../pick.ts";
import type { ToolPointer } from "../editor.ts";
import type { ToolCtx, ToolHandler } from "../tool-handler.ts";
import type { ScaleGeom } from "../scale-ref.ts";
declare abstract class DrawTool implements ToolHandler {
    abstract readonly tool: "line" | "rect" | "crect" | "circle";
    readonly grammar: "steps";
    readonly draws = true;
    readonly lock: "axis" | "plane";
    protected anchor: Pt3 | null;
    protected plane: DrawPlane;
    protected fixed: DrawPlane | null;
    active(): boolean;
    cancel(): void;
    sample(): Record<string, number>;
    hover(ctx: ToolCtx, s: {
        x: number;
        y: number;
    }): void;
    down(ctx: ToolCtx, ev: ToolPointer): void;
    protected basePlane(): DrawPlane | undefined;
    /** 第二点在平面上取（矩形 / 圆 / 画线意图门回退）：钉死的平面直接吸，否则 resolveRectPlane 可切面；轻擦保持上一帧。 */
    protected planeSnap(ctx: ToolCtx, sx: number, sy: number): Pt3;
    track(ctx: ToolCtx, s: {
        x: number;
        y: number;
    }, _travel?: number): void;
    live(ctx: ToolCtx, run: (fn: (c: Kernel) => FaceEvent[]) => void): string;
    describe(ctx: ToolCtx): Record<string, unknown>;
    protected abstract segsFor(ctx: ToolCtx, b: Pt3): [Pt3, Pt3][];
    protected abstract preview(ctx: ToolCtx, run: (fn: (c: Kernel) => FaceEvent[]) => void): string;
    protected abstract commit(ctx: ToolCtx): void;
    protected finish(ctx: ToolCtx): void;
}
export declare class LineTool extends DrawTool {
    readonly tool: "line";
    readonly lock: "axis";
    track(ctx: ToolCtx, s: {
        x: number;
        y: number;
    }, travel?: number): void;
    protected segsFor(_ctx: ToolCtx, b: Pt3): [Pt3, Pt3][];
    scaleGeom(ctx: ToolCtx): ScaleGeom | null;
    protected preview(ctx: ToolCtx, run: (fn: (c: Kernel) => FaceEvent[]) => void): string;
    protected commit(ctx: ToolCtx): void;
    /** 数值小窗改完这一笔之后继续连画（底座 applyVcb 调）。 */
    vcbContinue(ctx: ToolCtx, p: Pt3): void;
}
export declare class RectTool extends DrawTool {
    readonly tool: "rect" | "crect";
    /** 起点：从角；Ctrl 按着 = 临时从中心（SU Ctrl / Option 同款）。中心矩形（CenterRectTool）反过来。 */
    protected from(ctx: ToolCtx): "corner" | "center";
    protected segsFor(ctx: ToolCtx, b: Pt3): [Pt3, Pt3][];
    scaleGeom(ctx: ToolCtx): ScaleGeom | null;
    protected preview(ctx: ToolCtx, run: (fn: (c: Kernel) => FaceEvent[]) => void): string;
    protected commit(ctx: ToolCtx): void;
}
/**
 * 中心矩形（user 10-27「随手，硬表面里面中心矩形能单独做一个工具吗而不是矩形的预设」）：第一下 = 中心、第二下 = 一个角；Ctrl 按着 = 临时从角。
 * 和矩形同一套手势 / 吸附 / 数值小窗（数值仍是整个矩形的宽 × 高）；矩形工具原来的「起点」选项（预设）撤掉，两个工具各管一种。
 */
export declare class CenterRectTool extends RectTool {
    readonly tool: "crect";
    protected from(ctx: ToolCtx): "corner" | "center";
}
export declare class CircleTool extends DrawTool {
    readonly tool: "circle";
    protected segsFor(ctx: ToolCtx, b: Pt3): [Pt3, Pt3][];
    scaleGeom(ctx: ToolCtx): ScaleGeom | null;
    protected preview(ctx: ToolCtx, run: (fn: (c: Kernel) => FaceEvent[]) => void): string;
    protected commit(ctx: ToolCtx): void;
}
export {};
