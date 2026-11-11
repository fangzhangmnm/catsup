import type { Gl2Port, PooledFBO } from "../../common/gl2-port.ts";
export interface Stamp {
    x: number;
    y: number;
    size: number;
    alpha: number;
}
export interface StrokeShape {
    hardness: number;
    color: [number, number, number];
    buildup: boolean;
    aspect?: number;
    rotation?: number;
}
export declare class GLStampRasterizer {
    private _glctx;
    private _instData;
    constructor(glctx: Gl2Port);
    rasterize(stamps: Stamp[], shape: StrokeShape, ox: number, oy: number, ow: number, oh: number, scissor?: {
        x: number;
        y: number;
        w: number;
        h: number;
    } | null): PooledFBO;
}
