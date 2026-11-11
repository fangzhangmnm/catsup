// tool-ids.ts —— 工具 id 的 SSoT（从 editor.ts 搬出，0.13 刀 ①：模式模块要引用它而不引用 Editor，断掉循环 import）。
// created 2026-10-24 by Claude Fable 5.1
export type Tool = "select" | "line" | "rect" | "rrect" | "circle" | "arc" | "move" | "rotate" | "scale" | "transform" | "pp" | "offset" | "followme" | "paint" | "erase" | "weldErase" | "softErase" | "eraseFace" | "tape" | "axes" | "protractor" | "compass" | "knife" | "crect" | "shrink" | "walk" | "create" | "brushGrab" | "brushDraw" | "brushSmooth" | "brushFlatten" | "paintPen" | "paintEraser" | "eyedrop";   // shrink = 自由建模的沿法线移动（Blender Shrink / Fatten，Alt+S / Alt+W；不进左柱）   // knife = 自由建模的刀（2026-10-27 Opus 5.5）
export const TOOLS: readonly Tool[] = ["select", "line", "rect", "rrect", "circle", "arc", "move", "rotate", "scale", "transform", "pp", "offset", "followme", "paint", "erase", "weldErase", "softErase", "eraseFace", "tape", "axes", "protractor", "compass", "knife", "crect", "shrink", "walk", "create", "brushGrab", "brushDraw", "brushSmooth", "brushFlatten", "paintPen", "paintEraser", "eyedrop"];
/** 橡皮家族（user 2026-10-24「加两种橡皮，橡皮的小三角可以选它们」）：橡皮 / 焊边橡皮 / 软边橡皮——左柱一格，小三角换。 */
export const ERASERS: readonly Tool[] = ["erase", "weldErase", "softErase"];
// walk = 「验证」工作台的步行（2026-10-28 Opus 5.5；工具本身不动几何：选它 = 进放置，app 层 locomotion 接手）
// create = 自由建模的「新建」（2026-10-28 Opus 5.5；纪元账本 FM182：拖出来新建，点一下 = 马前炮尺寸，马后炮可改；和右键「新建 ›」同一条 Editor.addPrimitive）
/** 软编辑笔刷（自由建模；2026-10-29 Opus 5.5，账本 UX53）：抓 / 鼓起 / 抹平 / 压平——左柱折叠组里一格，小三角换（tools/mesh-brush.ts）。 */
export const BRUSHES: readonly Tool[] = ["brushGrab", "brushDraw", "brushSmooth", "brushFlatten"];
/** 画画工作台（贴图主线 1-7，2026-11-11 Opus 5.5）：笔 / 橡皮 / 吸管。工具本身不碰几何：按下 / 拖 / 松手经 ToolCtx.paint 交给宿主的画画控制器（app/paint-workbench.ts）。 */
export const PAINT_TOOLS: readonly Tool[] = ["paintPen", "paintEraser", "eyedrop"];
/** 只读工具（user 11-05「只读工具比如walk之类的应该全量可以的」）：演示锁里照常拿、照常用。选择 / 走路不碰模型；卷尺 / 量角器照量，读数看得到，落定时的参考线被提交口拒（不留线）。 */
export const READ_ONLY_TOOLS: readonly Tool[] = ["select", "walk", "tape", "protractor"];
export const isReadOnlyTool = (t: Tool): boolean => READ_ONLY_TOOLS.includes(t);
