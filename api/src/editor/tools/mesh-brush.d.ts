import type { FaceEvent, Kernel } from "../../kernel/kernel.ts";
import type { MeshKernel } from "../../mesh/mesh-kernel.ts";
import type { ToolPointer } from "../editor.ts";
import type { ToolCtx, ToolHandler, ToolSample } from "../tool-handler.ts";
export type BrushKind = "grab" | "draw" | "smooth" | "flatten";
declare const TOOL: {
    readonly grab: "brushGrab";
    readonly draw: "brushDraw";
    readonly smooth: "brushSmooth";
    readonly flatten: "brushFlatten";
};
export declare class MeshBrushTool implements ToolHandler {
    readonly grammar: "direct";
    readonly tool: (typeof TOOL)[BrushKind];
    private readonly kind;
    constructor(kind: BrushKind);
    /** 一笔：碰过的点现在的位置（本地）+ 按下前的位置；邻接（抹平用）；上一个 dab 的屏幕点。 */
    private stroke;
    /** 抓：按下那一刻的点（本地）+ 权重；拖的平面（世界：过按下处、法向 = 视线）；按下处（世界）。 */
    private grab;
    active(): boolean;
    cancel(): void;
    sample(): Record<string, number>;
    live(_ctx: ToolCtx, _run: (fn: (c: Kernel) => FaceEvent[]) => void): string;
    describe(): Record<string, unknown>;
    /** 悬停：光标处画笔刷圈（和软选择半径同一个圈）。 */
    hover(ctx: ToolCtx, s: {
        x: number;
        y: number;
    }): void;
    private posOf;
    /** 光标打在网格体哪一点（本地坐标）+ 那张面的法向（本地）+ 半径换成本地长度。打不到 = null。 */
    private hit;
    /** 半径里的点（按现在的位置量）和它们的衰减权重。 */
    private within;
    /** 点的法向（本地）：连着的面的法向按现在的位置算、平均。 */
    private vNormal;
    private set;
    /** 刷一下（鼓起 / 抹平 / 压平）：以 c 为心、R 为半径。 */
    private dab;
    down(ctx: ToolCtx, ev: ToolPointer): void;
    track(ctx: ToolCtx, s: {
        x: number;
        y: number;
    }): void;
    liveMesh(_ctx: ToolCtx, run: (fn: (m: MeshKernel) => void) => void): string;
    up(ctx: ToolCtx, _ev: ToolPointer, _settle: () => ToolSample | null): void;
}
export {};
