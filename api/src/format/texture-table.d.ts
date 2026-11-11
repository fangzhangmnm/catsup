import type { ViewSink } from "./brep-codec.ts";
import type { CarriedJson, TextureDoc } from "./document.ts";
import type { FormatReadNotes } from "./migrate/index.ts";
import { type Guid } from "./guid.ts";
/** 一段 JSON 连同它引用的字节（按文件里的号）拷出来。 */
export declare function carryJson(json: unknown, view: (bv: number) => Uint8Array): CarriedJson;
/** 写盘：自带的字节各落一条新 bufferView，JSON 里的旧号换成新号。 */
export declare function landCarried(c: CarriedJson, sink: ViewSink): unknown;
/** 读一行。seen / reminted = 身份去重（重复或不合法的 GUID 现铸，和别的条目一样）。 */
export declare function readTextureRow(raw: unknown, i: number, view: (bv: number) => Uint8Array, seen: Set<Guid>, reminted: () => void, notes: FormatReadNotes): TextureDoc;
/** 写一行。imageView = 原图那份字节的 bufferView（和标准那一半的 images[] 共用一条；write.ts 记着每张图落在哪）。不认识的键先铺、认识的后铺（已知键永远赢）。 */
export declare function writeTextureRow(t: TextureDoc, sink: ViewSink, imageView: (t: TextureDoc) => number): Record<string, unknown>;
