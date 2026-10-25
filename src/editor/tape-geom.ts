// tape-geom.ts —— 卷尺的纯几何（0.11 尺规纪元 ③，2026-10-24，Claude Fable 5.1）：起点身份 → 产物。不 import editor.ts（测试直跑 strip-types）。
import type { Pt3 } from "../kernel/kernel.ts";
import { dist3, dot3, normalize3, scale3, sub3, add3 } from "../kernel/geom.ts";
import type { Snap3, SnapKind } from "./solver.ts";

/** 与 editor.ts MIN_GESTURE_LEN 同值（那边 import 这边会把 editor 拖进测试）。 */
export const TAPE_MIN = 0.01;

/** 起点的身份：决定产物。 */
export type TapeStart = { kind: "line"; p: Pt3; dir: Pt3 } | { kind: "point"; p: Pt3 } | { kind: "measure"; p: Pt3 };
export type TapeResult = { make: "line"; p: Pt3; dir: Pt3; d: number } | { make: "point"; p: Pt3; d: number } | { make: "measure"; d: number };

/** 起点 + 第二点 → 产物（纯函数，测试面）。 */
export function tapeResult(start: TapeStart, b: Pt3): TapeResult {
  if (start.kind === "line") {
    const v = sub3(b, start.p);
    const w = sub3(v, scale3(start.dir, dot3(v, start.dir)));   // 去掉沿线分量 = 垂直偏移
    const d = Math.hypot(w.x, w.y, w.z);
    if (d < TAPE_MIN) return { make: "measure", d: 0 };
    return { make: "line", p: add3(start.p, w), dir: start.dir, d };
  }
  const d = dist3(start.p, b);
  if (start.kind === "point") return d < TAPE_MIN ? { make: "measure", d: 0 } : { make: "point", p: b, d };
  return { make: "measure", d };
}

const POINT_KINDS = new Set<SnapKind>(["endpoint", "midpoint", "intersection", "origin", "guide-point", "guide-cross", "align-combo"]);
const LINE_KINDS = new Set<SnapKind>(["on-edge", "edge-align", "on-guide"]);
/** 栅格开着时，求解器把「边上 / 参考线上」改写成落格的点（「格点 · 边上」）；调用方确认这点正落在那条边 / 参考线上才给 lineDir（D23，2026-10-25 Opus）。 */
const ON_LATTICE = new Set<SnapKind>(["grid-point", "increment"]);

/** 按吸附结果给起点定身份：边 / 参考线 → 带方向；点类 → 参考点；其余 → 只量。edgeDir / guideDir 由调用方按命中补。 */
export function classifyStart(sn: Snap3, lineDir: Pt3 | null): TapeStart {
  if (sn.kind && (LINE_KINDS.has(sn.kind) || ON_LATTICE.has(sn.kind)) && lineDir) return { kind: "line", p: sn.p, dir: normalize3(lineDir) };
  if (sn.kind && POINT_KINDS.has(sn.kind)) return { kind: "point", p: sn.p };
  return { kind: "measure", p: sn.p };
}

