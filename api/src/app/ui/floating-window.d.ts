import { type PanelPos } from "./panel-gizmo.ts";
export type { PanelPos } from "./panel-gizmo.ts";
export declare const TOP_DEAD_ZONE_MIN = 24;
export declare const FLOOR_GAP = 4;
export declare const EDGE_MARGIN = 8;
/** 拖把地板（纯函数）：max(安全区 + 死区底线, HUD 顶排下缘 + 间距)。hudBottom = null → 顶排不可见。 */
export declare function computeTopFloor(safeTop: number, hudBottom: number | null): number;
/** 当前拖把地板（每次现量：旋转 / 顶排显隐 / 安全区变了都准）。 */
export declare function floatingTopFloor(): number;
export interface FloatingWindowSpec {
    id: string;
    /** 拖把（标题栏）。缺省 = 不可拖。 */
    head?: HTMLElement | null;
    /** 拖把上哪些目标不起拖（关闭钮等）。 */
    ignoreDragOn?: (target: Element) => boolean;
    /** 每次拖动落点（已钳；模块已写 left / top）——调用方只管记。 */
    onMove?: (pos: PanelPos) => void;
    resize?: {
        grip: HTMLElement | null;
        min: {
            w: number;
            h: number;
        };
        onResize?: (size: {
            w: number;
            h: number;
        }) => void;
    };
    /** open / close 的回声（钮的 aria-pressed 等）。 */
    onOpenChange?: (open: boolean) => void;
    /** 藏着时量不到尺寸的兜底（恢复位置时钳用）。 */
    fallbackSize?: {
        w: number;
        h: number;
    };
}
export interface FloatingWindowHandle {
    readonly el: HTMLElement;
    readonly id: string;
    open(): void;
    close(): void;
    toggle(force?: boolean): boolean;
    isOpen(): boolean;
    raise(): void;
    /** 钳进视口（拖把不进顶边死区、不出屏）。藏着时不做。 */
    clamp(): void;
    /** 放到这个位置（钳过）；null = 回 CSS 默认位（清内联样式）。 */
    restore(pos: (PanelPos & {
        width?: number;
        height?: number;
    }) | null): void;
    dispose(): void;
}
export declare function registerFloatingWindow(el: HTMLElement, spec: FloatingWindowSpec): FloatingWindowHandle;
/** 诊断 / 探针：当前栈（id 按 z 升序）。 */
export declare function floatingWindowStack(): string[];
