import type { Editor } from "../editor/editor.ts";
export interface ToolStrip {
    render(): void;
}
export declare function mountToolStrip(root: HTMLElement, editor: Editor): ToolStrip;
