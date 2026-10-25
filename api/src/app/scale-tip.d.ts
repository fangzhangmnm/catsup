import type { ScaleTipView } from "../editor/scale-ref.ts";
/** 「最多几条」的档（试用；这台设备记住）。 */
export declare const SCALE_TIP_MAX: readonly [3, 5, 8];
/** 提示框内容（HTML）：第一行 = 读数（加粗，最显眼）+ 原来的吸附 / 工具文字（小字跟在后面）；第二行 = 「≈ 名字 / 名字」（更小更淡）。 */
export declare function scaleTipHtml(text: string | null, view: ScaleTipView | null, max: number, measure?: string): string;
