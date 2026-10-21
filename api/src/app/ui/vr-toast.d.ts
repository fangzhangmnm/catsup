import type { NoticeLevel } from "./notice.ts";
export declare const TOAST_PX: {
    readonly w: 1024;
    readonly h: 176;
};
/** 面板世界尺寸（米）：挂在相机前 1.2 m、下 0.30 m 处约占视野下沿一条字幕 */
export declare const TOAST_M: {
    readonly w: 0.9;
    readonly h: number;
};
/** 烤一张字幕（最多两行，超出截断加 …）。 */
export declare function bakeToast(text: string, level?: NoticeLevel): HTMLCanvasElement;
