import type { Editor } from "../editor/editor.ts";
import type { PaintPointer } from "../editor/tool-handler.ts";
import type { PaintBoards } from "../paint/boards.ts";
import { type SpacePaintDeps } from "../paint/space-paint.ts";
import type { PaintColor } from "./paint-color.ts";
import type { SpacePrep } from "../paint/space-prep.ts";
export interface PaintWorkbenchDeps {
    readonly editor: Editor;
    readonly boards: PaintBoards;
    /** 一笔要的那些口（main.ts 和调试钩子同一份）；chain = 落点只认这一份摆放（正在编辑的那一份）。 */
    strokeDeps(chain: readonly number[]): SpacePaintDeps;
    /** 落笔之前问的门（main.ts paintStrokeGate：冷的 = 不开始 + 解开；只能看不能画 = 说为什么）。能画 = null。 */
    gate(texture: string): "warming" | "view-only" | null;
    readonly color: PaintColor;
    /** 画画的准备（main.ts paintPrep；和调试钩子同一个）。 */
    readonly prep: SpacePrep;
    /** 提示行。 */
    hint(text: string): void;
    /** 上方正中的主按钮闪一下（没画过的物件上落笔：提示行说一句 + 让人看到按哪里；施工单十五第三节）。 */
    flashStart?(): void;
}
export declare class PaintWorkbench {
    private readonly d;
    private stroke;
    private t0;
    private lastPen;
    private readonly grids;
    private entered;
    constructor(d: PaintWorkbenchDeps);
    /** 一笔正在画（手势路由问：这时候相机不动）。 */
    get stroking(): boolean;
    /** 编辑器的工具交过来的一下。 */
    pointer(ev: PaintPointer): void;
    /** 上一次准备花了多少毫秒（探针量）。 */
    lastPrepMs: number;
    /**
     * 每帧的「准备」之前调一次（main.ts beforeRender）：进了画画工作台 / 换了正在编辑的物件 = 这个物件的画先热起来（只比一个键）；
     * 然后对一次画画的准备（键对上 = 空操作；过期 = 这一帧重建）。出了画画工作台 = 准备全放。
     */
    tick(): void;
    /** 这个物件上走的画（贴图表里分层的那几张）。 */
    private paintsOn;
    /** 这个物件上的画：新建还没画过的建画板（存出去和没建一样是空白的那份）；热的那几张的每份摆放（只认正在编辑的这一份）准备现成。 */
    private keepPrepared;
    private grid;
    /** 屏幕上这一点打到当前物件的哪张面、那张面走哪张画、落在哪一格。 */
    private aim;
    private begin;
    /** 吸管：取那一处的颜色，取完回到上一把笔。 */
    private eyedrop;
}
/** 一笔开不了时提示行说的话（已知的几种说人话；别的照原文）。 */
export declare function strokeFailedSay(err: unknown): string;
