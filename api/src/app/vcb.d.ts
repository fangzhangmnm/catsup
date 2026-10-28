import type { Editor } from "../editor/editor.ts";
export interface VcbUi {
    render(): void;
    feedKey(ev: KeyboardEvent): boolean; /** 只读：这一下按键数值小窗要不要（和 feedKey 同一套判断，不改状态；键表 controller/keymap.ts 的 vcb 层问它）。 */
    wants(ev: {
        key: string;
        ctrl: boolean;
        alt: boolean;
    }): boolean;
}
export declare function mountVcb(root: HTMLElement, editor: Editor): VcbUi;
