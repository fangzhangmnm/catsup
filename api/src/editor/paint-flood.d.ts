import type { Kernel } from "../kernel/kernel.ts";
import type { FaceId } from "../kernel/kernel.ts";
import type { PaintMode } from "./tool-config.ts";
export declare function facesForPaint(k: Kernel, seed: FaceId, mode: PaintMode, sharpDeg: number): FaceId[];
