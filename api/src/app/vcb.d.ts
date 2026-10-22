import type { Editor } from "../editor/editor.ts";
export interface VcbUi {
    render(): void;
    feedKey(ev: KeyboardEvent): boolean;
}
export declare function mountVcb(root: HTMLElement, editor: Editor): VcbUi;
