import type { KeyContext } from "./keymap.ts";
import type { Stance } from "./stance.ts";
/** 槽位（顺序 = 屏上从左到右，永远这个顺序）。 */
export declare const CHIP_SLOTS: readonly ["shift", "ctrl", "alt", "confirm", "finish", "cancel"];
export type ChipSlot = (typeof CHIP_SLOTS)[number];
/** 一个按键芯片：keys = 印在芯片上的键名；label = 意思；press = 点它 = 按了这个和弦（null = 不是和弦）；latch = 点它 = 锁住 / 放开这个修饰键（没键盘时）；on = 现在亮着（锁着 / 按着）。 */
export interface ChipKey {
    readonly keys: string;
    readonly label: string;
    readonly press: string | null;
    readonly latch?: "shift" | "ctrl" | "alt";
    readonly on: boolean; /** 点它 = 这个动作（不是按某个键）：finish = 编辑器的「收」（W-7）。 */
    readonly act?: "finish"; /** 实心（主要的动作）。 */
    readonly solid?: boolean;
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
    /** 印键名吗：键鼠 = 印；笔 / 手指的设备 = 不印、修饰键槽不出（user「ipad的时候能不能不显示键位」）。 */
    readonly keys: boolean;
    /** 指针正按在画布上（拖着没松）。 */
    readonly pressing: boolean;
    /** 「收」那颗钮的字（编辑器 finishLabel：声明了 sameSpotEnds 的工具定了点、在等下一点时 =「收笔」「收刀」；不是这时候 = null；W-7）。 */
    readonly finish: string | null;
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
 * （锁轴 / 面锁不在这里了：右上角那三行，白模 W-6。）
 * Shift / Ctrl / Alt：立场表那一格的名字（"—" = 没有）；有键盘 = 手势进行中或正按着才出、只显示；没键盘 = 开关（latch），手势进行中 / 对选区做事 / 点住了才出。亮 = 按着或点住了。
 * 确认：镜像会话的回车。收（W-7，2026-11-10）：画线 / 刀定了点、在等下一点时（拖着没松不出）；实心，点它 = 和「同一处再点一下」同一条路（做成的留着，不是取消）。
 * 取消：等下一点 / 键盘起手 / 镜像会话（拖着没松不出）。
 */
export declare function chipsOf(c: KeyContext, stance: Stance | undefined, L?: ChipLive): Chip[];
