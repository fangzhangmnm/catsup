import type { Editor } from "../editor/editor.ts";
import type { LeftDial } from "./left-dial.ts";
/** 拉到最近的档位上（滑条 / [ ] 键 / 打数共用）。 */
export declare const niceRadius: (v: number) => number;
/** [ ] 键 / ↑ ↓：下一档 / 上一档（按档位走，不是乘 1.2——跳的数也是整数）。 */
export declare const stepRadius: (r: number, dir: 1 | -1) => number;
export interface SoftSlider {
    render(): void;
    ring(c: {
        x: number;
        y: number;
        r: number;
    } | null): void;
    flash(): void;
}
/** 软选择半径 = 左栏 dial 的第一格（left-dial.ts；以后的不透明度 / 取样钮排在它下面）+ 画布上的半径圈。 */
export declare function mountSoftSlider(dial: LeftDial, stage: HTMLElement, canvas: HTMLElement, editor: Editor, deps: {
    visible(): boolean;
    selectionScreenCenter(): {
        x: number;
        y: number;
    } | null;
}): SoftSlider;
