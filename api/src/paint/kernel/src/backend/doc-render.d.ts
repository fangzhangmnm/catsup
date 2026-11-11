type Bitmap = HTMLCanvasElement | OffscreenCanvas;
export type DocCompositorFn = (nodes: readonly unknown[], docW: number, docH: number) => Bitmap | null;
export type DocCompositorBytesFn = (nodes: readonly unknown[], docW: number, docH: number) => {
    data: Uint8ClampedArray;
    w: number;
    h: number;
} | null;
export declare function setDocCompositor(fn: DocCompositorFn): void;
export declare function setDocCompositorBytes(fn: DocCompositorBytesFn | null): void;
/** 现值读口（测试 save/restore 全局接缝用）。 */
export declare function getDocCompositorBytes(): DocCompositorBytesFn | null;
/** nodes → 合成 canvas（**透明底**；doc 背景由调用方按需自铺）。null = GL 不可用。 */
export declare function renderNodesToCanvas(nodes: readonly unknown[], docW: number, docH: number): Bitmap | null;
/** nodes → 合成 straight 字节（v0.6.39：merge-down 等「字节进出」op 用——同一 GL 引擎，零 canvas）。 */
export declare function renderNodesToBytes(nodes: readonly unknown[], docW: number, docH: number): {
    data: Uint8ClampedArray;
    w: number;
    h: number;
} | null;
export {};
