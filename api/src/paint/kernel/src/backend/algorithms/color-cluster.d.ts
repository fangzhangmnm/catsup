export interface ColorCluster {
    center: [number, number, number];
    share: number;
}
export declare function clusterColors(rgba: Uint8ClampedArray, k: number, { maxSamples, iters }?: {
    maxSamples?: number;
    iters?: number;
}): ColorCluster[];
export declare function partitionByNearest(rgba: Uint8ClampedArray, centers: [number, number, number][]): {
    parts: Uint8ClampedArray[];
    counts: number[];
};
export declare function hexOf(c: [number, number, number]): string;
