import type { ModeId } from "../editor/mode.ts";
import type { Tool } from "../editor/tool-ids.ts";
export interface RailCtx {
    readonly mode: ModeId;
    /** 有选区（点 / 边 / 面 / 子物体）。 */
    readonly hasSelection: boolean;
    /** 手势进行中（按下没松 / 等下一点 / 键盘起手）。现在没有脸看它（见上面的规矩），留着给以后真需要的脸。 */
    readonly gesture: boolean;
}
export interface RailFace {
    /** 图标（共享图标库的 id）。 */
    readonly icon: string;
    /** 左柱上的字。 */
    readonly label: string;
    /** 悬停提示：点了做什么。 */
    readonly tip: string;
    /** 点了跑的动作（键表同一套 id）。 */
    readonly action: string;
}
interface Rule {
    readonly tool: Tool;
    readonly modes: readonly ModeId[];
    readonly when: (c: RailCtx) => boolean;
    readonly face: RailFace;
}
/** 换脸表（一行一张脸；先匹配的先用）。 */
export declare const RAIL_FACES: readonly Rule[];
/** 这一格此刻的脸（null = 平常的样子）。 */
export declare function railFace(tool: Tool, c: RailCtx): RailFace | null;
export {};
