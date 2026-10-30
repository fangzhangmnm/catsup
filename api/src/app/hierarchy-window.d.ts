import type { Editor } from "../editor/editor.ts";
import { type MenuWindowSpec } from "./ui/menu-window.ts";
import type { HudModel } from "./ui/hud-model.ts";
export interface HierarchyWindow {
    toggle(anchor: HTMLElement): void;
    isOpen(): boolean;
    refresh(): void;
}
export declare function createHierarchyWindow(editor: Editor, hud: HudModel, deps: {
    store: MenuWindowSpec<string>["store"];
    after(): void;
    onOpenChange?(open: boolean): void;
}): HierarchyWindow;
