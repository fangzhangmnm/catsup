import type { Pt3 } from "../kernel/kernel.ts";
/** 交货的身份：和 scripts/pull-size-ladder.mjs 钉的同一个（test/scale-ref.test.ts 核三处一致）。 */
export declare const LADDER_SHA256 = "e161c8835a16024192b6206fe0ca977aa8b472f7f7981039ca15a11e6b5f278f";
export declare const LADDER_URL = "vendor/size-ladder/ladder-v3.json";
export type Lang = "zh" | "en" | "ja";
export type ScaleDir = "up" | "flat" | "both" | "plan";
export interface Orientation {
    verticalWithinDeg: number;
    horizontalWithinDeg: number;
    planNormalWithinDeg: number;
}
/** 梯子 JSON（schema size-ladder/3）；形状归仓鼠的数据契约，这里只点名用到的几个字段。 */
export interface Ladder {
    schema: string;
    version: number;
    orientation: Orientation;
    tooltipMax: number;
    starWorlds: string[];
    menu: {
        id: string;
        theme: string;
        view: string;
        names: Record<Lang, string>;
        inherits?: string[];
        reminders?: string[];
    }[];
    reminders: ({
        id: string;
    } & Record<Lang, string>)[];
    concepts: {
        id: string;
        themes: string[];
    }[];
    values: {
        concept: string;
        regions: string[] | "*";
        value: number;
    }[];
    [k: string]: unknown;
}
export interface ScaleQuery {
    reading: number;
    dir: ScaleDir;
}
/** 长度读数的方向（v = 量的那根向量，up = 上下文帧的 z）：离竖直 ≤ verticalWithinDeg = 竖；离水平 ≤ horizontalWithinDeg = 横；其余 = 斜；零向量 = null。 */
export declare function lengthDir(v: Pt3, up: Pt3, o: Orientation): "up" | "flat" | "both" | null;
/** 面积读数的方向（normal = 面的法向）：法向离上下文帧的 z ≤ planNormalWithinDeg = 平面（地板 / 场地）；墙面这类 = null（数据里的面积都是平面的）。 */
export declare function areaDir(normal: Pt3, up: Pt3, o: Orientation): "plan" | null;
/** 界面语言 → 「本地」是哪几个地区（user：中文 → 中国的，日文 → 日本的，英文 → 美欧的）。 */
export declare function localWorlds(lang: Lang): string[];
/** 按界面语言滤过地标的梯子：地标题材的值只留世界级（regions = "*"）和本地的；别的值原样。按 (梯子, 语言) 缓存。 */
export declare function forLanguage(L: Ladder, lang: Lang): Ladder;
/** tooltip（只管「认」）：前 tooltipMax 个短名，「 / 」隔开；没有 = ""。 */
export declare function scaleTooltip(L: Ladder, subs: readonly string[], q: ScaleQuery, lang?: Lang): string;
export declare const scaleMenu: (L: Ladder) => Ladder["menu"];
/** 懒加载（订阅了才拉）；失败了下次再试。 */
export declare function loadLadder(fetchImpl?: typeof fetch): Promise<Ladder>;
/** 工具交来的原始几何（世界系）；方向和挑哪个数由 readingOf 定，工具不管。 */
export type ScaleGeom = {
    kind: "length";
    vec: Pt3;
} | {
    kind: "rect";
    u: Pt3;
    v: Pt3;
    normal: Pt3;
} | {
    kind: "circle";
    radius: number;
    normal: Pt3;
};
/** 读数 + 方向（user 定：矩形平放 = 面积、竖着 = 竖边的高、斜的不配；圆 = 直径，平放 = 横、别的 = 斜）。null = 不配参考。 */
export declare function readingOf(g: ScaleGeom, up: Pt3, o: Orientation): ScaleQuery | null;
/** 提示框里的一个名字：strength = 读数离它典型值多近（1 = 正好在典型值，0 = 在合理范围边上，对数尺）；hit = 规格点进了范围。 */
export interface ScaleTipItem {
    name: string;
    strength: number;
    hit: boolean;
    shape: "point" | "band";
    value: number;
    lo: number;
    hi: number;
}
export interface ScaleTipView {
    reading: number;
    dir: ScaleDir;
    items: ScaleTipItem[];
}
/** 读数在合理范围 [lo, hi] 里离典型值 value 多近（对数尺，0..1）。 */
export declare function closeness(reading: number, value: number, lo: number, hi: number): number;
export declare function frozenLadder(L: Ladder, subs: readonly string[], lang?: Lang): Ladder;
/** 提示框的数据：候选（读数落在合理范围里的全部）按名字去重，按挑选优先排好（评级高的先、同级离典型值近的先）；宿主按「最多几条」截、截下来再按深浅排。没订阅 = null。 */
export declare function scaleTipView(L: Ladder, subs: readonly string[], q: ScaleQuery, lang?: Lang): ScaleTipView | null;
/** 新文件 / 没存过这项的旧文件默认勾哪几项（user「默认室内加室外」）。 */
export declare const DEFAULT_SCALE_REFS: readonly string[];
/** 文件 settings：`scaleRefs`（数组；[] = 不显示）；没写 = 默认。v0.13.52–56 单选时写的 `scaleRef`（字符串，"none" = 不显示）照样读。认不出的 id 原样留着（不显示）。 */
export declare function scaleRefsFromSettings(s: {
    scaleRefs?: unknown;
    scaleRef?: unknown;
}): string[];
/** 写回：默认不写键（默认文档字节不变，同 gridPreset）；旧的单选键 scaleRef 不再写。 */
export declare function scaleRefsToSettings<T extends object>(s: T, refs: readonly string[]): T & {
    scaleRefs?: string[];
};
/** 「新手提醒」（数据里 reminders；界面名 user 2026-10-25 定）：每个选单项给哪几条写在数据里（menu[].reminders，已并上继承来的），
 *  勾了几项 = 几项的提醒并起来、同一条只出一次（先勾的在前）。 */
export declare function remindersFor(L: Ladder, subs: readonly string[], lang?: Lang): {
    id: string;
    text: string;
}[];
