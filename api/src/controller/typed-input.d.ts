import { type QuantityTag } from "../editor/units.ts";
export type TypedTarget = "gesture" | "vcb";
export interface TypedInputDeps {
    /** 手势进行中且这把工具收数 → 收什么量；否则 null。 */
    gestureQuantity(): QuantityTag | null;
    /** 刚做完一步、数值小窗能改它。 */
    vcbOpen(): boolean;
}
export interface TypedEvent {
    kind: "change" | "confirm" | "cancel";
    target: TypedTarget;
    text: string;
}
export interface TypedInput {
    /** 现在字往哪去（null = 没人收）。 */
    target(): TypedTarget | null;
    text(): string;
    /** 这一下按键归不归打字（键表层问它；不改状态）。 */
    wants(key: string, mods?: {
        ctrl?: boolean;
        alt?: boolean;
        meta?: boolean;
    }): boolean;
    /** 打一个键（键盘 / 小键盘共用）：true = 收了。 */
    feed(key: string): boolean;
    /** 小键盘的字面（⌫ / 清空 / ↵ / 空格 / 别的 = 字）。 */
    press(glyph: string): void;
    clear(): void;
    /** 现状可能变了（手势开始 / 结束、一步做完 / 下一步开始）：去向变了就清字。 */
    sync(): void;
    subscribe(cb: (e: TypedEvent) => void): () => void;
}
export declare function createTypedInput(d: TypedInputDeps): TypedInput;
