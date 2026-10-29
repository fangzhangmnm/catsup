import { type ChipLive } from "../controller/chips.ts";
import type { KeyContext } from "../controller/keymap.ts";
import type { Stance } from "../controller/stance.ts";
export interface MfdDeps {
    ctx(): KeyContext;
    stance(): Stance | undefined;
    /** 这一刻：按着哪些修饰键、锁着哪根轴 / 哪个面、印不印键名。 */
    live(): ChipLive;
    /** 点了能按的芯片：按这个和弦（app 走 resolveKey → runKeyAction）。 */
    press(chord: string): void;
    /** 点了修饰键开关（没键盘时）：锁住 / 放开。 */
    latch(m: "shift" | "ctrl" | "alt"): void;
    /** 这台设备收起了吗（电脑上）。 */
    collapsed(): boolean;
    setCollapsed(on: boolean): void;
    /** 笔 / 手指的设备：不许收。 */
    touchy(): boolean;
}
export interface Mfd {
    render(): void;
}
export declare function mountMfd(parent: HTMLElement, d: MfdDeps): Mfd;
