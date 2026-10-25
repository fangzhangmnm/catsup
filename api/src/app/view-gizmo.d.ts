import type { Editor } from "../editor/editor.ts";
export interface ViewGizmoOpts {
    isWalking(): boolean; /** 透视 / 平行切了（宿主刷新菜单勾选之类）。 */
    onProjection?(): void;
}
export interface ViewGizmo {
    render(): void;
    dispose(): void;
}
export declare function mountViewGizmo(root: HTMLElement, editor: Editor, opts: ViewGizmoOpts): ViewGizmo;
