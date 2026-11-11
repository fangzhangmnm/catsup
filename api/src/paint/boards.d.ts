import type { Gl2Port } from "./kernel/src/common/gl2-port.ts";
import type { LiveImage } from "../minccino/contract/stream.ts";
import { PaintBoard } from "./board.ts";
import { HostedSteps } from "./kernel/src/backend/workpiece/hosted-steps.ts";
import type { UndoComponent } from "../editor/history.ts";
import type { Scene } from "../scene/scene.ts";
import type { Guid } from "../format/guid.ts";
export interface PaintBoardsOpts {
    /** 内核的显卡接口（第一次建画板时才要）。 */
    readonly port: () => Gl2Port;
    /** 第几个文件（换文件 = 变；editor.docEpoch）。 */
    readonly epoch: () => number;
    /** 调试日志（有内容的行不砍时记一笔）。 */
    readonly log?: (msg: string) => void;
    /** 准备里动过显卡（合成了）：通知渲染器作废它的状态缓存。 */
    readonly touched?: () => void;
    /** 内核说这张画以前的步全作废（装载 / 状态不可信）：三维的撤销栈把它的记录摘掉（History.dropRecords）；tell = 状态不可信那一种，要在提示行告诉用户 why。刚建画板那一次不叫。 */
    readonly undoReset?: (texture: Guid, why: string, tell: boolean) => void;
    /** 有没有画板变了（第一块建出来 = true；换文件全扔了 = false）：图块池的空闲压缩只在有画板时跑（tile-jobs.ts TileJobsDriver.setActive，0-3a）。 */
    readonly active?: (on: boolean) => void;
}
/** 「画」这种撤销记录：哪张贴图 + 内核封的那一步（内核的对象，三维不看里面）。 */
export interface PaintRec {
    readonly tex: Guid;
    readonly step: Parameters<HostedSteps["flip"]>[0];
}
export declare const PAINT_UNDO_KIND = "paint";
export declare class PaintBoards {
    private readonly entries;
    private port;
    private epochSeen;
    private sigCache;
    private readonly o;
    constructor(o: PaintBoardsOpts);
    get count(): number;
    get(texture: Guid): PaintBoard | undefined;
    guids(): Guid[];
    /** 给这张画建一块空白的画板（已经有了 = 原样返回）。不是画（贴图表里没有、不是分层的、材质不指它、定义里没那一套坐标）= 抛。 */
    ensure(scene: Scene, texture: Guid): PaintBoard;
    /** 这一帧的准备活（这一笔的薄层：画、交给档口），prepare 里在合成之前跑。返回撤掉。 */
    onPrepare(job: () => void): () => void;
    private readonly jobs;
    /** 每帧开画之前的准备（编辑器的 beforeRender 调）：sync → 这一帧的准备活 → 合成。一块画板都没有 = 什么都不做。 */
    prepare(scene: Scene): void;
    /** 上一次「准备」两段（量；毫秒）：这一帧的准备活（薄层）/ 内核合成（含缩小图）。 */
    lastPrepare: {
        jobsMs: number;
        composeMs: number;
    };
    /** 只给量的时候用（探针）：每段前后等显卡把活做完，量到的才是显卡真花的时间。平时 null。 */
    measureSync: (() => void) | null;
    /** 换文件全销毁；画没了 = 歇着（留到关文件）；回来了 = 接着用；垫底色（prepare 的第一步；测试也直接调）。不改大小（1-8a：跟大小在提交的收尾里，follow）。 */
    sync(scene: Scene): void;
    /**
     * 跟着那一套贴图坐标的画布大小（裁定在 board.ts follow 头）：编辑器每条指令提交的收尾里调（1-8a），改大小时内核封的那一步进 pending、由编辑器挂进那条指令的那一步。
     * 歇着的不动。返回有没有改。
     */
    follow(scene: Scene): boolean;
    private pending;
    private resetWhy;
    /** 内核交来、还没挂进三维的栈的步（取走 = 交给编辑器挂上）。 */
    takePending(): PaintRec[];
    /** 正开着的一笔（档口开着令牌）：撤销 / 重做之前取消它们（beforeHistoryMove）。返回撤掉登记。 */
    trackOpen(texture: Guid, cancel: () => void): () => void;
    private readonly opens;
    /** 撤销 / 重做之前：开着的那几笔全部取消（零痕迹）。 */
    cancelOpen(): void;
    /** 这张画的状态不可信：叫内核把以前的步全部作废（onReset → undoReset → 三维的栈摘掉记录）。 */
    distrust(texture: Guid, why: string): void;
    /** 灌一份内容（调试钩子；以后读文件）：内核装载 = 这张画以前的步全作废（不用告诉用户：是装载，不是出错）。 */
    load(texture: Guid, data: Parameters<PaintBoard["load"]>[0]): void;
    /** 扔一块画板（只在换文件时）：图块全部还池、显卡上那份退租（PaintBoard.dispose）；这期间内核清栈发的 onReset 不往三维的栈里摘记录。 */
    private kill;
    private disposing;
    /** 「画」这一种撤销成分（编辑器 registerUndoComponent 登记）。 */
    undoComponent(): UndoComponent<PaintRec>;
    /** 翻过一步：下一帧重新合成（内容键里有作品的版本号，这里只是保险）。 */
    private overlayTouched;
    board(texture: Guid): {
        readonly width: number;
        readonly height: number;
        readonly image: LiveImage;
    } | null;
    /** 有哪些画板、多大（PaintImages.sig；拉流的内容键和材质槽签名里都有它）。 */
    sig(): string;
    disposeAll(): void;
    private checkEpoch;
    private resig;
}
/** 浏览器里：内核的显卡接口建在渲染器的画面上（整个程序一个）。 */
export declare function browserPaintBoards(gl: () => WebGL2RenderingContext | null, epoch: () => number, log?: (msg: string) => void, touched?: () => void, undoReset?: (texture: Guid, why: string, tell: boolean) => void, active?: (on: boolean) => void): PaintBoards;
