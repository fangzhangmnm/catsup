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
    confirm(title: string, message: string, okLabel: string): Promise<boolean>;
    hint(text: string): void; /** 这台设备记的开关（「同一组件合成一行」）。 */
    pref: {
        get(key: string): string | null;
        set(key: string, value: string): void;
    };
    onOpenChange?(open: boolean): void;
}): HierarchyWindow;
