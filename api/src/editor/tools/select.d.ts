import type { Kernel } from "../../kernel/kernel.ts";
import type { FaceEvent } from "../../kernel/kernel.ts";
import type { ToolPointer } from "../editor.ts";
import type { ToolCtx, ToolHandler, ToolSample } from "../tool-handler.ts";
import type { SelMode } from "../tools.ts";
export declare class SelectTool implements ToolHandler {
    readonly tool: "select";
    readonly grammar: "direct";
    private start;
    private cur;
    active(): boolean;
    /** 这一下怎么合进选区：修饰键 > 右下角选项。 */
    /** 两档（2026-10-28 FM158）：替换 / 多选（= 按住 Shift）：多选里拖 = 加选、点 = 切换；Ctrl 照旧减选。 */
    static modeOf(ctx: ToolCtx, ev: ToolPointer, box: boolean): SelMode;
    static multi(ctx: ToolCtx): boolean;
    cancel(): void;
    sample(): Record<string, number>;
    live(_ctx: ToolCtx, _run: (fn: (c: Kernel) => FaceEvent[]) => void): string;
    down(_ctx: ToolCtx, ev: ToolPointer): void;
    track(ctx: ToolCtx, s: {
        x: number;
        y: number;
    }): void;
    up(ctx: ToolCtx, ev: ToolPointer, _settle: () => ToolSample | null): void;
}
