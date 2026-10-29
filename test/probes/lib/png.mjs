// test/probes/lib/png.mjs —— 零依赖 PNG 编解码（截图基线用：8 位 RGB / RGBA、不隔行；编码只用 filter 0）。
// created 2026-10-29 by Claude Fable 5.1（Tron 纪元第一刀步 1：画面一个像素不变的尺子；仓里不装 pngjs，node:zlib 够用）
import { deflateSync, inflateSync } from "node:zlib";

const SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const CRC = new Int32Array(256);
for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; CRC[n] = c; }
function crc32(buf) { let c = -1; for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8); return (c ^ -1) >>> 0; }
function chunk(type, data) {
  const t = Buffer.from(type, "latin1"), len = Buffer.alloc(4), crc = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0); crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crc]);
}

/** RGBA 字节（左上起、行优先）→ PNG 文件字节。 */
export function encodePng(rgba, w, h) {
  if (rgba.length !== w * h * 4) throw new Error(`encodePng: ${rgba.length} bytes ≠ ${w}×${h}×4`);
  const stride = w * 4, raw = Buffer.alloc((stride + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (stride + 1)] = 0; raw.set(rgba.subarray(y * stride, (y + 1) * stride), y * (stride + 1) + 1); }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([SIG, chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0))]);
}

/** PNG 文件字节 → { w, h, rgba }（8 位、不隔行；灰 / 灰+α / RGB / RGBA 都展成 RGBA）。 */
export function decodePng(buf) {
  buf = Buffer.from(buf.buffer ? buf : Buffer.from(buf));
  if (!buf.subarray(0, 8).equals(SIG)) throw new Error("decodePng: not a PNG");
  let p = 8, w = 0, h = 0, depth = 0, ctype = 0, interlace = 0; const idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p), type = buf.toString("latin1", p + 4, p + 8), data = buf.subarray(p + 8, p + 8 + len);
    if (type === "IHDR") { w = data.readUInt32BE(0); h = data.readUInt32BE(4); depth = data[8]; ctype = data[9]; interlace = data[12]; }
    else if (type === "IDAT") idat.push(data);
    else if (type === "IEND") break;
    p += 12 + len;
  }
  if (depth !== 8 || interlace !== 0) throw new Error(`decodePng: unsupported depth ${depth} / interlace ${interlace}`);
  const ch = { 0: 1, 2: 3, 4: 2, 6: 4 }[ctype];
  if (!ch) throw new Error(`decodePng: unsupported color type ${ctype}`);
  const raw = inflateSync(Buffer.concat(idat)), stride = w * ch, out = Buffer.alloc(stride * h);
  let prev = Buffer.alloc(stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], row = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)), cur = out.subarray(y * stride, (y + 1) * stride);
    for (let i = 0; i < stride; i++) {
      const a = i >= ch ? cur[i - ch] : 0, b = prev[i], c = i >= ch ? prev[i - ch] : 0, x = row[i];
      let v;
      switch (f) {
        case 0: v = x; break;
        case 1: v = x + a; break;
        case 2: v = x + b; break;
        case 3: v = x + ((a + b) >> 1); break;
        case 4: { const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c); v = x + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c); break; }
        default: throw new Error(`decodePng: bad filter ${f} at row ${y}`);
      }
      cur[i] = v & 0xff;
    }
    prev = cur;
  }
  if (ch === 4) return { w, h, rgba: new Uint8Array(out.buffer, out.byteOffset, out.length) };
  const rgba = new Uint8Array(w * h * 4);
  for (let i = 0, j = 0; i < w * h; i++, j += ch) {
    if (ch === 3) { rgba[i * 4] = out[j]; rgba[i * 4 + 1] = out[j + 1]; rgba[i * 4 + 2] = out[j + 2]; rgba[i * 4 + 3] = 255; }
    else { rgba[i * 4] = rgba[i * 4 + 1] = rgba[i * 4 + 2] = out[j]; rgba[i * 4 + 3] = ch === 2 ? out[j + 1] : 255; }
  }
  return { w, h, rgba };
}

/** 两张同尺寸 RGBA 的差：不同像素数（任一通道差 > tol）+ 差图（不同 = 红，相同 = 原图压淡）。 */
export function diffRgba(a, b, w, h, tol = 8) {
  if (a.length !== b.length) throw new Error(`diffRgba: size ${a.length} ≠ ${b.length}`);
  const out = new Uint8Array(a.length); let n = 0;
  for (let i = 0; i < w * h; i++) {
    const o = i * 4;
    const d = Math.max(Math.abs(a[o] - b[o]), Math.abs(a[o + 1] - b[o + 1]), Math.abs(a[o + 2] - b[o + 2]), Math.abs(a[o + 3] - b[o + 3]));
    if (d > tol) { n++; out[o] = 255; out[o + 1] = 0; out[o + 2] = 0; out[o + 3] = 255; }
    else { out[o] = 128 + (a[o] >> 1); out[o + 1] = 128 + (a[o + 1] >> 1); out[o + 2] = 128 + (a[o + 2] >> 1); out[o + 3] = 255; }
  }
  return { differing: n, image: out };
}
