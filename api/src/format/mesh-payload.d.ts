import type { MeshDoc } from "./document.ts";
import type { ViewSink } from "./brep-codec.ts";
import { type FormatReadNotes } from "./migrate/index.ts";
export declare function encodeMeshItem(m: MeshDoc, sink: ViewSink): Record<string, unknown>;
/** @param sliceOf bufferView 下标 → 独立的 ArrayBuffer（偏移 0，所以 f64 / i32 视图不受 BIN 对齐限制） */
export declare function decodeMeshItem(raw: Record<string, unknown>, sliceOf: (bv: number) => ArrayBuffer, notes: FormatReadNotes, where: string, fail: (msg: string) => never): MeshDoc;
