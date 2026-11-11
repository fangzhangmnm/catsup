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
    /**
     * 钉点（同步，中间不 await）。doc = 刚冻结的那份文档；scene = 现在的场景（找坐标的宽高、材质的底色）。
     * mode = "save"：版本变了的当场拷出来、finish 里编；"snapshot"：不现编，用缓存（没有缓存 = 贴图行里的 / 空白的），画板比缓存新 = stale。
     */
    freeze(doc: CatsupDocument, scene: Scene, mode: "save" | "snapshot"): PaintFrozen;
    /** 有画板、比缓存新的那几张先编进缓存（崩溃快照之前、切后台时；跟自动保存同一个节奏，不单开定时器——统筹 11-11）。都是新的 = 什么都不做。 */
    refresh(scene: Scene): Promise<void>;
    /** 一张画钉下来的东西变成字节；编了的进缓存（只在比缓存里的新时替换）。 */
    private realize;
    /** 空白的分层字节（一层空的；按宽高只编一次）。 */
    private blank;
}
