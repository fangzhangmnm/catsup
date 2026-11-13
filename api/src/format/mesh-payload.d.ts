import { type MeshDoc, type UvDoc } from "./document.ts";
import type { ViewSink } from "./brep-codec.ts";
import { type FormatReadNotes } from "./migrate/index.ts";
/** uv 列里「这个角没有值」的整数（施工单十八 3.2）。 */
export declare const UV_NONE = -2147483648;
/** 一个 uv 通道（写进文件前）。 */
export interface UvChannel {
    readonly sets: string[];
    readonly faceSet: Int32Array;
    readonly data: Int32Array;
}
/**
 * 内存里的贴图坐标（MeshDoc.uv，和通道同形）→ 文件里的一个通道（文件头注释 3.0）：sets 按 GUID 字典序、代号跟着换；坐标 × 1024 取整（值本来就是 1/1024 格的整数倍）；
 * 没有位置的面（代号 −1）整面写 UV_NONE。同一份内容写出来逐字节一样：只由「哪张面在哪套上、坐标多少」和 GUID 的字典序决定，和速查表的先后无关。
 * 施工单十八第 1½ 刀起内存里一张面最多在一套排法上 = 永远只写一个通道（v0.19.80 一张面在几套上就写几个通道；一张面一套时两边逐字节一样）。
 */
export declare function packUv(uv: UvDoc, faceStart: Int32Array, faceLen: Int32Array, corners: number): UvChannel;
export declare function encodeMeshItem(m: MeshDoc, sink: ViewSink): Record<string, unknown>;
/** @param sliceOf bufferView 下标 → 独立的 ArrayBuffer（偏移 0，所以 f64 / i32 视图不受 BIN 对齐限制） */
export declare function decodeMeshItem(raw: Record<string, unknown>, sliceOf: (bv: number) => ArrayBuffer, notes: FormatReadNotes, where: string, fail: (msg: string) => never, owner?: {
    readonly guid: string;
    readonly name: string;
}): MeshDoc;
