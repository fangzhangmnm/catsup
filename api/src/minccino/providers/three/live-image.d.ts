import type { LiveImage } from "../../contract/stream.ts";
export declare class LiveTextures {
    private readonly entries;
    private prog;
    private fbo;
    private vao;
    private uSrc;
    private ds;
    private dsSrc;
    private dsSize;
    /**
     * 缩小图怎么跟（1-4d 第 6 条要量两种做法）："region" = 每次只重做变了的那一块牵涉到的格子（默认）；
     * "defer" = 画的时候只拷第 0 级、缩小图等不再变了（有一帧没有新版本）再整套做一次——只给探针量，缩小着看会看不到正在画的那一笔；
     * "full" = 不看变化史、每次整张（改之前的做法，只给探针当对照量）。
     */
    mipMode: "region" | "defer" | "full";
    /** 最近一次拷了多大一块（第 0 级的格子数；探针量）。 */
    lastCopyCells: number;
    /** 最近一次拷贝（拷 + 生成缩小图）花了多少毫秒（CPU 时间；探针量）。 */
    lastCopyMs: number;
    /** 这一帧拷了多久（每次 update 从 0 记起；没拷 = 0）。 */
    frameCopyMs: number;
    private readonly gl;
    constructor(gl: WebGL2RenderingContext);
    get size(): number;
    /** 这张活的图在 three 那边的贴图（同一张图永远是同一个对象）。还没拷过 = 指着空（three 绑 null = 黑；第一帧 update 就拷上）。 */
    textureFor(img: LiveImage): unknown;
    /** 画的时候：挨个问 current()（只读准备好的），版本变了的拷进显示图。返回 true = 拷过（调用的人 resetState 一次）。一张都没有 = 什么都不做。 */
    update(): boolean;
    /** 不再用的图：放掉显示图。 */
    drop(img: LiveImage): void;
    /** 现在登记着的图（render3 按「这一帧还有没有块用它」回收）。 */
    images(): LiveImage[];
    /** 显卡画面丢了：原始 GL 对象全死了，忘掉；恢复后第一帧按需重建、全部重拷。 */
    lost(): void;
    dispose(): void;
    private ensureProgram;
    /** 内核那张的 box 那一块拷进显示图第 0 级（第一次 / 大小变了 = 重建显示图、整张），再跟缩小图。 */
    private copy;
    /**
     * 缩小图：第 0 级的 box 那一块变了 → 一级一级往下，每一级只重做被它牵涉到的格子（上一级 [x0, x1) → 这一级 [⌊x0/2⌋, ⌈x1/2⌉)）。
     * 画第 l 级时显示图只开着第 l − 1 级（BASE = MAX = l − 1：读的和写的不是同一级，不算读写打架）；做完恢复成整套。
     */
    private mips;
}
