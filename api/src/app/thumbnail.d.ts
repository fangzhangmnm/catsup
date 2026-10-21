import type { Editor } from "../editor/editor.ts";
/** 渲染分辨率 = 目标的 2 倍再区域平均（抗锯齿又省 GPU）。 */
export declare function captureThumbnail(editor: Editor): {
    mimeType: string;
    bytes: Uint8Array;
} | null;
