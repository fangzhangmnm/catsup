// PNG 编解码深模块（全库唯一接缝——user 2026-07-29：「把 canvas 封成伪装的 png 库，下次不会再
// 越狱 canvas」）。v0.6.47 起内脏 = vendored UPNG（Photopea，MIT）+ fflate zlib：
//   - 编码：无损 RGBA8（cnum=0），**straight alpha 逐字节保真**（canvas toBlob 的 premult 往返
//     从此退出画作持久化路径）；压缩级旋钮 setDeflateLevel（未来自定义压缩比的入口）；
//     可选 pHYs（DPI 元数据——只进导出文件，永不进 ora，user 拍板）。
//   - 解码：UPNG 全格式吃（1-16bit/灰度/调色板/隔行/APNG 首帧）→ RGBA8。
//   - 回退安全网（**永不删**）：带 iCCP 色彩配置的外来 PNG（浏览器解码会应用 profile，UPNG 忽略
//     → 观感差异）与任何 UPNG 解码失败 → createImageBitmap 老路一次性读出。
//
// 【硬原则（user）】：库外任何地方不许再为 PNG 编解码创建 canvas / createImageBitmap——
// 字节进出一律走这里。新需求（调色板量化/16bit/APNG）改本库，别在外面绕。

import UPNG from "../../vendor/upng/upng.esm.js";

export interface RgbaPlane { data: Uint8ClampedArray; w: number; h: number }

// C7：canvas 回退路（createImageBitmap+2d 读出）物理移壳（shell/image-io.ts）——backend 零 canvas。
// 壳 boot 显式安装（app.ts）；headless 无回退 → iCCP/坏文件走 UPNG 硬解（忽略 profile，能解则解）。
// 「安全网永不删」承诺不变——它只是搬到壳域住，浏览器行为逐字节同旧。
export type PngDecodeFallback = (u8: Uint8Array) => Promise<RgbaPlane>;
let _decodeFallback: PngDecodeFallback | null = null;
export function setPngDecodeFallback(fn: PngDecodeFallback): void { _decodeFallback = fn; }

// ---- CRC32（PNG chunk 校验；pHYs 注入用）----
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(bytes: Uint8Array, from: number, to: number): number {
  let c = 0xffffffff;
  for (let i = from; i < to; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

// 在 IHDR 后插入 pHYs chunk（unit=meter；ppm = dpi/0.0254）。输入输出都是完整 PNG 字节。
export function insertPhys(png: Uint8Array, dpi: number): Uint8Array {
  const ppm = Math.round(dpi / 0.0254);
  const chunk = new Uint8Array(8 + 9 + 4);
  const dv = new DataView(chunk.buffer);
  dv.setUint32(0, 9);                       // length
  chunk[4] = 0x70; chunk[5] = 0x48; chunk[6] = 0x59; chunk[7] = 0x73;   // "pHYs"
  dv.setUint32(8, ppm); dv.setUint32(12, ppm);
  chunk[16] = 1;                            // unit = meter
  dv.setUint32(17, crc32(chunk, 4, 17));
  // IHDR = 首 chunk：8 字节魔数 + (4+4+13+4)=25 → 插入点 33
  const at = 33;
  const out = new Uint8Array(png.length + chunk.length);
  out.set(png.subarray(0, at), 0);
  out.set(chunk, at);
  out.set(png.subarray(at), at + chunk.length);
  return out;
}

// 扫 chunk 表看有没有某 chunk（如 iCCP）。容错：解析越界即停。
function hasChunk(png: Uint8Array, name: string): boolean {
  if (png.length < 8) return false;
  const target = [name.charCodeAt(0), name.charCodeAt(1), name.charCodeAt(2), name.charCodeAt(3)];
  let p = 8;
  const dv = new DataView(png.buffer, png.byteOffset, png.byteLength);
  while (p + 8 <= png.length) {
    const len = dv.getUint32(p);
    if (png[p + 4] === target[0] && png[p + 5] === target[1] && png[p + 6] === target[2] && png[p + 7] === target[3]) return true;
    if (png[p + 4] === 0x49 && png[p + 5] === 0x45 && png[p + 6] === 0x4e && png[p + 7] === 0x44) return false;   // IEND
    p += 12 + len;
    if (len > png.length) return false;   // 坏文件护栏
  }
  return false;
}

// ---- 编码 ----

/** straight RGBA 字节 → PNG（无损，逐字节保真）。opts.dpi → 写 pHYs（导出打印文件用；ora 不传）。 */
export async function encodePngFromBytes(data: Uint8ClampedArray, w: number, h: number, opts: { dpi?: number } = {}): Promise<Uint8Array> {
  // UPNG 需要独立 ArrayBuffer（防 subarray 偏移）
  const buf = new Uint8Array(data).buffer;
  let png = new Uint8Array(UPNG.encode([buf], w, h, 0));
  if (opts.dpi) png = insertPhys(png, opts.dpi);
  return png;
}

// ---- 解码 ----

/** PNG 字节 → straight RGBA。主路 UPNG（全格式、零 canvas、零 premult 损）；
 *  iCCP 色彩配置 / 解码失败 → 注入的壳回退（安全网，永不删——数据安全 >> 纯度）。 */
export async function decodePngToBytes(bytes: Uint8Array | Blob): Promise<RgbaPlane> {
  const u8 = bytes instanceof Blob ? new Uint8Array(await bytes.arrayBuffer()) : bytes;
  const upngDecode = (): RgbaPlane => {
    const img = UPNG.decode(u8.buffer === undefined ? (u8 as unknown as ArrayBuffer) : new Uint8Array(u8).buffer);
    const rgba = UPNG.toRGBA8(img)[0];
    return { data: new Uint8ClampedArray(rgba), w: img.width, h: img.height };
  };
  if (!hasChunk(u8, "iCCP")) {
    try {
      return upngDecode();
    } catch (_) { /* 回退 */ }
  }
  // iCCP（浏览器原生解码会应用 profile）或 UPNG 失败 → 壳回退；headless 无回退 → UPNG 硬解兜底。
  if (_decodeFallback) return _decodeFallback(u8);
  return upngDecode();
}

export { setDeflateLevel } from "../../vendor/upng/upng.esm.js";
