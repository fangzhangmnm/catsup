import type { ViewSink } from "./brep-codec.ts";
import type { UvSetDoc } from "./document.ts";
import type { FormatReadNotes } from "./migrate/index.ts";
/** 画布每边的上限（格）：内存里 32 位浮点能把 1/1024 格表示精确的上限（施工单十八 3.1）。 */
export declare const UV_CANVAS_MAX_SIDE = 16384;
/** 铺法自己能把画布长到多大（按一格多大开的画布往下加高的上限；paint/layout.ts 的缺省 maxSize）。 */
export declare const UV_LAYOUT_MAX_SIDE = 4096;
/** 一行排法的画布能到的最大范围 [0, 宽) × [0, 高)：宽 = 这一行的宽；高 = 这一行的高和铺法上限里大的那个（施工单十八第 2 刀统筹预审 B：旧画只可能在这里面）。 */
export declare function freedReach(width: number, height: number): readonly [number, number];
/** 读整张表（list）：坏的行不认、同号的几行都不认，各记一笔。 */
export declare function readUvSetRows(list: unknown, view: (bv: number) => Uint8Array, notes: FormatReadNotes): UvSetDoc[];
/** 写一行：不认识的键铺在前、认识的键后写（认识的永远赢）；freed 空 = 不写。 */
export declare function writeUvSetRow(r: UvSetDoc, sink: ViewSink): Record<string, unknown>;
