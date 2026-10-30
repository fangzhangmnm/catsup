import type { PixelOutlinePost } from "../../preset/index.ts";
/** 小图（颜色 + 深度贴图）+ 描边后的小图 + 两遍全屏。尺寸变了才重建。 */
export declare class PixelScreen {
    private low;
    private post;
    private readonly quadScene;
    private readonly quadCam;
    private readonly quad;
    private readonly outlineMat;
    private readonly upscaleMat;
    /** 小图尺寸（设备像素 ÷ k，向上取整）和放大倍数 k。 */
    w: number;
    h: number;
    k: number;
    constructor();
    /** 按画布（设备像素）和放大倍数（设备像素）准备小图；返回小图的渲染目标（场景画进它）。 */
    prepare(W: number, H: number, k: number): any;
    /** 描边后的那张小图（辉光合成也写进它）。 */
    get postTarget(): any;
    get lowTarget(): any;
    /** 小图 → 描边（或只补背景）→ 放大进 `target`（null = 画布），深度一起写回。 */
    finish(renderer: any, target: any, o: {
        outline: PixelOutlinePost | null;
        background: number;
        near: number;
        far: number;
        ortho: boolean;
    }): void;
    /** 小图 → 描边（后处理挂点）→ post。 */
    outline(renderer: any, o: {
        outline: PixelOutlinePost | null;
        background: number;
        near: number;
        far: number;
        ortho: boolean;
        bgInTex?: boolean;
    }): void;
    /** 放大回 target（屏幕一刀）：src = 小图本身或 post；外观 none / crt-tv；writeDepth = 把小图的深度写回 target（后面还要按原分辨率画东西时才要）。 */
    upscale(renderer: any, target: any, src: "low" | "post", look: "none" | "crt-tv", writeDepth: boolean): void;
    /** 显存估算（血槽位）：小图颜色 + 深度 + 描边后的小图（颜色 + 深度）。 */
    bytes(): number;
    dispose(): void;
}
