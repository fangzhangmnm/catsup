import type { Kernel } from "../kernel/kernel.ts";
import type { FaceEvent, FaceId } from "../kernel/kernel.ts";
import type { Tool } from "./tool-ids.ts";
import type { ToolPointer } from "./editor.ts";
import type { ToolCtx, ToolHandler, ToolSample } from "./tool-handler.ts";
export declare const SURFACE_TIERS: readonly [{
    readonly id: "smooth";
    readonly label: "平滑组";
    readonly hint: "沿软边连通的面 = 一张逻辑面（单击）";
}, {
    readonly id: "sharp";
    readonly label: "到锐角为止";
    readonly hint: "沿软边或夹角 ≤ 阈值的边连通的面（双击）";
}, {
    readonly id: "connected";
    readonly label: "连通体";
    readonly hint: "沿任何边连通的面（三击）";
}];
export type SurfaceTier = (typeof SURFACE_TIERS)[number]["id"];
/** 两档取大（选项档 = 下限，点击档往上抬）。 */
export declare function tierMax(a: SurfaceTier, b: SurfaceTier): SurfaceTier;
/** 点击次数 → 档：1 = 平滑组、2 = 到锐角、≥ 3 = 连通体。 */
export declare function tierOfClicks(n: number): SurfaceTier;
/** 从种子面出发按档泛洪（纯函数）。sharp：过一条边 = 软边 ∨ 二面角 ≤ sharpDeg（A–B 软边、A–C / B–D 共面 → ABCD 连坐）。 */
export declare function facesForAssign(k: Kernel, seed: FaceId, tier: SurfaceTier, sharpDeg: number): FaceId[];
export interface SurfaceAssignOpts {
    readonly tool: Tool;
    /** 这个工具的动词名（提示用：「涂了 N 张面」）。 */
    readonly verb: string;
    /** 把值指派给这些面（活动池本地 id）。 */
    apply(ctx: ToolCtx, faces: readonly FaceId[]): void;
    /** 吸：从这张面读值回工具的「蘸的」。 */
    sample(ctx: ToolCtx, face: FaceId): void;
    /** 这张面现在的值叫什么（吸色提示用）；不给就只说「这张面」。 */
    describe?(ctx: ToolCtx, face: FaceId): string;
}
export declare class SurfaceAssignTool implements ToolHandler {
    readonly tool: Tool;
    readonly grammar: "direct";
    /** 吸色子模式锁定（上下文条上的钮）；Ctrl / Alt 按着 = 临时。 */
    eyedropper: boolean;
    private readonly opts;
    private pressed;
    private tempEye;
    private scrub;
    private poolHit;
    constructor(opts: SurfaceAssignOpts);
    active(): boolean;
    cancel(): void;
    sample(): Record<string, number>;
    live(_ctx: ToolCtx, _run: (fn: (c: Kernel) => FaceEvent[]) => void): string;
    private faceAt;
    hover(ctx: ToolCtx, s: {
        x: number;
        y: number;
    }): void;
    down(ctx: ToolCtx, ev: ToolPointer): void;
    track(ctx: ToolCtx, s: {
        x: number;
        y: number;
    }): void;
    up(ctx: ToolCtx, ev: ToolPointer, _settle: () => ToolSample | null): void;
}
