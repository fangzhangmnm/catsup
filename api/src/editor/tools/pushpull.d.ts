import type { Kernel } from "../../kernel/kernel.ts";
import type { FaceEvent } from "../../kernel/kernel.ts";
import type { ToolPointer } from "../editor.ts";
import type { ToolCtx, ToolHandler } from "../tool-handler.ts";
import type { ScaleGeom } from "../scale-ref.ts";
export declare class PushPullTool implements ToolHandler {
    readonly tool: "pp";
    readonly grammar: "steps";
    private face;
    private normal;
    private nScale;
    private plane;
    private shell;
    private stops;
    private h;
    active(): boolean;
    cancel(): void;
    sample(): Record<string, number>;
    scaleGeom(): ScaleGeom | null;
    describe(ctx?: ToolCtx): Record<string, unknown>;
    /** 世界系推拉高度 → 活动池本地推拉距离（内核按本地平面法向走；down 里已把那根法向送到世界当 this.normal）。 */
    private localH;
    down(ctx: ToolCtx, ev: ToolPointer): void;
    /** pp 双通道吸附：光标通道（世界 = 按下时模型，源面原位不透明；不吸轴）+ 高度通道（h 对静态高度集咬合）。 */
    track(ctx: ToolCtx, s: {
        x: number;
        y: number;
    }, travel?: number): void;
    live(ctx: ToolCtx, run: (fn: (c: Kernel) => FaceEvent[]) => void): string;
    /** 加边（不自愈）：工具选项「加边」或按住 Ctrl（SketchUp Push/Pull + Ctrl）。 */
    private keepRing;
    private commit;
}
