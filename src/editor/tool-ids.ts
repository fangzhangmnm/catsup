// tool-ids.ts —— 工具 id 的 SSoT（从 editor.ts 搬出，0.13 刀 ①：模式模块要引用它而不引用 Editor，断掉循环 import）。
// created 2026-10-24 by Claude Fable 5.1
export type Tool = "select" | "line" | "rect" | "circle" | "arc" | "move" | "rotate" | "scale" | "pp" | "offset" | "followme" | "paint" | "erase" | "weldErase" | "softErase" | "eraseFace" | "tape" | "axes" | "protractor";
export const TOOLS: readonly Tool[] = ["select", "line", "rect", "circle", "arc", "move", "rotate", "scale", "pp", "offset", "followme", "paint", "erase", "weldErase", "softErase", "eraseFace", "tape", "axes", "protractor"];
/** 橡皮家族（user 2026-10-24「加两种橡皮，橡皮的小三角可以选它们」）：橡皮 / 焊边橡皮 / 软边橡皮——左柱一格，小三角换。 */
export const ERASERS: readonly Tool[] = ["erase", "weldErase", "softErase"];
