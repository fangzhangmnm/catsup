// JPEG 编码接缝（纯字节，零 canvas）——vendored jpeg-js 编码半边的唯一消费点。
//   与 png-codec.ts 同款分工：解码不在这（外来格式解码走浏览器解码边界 shell/image-io.ts），
//   这里只有「RGBA 字节 → JPEG 字节」。用途 = 云盘图片 picker 缩略图（spec 20260820 §6）。
import { encode as _jpegEncode } from "../../vendor/jpeg-js/jpeg-encoder.mjs";

/** RGBA 字节 → baseline JPEG 字节。quality 0-100（缩略图档 q=80：高压但不出可见噪点）。 */
export function encodeJpegFromBytes(data: Uint8ClampedArray | Uint8Array, w: number, h: number, quality = 80): Uint8Array {
  if (data.length !== w * h * 4) throw new Error(`encodeJpegFromBytes: byte length ${data.length} != ${w}x${h}x4`);
  return _jpegEncode({ data, width: w, height: h }, quality).data;
}
