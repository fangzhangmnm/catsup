// binary.ts —— src/format 的字节层：BIN chunk 的 4 字节对齐拼装 + 无符号整数流的位宽阶梯（uint8/16/32/64）。
// 契约（ai-docs/20260919-persistence-data-contract.md §5.2）：每条流按需最抠——写入器按最大值选位宽，读取器都认。
// 小端；零 DOM / 零 three / node 直跑。created 2026-09-20 by Claude Fable 5.1

export type UintType = "uint8" | "uint16" | "uint32" | "uint64";

export const UINT_BYTES: Readonly<Record<UintType, 1 | 2 | 4 | 8>> = { uint8: 1, uint16: 2, uint32: 4, uint64: 8 };

/** 2^53：JS double 精确整数上限 = 契约里「世界半径 2^53 µm」的出处（§3.3）。 */
export const MAX_SAFE = Number.MAX_SAFE_INTEGER;

/** 位宽阶梯：能装下 maxValue 的最窄无符号类型。 */
export function pickUintType(maxValue: number): UintType {
  if (!(maxValue >= 0) || !Number.isFinite(maxValue)) throw new Error(`pickUintType: bad max ${maxValue}`);
  if (maxValue <= 0xff) return "uint8";
  if (maxValue <= 0xffff) return "uint16";
  if (maxValue <= 0xffffffff) return "uint32";
  return "uint64";
}

export function isUintType(x: unknown): x is UintType {
  return x === "uint8" || x === "uint16" || x === "uint32" || x === "uint64";
}

/** 无符号整数流 → 小端字节。值必须是非负安全整数（uint64 也只装到 2^53，契约 §3.3）。 */
export function encodeUints(values: ArrayLike<number>, type: UintType): Uint8Array {
  const n = values.length;
  const w = UINT_BYTES[type];
  const out = new Uint8Array(n * w);
  const dv = new DataView(out.buffer);
  const max = type === "uint64" ? MAX_SAFE : 2 ** (8 * w) - 1;
  for (let i = 0; i < n; i++) {
    const v = values[i];
    if (!Number.isInteger(v) || v < 0 || v > max) throw new Error(`encodeUints(${type}): value ${v} at ${i} out of range`);
    switch (type) {
      case "uint8": out[i] = v; break;
      case "uint16": dv.setUint16(i * 2, v, true); break;
      case "uint32": dv.setUint32(i * 4, v, true); break;
      case "uint64": dv.setBigUint64(i * 8, BigInt(v), true); break;
    }
  }
  return out;
}

/** 小端字节 → 无符号整数流（uint64 超过 2^53 直接报错：文件违反世界半径契约，不猜）。 */
export function decodeUints(bytes: Uint8Array, type: UintType, count: number): number[] {
  const w = UINT_BYTES[type];
  if (bytes.byteLength < count * w) throw new Error(`decodeUints(${type}): need ${count * w} bytes, have ${bytes.byteLength}`);
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const out = new Array<number>(count);
  for (let i = 0; i < count; i++) {
    switch (type) {
      case "uint8": out[i] = bytes[i]; break;
      case "uint16": out[i] = dv.getUint16(i * 2, true); break;
      case "uint32": out[i] = dv.getUint32(i * 4, true); break;
      case "uint64": {
        const b = dv.getBigUint64(i * 8, true);
        if (b > BigInt(MAX_SAFE)) throw new Error(`decodeUints(uint64): value at ${i} exceeds 2^53 (world-radius contract)`);
        out[i] = Number(b);
        break;
      }
    }
  }
  return out;
}

export function encodeF32(values: ArrayLike<number>): Uint8Array {
  const f = new Float32Array(values.length);
  for (let i = 0; i < values.length; i++) f[i] = values[i];
  return new Uint8Array(f.buffer);
}

export function decodeF32(bytes: Uint8Array, count: number): Float32Array {
  if (bytes.byteLength < count * 4) throw new Error(`decodeF32: need ${count * 4} bytes, have ${bytes.byteLength}`);
  // 拷一份：bytes 的 byteOffset 未必 4 对齐（虽然我们自己写的都对齐）。
  const copy = new Uint8Array(count * 4);
  copy.set(bytes.subarray(0, count * 4));
  return new Float32Array(copy.buffer);
}

export interface BinSpan { readonly byteOffset: number; readonly byteLength: number; }

/** BIN chunk 拼装器：每段起点 4 字节对齐（glTF bufferView 对 accessor 的要求；我们的整数流也沿用）。 */
export class BinBuilder {
  private parts: Uint8Array[] = [];
  private len = 0;

  get byteLength(): number { return this.len; }

  push(bytes: Uint8Array): BinSpan {
    const pad = (4 - (this.len % 4)) % 4;
    if (pad) { this.parts.push(new Uint8Array(pad)); this.len += pad; }
    const span = { byteOffset: this.len, byteLength: bytes.byteLength };
    this.parts.push(bytes);
    this.len += bytes.byteLength;
    return span;
  }

  finish(): Uint8Array {
    const pad = (4 - (this.len % 4)) % 4;
    const out = new Uint8Array(this.len + pad);
    let o = 0;
    for (const p of this.parts) { out.set(p, o); o += p.byteLength; }
    return out;
  }
}

/** 从 BIN 里切一段（越界 = 文件坏，明确报错）。 */
export function sliceBin(bin: Uint8Array, span: BinSpan): Uint8Array {
  if (span.byteOffset < 0 || span.byteLength < 0 || span.byteOffset + span.byteLength > bin.byteLength) {
    throw new Error(`sliceBin: span [${span.byteOffset}, +${span.byteLength}) outside BIN of ${bin.byteLength} bytes`);
  }
  return bin.subarray(span.byteOffset, span.byteOffset + span.byteLength);
}
