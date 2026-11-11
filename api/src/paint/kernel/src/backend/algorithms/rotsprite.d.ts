export interface U8Plane {
    data: Uint8ClampedArray;
    w: number;
    h: number;
}
export declare function rotspriteLevels(w: number, h: number): number;
export declare function epx2x(src: Uint8ClampedArray, w: number, h: number): U8Plane;
/** straight RGBA u8 → EPX 放大 2^levels 的平面（levels 缺省按尺寸预算自选）。 */
export declare function rotspriteUpscale(rgba: Uint8ClampedArray, w: number, h: number, levels?: number): U8Plane;
