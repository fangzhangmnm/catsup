import { type ResolvedBrush } from "./kernel/src/common/resolved-brush.ts";
/** 一支笔的记录（键 = 画画软件笔架条目的键；本地写类型，不从内核多拿名字）。大小、浓度、硬度是旋钮（笔的模型第五节），不在记录里定死：size.base / shape.hardness 只是第一次拿起这支笔时的值。 */
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
    /** 大小：base = 第一次拿起来时的值、max = 滑条的上限（画画软件的 args.size / sizeBaseMax）；unit 缺 = 宿主自己的习惯（三维 = 屏幕上的 CSS 像素，第三节第 2 条）。 */
    readonly size: {
        readonly base: number;
        readonly max: number;
        readonly unit?: "cell";
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
/**
 * 内置的笔。id 定了不改、不重用（施工单二十第三节第 1 条）。
 * - pen / eraser：1a 时和 v0.19.54 一模一样的数（压感系数 0、不收尖、不跟手、间距 0.1）；普通笔要不要吃压感是手感，归 user。
 *   size.base / shape.hardness = 画画工作台一直以来的出厂值（笔 12 像素、橡皮 24 像素、硬度 0.8；旋钮总会盖过 shape.hardness，所以不影响画出来的样子）；max = 一直以来滑条的上限 400。
 * - sketch / ink：照画画软件内置笔的数据原样抄（WeebPaint builtin-brushes.json，v0.14.86 那一版）：草稿笔 = default-brush-pencil「铅笔」、勾线笔 = default-brush-ink「勾线」。
 *   args 的键 → 这里：size → size.base、sizeBaseMax → size.max、hardness → shape.hardness、spacingValue → spacing、taperIn / taperOut → taper、streamline / stabilization → smooth，其余同名。
 *   画画软件里那两支没写 taperFloor = 内核 resolveBrush 的缺省 0.4，这里写明。size 原样是数：画画软件里是画布像素、这里是屏幕像素（统筹 11-12：数据照抄；像不像归 user 判断，不自己调）。
 */
export declare const BRUSHES: {
    readonly pen: {
        readonly id: "pen";
        readonly name: "笔";
        readonly tool: "brush";
        readonly shape: {
            readonly kind: "round";
            readonly aspect: 1;
            readonly rotation: 0;
            readonly hardness: 0.8;
        };
        readonly size: {
            readonly base: 12;
            readonly max: 400;
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
            readonly hardness: 0.8;
        };
        readonly size: {
            readonly base: 24;
            readonly max: 400;
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
    readonly sketch: {
        readonly id: "sketch";
        readonly name: "草稿笔";
        readonly tool: "brush";
        readonly shape: {
            readonly kind: "round";
            readonly aspect: 1;
            readonly rotation: 0;
            readonly hardness: 0.75;
        };
        readonly size: {
            readonly base: 6;
            readonly max: 80;
        };
        readonly spacing: 0.06;
        readonly compositeMode: "wash";
        readonly blendMode: "source-over";
        readonly pixelMode: false;
        readonly sizeCoeff: 0.5;
        readonly opaCoeff: 0.35;
        readonly flowCoeff: 0.3;
        readonly pressureGamma: 1;
        readonly pressureLPF: 50;
        readonly taper: {
            readonly in: 0;
            readonly out: 0;
        };
        readonly taperFloor: 0.4;
        readonly smooth: {
            readonly streamline: 0.1;
            readonly stabilization: 0.15;
        };
    };
    readonly ink: {
        readonly id: "ink";
        readonly name: "勾线笔";
        readonly tool: "brush";
        readonly shape: {
            readonly kind: "round";
            readonly aspect: 1;
            readonly rotation: 0;
            readonly hardness: 0.5;
        };
        readonly size: {
            readonly base: 8;
            readonly max: 60;
        };
        readonly spacing: 0.06;
        readonly compositeMode: "wash";
        readonly blendMode: "source-over";
        readonly pixelMode: false;
        readonly sizeCoeff: 0.95;
        readonly opaCoeff: 0;
        readonly flowCoeff: 0;
        readonly pressureGamma: 0.5;
        readonly pressureLPF: 50;
        readonly taper: {
            readonly in: 0.5;
            readonly out: 0;
        };
        readonly taperFloor: 0.4;
        readonly smooth: {
            readonly streamline: 0.5;
            readonly stabilization: 0.5;
        };
    };
};
export type BrushId = keyof typeof BRUSHES;
export declare const BRUSH_IDS: BrushId[];
export declare const isBrushId: (s: unknown) => s is BrushId;
export declare const brushRecord: (id: BrushId) => BrushRecord;
/** 每种 tool 默认的那支（桌面态 active 指着这一版没有的笔 / 没记 = 用它）。 */
export declare const DEFAULT_BRUSH: Readonly<Record<BrushRecord["tool"], BrushId>>;
/** 这种 tool 有哪几支（表里的顺序 = 下拉里的顺序）。 */
export declare const brushesOfTool: (tool: BrushRecord["tool"]) => BrushId[];
/**
 * 起笔用的笔：这一行记录 + 旋钮（大小 = 屏幕像素、浓度、硬度）→ 内核的 ResolvedBrush（resolveBrush，和画画软件同一个解析）。
 * 颜色不走这里（一笔的颜色是宿主自己递的），这里固定 #000000。
 */
export declare function resolvedBrushOf(id: BrushId, knobs: {
    readonly size: number;
    readonly opacity: number;
    readonly hardness: number;
}): ResolvedBrush;
/**
 * 这支笔的平滑：跟手、防抖都是 0（或一格一格的笔）= 不平滑（undefined，起笔不递 = 和以前一模一样）；否则 = 内核的 resolveSmooth（平滑只有这一个函数，统筹 11-12）。
 * scale = 1：三维的轨迹在屏幕上、死区本来就是屏幕像素。
 */
export declare function strokeSmoothOf(b: ResolvedBrush): {
    tau: number;
    deadzone: number;
    tailBow: number;
} | undefined;
/** 一支笔走的路（笔的模型第七节第 2 条）：这几样的组合不一样 = 出来的像素走不一样的代码，探针里各要一组。geo.by 这一版还没有。 */
export declare const pathKeyOf: (r: BrushRecord) => string;
/** 宿主认得什么（笔的模型第四节）：一支笔的每一样取值都在这张单子里 = 这里能用。 */
export interface HostCaps {
    readonly name: string;
    readonly tools: readonly BrushRecord["tool"][];
    readonly compositeModes: readonly BrushRecord["compositeMode"][];
    readonly blendModes: readonly BrushRecord["blendMode"][];
    readonly shapes: readonly BrushRecord["shape"]["kind"][];
    /** size.unit 缺 = 宿主自己的习惯，永远认得；这里列认得的显式单位。 */
    readonly sizeUnits: readonly NonNullable<BrushRecord["size"]["unit"]>[];
    readonly pixelMode: boolean;
}
/** 三维模型上的画（有表面的宿主）。这一张里所有的笔都能用（施工单二十第三节第 7 条）。按格的笔（第 2 刀）来了再把 "cell" 和 pixelMode 加上。 */
export declare const SURFACE_HOST: HostCaps;
/** 这支笔在这个宿主里能不能用：能 = null；不能 = 一句说清哪一样不认得（家规：不静默——带着不认得的取值的笔是灰的、说原因，记录原样带着）。 */
export declare function brushUnusableWhy(r: BrushRecord, host: HostCaps): string | null;
