import type { Editor } from "../editor/editor.ts";
import type { PaintBoards } from "../paint/boards.ts";
export interface CanvasWindowDeps {
    readonly editor: Editor;
    readonly boards: PaintBoards;
    hint(text: string): void;
    onOpenChange?(open: boolean): void;
    /** 这张画最近一次存下去的字节多大（热的画存过之后贴图行里没有字节，得问存盘那边；paint/save.ts PaintSaver.lastSizes）。 */
    savedSizes?(texture: string): {
        readonly ora: number;
        readonly png: number;
    } | null;
    /** 在画布上画（施工单二十一第 2 刀；main.ts 递进来）。缺 = 只看（单测 / 老入口）。 */
    readonly paint?: CanvasPaintPort;
    /** 「…」里「新建平铺的画…」（施工单二十一第 3 刀；main.ts 递进来：问大小 → 编空白分层字节 → 指令 addTiledPaint → showTiled）。缺 = 菜单里没有这一项。 */
    newTiled?(): void;
}
/** 画布上落笔的口（宿主的）：工具、开一笔、吸色、笔印多大。坐标 = 画布格（可以带小数）。 */
export interface CanvasPaintPort {
    /** 手上能在画布上用的那把（笔 / 橡皮 / 吸管）；别的 = null。 */
    tool(): "paintPen" | "paintEraser" | "eyedrop" | null;
    /** 开一笔：落笔的门不让（锁 / 冷的……）= null（门自己说了）。 */
    open(texture: string, p: CanvasPointer): CanvasStroke | null;
    /** 吸管：取这一格显示的颜色。 */
    eyedrop(texture: string, x: number, y: number): void;
    /** 手上那支笔的大小（画布格；悬停笔印）；不是笔 = null。 */
    brushSize(): number | null;
}
export interface CanvasPointer {
    readonly x: number;
    readonly y: number;
    readonly pressure: number;
    readonly pointerType: string;
    readonly at: number;
}
export interface CanvasStroke {
    move(p: CanvasPointer): void;
    up(): void;
    cancel(): void;
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
    /** 显示这张平铺的画（新建完 / 探针用）：打开小窗、切过去、先变热（好直接画）。不是平铺的画 = 什么都不做。 */
    showTiled(texture: string, anchor?: HTMLElement): void;
    readonly el: HTMLElement;
}
export interface CanvasWindowProbe {
    open: boolean;
    def: number | null;
    tex: string | null;
    width: number;
    height: number;
    /** 正在显示的平铺的画（施工单二十一第 3 刀）；没有 = null（显示的是这个物件的画）。 */
    tiled: string | null;
    faces: number[];
    thin: number;
    thick: number;
    seam: number;
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
    /** 一笔开着时跟着变：读回了几次、一共读了多少格；这里正在画一笔吗。 */
    liveReads: number;
    liveCells: number;
    drawing: boolean;
    /** 小窗里那张图（热的画读回来的那张）的字节哈希 + 宽高（探针拿它和画板的显示那张 / 落定那张逐字节比）；不是读回来的图 = null。 */
    workHash(): {
        hash: string;
        w: number;
        h: number;
    } | null;
    hoverLine: string;
    statsLine: string;
    showNums: boolean;
    collapsed: boolean;
    /** 图上一点（格）在页面上的位置（探针点它用）。 */
    screenOf(x: number, y: number): {
        x: number;
        y: number;
    } | null;
}
export declare function mountCanvasWindow(d: CanvasWindowDeps): CanvasWindow;
