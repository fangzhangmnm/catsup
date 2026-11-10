// 导出 PSD（最小可用子集）。读者：Photoshop / Affinity Photo / Procreate / Krita。
//
// 子集（决意不做的）：
//   - Color mode: RGB 8-bit only（不做 16-bit / 32-bit / CMYK / Lab）
//   - ViewLeaf：raster pixel layer + bbox + 4 channel(A/R/G/B) + blend mode + opacity
//     + visibility + 名字（pascal ASCII + luni unicode）
//   - 不做：layer mask / adjustment layer / smart object / text / vector / clipping group
//   - 不做：image resources（thumb / DPI / 颜色配置都不写，PS 用默认值）
//
// 编码：
//   - PackBits RLE（PSD 默认；不做 ZIP）
//   - big-endian binary writer
//   - 章节长度先占位、写完回填
//
// 参考：
//   - Adobe PSD/PSB File Format Spec（公开）
//   - ag-psd（npm）—— 看实现校验我们没漏字段
//
// 用法：
//   const blob = await encodeDocToPsd(doc);
//   // → image/vnd.adobe.photoshop blob，触发下载或 share

import { renderNodesToBytes } from "./doc-render.ts";
import { flattenViewLeaves } from "./workpiece/painting-view.ts";
import type { ViewLeaf } from "./workpiece/painting-view.ts";
import type { PaintingView } from "./workpiece/painting-view.ts";

// doc.layers / compositeLayers 的节点联合（ViewLeaf | LayerGroup）；这两个类型在 doc.ts 未导出，
// compositeLayers 接受 doc.layers 原样传入即可，这里给本地用到的画布上下文类型。

// 单通道 PackBits 编码结果
interface EncodedChannel {
  id: number;
  length: number;
  rowByteCounts: Uint16Array;
  encoded: Uint8Array;
}

// ---- BinaryWriter：动态增长 Uint8Array + big-endian + delayed fill ----
class BinaryWriter {
  _buf: Uint8Array;
  _off: number;
  constructor(initialCap = 1024) {
    this._buf = new Uint8Array(initialCap);
    this._off = 0;
  }
  get offset() { return this._off; }
  _grow(n: number) {
    if (this._off + n <= this._buf.length) return;
    let cap = this._buf.length;
    while (cap < this._off + n) cap *= 2;
    const nb = new Uint8Array(cap);
    nb.set(this._buf);
    this._buf = nb;
  }
  writeUInt8(v: number)  { this._grow(1); this._buf[this._off++] = v & 0xff; }
  writeUInt16(v: number) {
    this._grow(2);
    this._buf[this._off++] = (v >>> 8) & 0xff;
    this._buf[this._off++] = v & 0xff;
  }
  writeUInt32(v: number) {
    this._grow(4);
    this._buf[this._off++] = (v >>> 24) & 0xff;
    this._buf[this._off++] = (v >>> 16) & 0xff;
    this._buf[this._off++] = (v >>>  8) & 0xff;
    this._buf[this._off++] = v & 0xff;
  }
  writeInt16(v: number) { this.writeUInt16(v & 0xffff); }
  writeAscii(s: string) {
    this._grow(s.length);
    for (let i = 0; i < s.length; i++) this._buf[this._off++] = s.charCodeAt(i) & 0xff;
  }
  writeBytes(arr: Uint8Array) {
    this._grow(arr.length);
    this._buf.set(arr, this._off);
    this._off += arr.length;
  }
  padTo(multiple: number) {
    const r = this._off % multiple;
    if (r === 0) return;
    const n = multiple - r;
    this._grow(n);
    for (let i = 0; i < n; i++) this._buf[this._off++] = 0;
  }
  fillUInt32(at: number, v: number) {
    this._buf[at]     = (v >>> 24) & 0xff;
    this._buf[at + 1] = (v >>> 16) & 0xff;
    this._buf[at + 2] = (v >>>  8) & 0xff;
    this._buf[at + 3] = v & 0xff;
  }
  toUint8Array() { return this._buf.slice(0, this._off); }
}

// ---- PackBits RLE 单行编码 ----
// 编码规则（PSD / TIFF 同一种）：
//   header byte n：
//     0..127      = 紧跟 (n + 1) 个 literal 字节
//     -127..-1    = 把下一个字节重复 (1 - n) 次（注意 8-bit signed）
//     -128 (0x80) = no-op，不用
// 输出对每行独立做（PSD 按 scanline 切片）。
function packBitsEncodeRow(src: Uint8Array) {
  const out = [];
  const len = src.length;
  let i = 0;
  while (i < len) {
    // 找 ≥2 等值 run；如果长度 ≥3 就用 repeat 编码
    let runLen = 1;
    while (i + runLen < len && src[i + runLen] === src[i] && runLen < 128) runLen++;
    if (runLen >= 3) {
      out.push(257 - runLen);             // 8-bit signed: -(runLen - 1)
      out.push(src[i]);
      i += runLen;
    } else {
      // literal run：连续不重复 / 短重复段；最多 128 字节
      const litStart = i;
      i++;
      while (i < len && (i - litStart) < 128) {
        // 见到 ≥3 重复就停（重复用 repeat 更短）
        if (i + 2 < len && src[i] === src[i + 1] && src[i + 1] === src[i + 2]) break;
        i++;
      }
      const litLen = i - litStart;
      out.push(litLen - 1);
      for (let j = 0; j < litLen; j++) out.push(src[litStart + j]);
    }
  }
  return Uint8Array.from(out);
}

// 编码一整张通道（h 行 × w 列），返回每行字节数 + 拼接的编码 bytes
function packBitsEncodeChannel(data: Uint8Array, w: number, h: number) {
  if (w === 0 || h === 0) {
    return { rowByteCounts: new Uint16Array(0), encoded: new Uint8Array(0) };
  }
  const rowByteCounts = new Uint16Array(h);
  const rows = new Array(h);
  let total = 0;
  for (let y = 0; y < h; y++) {
    const row = data.subarray(y * w, (y + 1) * w);
    const enc = packBitsEncodeRow(row);
    rowByteCounts[y] = enc.length;
    rows[y] = enc;
    total += enc.length;
  }
  const encoded = new Uint8Array(total);
  let off = 0;
  for (const r of rows) { encoded.set(r, off); off += r.length; }
  return { rowByteCounts, encoded };
}

// ---- 通道切分：RGBA interleaved → 4 个独立 Uint8Array ----
function splitRGBAChannels(rgba: Uint8ClampedArray, w: number, h: number) {
  const n = w * h;
  const r = new Uint8Array(n);
  const g = new Uint8Array(n);
  const b = new Uint8Array(n);
  const a = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    r[i] = rgba[i * 4];
    g[i] = rgba[i * 4 + 1];
    b[i] = rgba[i * 4 + 2];
    a[i] = rgba[i * 4 + 3];
  }
  return { r, g, b, a };
}

// ---- Canvas blend mode → PSD blend key（4 chars，缺位补空格）----
// 12 个 Canvas mode 大部分能一一对应；其他 mode 我们也没用。
const PSD_BLEND_MODE: Record<string, string> = {
  "source-over": "norm",
  "multiply":    "mul ",
  "screen":      "scrn",
  "overlay":     "over",
  "darken":      "dark",
  "lighten":     "lite",
  "color-dodge": "div ",
  "color-burn":  "idiv",
  "hard-light":  "hLit",
  "soft-light":  "sLit",
  "difference":  "diff",
  "exclusion":   "smud",
  "hue":         "hue ",
  "saturation":  "sat ",
  "color":       "colr",
  "luminosity":  "lum ",
};

// ---- 名字编码 ----
// PSD layer name：pascal string（1 byte 长度 + bytes），padded 到 4 倍数（含长度字节）
// 只装 ASCII；非 ASCII 替换成 '?'。真实 unicode 名走 "luni" additional info。
function asciiPascalBytes(name: string) {
  const arr = [];
  for (let i = 0; i < name.length && arr.length < 255; i++) {
    const c = name.charCodeAt(i);
    arr.push(c < 128 ? c : 0x3F);    // '?'
  }
  return Uint8Array.from(arr);
}

// ---- 主入口 ----
export async function encodeDocToPsd(doc: PaintingView) {
  const w = new BinaryWriter(64 * 1024);
  const docW = doc.width;
  const docH = doc.height;

  // ===== Header (26 bytes) =====
  w.writeAscii("8BPS");
  w.writeUInt16(1);                    // version (1 = PSD)
  for (let i = 0; i < 6; i++) w.writeUInt8(0);   // reserved
  w.writeUInt16(4);                    // channels (R G B A)
  w.writeUInt32(docH);                 // height
  w.writeUInt32(docW);                 // width
  w.writeUInt16(8);                    // depth (8 bit / channel)
  w.writeUInt16(3);                    // color mode (3 = RGB)

  // ===== Color Mode Data (空) =====
  w.writeUInt32(0);

  // ===== Image Resources (空) =====
  w.writeUInt32(0);

  // ===== ViewLeaf & Mask Info =====
  const layerMaskLenOff = w.offset;
  w.writeUInt32(0);                    // 占位

  // --- ViewLeaf Info subsection ---
  const layerInfoLenOff = w.offset;
  w.writeUInt32(0);                    // 占位

  // ViewLeaf count（正数 = 普通；负数 = 第一个 alpha channel 是 doc 的合成透明，我们不用）
  // 图层组（batch 2）：PSD per-layer records 仍是**扁平叶**（组拍平进 merged，lsct 真组留 P2）。
  //   组本身无像素 canvas → 用 flattenLeaves 取所有叶，组结构丢失但像素不丢。
  const layers = flattenViewLeaves(doc.layers);
  w.writeInt16(layers.length);

  // 预先编码所有 layer 通道，记下每通道字节长度供 layer record 写入
  const encoded = layers.map((layer) => encodeLayerChannels(layer));

  // Per-layer records
  for (let i = 0; i < layers.length; i++) {
    writeLayerRecord(w, layers[i], encoded[i]);
  }
  // Per-layer channel data（接在 records 后面，顺序和 records 对应）
  for (let i = 0; i < layers.length; i++) {
    writeLayerChannelData(w, layers[i], encoded[i]);
  }
  // ViewLeaf info 字段 padded 到 2 的倍数
  w.padTo(2);
  const layerInfoLen = w.offset - layerInfoLenOff - 4;
  w.fillUInt32(layerInfoLenOff, layerInfoLen);

  // --- Global layer mask info（空）---
  w.writeUInt32(0);

  // ViewLeaf & mask info section length 回填
  const layerMaskLen = w.offset - layerMaskLenOff - 4;
  w.fillUInt32(layerMaskLenOff, layerMaskLen);

  // ===== Image Data (merged composite) =====
  // 必填。没层的查看器（如某些 thumb 工具）只看这块。
  writeMergedImage(w, doc, docW, docH);

  return new Blob([w.toUint8Array()], { type: "image/vnd.adobe.photoshop" });
}

// ---- 每 layer 通道编码（预算长度用）----
function encodeLayerChannels(layer: ViewLeaf): EncodedChannel[] {
  const lw = layer.bboxW || 0;
  const lh = layer.bboxH || 0;
  let channels;
  if (lw > 0 && lh > 0) {
    // v0.6.39：tiles 直读（layer.ctx.getImageData 走物化 canvas 的 premult 往返——分层导出是可编辑数据）
    const img = layer.getImageData(layer.bboxX, layer.bboxY, lw, lh);
    channels = splitRGBAChannels(img.data, lw, lh);
  } else {
    channels = { r: new Uint8Array(0), g: new Uint8Array(0), b: new Uint8Array(0), a: new Uint8Array(0) };
  }
  // PSD 通道写入顺序：先 alpha (-1)，再 R (0), G (1), B (2)
  const order = [
    { id: -1, data: channels.a },
    { id:  0, data: channels.r },
    { id:  1, data: channels.g },
    { id:  2, data: channels.b },
  ];
  return order.map((ch) => {
    const r = packBitsEncodeChannel(ch.data, lw, lh);
    // length = 2 (compression marker) + 2 * height (row counts) + encoded bytes
    const length = 2 + 2 * lh + r.encoded.length;
    return { id: ch.id, length, rowByteCounts: r.rowByteCounts, encoded: r.encoded };
  });
}

function writeLayerRecord(w: BinaryWriter, layer: ViewLeaf, encChannels: EncodedChannel[]) {
  // bbox（PSD wants top, left, bottom, right）
  const empty = !(layer.bboxW > 0 && layer.bboxH > 0);
  const top    = empty ? 0 : layer.bboxY;
  const left   = empty ? 0 : layer.bboxX;
  const bottom = empty ? 0 : layer.bboxY + layer.bboxH;
  const right  = empty ? 0 : layer.bboxX + layer.bboxW;
  w.writeUInt32(top);
  w.writeUInt32(left);
  w.writeUInt32(bottom);
  w.writeUInt32(right);

  // 4 个通道
  w.writeUInt16(4);
  for (const ch of encChannels) {
    w.writeInt16(ch.id);
    w.writeUInt32(ch.length);
  }

  // Blend mode signature + key
  w.writeAscii("8BIM");
  const key = PSD_BLEND_MODE[layer.mode] || "norm";
  w.writeAscii(key.length === 4 ? key : (key + "    ").slice(0, 4));

  // Opacity, clipping, flags, filler
  w.writeUInt8(Math.round((layer.opacity ?? 1) * 255));
  w.writeUInt8(0);                              // clipping (0 = base)
  // flags：bit1 = hidden（注意是反的，0 = 可见，2 = 隐藏）
  w.writeUInt8(layer.visible === false ? 2 : 0);
  w.writeUInt8(0);                              // filler

  // Extra data：长度占位，包含 mask data + blending ranges + name + additional info
  const extraOff = w.offset;
  w.writeUInt32(0);

  // ViewLeaf mask data (empty)
  w.writeUInt32(0);
  // ViewLeaf blending ranges (empty)
  w.writeUInt32(0);

  // Pascal name（ASCII fallback），整体 padded 到 4 倍数
  const nameBytes = asciiPascalBytes(layer.name || "ViewLeaf");
  w.writeUInt8(nameBytes.length);
  w.writeBytes(nameBytes);
  // pad
  const consumed = 1 + nameBytes.length;
  const padN = (4 - (consumed % 4)) % 4;
  for (let i = 0; i < padN; i++) w.writeUInt8(0);

  // Additional ViewLeaf Info: "luni" 真实 unicode 名
  writeLuni(w, layer.name || "ViewLeaf");

  // 回填 extra data length
  const extraLen = w.offset - extraOff - 4;
  w.fillUInt32(extraOff, extraLen);
}

// "luni" 块：
//   "8BIM" "luni" length(uint32) charCount(uint32) UTF-16BE bytes
//   length 字段后的数据 padded 到 4 倍数
function writeLuni(w: BinaryWriter, name: string) {
  w.writeAscii("8BIM");
  w.writeAscii("luni");
  const lenOff = w.offset;
  w.writeUInt32(0);
  const start = w.offset;
  w.writeUInt32(name.length);
  for (let i = 0; i < name.length; i++) w.writeUInt16(name.charCodeAt(i));
  // 4-byte pad
  while ((w.offset - start) % 4 !== 0) w.writeUInt8(0);
  const dataLen = w.offset - start;
  w.fillUInt32(lenOff, dataLen);
}

function writeLayerChannelData(w: BinaryWriter, layer: ViewLeaf, encChannels: EncodedChannel[]) {
  const lh = layer.bboxH || 0;
  for (const ch of encChannels) {
    w.writeUInt16(1);                            // compression = RLE
    // Row byte counts
    for (let y = 0; y < lh; y++) w.writeUInt16(ch.rowByteCounts[y]);
    // Encoded bytes
    w.writeBytes(ch.encoded);
  }
}

// ---- Merged image：所有可见 layer 合成到 docW×docH 平面后写入 ----
function writeMergedImage(w: BinaryWriter, doc: PaintingView, docW: number, docH: number) {
  // S9：合成走 GL（doc-render，与 display 同源；respect clip + mode + 组隔离）。
  //   v0.6.39 去 canvas 化：readPixels 字节直接分通道（旧 drawImage+getImageData 又一轮 premult 往返）。
  //   GL 不可用 → merged 透明占位（层数据仍完整；导出场景 GL 必在——无 GL app 无画布）。
  const merged = renderNodesToBytes(doc.layers, docW, docH);
  const ch = splitRGBAChannels(merged ? merged.data : new Uint8ClampedArray(docW * docH * 4), docW, docH);

  w.writeUInt16(1);                              // compression = RLE
  const order = [ch.r, ch.g, ch.b, ch.a];
  const enc = order.map((d) => packBitsEncodeChannel(d, docW, docH));
  // 先写完所有通道的 row byte counts，再写所有通道的编码 bytes
  for (const e of enc) {
    for (let y = 0; y < docH; y++) w.writeUInt16(e.rowByteCounts[y]);
  }
  for (const e of enc) w.writeBytes(e.encoded);
}
