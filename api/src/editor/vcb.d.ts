import type { Pt3 } from "../kernel/geom.ts";
import type { Xform } from "../scene/xform.ts";
export type LengthUnit = "m" | "cm" | "mm";
export interface VcbCtx {
    unit: LengthUnit;
}
/** 数值小窗作用的那一步属于哪类手势（决定怎么读输入）。 */
export type VcbKind = "line" | "rect" | "circle" | "pp" | "offset" | "move" | "rotate" | "scale";
export type VcbValue = {
    kind: "length";
    m: number;
} | {
    kind: "dims";
    a: number;
    b: number;
} | {
    kind: "angle";
    deg: number;
} | {
    kind: "factor";
    f: number[];
} | {
    kind: "segments";
    n: number;
} | {
    kind: "array";
    mode: "x" | "/";
    n: number;
};
/** 解析输入。失败 → { error }。 */
export declare function parseVcb(textIn: string, kind: VcbKind, ctx: VcbCtx): VcbValue | {
    error: string;
};
/** 阵列：x = 外部阵列（共 n 份，第 k 份在 k·delta）；/ = 内分（n 份匀布在 0..delta 之间，第 k 份在 k·delta/n）。 */
export declare function arrayTranslations(delta: Pt3, mode: "x" | "/", n: number): Xform[];
/** 旋转阵列（同上，角度版）。 */
export declare function arrayRotations(center: Pt3, axis: Pt3, angle: number, mode: "x" | "/", n: number): Xform[];
/** 小窗旁的提示字：这一步能输什么。 */
export declare function vcbPrompt(kind: VcbKind | null): string;
/** 长度显示（小窗回显用）：按 ctx.unit。 */
export declare function fmtVcbLength(m: number, unit: LengthUnit): string;
