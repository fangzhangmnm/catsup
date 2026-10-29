import type { KeyContext } from "./keymap.ts";
import type { Stance } from "./stance.ts";
/** 槽位（顺序 = 屏上从左到右，永远这个顺序）。 */
export declare const CHIP_SLOTS: readonly ["lock", "shift", "ctrl", "alt", "confirm", "cancel"];
export type ChipSlot = (typeof CHIP_SLOTS)[number];
/** 一个按键芯片：keys = 印在芯片上的键名；label = 意思；press = 点它 = 按了这个和弦（null = 不是和弦）；latch = 点它 = 锁住 / 放开这个修饰键（没键盘时）；on = 现在亮着（锁着 / 按着）。 */
export interface ChipKey {
    readonly keys: string;
    readonly label: string;
    readonly press: string | null;
    readonly latch?: "shift" | "ctrl" | "alt";
    readonly on: boolean;
}
export interface Chip {
    readonly slot: ChipSlot;
    readonly items: readonly ChipKey[];
}
/** 这一刻的实时状态（app 给；没给 = 什么都没按、没锁、有键盘）。 */
export interface ChipLive {
    /** 现在按着的修饰键。 */
    readonly held: {
        readonly shift: boolean;
        readonly ctrl: boolean;
        readonly alt: boolean;
    };
    /** 现在锁着的轴（方向键 / X Y Z；没锁 = null）。 */
    readonly axisLock: "x" | "y" | "z" | null;
    /** 现在锁着的面（Shift + 方向键；没锁 = null）。 */
    readonly planeLock: string | null;
    /** 印键名吗：键鼠 = 印；笔 / 手指的设备 = 不印、修饰键槽不出（user「ipad的时候能不能不显示键位」）。 */
    readonly keys: boolean;
    /** 指针正按在画布上（拖着没松）。 */
    readonly pressing: boolean;
    /** 没键盘时点芯片锁住的修饰键（= 一直按着）。 */
    readonly latched: {
        readonly shift: boolean;
        readonly ctrl: boolean;
        readonly alt: boolean;
    };
}
export declare const IDLE_LIVE: ChipLive;
/** 立场表那一格给人看的样子：去掉施工附注（「（…要改…）」「（…§3-3…）」「（UX35）」这种账本代号——界面不许出代号）。状态行的「按住 Shift：…」用它。 */
export declare function stanceShown(t: string): string;
/** 芯片上印的名字：给人看的样子取冒号前那段（「吸附：点 > 边 > 面」→「吸附」；user「吸附不要太长的解释，就叫吸附」）。 */
export declare function chipLabel(t: string): string;
/**
 * 这一刻的芯片（每个槽一个；这个槽现在没东西 = 不在结果里，渲染器不占位）。
 * 锁轴：这把工具吃锁、而且（手势进行中 / 已经锁着 / 对选区做事且有选区）才出——自由建模的操作工具 = X / Y / Z（UX17），别处 = 方向键 → ← ↑；字 = 键表里这个键现在的意思；锁着的那根亮。
 *   后面跟面锁 XY / YZ / XZ（自由建模 Shift+Z / X / Y，硬表面 Shift+↑ → ←；键表里这个和弦现在绑着才出），锁着的那个面亮。
 * Shift / Ctrl / Alt：立场表那一格的名字（"—" = 没有）；有键盘 = 手势进行中或正按着才出、只显示；没键盘 = 开关（latch），手势进行中 / 对选区做事 / 锁着才出。亮 = 按着或锁着。
 * 确认：镜像会话的回车。取消：等下一点 / 键盘起手 / 镜像会话（拖着没松不出）。
 */
export declare function chipsOf(c: KeyContext, stance: Stance | undefined, L?: ChipLive): Chip[];
