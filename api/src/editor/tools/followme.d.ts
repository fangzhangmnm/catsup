import type { Kernel } from "../../kernel/kernel.ts";
import type { FaceEvent, FaceId, Pt3 } from "../../kernel/kernel.ts";
import type { Selection } from "../tools.ts";
import type { ToolPointer } from "../editor.ts";
import type { ToolCtx, ToolHandler } from "../tool-handler.ts";
export interface FollowPath {
    path: Pt3[];
    closed: boolean;
    smoothJoints: boolean[];
}
/**
 * 跟随的路径 = 当前选区：一串边（链，无分叉）；没选边就取选中的一张面（不是轮廓面本身）的外环 = 闭路径。
 * 取向：起点必须落在轮廓面的平面上，且首段不平行于它；闭路径候选起点多时取离轮廓最近的；两个方向都试，取 |n·d₀| 大的。
 * 关节平滑 = 两侧路径边都是曲线成员（圆 / 弧路径 → 旋转体侧面光滑）。失败 → 人话原因。
 */
export declare function pathFromSelection(k: Kernel, selection: Readonly<Selection>, profile: FaceId): FollowPath | string;
export declare class FollowMeTool implements ToolHandler {
    readonly tool: "followme";
    readonly grammar: "direct";
    active(): boolean;
    cancel(): void;
    sample(): Record<string, number>;
    track(): void;
    live(_ctx: ToolCtx, _run: (fn: (c: Kernel) => FaceEvent[]) => void): string;
    down(ctx: ToolCtx, ev: ToolPointer): void;
}
