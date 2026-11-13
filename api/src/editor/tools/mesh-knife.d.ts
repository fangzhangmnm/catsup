import type { MeshKernel } from "../../mesh/mesh-kernel.ts";
import type { ToolPointer } from "../editor.ts";
import type { ToolCtx, ToolHandler, PreviewOp } from "../tool-handler.ts";
import type { ViewState } from "../view-state.ts";
export type KnifePoint = {
    v: number;
} | {
    e: number;
    t: number;
};
/** 吸附关着时，离端点不到这么多屏幕像素 = 就是那个端点（统筹 11-13：免得切出看不见的碎边）。 */
export declare const KNIFE_END_PX = 2;
/** 两个落点共有的那张面（最小 id）；没有 = null。 */
export declare function commonFace(m: MeshKernel, a: KnifePoint, b: KnifePoint): number | null;
export declare class MeshKnifeTool implements ToolHandler {
    readonly tool: "knife";
    /** direct：底座原样递按下 / 移动 / 松开，翻成「找位置 / 下点 / 抬笔」在 seek-input.ts（stance.ts PEN_PRESS = seek；笔的设计稿第七节第 3 步）。 */
    readonly grammar: "direct";
    readonly finishLabel = "\u6536\u5200";
    private readonly input;
    readonly escFinishes = true;
    /** 这一串切成的每一刀 + 第一个点定下时编辑器的操作数（收刀时进马后炮小窗：W-8）。 */
    private chain;
    private chainOps0;
    private start;
    private startW;
    private startKind;
    private hov;
    /** 在面里拐过的弯（还没切到边的那一段：只是预演，不进撤销；放弃 = 什么都没发生）：哪张面、拐点（定义坐标 / 世界坐标）。第一个面里的点定下是哪张面。 */
    private bend;
    /** Ctrl+R 预备：下一下点到边上直接环切（Blender Ctrl+R；纪元账本 FM10「也加一个模式按钮」）。 */
    private loopNext;
    armLoop(ctx: ToolCtx): void;
    /** 光标的屏幕位置：没落在点 / 边上时刀线画到这里——每帧按当前相机从这一点的射线上取（onPlane），所以线永远从起点到光标，
     *  不在三维里留一个悬空的点，转了视角也不飘（W-3；以前存的是三维点，W-0 侦察转视角后线伸进空处）。 */
    private cursorS;
    /** 这一串切开始时有没有选区（user 10-27：没选区开始 = 做完也不留选区）。 */
    private hadSel;
    active(): boolean;
    /** 松着手、已经有起点 = 在等下一下：回车 = 在光标处点一下（底座 confirmGesture）。 */
    awaitsClick(): boolean;
    cancel(): void;
    sample(): Record<string, number>;
    describe(): Record<string, unknown>;
    /** 悬着（鼠标没按、笔悬空、还没有起点）= 只找位置：落点标记跟着，不碰提示行。 */
    hover(ctx: ToolCtx, s: {
        x: number;
        y: number;
    }): void;
    /** 底座递来的移动（按着 / 已有起点）：交给 seek-input 翻成「找位置」，带着重按的 = 下点。 */
    track(ctx: ToolCtx, s: {
        x: number;
        y: number;
    }, _travel?: number, ev?: ToolPointer): void;
    /** 找位置（seek-input 的口）：落点标记 + 刀线跟到屏幕上这一点。 */
    private seekAt;
    /** 屏幕点 → 过上一个落点、垂直于视线的平面上的点（每帧现算，见 cursorS）。 */
    private onPlane;
    /** 现在这一下切不切得出来（刀线的颜色）：落在环上 = 和提交同一个 knifeCheck；落在面里 = 这张面能接着拐（拐弯的那张 / 挨着起点的）。 */
    private validNow;
    /** 从起点（经过拐点）到环上这一点的一刀：哪张面、整条路径；切不出 = null（两点之间已经有边）；验不过 = 原因（knifeCheck 那一句）。 */
    private planTo;
    down(ctx: ToolCtx, ev: ToolPointer): void;
    up(ctx: ToolCtx, ev: ToolPointer): void;
    /** 下点（seek-input 的口）：在现在的落点标记上下一点——第一个点 = 起点；面里的点 = 拐一个弯（第一个定下是哪张面）；环上的点 = 从上一个点（经过拐点）切一刀（= 一步撤销），接着从这一点往下切。 */
    private placeHere;
    /** 抬笔（seek-input 的口；报压感的笔抬起、宽限过了）= 收刀：已经切好的留着、进小窗，还没切到的那一段丢掉（和 Esc、左下「收刀」同一段 endChain）。还没有起点 = 什么都不做。 */
    private liftEnd;
    /** 定下一个点（第一个点 / 切到的点 / 挪过去的起点）：起点换成它。 */
    private setStart;
    /** 松手之后：找落点时的落点 / 光标丢掉（不留连到别处的线），标记留在起点上——笔没有悬停，不然看不出起点在哪；下一次按下再清（down）。 */
    private settle;
    live(ctx: ToolCtx, preview: PreviewOp): string;
    viewExtras(ctx: ToolCtx): Partial<ViewState>;
    private loopCutAt;
    /** 收刀（W-8）：这一串进马后炮小窗——一行一个落在边上的点。编辑器的 endChain 在 cancel 之前调这里。 */
    onEndChain(ctx: ToolCtx): void;
    /**
     * 光标下看得见的点 / 中点 / 边上的点（拓扑吸附，永远开）。中点 = 离边的中点在点的吸附半径内（和硬表面的求解器同一个 eps.point；W-3）。
     * 边上的点 = 光标正下方那一点在这条边上的位置：问指针帧的 distToSeg
     * （桌面相机按深度做透视校正、VR 帧按射线算；W-1 2026-11-10 Claude Opus 5.5：以前把屏幕上的比例直接当成边上的比例，
     * 透视下标记跑偏——默认视角 8 像素，一条往里伸的 4 m 长边上 160 像素 / 1.2 m；正交下两者相同）。
     */
    private snapAt;
    /** 面里的点 = 笔正下方那一点（不吸附，吸附开着也一样；第八节第 4 条）：射线打这张面画出来的三角形，重心坐标换回定义坐标（落在三角形上，离面 0）。 */
    private faceAt;
    /**
     * 吸附关着的落点：拾取给了边 = 那条边；只给了点 = 这个点连着的边里离笔最近的那条（屏幕上）。边上取笔正下方那一点（不拽到中点）；
     * 离两头不到 KNIFE_END_PX 个屏幕像素 = 就是那一头的点。拾取什么都没给 = null。
     */
    private freeAt;
}
