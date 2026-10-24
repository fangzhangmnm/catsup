// tool-ids.ts —— 工具 id 的 SSoT（从 editor.ts 搬出，0.13 刀 ①：模式模块要引用它而不引用 Editor，断掉循环 import）。
// created 2026-10-24 by Claude Fable 5.1
export type Tool = "select" | "line" | "rect" | "circle" | "arc" | "move" | "rotate" | "scale" | "pp" | "offset" | "followme" | "paint" | "erase" | "eraseFace" | "tape" | "axes" | "protractor";
export const TOOLS: readonly Tool[] = ["select", "line", "rect", "circle", "arc", "move", "rotate", "scale", "pp", "offset", "followme", "paint", "erase", "eraseFace", "tape", "axes", "protractor"];
