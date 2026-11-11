import type { ColorMetric } from "../../common/color-dist.ts";
interface Point {
    x: number;
    y: number;
}
export interface WandSourceLayer {
    readonly bboxX: number;
    readonly bboxY: number;
    readonly bboxW: number;
    readonly bboxH: number;
    getImageData(x: number, y: number, w: number, h: number): {
        data: Uint8ClampedArray;
    };
}
export interface Gray8Region {
    x: number;
    y: number;
    w: number;
    h: number;
    gray8: Uint8Array;
}
export interface FloodStopMask {
    x: number;
    y: number;
    w: number;
    h: number;
    data: Uint8Array;
}
export declare function floodRegionFrom(doc: {
    width: number;
    height: number;
}, start: Point | null, sourceLayer: WandSourceLayer | null, thresholdPct: number, metric?: ColorMetric, // v0.7.21：默认 rgb = v242 逐字语义；app 侧灌 desk 的度量
stopMask?: FloodStopMask | null, gapPx?: number): Gray8Region | null;
export declare function similarRegionFrom(doc: {
    width: number;
    height: number;
}, start: Point | null, sourceLayer: WandSourceLayer | null, thresholdPct: number, metric?: ColorMetric): Gray8Region | null;
export {};
