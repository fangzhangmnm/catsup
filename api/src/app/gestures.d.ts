import type { Editor } from "../editor/editor.ts";
export interface GestureOpts {
    fingerDraws(): boolean;
    onUndo(): void;
    onRedo(): void;
    /** 步行模式：环绕/平移手势改成视角（返回 true = 已消费）。2026-09-07 VR 纪元 */
    look?(dxPx: number, dyPx: number): boolean;
    /** 步行模式中滚轮无意义（相机每帧由 player 写）。 */
    walking?(): boolean;
    /** 工具停摆（teleport 充能中）：不喂工具指针事件、悬停预告清掉（VR 同款，vr.ts）。 */
    toolBlocked?(): boolean;
}
export declare function attachGestures(canvas: HTMLCanvasElement, editor: Editor, opts: GestureOpts): {
    dispose(): void;
    penEverSeen(): boolean;
};
