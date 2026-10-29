import type { Kernel } from "../../kernel/kernel.ts";
import type { FaceEvent, Pt3 } from "../../kernel/kernel.ts";
import type { ToolPointer } from "../editor.ts";
import type { ToolCtx, ToolHandler } from "../tool-handler.ts";
import type { ViewState } from "../view-state.ts";
export declare class CompassTool implements ToolHandler {
    readonly tool: "compass";
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
    private rim;
    active(): boolean;
    cancel(): void;
    sample(): Record<string, number>;
    private sphere;
    private radius;
    private relock;
    /** 光标落点 → 半径点：圆 = 投到圆所在的平面上；球 = 原样（三维里离球心多远就是半径）。 */
    private rimOf;
    down(ctx: ToolCtx, ev: ToolPointer): void;
    track(ctx: ToolCtx, s: {
        x: number;
        y: number;
    }): void;
    live(_ctx: ToolCtx, _run: (fn: (c: Kernel) => FaceEvent[]) => void): string;
    /** 预演：半径线 + 正在画的圆 / 球（当参考几何画，和落定后一个样子）。 */
    viewExtras(ctx: ToolCtx): Partial<ViewState>;
}
/** 一条「加参考圆 / 球」指令（世界坐标 → 当前池的本地坐标；半径按池的变换量）。 */
export declare function compassOp(ctx: Pick<ToolCtx, "toLocal">, at: ReturnType<ToolCtx["activePool"]>, center: Pt3, n: Pt3, r: number, sphere: boolean): import("../ops.ts").Op;
