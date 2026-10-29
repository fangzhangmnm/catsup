import type { Kernel } from "../../kernel/kernel.ts";
import type { FaceEvent } from "../../kernel/kernel.ts";
import type { ToolPointer } from "../editor.ts";
import type { ToolCtx, ToolHandler } from "../tool-handler.ts";
import type { ScaleGeom } from "../scale-ref.ts";
import type { ViewState } from "../view-state.ts";
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
    private theta;
    private len;
    private c;
    active(): boolean;
    cancel(): void;
    sample(): Record<string, number>;
    /** B43：拉第一边 = 这一边的长度；之后 = 矩形（两条边 + 法向）。 */
    scaleGeom(ctx: ToolCtx): ScaleGeom | null;
    /** A9 面锁：第二点落定之前随时可锁 / 解锁——平面过首点；解锁回到首点解析出的平面。 */
    private relock;
    /** ① 第一边终点：在首点的平面上取点（吸附照常）。 */
    private edgeEnd;
    private edgeDir;
    private u0;
    /** ② 角度：光标在「过 B、垂直第一边」的面上的方向 → θ；吸到点 = 面过那点；靠近帧轴吸正；格点吸附开着 = 15°（近才咬）。 */
    private trackAngle;
    /** ③ 长度：沿第二边方向；吸到点 = 那点投到这条线上；格点吸附开着 = 整格（近才咬）。 */
    private trackLength;
    down(ctx: ToolCtx, ev: ToolPointer): void;
    track(ctx: ToolCtx, s: {
        x: number;
        y: number;
    }): void;
    live(ctx: ToolCtx, run: (fn: (c: Kernel) => FaceEvent[]) => void): string;
    describe(ctx: ToolCtx): Record<string, unknown>;
    /** ② / ③：量角器在 B、绕第一边（轴 = AB 方向），基线 = 平躺的那个方向。 */
    viewExtras(): Partial<ViewState>;
}
