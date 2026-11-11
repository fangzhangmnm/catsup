import type { Editor } from "../editor/editor.ts";
/** 打开这张画时显卡上固定占多少 + 画的时候再多多少。 */
export declare function memSay(n: number, h?: number): string;
/** 一格多大（米）念出来：米制下不到 1 厘米念毫米、否则念厘米；英制念英寸。 */
export declare function cellSay(m: number): string;
/** 这份文件里最近建的那张画的画布边长（贴图表里最后一张分层的画走的那一套坐标的宽）；没有 = null。 */
export declare function recentCanvas(editor: Editor): number | null;
/** 这份文件里最近建的那张画一格多大（米，按它那个物件在世界里的大小）；没有 = null（「按一格多大」那一组的「和上一张画一样」，施工单十六第四节）。 */
export declare function recentCell(editor: Editor): number | null;
/** 「按一格多大」的常用档（米；按文件的显示单位：米制 1 cm / 5 mm / 2 mm / 1 mm，英制 1/2 / 1/4 / 1/8 / 1/16 英寸）。 */
export declare function cellSteps(): readonly number[];
/** 面板上选了什么：加进已有的哪张画 / 新开一张多大的（按总大小 = canvas；按一格多大 = density，每米几格、按这个物件自己的长度）。 */
export type PaintStartChoice = {
    readonly kind: "add";
    readonly tex: string;
} | {
    readonly kind: "new";
    readonly canvas: number;
} | {
    readonly kind: "density";
    readonly density: number;
};
/**
 * 出面板、等选；取消 = null。物件已经有画、选中的面里有还没进画的（施工单十五第三节，11-11 下午改）：上面几行「加进已有的画：〈名字〉」
 * （这个物件每张画一行；用那张画自己的密度、不问大小；铺不下的灰掉写原因），下面照常五行大小 =「新开一张画」。没有画 = 只有五行大小。
 */
export declare function pickPaintStart(editor: Editor): Promise<PaintStartChoice | null>;
