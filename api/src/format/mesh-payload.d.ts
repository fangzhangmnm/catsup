import type { ColumnDoc, MeshDoc } from "./document.ts";
import type { ViewSink } from "./brep-codec.ts";
import { type FormatReadNotes } from "./migrate/index.ts";
/** uv 列里「这个角没有值」的整数（施工单十八 3.2）。 */
export declare const UV_NONE = -2147483648;
/** 一个 uv 通道（写进文件前 / 读出来展开前）。 */
export interface UvChannel {
    readonly sets: string[];
    readonly faceSet: Int32Array;
    readonly data: Int32Array;
}
/**
 * 按排法分的 uv 列 → 通道（文件头注释 3.0）。每张面有没有位置看它第一个角（内存里一张面在一列上整面有或整面没有）；坐标 × 1024 取整（值本来就是 1/1024 格的整数倍）。
 * 同一份列写出来逐字节一样：通道、sets、下标都只由「哪张面在哪几套上有位置」和 GUID 的字典序决定，和内存里列的先后无关。
 */
export declare function packUvChannels(uv: readonly ColumnDoc[], faceStart: Int32Array, faceLen: Int32Array, corners: number): UvChannel[];
export declare function encodeMeshItem(m: MeshDoc, sink: ViewSink): Record<string, unknown>;
/** @param sliceOf bufferView 下标 → 独立的 ArrayBuffer（偏移 0，所以 f64 / i32 视图不受 BIN 对齐限制） */
export declare function decodeMeshItem(raw: Record<string, unknown>, sliceOf: (bv: number) => ArrayBuffer, notes: FormatReadNotes, where: string, fail: (msg: string) => never, owner?: {
    readonly guid: string;
    readonly name: string;
}): MeshDoc;
