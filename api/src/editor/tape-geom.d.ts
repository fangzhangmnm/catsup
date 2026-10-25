import type { Pt3 } from "../kernel/kernel.ts";
import type { Snap3 } from "./solver.ts";
/** 与 editor.ts MIN_GESTURE_LEN 同值（那边 import 这边会把 editor 拖进测试）。 */
export declare const TAPE_MIN = 0.01;
/** 起点的身份：决定产物。 */
/** through = 起手在参考点上：出过两点的参考线、参考点留着（user 2026-10-25「有了点，再拉一次……」「好，不删点」；尺规 2.0 稿 §0）。 */
/** point 带 lines = 这个点正落在这几条边上（中点 / 端点）：拖开时按方向定——垂直离开某条边 = 平行线，顺着边 / 斜着分不清 = 点（D25）。 */
export type TapeStart = {
    kind: "line";
    p: Pt3;
    dir: Pt3;
} | {
    kind: "point";
    p: Pt3;
    lines?: Pt3[];
} | {
    kind: "through";
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
    make: "through";
    p: Pt3;
    dir: Pt3;
    d: number;
} | {
    make: "measure";
    d: number;
};
/** 起点 + 第二点 → 产物（纯函数，测试面）。 */
export declare function tapeResult(start: TapeStart, b: Pt3): TapeResult;
/** 从点起手、点在边上时：拖动的垂直成分占多少才算「要平行线」（0.8 ≈ 离边 53°；拐角沿对角线拖 = 0.71 = 分不清 → 点）。 */
export declare const PERP_FRACTION = 0.8;
/** 按吸附结果给起点定身份：边 / 参考线 → 带方向；点类 → 参考点；其余 → 只量。edgeDir / guideDir 由调用方按命中补。 */
export declare function classifyStart(sn: Snap3, lineDir: Pt3 | null, pointLines?: Pt3[]): TapeStart;
