import { type PopupMenuItem, type PopupMenuOpts } from "./popup-menu.ts";
import { type PanelPos } from "./floating-window.ts";
/** 第一次开的默认位置：start / end = 在钮下面、左 / 右对齐；beside = 在它（一整列挂件）的左边、after = 在它的右边，都顶对齐——不盖住它。 */
export type Align = "start" | "end" | "beside" | "after";
export type MenuSpec<Id extends string> = Pick<PopupMenuOpts<Id>, "items" | "onPick" | "tabs" | "tabKey">;
export interface MenuWindowSpec<Id extends string> {
    /** 窗的身份（位置按它记；探针按 data-win 找）。 */
    id: string;
    title: string;
    /** 菜单（每次刷新现取：页签可能跟现状变，比如修复页只在硬表面体里有）。 */
    menu: () => MenuSpec<Id>;
    /** 位置记在哪（CatsUp = 这台设备）。null = 没记过 → 第一次开挨着钮。 */
    store: {
        get(id: string): PanelPos | null;
        set(id: string, pos: PanelPos): void;
    };
    /** 开关的回声（钮的按下态）。 */
    onOpenChange?(open: boolean): void;
}
export interface MenuWindowHandle {
    /** 开（开着 = 置顶）；tab = 直接停在这一页；anchor = 第一次开挨着谁。 */
    open(anchor: HTMLElement, align?: Align, tab?: string): void;
    /** 开着 = 关，关着 = 开。 */
    toggle(anchor: HTMLElement, align?: Align): void;
    close(): void;
    isOpen(): boolean;
    /** 现状可能变了：内容变了才重画。force = 从这扇窗里开出来的下拉自己要求的（下拉开着也重画，摘要跟着变）；不给 = 界面例行刷新（下拉开着就先不动，免得抽掉正在用的下拉）。 */
    refresh(force?: boolean): void;
    readonly el: HTMLElement;
}
/** 一扇带标题栏的浮窗（内容随调用方放：菜单窗 = 下面的 createMenuWindow；步行设置 = 参数区搬进来）。 */
export interface FloatWin {
    readonly el: HTMLElement;
    /** 内容区（标题栏下面，自己滚）。 */
    readonly body: HTMLElement;
    /** 开（开着 = 置顶）；第一次开挨着 anchor 摆（之后按记下的位置）。 */
    open(anchor: HTMLElement, align?: Align): void;
    close(): void;
    toggle(anchor: HTMLElement, align?: Align): void;
    isOpen(): boolean;
    /** 内容变了：重钳回屏。 */
    clamp(): void;
    /** 换标题字（标题是下拉的窗：换页时调）。 */
    setTitle(text: string): void;
}
/** 标题 = 下拉（user 10-30「两个大按钮太占地方了。我想的是窗口名字就是下拉」）：点标题弹这张表（换页 / 换内容），标题本身不拖窗。 */
export interface TitleMenu {
    items(): PopupMenuItem<string>[];
    onPick(id: string): void;
}
export declare function createFloatWin(spec: {
    id: string;
    title: string;
    store: MenuWindowSpec<string>["store"];
    onOpenChange?(open: boolean): void;
    bodyClass?: string;
    bodyRole?: string;
    titleMenu?: TitleMenu;
}): FloatWin;
export declare function createMenuWindow<Id extends string>(spec: MenuWindowSpec<Id>): MenuWindowHandle;
