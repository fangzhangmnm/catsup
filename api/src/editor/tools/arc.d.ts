import type { Kernel } from "../../kernel/kernel.ts";
import type { FaceEvent } from "../../kernel/kernel.ts";
import type { ToolPointer } from "../editor.ts";
import type { ToolCtx, ToolHandler } from "../tool-handler.ts";
import type { ViewState } from "../view-state.ts";
export declare class ArcTool implements ToolHandler {
    readonly tool: "arc";
    readonly grammar: "steps";
    readonly lock: "plane";
    hover(ctx: ToolCtx, s: {
        x: number;
        y: number;
    }): void;
    private stage;
    private mode;
    private plane;
    private plane0;
    /** 第一下：two / three 的起点；center / pie 的圆心。 */
    private p1;
    /** 第二下：two 的终点 / three 的枢轴 / center·pie 的起点。 */
    private p2;
    /** 第三量：two 的凸度点 / three 的终点（指针）；center·pie 的扫角（弧度，连续化）。 */
    private p3;
    private sweep;
    active(): boolean;
    cancel(): void;
    sample(): Record<string, number>;
    private label;
    private gesture;
    /** 指针在手势平面上的点（吸附过；吸不到就射线落面）。 */
    /** A9 面锁：第二点落定之前随时可锁 / 解锁——平面过首点；解锁回到首点解析出的平面。 */
    private relock;
    private pointOnPlane;
    /** 圆心弧：指针 → 扫角（连续化；格点吸附开着 = 15° 一档、离得近才咬，按住 Shift 反过来）。 */
    private sweepFrom;
    down(ctx: ToolCtx, ev: ToolPointer): void;
    track(ctx: ToolCtx, s: {
        x: number;
        y: number;
    }): void;
    live(ctx: ToolCtx, run: (fn: (c: Kernel) => FaceEvent[]) => void): string;
    /** 圆心弧 / 扇形转角度时画量角器弧（A34：克制的圆 + 基线 + 当前线）。 */
    viewExtras(): Partial<ViewState>;
}
