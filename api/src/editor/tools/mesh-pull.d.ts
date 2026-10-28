import type { FaceEvent, Kernel } from "../../kernel/kernel.ts";
import type { MeshKernel } from "../../mesh/mesh-kernel.ts";
import type { ToolPointer } from "../editor.ts";
import type { ToolCtx, ToolHandler } from "../tool-handler.ts";
export declare class MeshPullTool implements ToolHandler {
    readonly tool: "pp";
    readonly grammar: "steps";
    readonly lock: "axis";
    private t;
    /** 按在选区外的东西上：落定时选区换成它（selecting.ts adoptPress；账本 UX30）。 */
    private adopt;
    /** 按下时有没有选区（user 10-27：一开始没选区 = SU 手感，做完还是没选区、接着挑下一个「受害者」；一开始有选区才留选区）。 */
    private hadSel;
    private pivotW;
    private nW;
    private alongScale;
    private grabW;
    private start;
    private cur;
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
    liveMesh(ctx: ToolCtx, run: (fn: (m: MeshKernel) => void) => void): string;
    /** 当前拖动 → 世界位移（off：面、或锁了轴 / 面）或沿各点垂直方向的世界长度（along：边 / 点、没锁）。 */
    private motion;
    /** 沿 nW 拖了多少（世界长度）：nW 在屏幕上的投影够长 = 拖动在它上面的分量；正对着 / 抵消了 = 屏幕往上 = 正。 */
    private amountAlong;
    private commit;
    private what;
    /** 屏幕点 → 过轴心、垂直于视线的平面上的点（世界）。 */
    private onPlane;
}
