import type { Editor } from "../editor/editor.ts";
import { type PressHit } from "../controller/hard-press.ts";
export interface GestureOpts {
    /** 输入闸（第二层自检）：这一下能不能进场景。门口没吞到的（程序发的事件、以后别的输入适配器）在这里挡。 */
    admits?(source: "pointer" | "touch" | "wheel"): boolean;
    fingerDraws(): boolean;
    onUndo(): void;
    onRedo(): void;
    /** 四指轻点（Procreate 同款 = 全屏 / 藏界面；CatsUp = 一键藏起所有窗，user 10-30）。缺 = 当重做。 */
    onFourTap?(): void;
    /** 步行模式：环绕/平移手势改成视角（返回 true = 已消费）。2026-09-07 VR 纪元 */
    look?(dxPx: number, dyPx: number): boolean;
    /** 步行模式中滚轮无意义（相机每帧由 player 写）。 */
    walking?(): boolean;
    /** 这一下工具手势进行当中相机不许动（画画工作台的一笔：贴图主线 1-7「一笔进行当中视角不动」）。true = 工具指针活着时，环绕 / 平移 / 双指都不碰相机（平时「画到一半转视角」照旧）。 */
    cameraLocked?(): boolean;
    /** 工具停摆（teleport 充能中）：不喂工具指针事件、悬停预告清掉（VR 同款，vr.ts）。 */
    toolBlocked?(): boolean;
    /** 上下文菜单（#19，2026-10-21）：桌面右键（没拖成环绕）/ 触屏长按（没动）→ 在该点弹菜单。坐标 = 画布本地 + client。 */
    onContext?(x: number, y: number, clientX: number, clientY: number): void;
    /** 没键盘时点键名芯片锁住的修饰键（= 一直按着；app/mfd.ts）。 */
    latched?(): {
        shift: boolean;
        ctrl: boolean;
        alt: boolean;
    };
    /** 长按是否可用（main：只在选择工具里）。 */
    longPressEnabled?(): boolean;
    /** 「点两下 / 点三下」是否可用（缺省 = 只有鼠标）：#23 移动 / 旋转对笔和手指也开。 */
    armable?(pointerType: string): boolean;
    /** 笔的工具指针判到一次重按（hard-press.ts）：hit = 点下在哪（画布本地）；clientX / Y = 同一点的 client 坐标（笔尖闪一圈用）。同一下也带在递给编辑器的 ToolPointer.press 上。 */
    onHardPress?(hit: PressHit, clientX: number, clientY: number): void;
    /** 现在的工具是「笔轻 = 选、重 = 抓」那一族（stance.ts PEN_PRESS = grab；第七节第 6 步）。只有报压感的笔走这条。 */
    penGrab?(): boolean;
    /** 抬笔宽限（ms；设计稿第三节）：现在的工具用重按时 > 0。报压感的笔抬起先等这么久，其间又落下 = 当没断过；过了才交给编辑器（带 lift）。缺 / 0 = 不等。 */
    liftGraceMs?(): number;
}
export declare function attachGestures(canvas: HTMLCanvasElement, editor: Editor, opts: GestureOpts): {
    dispose(): void;
    penEverSeen(): boolean;
};
