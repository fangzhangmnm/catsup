import type { Editor } from "../editor/editor.ts";
export interface SelGrowBar {
    show(at: {
        x: number;
        y: number;
    } | null): void;
    sync(): void;
}
export declare function mountSelGrowBar(canvas: HTMLElement, editor: Editor, after: () => void): SelGrowBar;
