import type { DocumentSettings } from "../document.ts";
import { type UnitSystem } from "../unit-systems.ts";
export type UnitSystemId = UnitSystem;
/** 现在的形状（运行时只认它）。 */
export interface SettingsNow {
    readonly unitSystem: UnitSystemId;
    /** 吸附长度（米，> 0、有限）。 */
    readonly snapIncrement: number;
    readonly absoluteGrid: boolean;
    readonly gridPlane: "xy" | "yz" | "xz";
    /** 网格和三色轴不画。 */
    readonly gridHidden: boolean;
    /** 尺度参考勾了哪几项（现在的 id、去重；[] = 不显示）；undefined = 文件里没写 = 用默认。 */
    readonly scaleRefs?: readonly string[];
}
/**
 * 读的门口。CATSUP_document 3.4 起 unitSystem + snapIncrement 是主的；
 * 老文件没有 unitSystem → 按老键猜（制式 D&D = D&D；建筑英尺英寸制式 / 显示单位英尺英寸或英寸 = 英制；否则公制）；
 * 吸附长度坏了（不是正的有限数）→ 格距 ÷ 细分（老文件里 snapIncrement 一直 = 这个，写入时算的），也坏了 → 1 m ÷ 5。
 * 尺度参考：`scaleRefs`（数组）；没有就看 v0.13.52–56 单选时写的 `scaleRef`（字符串，"none" = 不显示）；都没有 = undefined。认不出的 id 原样留着。
 */
export declare function settingsNow(s: DocumentSettings): SettingsNow;
/**
 * 写的门口（网格那几样）：把现在的几样写进文件 settings，别的键原样留着、顺序不动；给老读者照写那几个旧键；旧的单选键 scaleRef 去掉。
 * 键的先后照 v0.19.64 及以前 editor/grid-settings.ts settingsFromGrid 那个对象的写法（写出去的 JSON 字节一样）。尺度参考那一项归 editor/scale-ref.ts scaleRefsToSettings（只管现在的键）。
 */
export declare function settingsForFile(s: DocumentSettings, now: {
    readonly absoluteGrid: boolean;
    readonly unitSystem: UnitSystemId;
    readonly snapIncrement: number;
    readonly gridPlane: "xy" | "yz" | "xz";
    readonly gridHidden: boolean;
}): DocumentSettings;
