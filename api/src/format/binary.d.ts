export type UintType = "uint8" | "uint16" | "uint32" | "uint64";
export declare const UINT_BYTES: Readonly<Record<UintType, 1 | 2 | 4 | 8>>;
/** 2^53：JS double 精确整数上限 = 契约里「世界半径 2^53 µm」的出处（§3.3）。 */
export declare const MAX_SAFE: number;
/** 位宽阶梯：能装下 maxValue 的最窄无符号类型。 */
export declare function pickUintType(maxValue: number): UintType;
export declare function isUintType(x: unknown): x is UintType;
/** 无符号整数流 → 小端字节。值必须是非负安全整数（uint64 也只装到 2^53，契约 §3.3）。 */
export declare function encodeUints(values: ArrayLike<number>, type: UintType): Uint8Array;
/** 小端字节 → 无符号整数流（uint64 超过 2^53 直接报错：文件违反世界半径契约，不猜）。 */
export declare function decodeUints(bytes: Uint8Array, type: UintType, count: number): number[];
export declare function encodeF32(values: ArrayLike<number>): Uint8Array;
export declare function decodeF32(bytes: Uint8Array, count: number): Float32Array;
export interface BinSpan {
    readonly byteOffset: number;
    readonly byteLength: number;
}
/** BIN chunk 拼装器：每段起点 4 字节对齐（glTF bufferView 对 accessor 的要求；我们的整数流也沿用）。 */
export declare class BinBuilder {
    private parts;
    private len;
    get byteLength(): number;
    push(bytes: Uint8Array): BinSpan;
    finish(): Uint8Array;
}
/** 从 BIN 里切一段（越界 = 文件坏，明确报错）。 */
export declare function sliceBin(bin: Uint8Array, span: BinSpan): Uint8Array;
