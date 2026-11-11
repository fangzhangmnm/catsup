import type { LiveImage } from "../../contract/stream.ts";
export declare class LiveTextures {
    private readonly entries;
    private prog;
    private fbo;
    private vao;
    private uSrc;
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
    private copy;
}
