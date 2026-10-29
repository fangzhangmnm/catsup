import type { Pt3 } from "../kernel/kernel.ts";
import type { OverlayLabel } from "../minccino/index.ts";
type LabelAnchor = NonNullable<OverlayLabel["anchor"]>;
type LabelStyleId = OverlayLabel["style"];
export interface WorldLabel {
    /** 稳定身份（同一个 id = 同一块字，挪位置不重画）。 */
    id: string;
    text: string;
    /** 世界坐标。 */
    at: Pt3;
    style: LabelStyleId;
    anchor?: LabelAnchor;
    /** 和点之间留几 CSS px（默认 3）。 */
    gapPx?: number;
    /** 被模型挡住时藏起来（默认 true）；false = 永远在最上面。 */
    occlude?: boolean;
}
/** 单位刻度（X 轴 +1 个单位处的字 + Z 轴刻度的间距）：公制念「1 m」，英制念「1 ft」。 */
export declare function unitMark(unit: string): {
    unitM: number;
    label: string;
};
/**
 * 一格有多大的字（DT16，user 10-25「1m的标记没有跟着格子的大小更新」）：X 轴上那个小标记放在一格处、写一格的长度。
 * 米制按大小挑 m / cm / mm；英制整英尺写「n ft」、不到一英尺写英寸、其余写英尺英寸（格子按米设、单位却是英尺时照实写，比如 1 m = 3' 3.38"）。
 */
export declare function gridStepLabel(stepM: number, unit: string): string;
export {};
