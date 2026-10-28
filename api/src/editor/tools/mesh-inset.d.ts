import type { FaceEvent, Kernel } from "../../kernel/kernel.ts";
import type { MeshKernel } from "../../mesh/mesh-kernel.ts";
import type { ToolPointer } from "../editor.ts";
import type { ToolCtx, ToolHandler } from "../tool-handler.ts";
export declare class MeshInsetTool implements ToolHandler {
    readonly tool: "offset";
    readonly grammar: "steps";
    private faces;
    private hadSel;
    private centerW;
    private start;
    private cur;
    private localScale;
    active(): boolean;
    cancel(): void;
    sample(): Record<string, number>;
    live(_ctx: ToolCtx, _run: (fn: (c: Kernel) => FaceEvent[]) => void): string;
    describe(): Record<string, unknown>;
    startModal(ctx: ToolCtx, s: {
        x: number;
        y: number;
    }): boolean;
    down(ctx: ToolCtx, ev: ToolPointer): void;
    track(ctx: ToolCtx, s: {
        x: number;
        y: number;
    }): void;
    /** 当前拖动 → 插多深（世界长度）：离面中心（屏幕）的距离少了多少 × 每像素的世界长度；起点离中心太近 = 在起点后面 40 px 立一个虚中心。 */
    private distW;
    liveMesh(ctx: ToolCtx, run: (fn: (m: MeshKernel) => void) => void): string;
    private commit;
}
