import type { Kernel } from "../kernel/kernel.ts";
import type { FaceEvent, FaceId, Pt3 } from "../kernel/kernel.ts";
import type { PointerFrame, Viewport, EpsSet } from "./pointer-frame.ts";
import type { AlignHand, AlignQuery, DrawPlane, HitResult3, Snap3 } from "./pick.ts";
import type { WorldView } from "../scene/world-view.ts";
import type { PoolRef } from "../scene/scene.ts";
import type { Xform } from "../scene/xform.ts";
import type { Op } from "./ops.ts";
import type { CatsUpToolConfig } from "./tool-config.ts";
import type { LastGesture, PoolPick, Tool, ToolPointer } from "./editor.ts";
/** 指针下的东西属于谁：活动池里的实体 / 子池（group 或实例）整体 / 什么都没有。 */
export type Classified = {
    kind: "entity";
    local: HitResult3;
} | {
    kind: "pool";
    pick: PoolPick;
    key: string;
} | {
    kind: "none";
};
/** 抬笔结算回放给工具的那一帧（底座公共字段 + 工具自己报的数）。 */
export interface ToolSample {
    cursor3: Pt3 | null;
    plane: DrawPlane;
    snap: Snap3 | null;
    extra: Readonly<Record<string, number>>;
}
/** 底座递给工具的全部能力（窄接口 = 测试面：给假 ctx 喂事件序列，断言 commitOp 收到的 op）。 */
export interface ToolCtx {
    readonly config: CatsUpToolConfig;
    /** 活动池的 checkpoint 内核（本地坐标）。 */
    kernel(): Kernel;
    /** 静态推断世界（全池合成，世界坐标）。 */
    world(): WorldView;
    /** 手势中的实时世界（没手势 = world）。 */
    live(): WorldView;
    frame(): PointerFrame;
    vp(): Viewport;
    eps(): EpsSet;
    snapPx(): number;
    /** 屏幕点下的面（全局 id）。 */
    pickFace(sx: number, sy: number): FaceId | undefined;
    classify(view: WorldView, hit: HitResult3): Classified;
    /** 吸附求解（世界视图 + 帧 + ε 由底座配好）。 */
    snap(view: WorldView, sx: number, sy: number, q: AlignQuery): Snap3;
    alignSources(): Pt3[];
    /** 「手里」谓词（在手的几何不参与吸附）。 */
    hand(view: WorldView): AlignHand;
    toLocal(p: Pt3): Pt3;
    ctxXform(): Xform;
    activePool(): PoolRef;
    /** 意图门开关：屏上拖够了才有意图。 */
    intentOn(s: {
        x: number;
        y: number;
    }, travel?: number): boolean;
    commitOp(op: Op): FaceEvent[];
    opCount(): number;
    hint(text: string | null): void;
    anchor(): Pt3 | null;
    setAnchor(p: Pt3 | null): void;
    setCursor(p: Pt3 | null): void;
    setSnap(sn: Snap3 | null): void;
    /** 数值小窗：记下「刚做完的那一步」。 */
    recordLast(L: LastGesture): void;
}
export interface ToolHandler {
    readonly tool: Tool;
    /** 手势进行中？（底座 gestureActive 的一票；为真时 pointerMove 走 track、computeLive 走 live）。 */
    active(): boolean;
    /** 清掉自己的手势状态（底座 cancelGesture 时对所有工具调）。 */
    cancel(): void;
    down(ctx: ToolCtx, ev: ToolPointer): void;
    track(ctx: ToolCtx, s: {
        x: number;
        y: number;
    }, travel?: number): void;
    /** settle() = 抬笔结算后的那一帧（null = 没样本）。 */
    up(ctx: ToolCtx, ev: ToolPointer, settle: () => ToolSample | null): void;
    /** 预演：把本工具当前状态跑到克隆内核上（run 一次 = 一份影子）；返回尺寸文案（"" = 无）。 */
    live(ctx: ToolCtx, run: (fn: (c: Kernel) => FaceEvent[]) => void): string;
    /** 本工具要进样本环的数（抬笔结算回放时按 extra 读回）。 */
    sample(): Record<string, number>;
}
