import type { Kernel } from "../../kernel/kernel.ts";
import type { FaceEvent } from "../../kernel/kernel.ts";
import type { ToolPointer } from "../editor.ts";
import type { ToolCtx, ToolHandler } from "../tool-handler.ts";
import type { ScaleGeom } from "../scale-ref.ts";
import type { ViewState } from "../render3.ts";
export declare class RRectTool implements ToolHandler {
    readonly tool: "rrect";
    readonly grammar: "steps";
    readonly draws = true;
    readonly lock: "plane";
    hover(ctx: ToolCtx, s: {
        x: number;
        y: number;
    }): void;
    private stage;
    private plane;
    private plane0;
    private a;
    private b;
    private c;
    private deg;
    active(): boolean;
    cancel(): void;
    sample(): Record<string, number>;
    /** B43：拉第一边 = 这一边的长度；转第二边 = 矩形（两条边 + 法向）。 */
    scaleGeom(ctx: ToolCtx): ScaleGeom | null;
    /** A9 面锁：第二点落定之前随时可锁 / 解锁——平面过首点；解锁回到首点解析出的平面。 */
    private relock;
    private pointOnPlane;
    /** 第二边：角度咬合（90° 强吸；Shift 15° 格），顺手记角度给提示。 */
    private secondCorner;
    down(ctx: ToolCtx, ev: ToolPointer): void;
    track(ctx: ToolCtx, s: {
        x: number;
        y: number;
    }): void;
    live(ctx: ToolCtx, run: (fn: (c: Kernel) => FaceEvent[]) => void): string;
    describe(ctx: ToolCtx): Record<string, unknown>;
    /** 第二边阶段：量角器弧在 B，基线 = B→A（A34）。 */
    viewExtras(): Partial<ViewState>;
}
