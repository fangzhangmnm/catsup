export type Tool = "select" | "line" | "rect" | "rrect" | "circle" | "arc" | "move" | "rotate" | "scale" | "transform" | "pp" | "offset" | "followme" | "paint" | "erase" | "weldErase" | "softErase" | "eraseFace" | "tape" | "axes" | "protractor" | "compass" | "knife" | "crect" | "shrink" | "walk" | "create" | "brushGrab" | "brushDraw" | "brushSmooth" | "brushFlatten";
export declare const TOOLS: readonly Tool[];
/** 橡皮家族（user 2026-10-24「加两种橡皮，橡皮的小三角可以选它们」）：橡皮 / 焊边橡皮 / 软边橡皮——左柱一格，小三角换。 */
export declare const ERASERS: readonly Tool[];
/** 软编辑笔刷（自由建模；2026-10-29 Opus 5.5，账本 UX53）：抓 / 鼓起 / 抹平 / 压平——左柱折叠组里一格，小三角换（tools/mesh-brush.ts）。 */
export declare const BRUSHES: readonly Tool[];
