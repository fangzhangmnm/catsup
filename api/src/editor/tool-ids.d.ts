export type Tool = "select" | "line" | "rect" | "rrect" | "circle" | "arc" | "move" | "rotate" | "scale" | "transform" | "pp" | "offset" | "followme" | "paint" | "erase" | "weldErase" | "softErase" | "eraseFace" | "tape" | "axes" | "protractor" | "compass" | "knife" | "crect" | "shrink" | "walk" | "create" | "brushGrab" | "brushDraw" | "brushSmooth" | "brushFlatten" | "paintPen" | "paintEraser" | "eyedrop" | "paintBucket";
export declare const TOOLS: readonly Tool[];
/** 橡皮家族（user 2026-10-24「加两种橡皮，橡皮的小三角可以选它们」）：橡皮 / 焊边橡皮 / 软边橡皮——左柱一格，小三角换。 */
export declare const ERASERS: readonly Tool[];
/** 软编辑笔刷（自由建模；2026-10-29 Opus 5.5，账本 UX53）：抓 / 鼓起 / 抹平 / 压平——左柱折叠组里一格，小三角换（tools/mesh-brush.ts）。 */
export declare const BRUSHES: readonly Tool[];
/** 画画工作台（贴图主线 1-7，2026-11-11 Opus 5.5）：笔 / 橡皮 / 吸管。工具本身不碰几何：按下 / 拖 / 松手经 ToolCtx.paint 交给宿主的画画控制器（app/paint-workbench.ts）。 */
export declare const PAINT_TOOLS: readonly Tool[];
/** 手上拿的是画画的工具吗（这三把只在画画工作台里有：app 层问「在画画吗」就问这一句，不按工作台的名字分叉——棘轮 test/app-mode-branch-ratchet.test.ts）。 */
export declare const isPaintTool: (t: string) => boolean;
/** 手上拿的是画画的笔或橡皮（有大小 / 浓度 / 硬度的那两把）。 */
export declare const paintPenOf: (t: string) => "paintPen" | "paintEraser" | null;
/** 只读工具（user 11-05「只读工具比如walk之类的应该全量可以的」）：演示锁里照常拿、照常用。选择 / 走路不碰模型；卷尺 / 量角器照量，读数看得到，落定时的参考线被提交口拒（不留线）。 */
export declare const READ_ONLY_TOOLS: readonly Tool[];
export declare const isReadOnlyTool: (t: Tool) => boolean;
