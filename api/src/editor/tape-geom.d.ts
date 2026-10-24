import type { Pt3 } from "../kernel/kernel.ts";
import type { Snap3 } from "./solver.ts";
/** 与 editor.ts MIN_GESTURE_LEN 同值（那边 import 这边会把 editor 拖进测试）。 */
export declare const TAPE_MIN = 0.01;
/** 起点的身份：决定产物。 */
export type TapeStart = {
    kind: "line";
    p: Pt3;
    dir: Pt3;
} | {
    kind: "point";
    p: Pt3;
} | {
    kind: "measure";
    p: Pt3;
};
export type TapeResult = {
    make: "line";
    p: Pt3;
    dir: Pt3;
    d: number;
} | {
    make: "point";
    p: Pt3;
    d: number;
} | {
    make: "measure";
    d: number;
};
/** 起点 + 第二点 → 产物（纯函数，测试面）。 */
export declare function tapeResult(start: TapeStart, b: Pt3): TapeResult;
/** 按吸附结果给起点定身份：边 / 参考线 → 带方向；点类 → 参考点；其余 → 只量。edgeDir / guideDir 由调用方按命中补。 */
export declare function classifyStart(sn: Snap3, lineDir: Pt3 | null): TapeStart;
