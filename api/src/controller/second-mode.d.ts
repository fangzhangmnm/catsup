import type { ModeId } from "../editor/mode.ts";
import type { Tool } from "../editor/tool-ids.ts";
export type SecondMode = {
    readonly kind: "option";
    readonly modes: readonly ModeId[];
    readonly key: string;
    readonly alt: string | true;
    readonly badge: string;
    readonly name: string;
    readonly mod: "Ctrl" | "Shift";
} | {
    readonly kind: "swap";
    readonly modes: readonly ModeId[];
    readonly to: Tool;
};
export declare const SECOND_MODES: Partial<Record<Tool, readonly SecondMode[]>>;
/** 这个工作台里这把工具的另一种做法（没有 = null）。 */
export declare function secondModeOf(tool: Tool, mode: ModeId): SecondMode | null;
/** 现在是不是在另一种做法上（选项值 = alt）。 */
export declare const onSecond: (sm: SecondMode | null, value: unknown) => boolean;
/** 切一下以后的选项值：开关 = 取反；两档的 enum = 另一档（values = 选项表那一项的档位）。 */
export declare function flippedValue(sm: Extract<SecondMode, {
    kind: "option";
}>, value: unknown, values?: readonly {
    id: string;
}[]): string | boolean;
