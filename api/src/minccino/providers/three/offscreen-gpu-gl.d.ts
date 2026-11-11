import type { OffscreenData, OffscreenDraw, OffscreenGpu, OffscreenImage, OffscreenProgram } from "../../contract/offscreen-gpu.ts";
export declare class GlOffscreenGpu implements OffscreenGpu {
    private readonly gl;
    private readonly touched;
    private readonly programs;
    private vao;
    private quad;
    private instBuf;
    /** 最近一次 draw 花了多少毫秒（CPU 时间；探针量）。 */
    lastDrawMs: number;
    constructor(gl: WebGL2RenderingContext, touched: () => void);
    register(p: OffscreenProgram): void;
    image(w: number, h: number): OffscreenImage;
    data(w: number, h: number, values: Float32Array | Uint16Array, format?: "r32f" | "rg16ui"): OffscreenData;
    draw(d: OffscreenDraw): void;
    copy(src: OffscreenImage, dst: OffscreenImage, rect?: {
        readonly x: number;
        readonly y: number;
        readonly w: number;
        readonly h: number;
    }): void;
    read(img: OffscreenImage): Uint8Array;
    release(x: OffscreenImage | OffscreenData): void;
    /** 真显卡版独有：离屏图的贴图句柄（交给画画内核的 wrapExternal）。 */
    glTexture(img: OffscreenImage): WebGLTexture;
    /** 显卡画面丢了：原始 GL 对象全死了，忘掉（程序要重新登记、图要重建；调用的人负责）。 */
    lost(): void;
    private params;
    private unpackDefaults;
    private ensureGeometry;
    /** 归位到 WebGL 的初始值（见文件头），再告诉 three。 */
    private restore;
}
