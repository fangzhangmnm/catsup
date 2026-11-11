export interface RgbaPlane {
    data: Uint8ClampedArray;
    w: number;
    h: number;
}
export type PngDecodeFallback = (u8: Uint8Array) => Promise<RgbaPlane>;
export declare function setPngDecodeFallback(fn: PngDecodeFallback): void;
export declare function insertPhys(png: Uint8Array, dpi: number): Uint8Array;
/** straight RGBA 字节 → PNG（无损，逐字节保真）。opts.dpi → 写 pHYs（导出打印文件用；ora 不传）。 */
export declare function encodePngFromBytes(data: Uint8ClampedArray, w: number, h: number, opts?: {
    dpi?: number;
}): Promise<Uint8Array>;
/** PNG 字节 → straight RGBA。主路 UPNG（全格式、零 canvas、零 premult 损）；
 *  iCCP 色彩配置 / 解码失败 → 注入的壳回退（安全网，永不删——数据安全 >> 纯度）。 */
export declare function decodePngToBytes(bytes: Uint8Array | Blob): Promise<RgbaPlane>;
export { setDeflateLevel } from "../../vendor/upng/upng.esm.js";
