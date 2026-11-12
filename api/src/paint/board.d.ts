import { DirtyCells } from "./kernel/src/common/dirty-rects.ts";
import { PaintingWorkpiece, type PaintingData } from "./kernel/src/backend/workpiece/painting-workpiece.ts";
import { GLBoard } from "./kernel/src/shell/gl-board.ts";
import type { SharedTilePool } from "./kernel/src/backend/gl/shared-tile-pool.ts";
import type { ExternalImage, ExternalTexture, Gl2Port, PooledFBO } from "./kernel/src/common/gl2-port.ts";
import type { StepSink } from "./kernel/src/backend/workpiece/undo-stack.ts";
import { StrokeSession } from "./kernel/src/backend/stroke-session.ts";
/** 显存预算（和画画软件的后端同一个数）：图块池按需长，长到这个顶。施工单十九第 3 刀起是一份文件合用的那个池的顶（PaintBoards 建池时用；只有正在编辑的画板醒着占片）。 */
export declare const PAINT_GPU_BUDGET_BYTES: number;
export interface PaintBoardOpts {
    /** 内核的显卡接口（整个程序一个，建在渲染器的画面上）。 */
    readonly port: Gl2Port;
    readonly width: number;
    readonly height: number;
    /** 步的去处：不给 = 记录随手丢（1-3c）；1-8 给 HostedSteps。 */
    readonly undo?: StepSink;
    /** 有内容的行 / 列不砍时记一笔（调试日志）。 */
    readonly log?: (msg: string) => void;
    /** 文件锁着吗（锁着 = 交出给人看的那句理由，能改 = null）。开一笔、落层都问它（v0.19.48）。缺 = 当没锁（单测）；app 里由 PaintBoards 递进来，守卫 test/paint-pixel-writes.test.ts。画板不认识编辑器。 */
    readonly locked?: () => string | null;
    /** 几块画板合用的显卡图块池（施工单十九第 3 刀：一份文件一个，PaintBoards 建、换文件退租）。缺 = 自己开一个（单测）。 */
    readonly pool?: SharedTilePool;
    /**
     * 在每帧准备的合成之外动过显卡之后叫（借一下显卡、睡下）：渲染器和内核共用一个 GL 画面，内核动过 GL，渲染器记着的绑定就不对了，要作废一次
     * （render3.resetPaintState）。准备里的合成由登记处统一叫。缺 = 不叫（单测）。
     */
    readonly touched?: () => void;
}
/** 画布上一块（格子；[x, x + w) × [y, y + h)）。 */
export interface ChangedRect {
    readonly x: number;
    readonly y: number;
    readonly w: number;
    readonly h: number;
}
/** 合成图上变了的那些格（内核的脏格子位图）；"all" = 说不清、按整张算。 */
export type Changed = DirtyCells | "all";
export declare class PaintBoard {
    readonly wp: PaintingWorkpiece;
    /** 内核的画板。**只经 gpu() 拿**（睡着就先叫醒；守卫 test/paint-board-sleep.test.ts 查这个文件里别处不碰它），睡 / 退租除外。 */
    private readonly gl;
    private readonly port;
    private readonly log;
    private readonly locked;
    private readonly touched;
    private bg;
    /** 合成出来的那张图（内核的，下一次合成之前有效）+ 合成它时的内容键。 */
    private last;
    /** 显示版本：每合成出一张新图加一（渲染器按它决定要不要重拷）。 */
    private shown;
    /** 显卡画面恢复了几次（进内容键：恢复后旧图作废、要重合成）。 */
    private restores;
    /** 这一笔交给显示那一侧的薄层（档口 setHostOverlays 给的；合成时垫在对应的层上）+ 它的版本（薄层内容每帧变 = 加一）。 */
    private hostOverlays;
    private overlayVer;
    private disposed;
    /**
     * 合成图的变化史（1-4d 第 6 条：显示那一侧只拷变了的那一块）：每个版本比上一个版本变了哪一块（"all" = 说不清、按整张算），留最近 HISTORY 个。
     * 谁能说「只变了这一块」：只有薄层的内容（overlayChanged(块)，块由画薄层的那一边按它真画过的格子报）。别的一切——落定的内容变了（抬笔落层、撤销、装载、改大小、换底色、画面恢复）、
     * 薄层换了一片、内核的档口叫 invalidate、overlayChanged() 不带块——都按整张。薄层的方框只是长大（同一片、同样的叠法）不算变：方框外面那片从没写过、是透明的。
     */
    private history;
    /** 上一次合成之后攒下的薄层变化（脏格子位图；null = 没报过；"all" = 按整张）。 */
    private pending;
    /** 上一次合成时落定内容的键（变了 = 整张）。 */
    private lastCommitted;
    constructor(o: PaintBoardOpts);
    /** 摘掉挂在 Port 上的那个回调（退租时摘；内核 v0.14.85 起 onInvalidated 返回它——不摘 = Port 一直拉着这块画板，换文件换多了放不掉）。 */
    private unInvalidated;
    get width(): number;
    get height(): number;
    /** 内容键：作品的提交版本（画、撤销、改大小都算）+ 大小 + 底色 + 恢复次数。变了 = 下一次合成出新图。 */
    private key;
    /** 落定了的内容的键（不含一笔正在画的薄层）：画布小窗（施工单十六）看它变没变 —— 一笔当中不变，抬笔 / 撤销 / 装载才变，所以小窗只在抬笔之后读回一次。 */
    committedKey(): string;
    /** 有几层（图层，不算组）。 */
    layerCount(): number;
    /** 三维画好的薄层包成内核的纹理对象（外面的图进内核的唯一一道门，画画仓 v0.14.75）：真显卡 = { gl: WebGLTexture }，软件版 = { pixels }。 */
    wrapLayer(src: ExternalImage): ExternalTexture;
    /**
     * 薄层的内容变了（三维每帧重画了尾巴）：下一次合成要重来。cells = 只在这些格里变了（脏格子位图，画布格子）；不给 = 不知道哪里变了（按整张）；null = 什么都没变（不重合成）。
     */
    overlayChanged(cells?: DirtyCells | null): void;
    /**
     * 从版本 since 到现在的合成图变了哪一块（画布格子；没变 = w = 0）。中间有「说不清」的、或者 since 太老不在变化史里了 = "all"。
     * 显示那一侧（渲染器的显示图）按它只拷这一块；存盘用的合成图从不用它（composeBytes 永远整张重合）。
     */
    changedSince(since: number): Changed;
    /**
     * 一笔的档口（内核 0-5 的 host 方式；一次手势 = 一个令牌 = 一步）：宿主每帧 setHostLayers 交薄层（真显卡 / 软件版各自经 wrapExternal 包进来的那张），
     * 抬笔 = 内核把它落进图层（commitBrushStroke = bakeStamps 写回链），取消 = 零痕迹。layerId 不给 = 当前层。
     */
    openStroke(layerId?: number): StrokeSession;
    /** 合成时垫在最底下的不透明底色（材质自己的底色，sRGB 0..1）：交出来的图不透明。 */
    setBackground(rgb: readonly number[]): void;
    /** 灌一份内容（调试钩子用；以后读文件）。整份换：内核把栈清了（这一张本来没有栈）。 */
    load(data: PaintingData): void;
    /**
     * 跟着那一套贴图坐标的画布大小（裁定 ③）：要的比现在大 = 跟着长；要的比现在小 = 要砍的那几行 / 列全空白才砍，不然留着（记一笔）。
     * 返回改完的实际大小；kept = 有内容、没砍到要的大小。
     */
    follow(w: number, h: number): {
        width: number;
        height: number;
        kept: boolean;
    };
    /**
     * 合成（只合成、不上屏）：内容和底色没变 = 交上一次那张。返回的图归内核：下一次合成之前有效，不许归还、不许改采样设置。
     * 显卡画面丢了 = null。
     */
    compose(): {
        fbo: PooledFBO;
        version: number;
    } | null;
    /**
     * 扔掉这块画板：图块全部还给内核的图块池（1-8a 统筹审查：以前只记个「扔了」，图块一直占着）。
     * 和画画仓 WeebPaintBackend.dispose 同一手：换 1×1 空根 = 现在的内容还池；装载顺手清栈 = 步里攒着的旧图块也还池（交给三维的栈的步也在内：HostedSteps.clear 逐步释放、发 onReset）；
     * 图块账退租；显卡上那份退租（内核 v0.14.77 的 GLBoard.dispose：建的纹理全删、借的离屏图全还，0-3a）。开着的一笔要宿主先取消（登记处 disposeAll 先 cancelOpen；令牌开着时装载会抛）。只做一次。
     */
    /**
     * 合成图读回来（存盘的钉点用，1-8b）：**只合已落层的内容**、垫着现在的底色、不透明；只读前 rows 行（裁高用，缺省整张）。
     * 不带正在画的那一笔（统筹 11-11 审查：自动保存会撞上画到一半；合成图必须和分层字节是同一个内容，不然冷的画上会多出一笔没落下、甚至后来被取消的笔迹）——
     * 所以这里不用显示那张（compose 会垫上这一笔的薄层），单独合一次不带薄层的；合完作废显示的缓存，下一帧照常带着薄层重合。
     * 同步：真显卡上是一次读回（会等显卡做完）。显卡画面丢了 / 扔过 = null。
     */
    composeBytes(rows?: number): Uint8ClampedArray | null;
    /**
     * 核对（读数角标「核对」开着时；统筹 11-11）：现在显示的那张合成图（可能是只合了脏格的）读回 → 强制整张重合（同样的内容、同样垫着薄层）→ 再读回，逐字节比。
     * 整张那张留下来当现在的图；对不上 = 变化史记一版「整张」（显示那一侧下一帧整张重拷，不留着错的）。没合成过 / 画面丢了 = null。读回会等显卡做完：只在核对那一帧做。
     */
    verifyFull(): {
        diff: number;
        box: readonly [number, number, number, number] | null;
    } | null;
    /** 显示的那张合成图上一格的颜色（RGBA 字节，垫着底色、不透明；吸管用，1-7）。出界 / 显卡画面丢了 = null。 */
    pixelAt(x: number, y: number): Uint8Array | null;
    /** 最近一次落层怎么读回的（内核 GLBoard.lastBake：box / cells / box-unreported、读了几次、多少字节；探针 / 测试看）。 */
    get lastBake(): GLBoard["lastBake"];
    /** 现在的底色（sRGB 0..1，三个数）。 */
    get background(): readonly [number, number, number];
    dispose(): void;
    /** 显卡那一半睡着吗。 */
    get asleep(): boolean;
    /** 一笔正开着（薄层还垫着）：不许睡。 */
    get strokeOpen(): boolean;
    /** 显示的那一版过期了（内容 / 底色 / 薄层在上一次交出去之后变过）：要合成一次才对。睡着的画板靠它决定要不要醒来合一次（撤销、跟大小、装载都只动内存）。 */
    get displayStale(): boolean;
    /** 叫醒了几次（量；探针看来回切物件时醒睡的次数）。 */
    wakes: number;
    /** 睡。一笔开着 = 抛（宿主先收笔 / 取消）。睡两次没事。 */
    sleep(): void;
    /** 要用显卡：睡着就先叫醒。 */
    private gpu;
    /** 借一下显卡（存盘读回、吸色）：原来睡着的，用完睡回去（一笔开着时不会是睡着的）。 */
    private borrowGpu;
    /** 合成一次（三个口共用）；记下这一次给内核的薄层有没有（睡之前要清）。 */
    private composite;
    private glHasOverlay;
    /** 最近一次交给显示那一侧的那一版的内容键（compose / verifyFull 交出时记；存盘读回不算：它不换显示的那一版）。 */
    private shownKey;
    private tree;
    /** 所有图层内容的并（紧的）：null = 全空。 */
    /** 所有图层有内容的范围合在一起（全空 = null）；存盘裁高用（1-8b）。 */
    contentBounds(): {
        x: number;
        y: number;
        w: number;
        h: number;
    } | null;
    /** 改画布大小：和画画软件的裁剪同一批动词（每层换一份新尺寸的像素 + 树上的宽高），一个令牌。左上角不动，多出来的是空白。 */
    private resize;
    /** 作品的树 → 合成器吃的那棵（每叶带它现在的像素）。 */
    private docNodes;
}
