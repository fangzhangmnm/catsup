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
/** 两个落点共有的那张面（最小 id）；没有 = null。 */
export declare function commonFace(m: MeshKernel, a: KnifePoint, b: KnifePoint): number | null;
export declare class MeshKnifeTool implements ToolHandler {
    readonly tool: "knife";
    /** direct：松手交给工具（落点在松手时定）。以前是 steps = 按下那一刻就按悬停到的位置取点，笔没有悬停、一落下就得正好压在边上（W-0 侦察）。 */
    readonly grammar: "direct";
    /** 同一处再点一下 = 收刀（和画线的收笔一样）。direct 工具底座不管这一下，刀在 up 里自己认；W-7 的「收」钮也认这个标记。 */
    readonly sameSpotEnds = true;
    private start;
    private startW;
    private startKind;
    private hov;
    /** 按着没松 = 这一下的落点还在找（active 的一票：底座这时才把移动 / 松手递过来）。 */
    private pressing;
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
    hover(ctx: ToolCtx, s: {
        x: number;
        y: number;
    }): void;
    track(ctx: ToolCtx, s: {
        x: number;
        y: number;
    }): void;
    /** 屏幕点 → 过上一个落点、垂直于视线的平面上的点（每帧现算，见 cursorS）。 */
    private onPlane;
    /** 现在这一下切不切得出来（刀线的颜色）。 */
    private validNow;
    down(ctx: ToolCtx, ev: ToolPointer): void;
    up(ctx: ToolCtx, ev: ToolPointer): void;
    /** 定下一个点（第一个点 / 切到的点 / 挪过去的起点）：起点换成它。 */
    private setStart;
    /** 松手之后：找落点时的落点 / 光标丢掉（不留连到别处的线），标记留在起点上——笔没有悬停，不然看不出起点在哪；下一次按下再清（down）。 */
    private settle;
    live(ctx: ToolCtx, preview: PreviewOp): string;
    viewExtras(ctx: ToolCtx): Partial<ViewState>;
    private loopCutAt;
    /**
     * 光标下看得见的点 / 中点 / 边上的点（拓扑吸附，永远开）。中点 = 离边的中点在点的吸附半径内（和硬表面的求解器同一个 eps.point；W-3）。
     * 边上的点 = 光标正下方那一点在这条边上的位置：问指针帧的 distToSeg
     * （桌面相机按深度做透视校正、VR 帧按射线算；W-1 2026-11-10 Claude Opus 5.5：以前把屏幕上的比例直接当成边上的比例，
     * 透视下标记跑偏——默认视角 8 像素，一条往里伸的 4 m 长边上 160 像素 / 1.2 m；正交下两者相同）。
     */
    private snapAt;
}
