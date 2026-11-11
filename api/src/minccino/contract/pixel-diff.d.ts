/** 两份 RGBA 字节逐像素比：差了几个像素、范围（含两端；没差 = null）。 */
export declare function diffBox(a: Uint8Array, b: Uint8Array, w: number): {
    diff: number;
    box: readonly [number, number, number, number] | null;
};
