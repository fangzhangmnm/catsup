// jpeg.ts —— RGBA 像素 → 基线 JPEG 字节（vendored jpeg-js 编码器；缩略图专用）。不走 canvas.toBlob（user 2026-09-20「自己 vendor jpeg 编码器吧」）。
// created 2026-09-20 by Claude Fable 5.1
import encode from "../vendor/jpeg-js/encoder.js";

export const THUMBNAIL_MIME = "image/jpeg";

/** rgba = 每像素 4 字节、行序自上而下（WebGL readPixels 是自下而上：调用方先翻转）。quality 1–100。 */
export function encodeJpeg(rgba: Uint8Array | Uint8ClampedArray, width: number, height: number, quality = 80): Uint8Array {
  if (rgba.length < width * height * 4) throw new Error(`encodeJpeg: need ${width * height * 4} bytes, have ${rgba.length}`);
  const out = encode({ width, height, data: rgba }, quality);
  return out.data instanceof Uint8Array ? out.data : new Uint8Array(out.data);
}

/** WebGL readPixels 的行序翻转（自下而上 → 自上而下），原地不动、返回新数组。 */
export function flipRowsRgba(rgba: Uint8Array, width: number, height: number): Uint8Array {
  const out = new Uint8Array(rgba.length);
  const row = width * 4;
  for (let y = 0; y < height; y++) out.set(rgba.subarray(y * row, (y + 1) * row), (height - 1 - y) * row);
  return out;
}
