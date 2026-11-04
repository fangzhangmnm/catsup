/** sRGB（0..1）→ 线性（IEC 61966-2-1 分段式）。 */
export declare const srgbToLinear: (c: number) => number;
/** 线性（0..1）→ sRGB。 */
export declare const linearToSrgb: (c: number) => number;
