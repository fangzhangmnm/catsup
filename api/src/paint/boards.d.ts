import type { Gl2Port } from "./kernel/src/common/gl2-port.ts";
import type { LiveImage } from "../minccino/contract/stream.ts";
import { PaintBoard } from "./board.ts";
import type { Scene } from "../scene/scene.ts";
import type { Guid } from "../format/guid.ts";
export interface PaintBoardsOpts {
    /** 内核的显卡接口（第一次建画板时才要）。 */
    readonly port: () => Gl2Port;
    /** 第几个文件（换文件 = 变；editor.docEpoch）。 */
    readonly epoch: () => number;
    /** 调试日志（有内容的行不砍时记一笔）。 */
    readonly log?: (msg: string) => void;
}
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
    /** 每次拉流之前（PaintImages.sync）：换文件全销毁；画没了的销毁；其余跟着坐标改大小、垫底色。 */
    sync(scene: Scene): void;
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
export declare function browserPaintBoards(gl: () => WebGL2RenderingContext | null, epoch: () => number, log?: (msg: string) => void): PaintBoards;
