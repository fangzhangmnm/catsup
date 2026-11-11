export type FilterParams = Record<string, unknown>;
export interface FilterKernel {
    id: string;
    defaults(): FilterParams;
    /** 输出一个像素最多读输入 ±N 邻域（non-local 用）；per-pixel filter 返 0。 */
    bleedRadius(params: FilterParams | null): number;
    bake(src: Uint8ClampedArray, dst: Uint8ClampedArray, params: FilterParams, mask: Uint8Array | null, w: number, h: number): void;
}
export declare function clamp8(v: number): number;
