import type { FaceEvent, Kernel } from "../../kernel/kernel.ts";
import type { MeshKernel } from "../../mesh/mesh-kernel.ts";
import type { ToolPointer } from "../editor.ts";
import type { ToolCtx, ToolHandler } from "../tool-handler.ts";
export declare class MeshInsetTool implements ToolHandler {
    readonly tool: "offset";
    readonly grammar: "steps";
    private job;
    private hadSel;
    private centerW;
    private start;
    private cur;
    private localScale;
    /** 倒角的段数（这个会话里记着上一次用的；马后炮里改）。 */
    private segments;
    /** 没选区又按在空处 = 拖框（「会选的工具」，selecting.ts）。 */
    private box;
    tap(ctx: ToolCtx, ev: ToolPointer): void;
    active(): boolean;
    cancel(): void;
    sample(): Record<string, number>;
    live(_ctx: ToolCtx, _run: (fn: (c: Kernel) => FaceEvent[]) => void): string;
    describe(): Record<string, unknown>;
    /** Blender I / Ctrl+B / Ctrl+Shift+B：有选区 = 光标处起手。 */
    startModal(ctx: ToolCtx, s: {
        x: number;
        y: number;
    }, variant?: string): boolean;
    down(ctx: ToolCtx, ev: ToolPointer): void;
    private begin;
    track(ctx: ToolCtx, s: {
        x: number;
        y: number;
    }): void;
    /**
     * 当前拖动 → 多宽（世界长度）：离目标中心（屏幕）的距离变了多少 × 每像素的世界长度；插入 = 靠近中心为正，倒角 = 远离中心为正。
     * 起点离中心太近 = 在起点后面 40 px 立一个虚中心。
     */
    private distW;
    /** 这一下的 op（本地宽度 dL）。 */
    private opFor;
    liveMesh(ctx: ToolCtx, run: (fn: (m: MeshKernel) => void) => void): string;
    private commit;
}
