import type { FaceEvent, Kernel } from "../../kernel/kernel.ts";
import type { MeshKernel } from "../../mesh/mesh-kernel.ts";
import type { ToolPointer } from "../editor.ts";
import type { ToolCtx, ToolHandler, ToolSample } from "../tool-handler.ts";
export declare class MeshEraseTool implements ToolHandler {
    readonly tool: "erase";
    readonly grammar: "direct";
    private hit;
    private dissolve;
    active(): boolean;
    cancel(): void;
    sample(): Record<string, number>;
    live(_ctx: ToolCtx, _run: (fn: (c: Kernel) => FaceEvent[]) => void): string;
    describe(): Record<string, unknown>;
    down(ctx: ToolCtx, ev: ToolPointer): void;
    track(ctx: ToolCtx, s: {
        x: number;
        y: number;
    }): void;
    private collect;
    private count;
    liveMesh(_ctx: ToolCtx, run: (fn: (m: MeshKernel) => void) => void): string;
    up(ctx: ToolCtx, _ev: ToolPointer, _settle: () => ToolSample | null): void;
}
