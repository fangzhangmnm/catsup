import type { EpsSet } from "./pointer-frame.ts";
/** 上一个吸附目标的放手容差：有这一帧的度量（VR / 新指针帧）用它，没有 = 桌面像素表 × 视口高 / 800。 */
export declare function snapHoldTol(kind: string, eps: EpsSet | null | undefined, viewH: number): number;
