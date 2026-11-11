import type { SpaceData, SpaceDraw, SpaceGpu, SpaceImage, SpaceProgram } from "./space-gpu.ts";
export declare class SoftSpaceGpu implements SpaceGpu {
    private readonly programs;
    /** 每边最多多少格（契约 maxSize；测试可以调小去顶容量）。 */
    readonly maxSize: number;
    /** 还没释放的离屏图 + 数据图（测试查缓存放没放）。 */
    live: number;
    private readonly gone;
    constructor(o?: {
        readonly maxSize?: number;
    });
    private fits;
    register(p: SpaceProgram): void;
    image(w: number, h: number): SpaceImage;
    data(w: number, h: number, values: Float32Array | Uint16Array, format?: "r32f" | "rgba16ui"): SpaceData;
    draw(d: SpaceDraw): void;
    copy(src: SpaceImage, dst: SpaceImage, rect?: {
        readonly x: number;
        readonly y: number;
        readonly w: number;
        readonly h: number;
    }): void;
    read(img: SpaceImage): Uint8Array;
    release(x: SpaceImage | SpaceData): void;
    /** 软件版独有：离屏图的像素（交给画画内核的软件显卡当薄层用）。 */
    pixels(img: SpaceImage): Uint8ClampedArray;
}
