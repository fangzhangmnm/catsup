import type { KeyContext } from "../controller/keymap.ts";
import type { Stance } from "../controller/stance.ts";
export interface MfdDeps {
    ctx(): KeyContext;
    stance(): Stance | undefined;
    /** 点了能按的芯片：按这个和弦（app 走 resolveKey → runKeyAction）。 */
    press(chord: string): void;
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
