import type { Tool } from "../editor/tool-ids.ts";
import { type BrushId, type BrushRecord } from "./brush-records.ts";
export type BrushKind = BrushId;
export declare const BRUSH_KIND_IDS: ("pen" | "eraser" | "ink" | "sketch")[];
export interface BrushKindRow {
    readonly label: string;
    /** 画画工作台里拿着哪把工具画的是这支笔。 */
    readonly tool: Tool;
    readonly erase: boolean;
    readonly accum: "over" | "max";
    /** 走哪条路（brush-records.ts pathKeyOf）：探针按路一组。 */
    readonly path: string;
}
/** 种类表（从记录算出来的；探针 / 守卫照它跑）。 */
export declare const BRUSH_KINDS: Readonly<Record<BrushKind, BrushKindRow>>;
/** 表里出现的每一条路 → 走这条路的第一支笔（探针拿它画）。 */
export declare const BRUSH_PATHS: Readonly<Record<string, BrushKind>>;
/** 这把工具上的笔记在桌面态 active 的哪一个键下（= 记录的 tool 取值）；不是画的工具 = null。 */
export declare function recordToolOf(t: string): BrushRecord["tool"] | null;
/** 这把工具上能挑的几支（下拉里的顺序 = 表里的顺序）。 */
export declare function brushKindsOfTool(t: string): BrushKind[];
/**
 * 拿着这把工具画的是哪支笔：chosen 是这把工具上的笔 = 它；没挑过、挑的是这一版没有的笔、或者是别的工具上的笔 = 这把工具默认的那支（桌面态 active 的规矩）。
 * 不是画的工具（吸管等）= null。
 */
export declare function brushKindOfTool(t: string, chosen?: unknown): BrushKind | null;
/** 起笔时随种类定的那几项（SpacePaintOpts 里不随设置变的部分）。 */
export declare function strokeKindOpts(k: BrushKind): {
    readonly erase: boolean;
    readonly accum: "over" | "max";
};
