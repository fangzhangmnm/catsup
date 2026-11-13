import type { ViewSink } from "./brep-codec.ts";
import type { UvSetDoc } from "./document.ts";
import type { FormatReadNotes } from "./migrate/index.ts";
/** 画布每边的上限（格）：内存里 32 位浮点能把 1/1024 格表示精确的上限（施工单十八 3.1）。 */
export declare const UV_CANVAS_MAX_SIDE = 16384;
/** 读整张表（list）：坏的行不认、同号的几行都不认，各记一笔。 */
export declare function readUvSetRows(list: unknown, view: (bv: number) => Uint8Array, notes: FormatReadNotes): UvSetDoc[];
/** 写一行：不认识的键铺在前、认识的键后写（认识的永远赢）；freed 空 = 不写。 */
export declare function writeUvSetRow(r: UvSetDoc, sink: ViewSink): Record<string, unknown>;
