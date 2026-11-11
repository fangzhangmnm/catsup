import type { Tool } from "../editor/tool-ids.ts";
export interface BrushKindRow {
    readonly label: string;
    /** 画画工作台里拿着哪把工具画的是这种笔。 */
    readonly tool: Tool;
    readonly erase: boolean;
    readonly accum: "over" | "max";
}
export declare const BRUSH_KINDS: {
    readonly pen: {
        readonly label: "笔";
        readonly tool: "paintPen";
        readonly erase: false;
        readonly accum: "over";
    };
    readonly eraser: {
        readonly label: "橡皮";
        readonly tool: "paintEraser";
        readonly erase: true;
        readonly accum: "over";
    };
};
export type BrushKind = keyof typeof BRUSH_KINDS;
export declare const BRUSH_KIND_IDS: BrushKind[];
/** 这把工具画的是哪种笔（不是画的工具 = null）。 */
export declare function brushKindOfTool(t: string): BrushKind | null;
/** 起笔时随种类定的那几项（SpacePaintOpts 里不随设置变的部分）。 */
export declare function strokeKindOpts(k: BrushKind): {
    readonly erase: boolean;
    readonly accum: "over" | "max";
};
