import type { Editor } from "../editor/editor.ts";
export interface VcbUi {
    render(): void; /** 参数区（马前炮那一块）住哪：给了 el 且 accepts() = 现在这一段会话归它 → 搬进 el；null = 回右下角（指令板用，2026-10-28 Opus）。 */
    setParamsHome(el: HTMLElement | null, accepts?: () => boolean): void;
    feedKey(ev: KeyboardEvent): boolean; /** 只读：这一下按键数值小窗要不要（和 feedKey 同一套判断，不改状态；键表 controller/keymap.ts 的 vcb 层问它）。 */
    wants(ev: {
        key: string;
        ctrl: boolean;
        alt: boolean;
    }): boolean;
}
export declare function mountVcb(root: HTMLElement, editor: Editor): VcbUi;
