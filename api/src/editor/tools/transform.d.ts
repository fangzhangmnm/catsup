import type { Kernel } from "../../kernel/kernel.ts";
import type { FaceEvent } from "../../kernel/kernel.ts";
import type { ToolPointer } from "../editor.ts";
import type { ToolCtx, ToolHandler, ToolSample } from "../tool-handler.ts";
import type { ViewState } from "../view-state.ts";
export declare class TransformTool implements ToolHandler {
    readonly tool: "transform";
    readonly grammar: "direct";
    private mode;
    private grab;
    /** 拖中心点 / 拖选区（移动代驾）开始时的手柄：拖动中跟着走，不重算（重算时在手里的组件不算数，「自动」会跳回包围盒中心）。 */
    private centerG;
    private dist;
    private angle;
    private factor;
    private copy;
    private mv;
    /** 悬停 / 拖着的把手（高亮）：XformHandle 或 "mc"（中心点）。 */
    private hot;
    /** 代驾：中心点 / 拖已选中的东西 = 移动工具；点空处 / 框选 = 选择工具。 */
    private readonly mover;
    private readonly selector;
    /** 按在已选中的东西上开的移动：松手前没动 = 其实是点一下 → 退回选择（点击族照常）。 */
    private fromHit;
    /** 临时变换中心（右下「选变换中心」拾的点）与当时的选区签名：选区一变就作废。 */
    private tempPivot;
    private tempSig;
    /** 正在等用户点一下定变换中心。 */
    picking: boolean;
    /** 抓的时候四种变换中心（马后炮换变换中心重做用）。 */
    private pivotsAtGrab;
    active(): boolean;
    cancel(): void;
    sample(): Record<string, number>;
    describe(ctx?: ToolCtx): Record<string, unknown>;
    /** 「选变换中心」：下一下点 = 临时变换中心（再按一次 = 不选了）。 */
    startPickPivot(): void;
    clearPivot(): void;
    get hasTempPivot(): boolean;
    /** 选区签名（便宜的那种：数量 + id 和 + 组 / 组件键）：临时变换中心跟着选区走，选区一变就作废。 */
    private static selSig;
    private pivotMode;
    /** 现在的变换中心：临时变换中心（选区没变）> 变换中心选项。 */
    private pivotNow;
    private gizmo;
    /** 屏幕把手：中心点（变换中心的投影）和等比缩放块（中心右上方）。 */
    private screenHandles;
    /** 光标下是哪个把手：中心点 / 等比块 / 单轴块 / 箭头先比（屏距最近，叠在一起离相机近的赢），都不在圈里才看环。 */
    private pickAt;
    private static hotOf;
    hover(ctx: ToolCtx, s: {
        x: number;
        y: number;
    }): void;
    down(ctx: ToolCtx, ev: ToolPointer): void;
    /** 命中的东西在选区里吗（散的面 / 边；组 / 组件按整体）。 */
    private inSelection;
    track(ctx: ToolCtx, s: {
        x: number;
        y: number;
    }, travel?: number): void;
    /** 沿轴移动：① 吸到点 = 那点投到轴上；② 否则格点吸附开着 = 从抓点量整格（近才咬）。 */
    private trackMove;
    /** 绕轴转（连续化，可以转过 180°）；格点吸附开着 = 15° 一档，近才咬。 */
    private trackRotate;
    /** 缩放（绕变换中心）：单轴块 = 抓点沿轴的距离比（过了变换中心 = 负 = 镜像），等比块 = 屏距比；咬 −1 / 0.5 / 1 / 1.5 / 2 / 3 / 4（屏距近才咬）。 */
    private trackScale;
    /** 当前预演的变换（世界系，绕抓的时候的变换中心）；中心点 / 选择 / 没在拖 → null。 */
    private xformOf;
    /** 缩放沿哪几根轴：单轴块 = 那一根；平面块 = 两根；等比块 = 空（三轴等比）。 */
    private scaleDirs;
    private currentXform;
    live(ctx: ToolCtx, run: (fn: (c: Kernel) => FaceEvent[]) => void): string;
    up(ctx: ToolCtx, ev: ToolPointer, settle: () => ToolSample | null): void;
    /** 箭头 / 环 / 方块 / 中心点，跟着预演实时动（拖着的时候在抓的那一刻的位置上叠当前变换）。 */
    viewExtras(ctx: ToolCtx): Partial<ViewState>;
}
