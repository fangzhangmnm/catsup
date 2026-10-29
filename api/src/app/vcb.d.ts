import type { Editor } from "../editor/editor.ts";
export interface VcbUi {
    render(): void; /** 参数区（马前炮那一块）住哪：给了 el 且 accepts() = 现在这一段会话归它 → 搬进 el；null = 回右下角（指令板用，2026-10-28 Opus）。 */
    setParamsHome(el: HTMLElement | null, accepts?: () => boolean): void;
}
export declare function mountVcb(root: HTMLElement, editor: Editor): VcbUi;
