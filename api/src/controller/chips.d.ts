import type { KeyContext } from "./keymap.ts";
import type { Stance } from "./stance.ts";
/** 槽位（顺序 = 屏上从左到右，永远这个顺序）。 */
export declare const CHIP_SLOTS: readonly ["lock", "shift", "ctrl", "alt", "confirm", "cancel"];
export type ChipSlot = (typeof CHIP_SLOTS)[number];
/** 一个按键芯片：keys = 印在芯片上的键名；label = 意思；press = 触屏上点它 = 按了这个和弦（null = 只显示：修饰键要按住，点一下没有意义）。 */
export interface ChipKey {
    readonly keys: string;
    readonly label: string;
    readonly press: string | null;
}
export interface Chip {
    readonly slot: ChipSlot;
    readonly items: readonly ChipKey[];
}
/**
 * 这一刻的芯片（每个槽一个；这个槽现在没东西 = 不在结果里，渲染器照样占位）。
 * 锁轴：这把工具吃锁才有——自由建模的操作工具 = X / Y / Z（UX17），别处 = 方向键 → ← ↑；字 = 键表里这个键现在的意思。
 * Shift / Ctrl / Alt：立场表那一格（"—" = 没有）。确认：镜像会话的回车。取消：手势进行中 / 镜像会话的 Esc。
 */
export declare function chipsOf(c: KeyContext, stance: Stance | undefined): Chip[];
