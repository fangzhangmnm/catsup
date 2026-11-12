import type { PaintingData } from "./kernel/src/backend/workpiece/painting-workpiece.ts";
import type { PaintBoard } from "./board.ts";
import { type CatsupDocument } from "../format/document.ts";
import type { Scene } from "../scene/scene.ts";
import type { Guid } from "../format/guid.ts";
/** 存盘要的那一点画板登记处（boards.ts PaintBoards 结构上满足）。 */
export interface PaintBoardSource {
    get(texture: Guid): PaintBoard | undefined;
}
export interface PaintFrozen {
    /** 有画板的画比缓存新、这份没带上最后几笔（只在 snapshot 那种会是 true）。 */
    readonly stale: boolean;
    /** 编完、填好的那份文档（贴图行是新对象；冻结那份文档本身不改）。编码出错 = 抛（说是哪张画）。 */
    finish(): Promise<CatsupDocument>;
}
/** 这一次有画要编码，但 zip.js 没加载上（页面没加载完整）。不带画 / 画全是现成字节的存盘不会碰到它。 */
export declare class ZipMissingError extends Error {
    constructor();
}
export declare class PaintSaver {
    private readonly boards;
    private readonly wroteWith;
    private readonly cache;
    private readonly blanks;
    /** 分层字节的编码器（缺省 = 内核；探针 / 测试换成会抛的，验「编码中途出错 = 这一轮整个没成」）。 */
    encodeOra: (data: PaintingData, wroteWith: string) => Promise<Uint8Array>;
    constructor(o: {
        readonly boards: PaintBoardSource;
        readonly wroteWith: string;
    });
    /** 缓存的版本签名（崩溃快照「这一版拍过了」的键里带上它：缓存一新快照就重拍）。 */
    cacheKey(): string;
    /** 换文件：缓存清掉（画板全扔了，旧的缓存指着扔掉的画板）。 */
    clear(): void;
    /** 这张画最近一次编好（存盘 / 快照）的字节有多大：画布小窗底下那行（施工单十六）。贴图行里的字节只在读文件时进来，热的画存过之后得问这里。缓存里没有 = null。 */
    lastSizes(texture: Guid): {
        readonly ora: number;
        readonly png: number;
    } | null;
    /**
     * 钉点（同步，中间不 await）。doc = 刚冻结的那份文档；scene = 现在的场景（找坐标的宽高、材质的底色）。
     * mode = "save"：版本变了的当场拷出来、finish 里编；"snapshot"：不现编，用缓存（没有缓存 = 贴图行里的 / 空白的），画板比缓存新 = stale。
     */
    freeze(doc: CatsupDocument, scene: Scene, mode: "save" | "snapshot"): PaintFrozen;
    /** 钉点的同步那一段：这几行贴图里每张画这一次的来源定死（freeze / prime / refresh 共用；只吃贴图行，不吃整份文档）。 */
    private pin;
    /** 钉点的异步那一段：钉下来的变成字节，按传进来的顺序交回新的贴图行（编了的进缓存）。编码出错 = 抛（说是哪张画）。 */
    private realizeRows;
    /** 有画板、比缓存新的那几张先编进缓存（崩溃快照之前、切后台时；跟自动保存同一个节奏，不单开定时器——统筹 11-11）。都是新的 = 什么都不做。 */
    refresh(scene: Scene): Promise<void>;
    /**
     * 画板要睡了（施工单十九第 3 刀，PaintBoards.beforeSleep）：它比缓存新 = 趁醒着同步钉一份（分层的冻结拷贝 + 整张合成读回，和存盘同一个钉点），
     * 后台编进缓存；之后存盘碰到这块睡着的画板直接用缓存、不用叫醒。缓存已经是新的 / 不是画 = null（什么都不做）。
     * 编码失败只回一个失败的 Promise（调的人记日志）：存盘时照常当场钉（叫醒、合、读回、再睡），不会因此丢东西。
     */
    prime(scene: Scene, texture: Guid): Promise<void> | null;
    /** 一张画钉下来的东西变成字节；编了的进缓存（只在比缓存里的新时替换）。 */
    private realize;
    /** 新建平铺的画用的空白分层字节（施工单二十一第 3 刀）：和存盘给没画过的新画编空白是同一个编码器、同一份缓存。没有全局的 zip = ZipMissingError。 */
    blankOra(w: number, h: number): Promise<Uint8Array>;
    /** 空白的分层字节（一层空的；按宽高只编一次）。 */
    private blank;
}
