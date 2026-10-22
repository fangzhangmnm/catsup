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
    /** 上下文菜单（#19，2026-10-21）：桌面右键（没拖成环绕）/ 触屏长按（没动）→ 在该点弹菜单。坐标 = 画布本地 + client。 */
    onContext?(x: number, y: number, clientX: number, clientY: number): void;
    /** 长按是否可用（main：只在选择工具里）。 */
    longPressEnabled?(): boolean;
    /** 「点两下 / 点三下」是否可用（缺省 = 只有鼠标）：#23 移动 / 旋转对笔和手指也开。 */
    armable?(pointerType: string): boolean;
}
export declare function attachGestures(canvas: HTMLCanvasElement, editor: Editor, opts: GestureOpts): {
    dispose(): void;
    penEverSeen(): boolean;
};
