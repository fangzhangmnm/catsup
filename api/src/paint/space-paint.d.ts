import { type SpaceCamera } from "./space-stroke.ts";
import type { SpacePrep } from "./space-prep.ts";
import type { SpaceGpu, SpaceImage } from "./space-gpu.ts";
import type { PaintBoards } from "./boards.ts";
import type { PaintTarget } from "./space-target.ts";
import { type ResolvedBrush } from "./kernel/src/common/resolved-brush.ts";
import type { Scene } from "../scene/scene.ts";
import type { Guid } from "../format/guid.ts";
export interface SpacePaintDeps {
    readonly boards: PaintBoards;
    readonly scene: () => Scene;
    /** 这张画（按画板实际的画布）在世界里摆在哪几处（paint-targets.ts）。 */
    readonly targets: (texture: Guid) => PaintTarget[];
    /** 三维的显卡接口（真显卡版 / 软件版）。 */
    readonly gpu: () => SpaceGpu | null;
    /** 画画的准备（1-4c）：整份几何 + 每格的表，落笔只取现成的；没准备好 = 这一笔不开始（PrepPendingError / 建不了的那个错）。 */
    readonly prep: SpacePrep;
    /** 这张离屏图在这个显卡接口上交给内核的形态（真显卡 = { gl }，软件版 = { pixels }）。 */
    readonly external: (img: SpaceImage) => {
        readonly gl: WebGLTexture;
    } | {
        readonly pixels: Uint8Array | Uint8ClampedArray;
    };
    readonly camera: () => SpaceCamera;
    /** 一笔落层之后（内核封的那几步在画板登记处攒着）：交给三维的撤销栈当一步（1-8a；label = 画一笔 / 擦一笔）。不给 = 不进三维的栈（测试）。 */
    readonly commitStep?: (erase: boolean) => void;
    /** 这一笔开不了（建这一笔的表时出错，比如画布上的格子超过这一版的上限）：这一笔已经取消、零痕迹；告诉宿主为什么（1-7：不许每帧在「准备」里抛）。 */
    readonly failed?: (err: unknown) => void;
}
export interface SpacePaintOpts {
    readonly brush: ResolvedBrush;
    readonly color: readonly [number, number, number];
    readonly accum: "max" | "over";
    readonly erase?: boolean;
}
/** 调试钩子 / 探针用的一支笔：屏幕上 size 像素、间距 0.1、浓度 1、不随压感变、没有起笔渐细（收笔渐细按 taperOut）。笔刷设置的界面是后面的施工单。 */
export declare function hookBrush(o: {
    readonly size?: number;
    readonly hardness?: number;
    readonly taperOut?: number;
}): ResolvedBrush;
export declare class SpacePaintStroke {
    private readonly d;
    private readonly o;
    private readonly board;
    private readonly stroke;
    private readonly gpu;
    private session;
    private layer;
    private ext;
    private layerId;
    private dirty;
    private finishing;
    /** 已经画进定型层的笔尖数（这些不再取、不再算碰到哪些三角形）。 */
    private drawn;
    private readonly unhook;
    constructor(d: SpacePaintDeps, texture: Guid, o: SpacePaintOpts);
    private readonly untrack;
    /** 借来的每格的表（画画的准备那里的；这一笔不放）。 */
    private readonly cells;
    down(x: number, y: number, p: number, t?: number | null): void;
    move(x: number, y: number, p: number, t?: number | null): void;
    /** 抬笔：整笔重画一次（收笔渐细）→ 落层（内核一步）。在下一次「准备」里做完；这里先把它准备好。 */
    up(): void;
    /** 抬笔那一下各段（量；毫秒）：收路 / 整笔重画（含取笔尖、画薄层、交档口）/ 落层（档口 end = 内核写回）。 */
    lastUp: Record<string, number>;
    cancel(): void;
    /** 这一笔到现在一帧里最大的那张数据表（个数、哪张、上限；探针量）。 */
    peak: {
        values: number;
        table: string;
        cap: number;
    };
    /** 现在的范围（报给内核的那一块；探针用）。 */
    range(): {
        x: number;
        y: number;
        w: number;
        h: number;
    } | null;
    tipCount(): number;
    /** 落笔那一下建各种表（三角形公式、两张离屏图；每格的表是借来的现成的）花了多少毫秒（量）。 */
    buildMs: number;
    /** 上一次「准备」各段（量；毫秒）：取新笔尖 + 算碰到哪些三角形 / 画薄层（含上传、拷定型层）/ 交给档口。fresh = 这一帧给的笔尖数。 */
    lastFrame: {
        fresh: number;
        frozen: number;
        tipsMs: number;
        layerMs: number;
        hostMs: number;
    };
    /** 这一帧的准备（画板登记处的 prepare 调；合成在它后面）。 */
    /** 建这一笔的表时出过错（已经取消、零痕迹）。 */
    private broken;
    private prepare;
    private finish;
    private close;
}
