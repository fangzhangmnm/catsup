import { type PopupMenuItem } from "./popup-menu.ts";
export interface BareFloatWinSpec {
    /** 窗的身份（探针按 data-win 找）。 */
    id: string;
    /** 给读屏和圆钮的 title。 */
    label: string;
    /** 左上圆钮 / 收起后那颗的图标（图标库的名字）。 */
    icon: string;
    /** 「…」菜单（每次打开现取）。 */
    more?: {
        items(): PopupMenuItem<string>[];
        onPick(id: string): void | "keep";
    };
    /** 最小宽高。 */
    min: {
        w: number;
        h: number;
    };
    /** 第一次打开放哪：anchor（缺省）= 挨着钮；left = 靠左、让开左边的工具柱（跟着选中的东西变的面板，不是一块视图——user 11-12「画布小窗应该放在左侧而不是右侧？因为是context aware panel，不是viewport」）。 */
    firstSide?: "anchor" | "left";
    onOpenChange?(open: boolean): void;
}
export interface BareFloatWin {
    readonly el: HTMLElement;
    /** 内容区（贴满整扇窗）。 */
    readonly body: HTMLElement;
    /** 开（开着 = 置顶）；第一次开挨着 anchor 摆（右对齐、在它下面）。 */
    open(anchor: HTMLElement): void;
    close(): void;
    toggle(anchor: HTMLElement): void;
    isOpen(): boolean;
    collapsed(): boolean;
    setCollapsed(on: boolean): void;
}
/** 屏底被占掉的高度：底部抽屉（styles.css --drawer-h）和软键盘（visualViewport 盖不到的那一截），取大的。 */
export declare function screenBottomFloor(): number;
export declare function createBareFloatWin(spec: BareFloatWinSpec): BareFloatWin;
