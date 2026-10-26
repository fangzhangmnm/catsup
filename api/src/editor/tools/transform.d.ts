import type { Kernel } from "../../kernel/kernel.ts";
import type { FaceEvent } from "../../kernel/kernel.ts";
import type { ToolPointer } from "../editor.ts";
import type { ToolCtx, ToolHandler, ToolSample } from "../tool-handler.ts";
import type { ViewState } from "../render3.ts";
export declare class TransformTool implements ToolHandler {
    readonly tool: "transform";
    readonly grammar: "direct";
    private mode;
    private h;
    private hIdx;
    private t0;
    private f;
    private grab;
    private dist;
    private angle;
    private mv;
    /** 悬停 / 拖着的把手（高亮）：缩放柄 `s<序号>`，箭头 / 环 = XformHandle。 */
    private hot;
    active(): boolean;
    cancel(): void;
    sample(): Record<string, number>;
    describe(): Record<string, unknown>;
    /** 角柄 8 个（等比）+ 面心柄 6 个（单轴），按选区的世界包围盒。 */
    private handles;
    /** 箭头 / 环的位置：选区包围盒中心 + 上下文帧的三轴。没选区 → null。 */
    private gizmo;
    /** 光标下是哪个把手：缩放柄和箭头一起比（屏距最近，叠在一起离相机近的赢），都不在圈里才看环。 */
    private pickAt;
    private static hotOf;
    hover(ctx: ToolCtx, s: {
        x: number;
        y: number;
    }): void;
    down(ctx: ToolCtx, ev: ToolPointer): void;
    track(ctx: ToolCtx, s: {
        x: number;
        y: number;
    }, travel?: number): void;
    private trackScale;
    /** 沿轴移动：① 吸到点（端点 / 中点 / 圆心…）= 那点投到轴上；② 否则格点吸附开着 = 从抓点量整格（离得近才咬）。 */
    private trackMove;
    /** 绕轴转：从抓的方向转到光标方向（连续化，可以转过 180°）；格点吸附开着 = 15° 一档，离得近才咬。 */
    private trackRotate;
    /** 当前预演的变换（世界系）；没在拖 → null。 */
    private currentXform;
    live(ctx: ToolCtx, run: (fn: (c: Kernel) => FaceEvent[]) => void): string;
    up(ctx: ToolCtx, _ev: ToolPointer, settle: () => ToolSample | null): void;
    /** 缩放柄 + 箭头 / 环，都跟着预演实时动（user 2026-10-21「缩放的handle应该跟着实时动」）。缩放拖着的时候不画箭头 / 环（包围盒在变形）。 */
    viewExtras(ctx: ToolCtx): Partial<ViewState>;
}
