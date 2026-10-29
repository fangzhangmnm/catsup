import type { FaceEvent, Kernel } from "../../kernel/kernel.ts";
import type { MeshKernel } from "../../mesh/mesh-kernel.ts";
import type { ToolPointer } from "../editor.ts";
import type { ToolCtx, ToolHandler } from "../tool-handler.ts";
export type MeshXformKind = "move" | "rotate" | "scale" | "normal";
export declare class MeshTransformTool implements ToolHandler {
    readonly grammar: "steps";
    readonly lock: "axis";
    readonly tool: "move" | "rotate" | "scale" | "shrink";
    private readonly kind;
    /** 沿法线：每个点自己的方向（本地，单位长；点 = 连着的面的法向平均）。 */
    private dirs;
    private vids;
    /** 按在选区外的东西上：落定时选区换成它（selecting.ts adoptPress；账本 UX30）。 */
    private adopt;
    private base;
    private pivotW;
    private grabW;
    private start;
    private cur;
    private shift;
    /** 这一刻吸不吸（底 XOR Shift；底 = ctx.snapBase()：鼠标关、触屏跟锁钮）。移动 = 点 > 边 > 面，旋转 = 15° 一档，缩放 = 0.1 一档。 */
    private snapOn;
    private handleW;
    private snapT;
    /** 沿边滑（移动的一种模式，G G）：每个被挪的点能滑的边（另一头不在被挪的点里）；挑定的那一条（第一次拖出方向时挑，之后不换）。 */
    private rails;
    private railPick;
    /** G G = 这一次操作反过来（工具条上的「沿边滑」是常驻模式；Blender 的 G G 只管这一次）。 */
    private slideOnce;
    toggleSlideOnce(): void;
    /** 换了沿边滑开关：下一帧重挑。 */
    resetSlide(): void;
    /** 软选择（开着时按下那一刻算）：选区外每个点到选区的世界距离 + 它的本地坐标（+ 沿法线时它自己的方向）。 */
    private soft;
    /** 手势中打的数是什么量（Blender「S Z 0」：缩放 = 倍数、旋转 = 角度、移动 / 沿法线 = 长度；读法 = units.ts，工具只问 ctx.typed()）。 */
    readonly typedQuantity: {
        q: "length" | "angle" | "factor";
    };
    constructor(kind: MeshXformKind);
    /** 没选区又按在空处 = 拖框（「会选的工具」，selecting.ts）。 */
    private box;
    tap(ctx: ToolCtx, ev: ToolPointer): void;
    active(): boolean;
    startModal(ctx: ToolCtx, s: {
        x: number;
        y: number;
    }): boolean;
    cancel(): void;
    sample(): Record<string, number>;
    live(_ctx: ToolCtx, _run: (fn: (c: Kernel) => FaceEvent[]) => void): string;
    describe(): Record<string, unknown>;
    down(ctx: ToolCtx, ev: ToolPointer): void;
    track(ctx: ToolCtx, s: {
        x: number;
        y: number;
    }): void;
    /** 挪的吸附目标（Shift）：光标吸附圈里最近的点 > 边上最近的点 > 光标射线打到的面；被挪的点、连着它们的边 / 面不算。O(网格)，几千面以内每帧零点几毫秒。 */
    private snapTarget;
    liveMesh(ctx: ToolCtx, run: (fn: (m: MeshKernel) => void) => void): string;
    /** 当前拖动 → 每个点的新本地坐标 + 读数。 */
    private solve;
    /** 沿边滑：抓住的那个点（离按下处最近的）按拖动方向挑一条边、拖的量换成沿那条边的比例 t；别的点挑和它方向最像的那条边、走同样的 t。 */
    private solveSlide;
    /** 软选择这一帧的权重：半径（屏幕像素）在轴心那里换成世界长度；顺手画半径圈。没开 = null。 */
    private softWeightsNow;
    private commit;
    private verb;
    /** 屏幕点 → 过轴心、垂直于视线的平面上的点（世界）。不用 pick.ts cameraPlane：那个是「最朝向镜头的轴平面」（SU 画图用），等轴视角下是地面，锁 Z 就挪不动了。 */
    private onPlane;
}
