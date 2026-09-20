// glb.ts —— GLB 容器（glTF 2.0 二进制：12 B 头 + JSON chunk + BIN chunk）的读写，自写、零依赖。
// 只管容器，不懂 glTF 语义；version 2（> 4 GiB 才需要 2.1 的 version 3，届时在这里加）。
// 规范：magic "glTF"、JSON chunk 用 0x20 补齐到 4 的倍数、BIN chunk 用 0x00 补齐。
// created 2026-09-20 by Claude Fable 5.1

const MAGIC = 0x46546c67;        // "glTF" 小端
const CHUNK_JSON = 0x4e4f534a;   // "JSON"
const CHUNK_BIN = 0x004e4942;    // "BIN\0"
const HEADER_BYTES = 12;
const CHUNK_HEADER_BYTES = 8;

export interface GlbParts {
  readonly json: unknown;
  readonly bin: Uint8Array;
  readonly version: number;
}

const enc = new TextEncoder();
const dec = new TextDecoder("utf-8", { fatal: true });

function pad4(n: number): number { return (4 - (n % 4)) % 4; }

export function encodeGlb(json: unknown, bin: Uint8Array): Uint8Array {
  const jsonBytes = enc.encode(JSON.stringify(json));
  const jsonPad = pad4(jsonBytes.byteLength);
  const binPad = pad4(bin.byteLength);
  const hasBin = bin.byteLength > 0;
  const total = HEADER_BYTES
    + CHUNK_HEADER_BYTES + jsonBytes.byteLength + jsonPad
    + (hasBin ? CHUNK_HEADER_BYTES + bin.byteLength + binPad : 0);
  if (total > 0xffffffff) throw new Error("encodeGlb: file exceeds 4 GiB (GLB version 3 not implemented)");
  const out = new Uint8Array(total);
  const dv = new DataView(out.buffer);
  let o = 0;
  dv.setUint32(o, MAGIC, true); dv.setUint32(o + 4, 2, true); dv.setUint32(o + 8, total, true); o += HEADER_BYTES;
  dv.setUint32(o, jsonBytes.byteLength + jsonPad, true); dv.setUint32(o + 4, CHUNK_JSON, true); o += CHUNK_HEADER_BYTES;
  out.set(jsonBytes, o); o += jsonBytes.byteLength;
  for (let i = 0; i < jsonPad; i++) out[o++] = 0x20;
  if (hasBin) {
    dv.setUint32(o, bin.byteLength + binPad, true); dv.setUint32(o + 4, CHUNK_BIN, true); o += CHUNK_HEADER_BYTES;
    out.set(bin, o); o += bin.byteLength + binPad;   // 补零已是 0
  }
  return out;
}

/** 只看头 12 字节：是不是 GLB（validateAdopt / 头片 peek 用）。 */
export function isGlb(bytes: Uint8Array): boolean {
  if (bytes.byteLength < HEADER_BYTES) return false;
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return dv.getUint32(0, true) === MAGIC;
}

export function decodeGlb(bytes: Uint8Array): GlbParts {
  if (bytes.byteLength < HEADER_BYTES) throw new Error("decodeGlb: too short for a GLB header");
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (dv.getUint32(0, true) !== MAGIC) throw new Error("decodeGlb: bad magic (not a GLB)");
  const version = dv.getUint32(4, true);
  if (version !== 2) throw new Error(`decodeGlb: unsupported GLB container version ${version}`);
  const total = dv.getUint32(8, true);
  if (total > bytes.byteLength) throw new Error(`decodeGlb: header says ${total} bytes, have ${bytes.byteLength} (truncated)`);
  let o = HEADER_BYTES;
  let json: unknown = undefined;
  let jsonSeen = false;
  let bin: Uint8Array = new Uint8Array(0);
  while (o + CHUNK_HEADER_BYTES <= total) {
    const len = dv.getUint32(o, true);
    const type = dv.getUint32(o + 4, true);
    o += CHUNK_HEADER_BYTES;
    if (o + len > total) throw new Error("decodeGlb: chunk runs past end of file");
    const body = bytes.subarray(o, o + len);
    if (type === CHUNK_JSON) {
      if (jsonSeen) throw new Error("decodeGlb: duplicate JSON chunk");
      jsonSeen = true;
      json = JSON.parse(dec.decode(body));
    } else if (type === CHUNK_BIN) {
      bin = body;
    }
    // 其它 chunk 类型：规范说忽略。
    o += len;
  }
  if (!jsonSeen) throw new Error("decodeGlb: missing JSON chunk");
  return { json, bin, version };
}
