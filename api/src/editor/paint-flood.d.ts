import type { Kernel } from "../kernel/kernel.ts";
import type { FaceId } from "../kernel/kernel.ts";
import type { PaintMode } from "./tool-config.ts";
/** 曲面（0.10，设计稿 §4.2）：从一张面出发沿**软边**泛洪的面集 = SU 的 Surface（soft 决定成不成一张面来选，smooth 只管着色）。派生态，不存。 */
export declare function surfaceFaces(k: Pick<Kernel, "face" | "isSoft" | "graph">, seed: FaceId): FaceId[];
export declare function facesForPaint(k: Kernel, seed: FaceId, mode: PaintMode, sharpDeg: number): FaceId[];
