export declare const THUMBNAIL_MIME = "image/jpeg";
/** rgba = 每像素 4 字节、行序自上而下（WebGL readPixels 是自下而上：调用方先翻转）。quality 1–100。 */
export declare function encodeJpeg(rgba: Uint8Array | Uint8ClampedArray, width: number, height: number, quality?: number): Uint8Array;
/** WebGL readPixels 的行序翻转（自下而上 → 自上而下），原地不动、返回新数组。 */
export declare function flipRowsRgba(rgba: Uint8Array, width: number, height: number): Uint8Array;
