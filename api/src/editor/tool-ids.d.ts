export type Tool = "select" | "line" | "rect" | "rrect" | "circle" | "arc" | "move" | "rotate" | "scale" | "transform" | "pp" | "offset" | "followme" | "paint" | "erase" | "weldErase" | "softErase" | "eraseFace" | "tape" | "axes" | "protractor" | "compass" | "knife" | "crect";
export declare const TOOLS: readonly Tool[];
/** 橡皮家族（user 2026-10-24「加两种橡皮，橡皮的小三角可以选它们」）：橡皮 / 焊边橡皮 / 软边橡皮——左柱一格，小三角换。 */
export declare const ERASERS: readonly Tool[];
