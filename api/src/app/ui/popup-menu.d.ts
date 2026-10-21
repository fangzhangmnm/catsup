export interface PopupMenuItem<Id extends string = string> {
    id: Id;
    label: string;
    icon?: string;
    hint?: string;
    checked?: boolean;
    disabled?: boolean;
    separatorBefore?: boolean;
}
export interface PopupMenuOpts<Id extends string = string> {
    anchor: HTMLElement;
    items: () => PopupMenuItem<Id>[];
    onPick: (id: Id) => void | "keep";
    align?: "start" | "end";
}
export interface PopupMenuHandle {
    readonly el: HTMLElement;
    close(): void;
    refresh(): void;
    isOpen(): boolean;
}
export declare function closePopupMenu(): void;
export declare function isPopupOpen(): boolean;
export declare function togglePopupMenu<Id extends string>(opts: PopupMenuOpts<Id>): PopupMenuHandle | null;
export declare function openPopupMenu<Id extends string>(opts: PopupMenuOpts<Id>): PopupMenuHandle;
