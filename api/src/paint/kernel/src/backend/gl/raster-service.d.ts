import type { Background } from "./gl-compositor.ts";
import type { DocNode } from "./gl-doc-bridge.ts";
import type { LayerPixels } from "../tiles/tile-layer.ts";
import type { Stamp, StrokeShape } from "./gl-stamp.ts";
import type { PooledFBO } from "../../common/gl2-port.ts";
import type { GlRoom, OverlayInput, SurrogateInput } from "./gl-room.ts";
export declare class RasterService {
    private _room;
    constructor(room: GlRoom);
    rasterizeStampsToBytes(stamps: Stamp[], shape: StrokeShape, bx: number, by: number, bw: number, bh: number): Uint8ClampedArray | null;
    bakeStamps(leafId: number, pixels: LayerPixels, ov: OverlayInput, docW: number, docH: number, apply: (px: Uint8ClampedArray, x: number, y: number, w: number, h: number) => {
        tx: number;
        ty: number;
    }[]): boolean;
    warpToBytes(src: {
        data: Float32Array;
        w: number;
        h: number;
    } | {
        data: Uint8ClampedArray;
        w: number;
        h: number;
    }, srcW: number, srcH: number, hinv: number[], mode: number, bx: number, by: number, bw: number, bh: number): {
        data: Uint8ClampedArray;
        w: number;
        h: number;
        dstX: number;
        dstY: number;
    } | null;
    compositeOnce(nodes: DocNode[], docW: number, docH: number, bg?: Background, surrogates?: readonly SurrogateInput[], overlays?: readonly OverlayInput[]): PooledFBO;
    compositeToBytes(nodes: DocNode[], docW: number, docH: number, surrogates?: readonly SurrogateInput[], overlays?: readonly OverlayInput[]): {
        data: Uint8ClampedArray;
        w: number;
        h: number;
    };
    pickColor(nodes: DocNode[], docW: number, docH: number, bg: Background | undefined, x: number, y: number, surrogates?: readonly SurrogateInput[], overlays?: readonly OverlayInput[]): [number, number, number, number];
}
