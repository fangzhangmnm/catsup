import type { Editor } from "../editor/editor.ts";
export interface ViewGizmoOpts {
    isWalking(): boolean;
}
export interface ViewGizmo {
    render(): void;
    dispose(): void;
}
export declare function mountViewGizmo(root: HTMLElement, editor: Editor, opts: ViewGizmoOpts): ViewGizmo;
