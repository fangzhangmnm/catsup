import type { FaceEvent, Kernel } from "../../kernel/kernel.ts";
import type { MeshKernel } from "../../mesh/mesh-kernel.ts";
import type { ToolPointer } from "../editor.ts";
import type { ToolCtx, ToolHandler } from "../tool-handler.ts";
export declare class MeshPullTool implements ToolHandler {
    readonly tool: "pp";
    readonly grammar: "steps";
    readonly lock: "axis";
    private t;
    private pivotW;
    private nW;
    private grabW;
    private start;
    private cur;
    active(): boolean;
    cancel(): void;
    sample(): Record<string, number>;
    live(_ctx: ToolCtx, _run: (fn: (c: Kernel) => FaceEvent[]) => void): string;
    describe(): Record<string, unknown>;
    hover(ctx: ToolCtx, s: {
        x: number;
        y: number;
    }): void;
    down(ctx: ToolCtx, ev: ToolPointer): void;
    track(ctx: ToolCtx, s: {
        x: number;
        y: number;
    }): void;
    liveMesh(ctx: ToolCtx, run: (fn: (m: MeshKernel) => void) => void): string;
    /** 当前拖动 → 世界位移。 */
    private offsetW;
    private commit;
    private what;
    /** 屏幕点 → 过轴心、垂直于视线的平面上的点（世界）。 */
    private onPlane;
}
