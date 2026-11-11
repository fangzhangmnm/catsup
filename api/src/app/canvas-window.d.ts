import type { Editor } from "../editor/editor.ts";
import type { PaintBoards } from "../paint/boards.ts";
import { type MenuWindowSpec } from "./ui/menu-window.ts";
export interface CanvasWindowDeps {
    readonly editor: Editor;
    readonly boards: PaintBoards;
    readonly store: MenuWindowSpec<string>["store"];
    hint(text: string): void;
    onOpenChange?(open: boolean): void;
    /** 这张画最近一次存下去的字节多大（热的画存过之后贴图行里没有字节，得问存盘那边；paint/save.ts PaintSaver.lastSizes）。 */
    savedSizes?(texture: string): {
        readonly ora: number;
        readonly png: number;
    } | null;
}
export interface CanvasWindow {
    toggle(anchor: HTMLElement): void;
    open(anchor: HTMLElement): void;
    isOpen(): boolean;
    /** 界面例行刷新（选区 / 上下文 / 场景变了）：物件、atlas、线、高亮跟上；没变就什么都不做。关着 = 什么都不做。 */
    sync(): void;
    /** 每帧开画之前：画板落定的内容变了 = 读回一次（一笔当中不变 → 不读）。关着 = 什么都不做。 */
    frame(): void;
    /** 三维这边要亮的面（世界编号）：小窗里悬停的那张面在每一份摆放里的编号；没有 = null。 */
    peekWorld(): ReadonlySet<number> | null;
    /** 探针用：现在的样子和计数。 */
    probe(): CanvasWindowProbe;
    readonly el: HTMLElement;
}
export interface CanvasWindowProbe {
    open: boolean;
    def: number | null;
    tex: string | null;
    width: number;
    height: number;
    faces: number[];
    thin: number;
    thick: number;
    patches: number;
    covered: number;
    shared: number;
    selected: number[];
    hover: number | null;
    debugView: boolean;
    /** 读回了几次 / 线重算了几次 / 冷图解了几次（开着画一笔：笔当中不涨）。 */
    readbacks: number;
    outlines: number;
    decodes: number;
    hoverLine: string;
    statsLine: string;
    /** 图上一点（格）在页面上的位置（探针点它用）。 */
    screenOf(x: number, y: number): {
        x: number;
        y: number;
    } | null;
}
export declare function mountCanvasWindow(d: CanvasWindowDeps): CanvasWindow;
