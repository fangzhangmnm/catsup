import type { Editor } from "../editor/editor.ts";
/** 打开这张画时显卡上固定占多少 + 画的时候再多多少。 */
export declare function memSay(n: number): string;
/** 一格多大（米）念出来：米制下不到 1 厘米念毫米、否则念厘米；英制念英寸。 */
export declare function cellSay(m: number): string;
/** 这份文件里最近建的那张画的画布边长（贴图表里最后一张分层的画走的那一套坐标的宽）；没有 = null。 */
export declare function recentCanvas(editor: Editor): number | null;
/** 面板上选了什么：加进已有的哪张画 / 新开一张多大的。 */
export type PaintStartChoice = {
    readonly kind: "add";
    readonly tex: string;
} | {
    readonly kind: "new";
    readonly canvas: number;
};
/**
 * 出面板、等选；取消 = null。物件已经有画、选中的面里有还没进画的（施工单十五第三节，11-11 下午改）：上面几行「加进已有的画：〈名字〉」
 * （这个物件每张画一行；用那张画自己的密度、不问大小；铺不下的灰掉写原因），下面照常五行大小 =「新开一张画」。没有画 = 只有五行大小。
 */
export declare function pickPaintStart(editor: Editor): Promise<PaintStartChoice | null>;
