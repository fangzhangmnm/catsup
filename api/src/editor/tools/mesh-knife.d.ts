import type { FaceEvent, Kernel } from "../../kernel/kernel.ts";
import type { MeshKernel } from "../../mesh/mesh-kernel.ts";
import type { ToolPointer } from "../editor.ts";
import type { ToolCtx, ToolHandler } from "../tool-handler.ts";
import type { ViewState } from "../render3.ts";
export type KnifePoint = {
    v: number;
} | {
    e: number;
    t: number;
};
/** 两个落点共有的那张面（最小 id）；没有 = null。 */
export declare function commonFace(m: MeshKernel, a: KnifePoint, b: KnifePoint): number | null;
export declare class MeshKnifeTool implements ToolHandler {
    readonly tool: "knife";
    readonly grammar: "steps";
    /** 同一处点第二下也递给工具（底座默认吞掉）：同一条边点两下 = 环切。 */
    readonly repeatTap = true;
    private start;
    private startW;
    private hov;
    active(): boolean;
    cancel(): void;
    sample(): Record<string, number>;
    live(_ctx: ToolCtx, _run: (fn: (c: Kernel) => FaceEvent[]) => void): string;
    describe(): Record<string, unknown>;
    hover(ctx: ToolCtx, s: {
        x: number;
        y: number;
    }): void;
    track(ctx: ToolCtx, s: {
        x: number;
        y: number;
    }): void;
    down(ctx: ToolCtx, ev: ToolPointer): void;
    liveMesh(ctx: ToolCtx, run: (fn: (m: MeshKernel) => void) => void): string;
    viewExtras(): Partial<ViewState>;
    private loopCutAt;
    /** 光标下看得见的点 / 边上的点（拓扑吸附，永远开）。边上的点 = 光标在这条边屏幕投影上的位置。 */
    private snapAt;
}
