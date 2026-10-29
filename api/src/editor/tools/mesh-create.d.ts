import type { FaceEvent, Kernel } from "../../kernel/kernel.ts";
import type { MeshKernel } from "../../mesh/mesh-kernel.ts";
import type { QuantityTag } from "../units.ts";
import type { ToolPointer } from "../editor.ts";
import type { ViewState } from "../render3.ts";
import type { ToolCtx, ToolHandler, ToolSample } from "../tool-handler.ts";
export declare class MeshCreateTool implements ToolHandler {
    readonly tool: "create";
    readonly grammar: "direct";
    private phase;
    private start;
    private cur;
    private dragging;
    private size;
    /** 深 / 宽（平的几种拖出来的长宽比；别的 = 1）。 */
    private aspect;
    private frame;
    private spin;
    private base;
    private refAng;
    private pressing;
    /** 第二步按下之后挪过了点按容差（= 在拖着转；没过 = 这一下是点一下，不转）。 */
    private turning;
    /** 第二步能打角度（「30」回车 = 转 30°）。 */
    get typedQuantity(): QuantityTag | undefined;
    awaitsClick(): boolean;
    active(): boolean;
    cancel(): void;
    /** 右键 = 不要环：拖着定大小时 / 第二步里，都按起始朝向（打了角度就按打的）落定。 */
    commitInPlace(ctx: ToolCtx): void;
    sample(): Record<string, number>;
    live(_ctx: ToolCtx, _run: (fn: (c: Kernel) => FaceEvent[]) => void): string;
    describe(): Record<string, unknown>;
    /** 定朝向的环 = 量角器圆环（参考线 = 没转时的 x 方向，橙线 = 现在的朝向），套在基本体外面（方的半对角 ≈ 0.71 × 边长，圆的半径 = 0.5 × 直径）。 */
    viewExtras(): Partial<ViewState>;
    private kind;
    /** 拖出来的尺寸（世界长度：边长 / 直径 = 拖的距离 × 2）；没拖 / 落不到东西 = null。 */
    private dragSize;
    /** 拖出来的尺寸 + 长宽比：平的几种、没锁比例（Shift 反过来）= 指针落在底面上那一点在坐标架两根轴上各多远 × 2；别的 = 正方 / 正圆。 */
    private dragDims;
    /** 指针打在底面那个平面上、绕法向的角（相对没转时的 x）；看平面看到侧边 / 打不到 = null。 */
    private angleAt;
    /** 现在的朝向：打了数 = 打的数；否则跟指针（吸轴 / Shift 档）。 */
    private spinNow;
    private orientTo;
    down(ctx: ToolCtx, ev: ToolPointer): void;
    track(ctx: ToolCtx, s: {
        x: number;
        y: number;
    }, travel?: number): void;
    liveMesh(ctx: ToolCtx, run: (fn: (m: MeshKernel) => void) => void): string;
    up(ctx: ToolCtx, ev: ToolPointer, _settle: () => ToolSample | null): void;
}
