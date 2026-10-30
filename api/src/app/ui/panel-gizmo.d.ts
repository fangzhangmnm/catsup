export interface PanelPos {
    left: number;
    top: number;
}
export interface Viewport {
    w: number;
    h: number;
}
/** 视口钳制（纯函数）：左右 0..vw-w；上下 topFloor..vh-h（窗比视口还大时取靠上/靠左那端）。 */
export declare function clampPanelPos(pos: PanelPos, size: Viewport, vp: Viewport, topFloor?: number): PanelPos;
/** 尺寸钳制（纯函数）：min ≤ v ≤ max（max 可为 Infinity）。 */
export declare function clampSize(v: number, min: number, max: number): number;
export interface DragOpts {
    /** 把手上哪些目标不起拖（关闭钮等）。 */
    ignore?: (target: Element) => boolean;
    topFloor?: number | (() => number);
    /** 每次移动：已钳制的 left/top（消费者写 style + 持久化）。 */
    onMove: (pos: PanelPos) => void;
    onEnd?: () => void;
}
export interface GizmoHandle {
    dispose(): void;
}
/** 标题栏拖动整窗。panel 只用来量尺寸/起点；落地全在 onMove。 */
export declare function attachPanelDrag(panel: HTMLElement, handle: HTMLElement, opts: DragOpts): GizmoHandle;
export interface ResizeOpts {
    /** 起拖时量当前尺寸（图层窗的 h = 列表高，不是面板高——语义归消费者）。 */
    getSize: () => {
        w: number;
        h: number;
    };
    min: {
        w: number;
        h: number;
    };
    /** 上限（默认：宽 = 视口右缘留 8px；高 = 无限）。每次移动现算。 */
    max?: () => {
        w: number;
        h: number;
    };
    /** 每次移动：已钳制的 w/h（消费者写 style + 持久化）。 */
    onResize: (size: {
        w: number;
        h: number;
    }) => void;
    onEnd?: () => void;
}
/** 右下角 grip 缩放。 */
export declare function attachPanelResize(panel: HTMLElement, grip: HTMLElement, opts: ResizeOpts): GizmoHandle;
