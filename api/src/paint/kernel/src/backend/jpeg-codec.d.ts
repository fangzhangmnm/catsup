/** RGBA 字节 → baseline JPEG 字节。quality 0-100（缩略图档 q=80：高压但不出可见噪点）。 */
export declare function encodeJpegFromBytes(data: Uint8ClampedArray | Uint8Array, w: number, h: number, quality?: number): Uint8Array;
