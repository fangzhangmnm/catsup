import type { Tool } from "../editor/tool-ids.ts";
import { type ResolvedBrush } from "./kernel/src/common/resolved-brush.ts";
/** 一支笔的记录（键 = 画画软件笔架条目的键；本地写类型，不从内核多拿名字）。大小、浓度、硬度是旋钮（笔的模型第五节），不在记录里定死：shape.hardness 只是缺省。 */
export interface BrushRecord {
    readonly id: string;
    readonly name: string;
    /** 对像素做什么（笔的模型的 tool 轴）：brush 上色、eraser 擦。 */
    readonly tool: "brush" | "eraser";
    readonly shape: {
        readonly kind: "round";
        readonly aspect: number;
        readonly rotation: number;
        readonly hardness: number;
    };
    readonly spacing: number;
    /** 一笔里自己叠自己：wash = 取最浓（自己叠自己不变深）、buildup = 越叠越浓。 */
    readonly compositeMode: "wash" | "buildup";
    readonly blendMode: "source-over";
    readonly pixelMode: boolean;
    readonly sizeCoeff: number;
    readonly opaCoeff: number;
    readonly flowCoeff: number;
    readonly pressureGamma: number;
    readonly pressureLPF: number;
    readonly taper: {
        readonly in: number;
        readonly out: number;
    };
    readonly taperFloor: number;
    readonly smooth: {
        readonly streamline: number;
        readonly stabilization: number;
    };
}
/** 内置的笔。1a：两行，数和 v0.19.54（hookBrush + 种类表）一模一样。 */
export declare const BRUSHES: {
    readonly pen: {
        readonly id: "pen";
        readonly name: "笔";
        readonly tool: "brush";
        readonly shape: {
            readonly kind: "round";
            readonly aspect: 1;
            readonly rotation: 0;
            readonly hardness: 0.5;
        };
        readonly spacing: 0.1;
        readonly compositeMode: "buildup";
        readonly blendMode: "source-over";
        readonly pixelMode: false;
        readonly sizeCoeff: 0;
        readonly opaCoeff: 0;
        readonly flowCoeff: 0;
        readonly pressureGamma: 1;
        readonly pressureLPF: 0;
        readonly taper: {
            readonly in: 0;
            readonly out: 0;
        };
        readonly taperFloor: 0.4;
        readonly smooth: {
            readonly streamline: 0;
            readonly stabilization: 0;
        };
    };
    readonly eraser: {
        readonly id: "eraser";
        readonly name: "橡皮";
        readonly tool: "eraser";
        readonly shape: {
            readonly kind: "round";
            readonly aspect: 1;
            readonly rotation: 0;
            readonly hardness: 0.5;
        };
        readonly spacing: 0.1;
        readonly compositeMode: "buildup";
        readonly blendMode: "source-over";
        readonly pixelMode: false;
        readonly sizeCoeff: 0;
        readonly opaCoeff: 0;
        readonly flowCoeff: 0;
        readonly pressureGamma: 1;
        readonly pressureLPF: 0;
        readonly taper: {
            readonly in: 0;
            readonly out: 0;
        };
        readonly taperFloor: 0.4;
        readonly smooth: {
            readonly streamline: 0;
            readonly stabilization: 0;
        };
    };
};
export type BrushKind = keyof typeof BRUSHES;
export declare const BRUSH_KIND_IDS: BrushKind[];
export interface BrushKindRow {
    readonly label: string;
    /** 画画工作台里拿着哪把工具画的是这种笔。 */
    readonly tool: Tool;
    readonly erase: boolean;
    readonly accum: "over" | "max";
}
/** 种类表（从记录算出来的；探针 / 守卫照它跑）。 */
export declare const BRUSH_KINDS: Readonly<Record<BrushKind, BrushKindRow>>;
/** 这把工具画的是哪种笔（不是画的工具 = null）。 */
export declare function brushKindOfTool(t: string): BrushKind | null;
/** 起笔时随种类定的那几项（SpacePaintOpts 里不随设置变的部分）。 */
export declare function strokeKindOpts(k: BrushKind): {
    readonly erase: boolean;
    readonly accum: "over" | "max";
};
/**
 * 起笔用的笔：这一行记录 + 旋钮（大小 = 屏幕像素、浓度、硬度）→ 内核的 ResolvedBrush（resolveBrush，和画画软件同一个解析）。
 * 颜色不走这里（一笔的颜色是 SpacePaintOpts.color），这里固定 #000000（和以前的 hookBrush 一样）。
 */
export declare function resolvedBrushOf(k: BrushKind, knobs: {
    readonly size: number;
    readonly opacity: number;
    readonly hardness: number;
}): ResolvedBrush;
