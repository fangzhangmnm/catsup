import type { Vec3 } from "../minccino/index.ts";
/** 一行字的宽（em）。 */
export declare function textWidthEm(text: string): number;
/**
 * 一行字 → 线段（世界坐标，a b 成对）：左下角在 origin，往 right 排、往 up 长；em = 一个 em 多长（世界米）。
 * 折线拆成线段（辅助几何的线族吃线段）。
 */
export declare function strokeText(text: string, origin: Vec3, right: Vec3, up: Vec3, em: number): number[];
