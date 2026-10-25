// tape-geom.ts —— 卷尺的纯几何（0.11 尺规纪元 ③，2026-10-24，Claude Fable 5.1）：起点身份 → 产物。不 import editor.ts（测试直跑 strip-types）。
import type { Pt3 } from "../kernel/kernel.ts";
import { dist3, dot3, normalize3, scale3, sub3, add3 } from "../kernel/geom.ts";
import type { Snap3, SnapKind } from "./solver.ts";

/** 与 editor.ts MIN_GESTURE_LEN 同值（那边 import 这边会把 editor 拖进测试）。 */
export const TAPE_MIN = 0.01;

/** 起点的身份：决定产物。 */
/** through = 起手在参考点上：出过两点的参考线、参考点留着（user 2026-10-25「有了点，再拉一次……」「好，不删点」；尺规 2.0 稿 §0）。 */
/** point 带 lines = 这个点正落在这几条边上（中点 / 端点）：拖开时按方向定——垂直离开某条边 = 平行线，顺着边 / 斜着分不清 = 点（D25）。 */
export type TapeStart = { kind: "line"; p: Pt3; dir: Pt3 } | { kind: "point"; p: Pt3; lines?: Pt3[] } | { kind: "through"; p: Pt3 } | { kind: "measure"; p: Pt3 };
export type TapeResult = { make: "line"; p: Pt3; dir: Pt3; d: number } | { make: "point"; p: Pt3; d: number } | { make: "through"; p: Pt3; dir: Pt3; d: number } | { make: "measure"; d: number };

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
  if (start.kind === "through") return d < TAPE_MIN ? { make: "measure", d: 0 } : { make: "through", p: start.p, dir: normalize3(sub3(b, start.p)), d };
  if (start.kind === "point") {
    if (d < TAPE_MIN) return { make: "measure", d: 0 };
    // D25（2026-10-25 Opus；user「卷尺当从线和snap开始拉，还是没有出线，出了点。这样不对」「我应该是在直边上拉的尺」）：
    // 起手吸到边的中点 / 端点（栅格开着时整米边的中点正好也是格点，很容易落上去）——按拖的方向定：垂直成分 ≥ 八成（离边 ≥ 约 53°）= 那条边的平行线
    if (start.lines?.length) {
      const v = sub3(b, start.p);
      let best: { dir: Pt3; w: Pt3; f: number } | null = null;
      for (const dir of start.lines) { const w = sub3(v, scale3(dir, dot3(v, dir))), f = Math.hypot(w.x, w.y, w.z) / d; if (!best || f > best.f) best = { dir, w, f }; }
      if (best && best.f >= PERP_FRACTION) return { make: "line", p: add3(start.p, best.w), dir: best.dir, d: Math.hypot(best.w.x, best.w.y, best.w.z) };
    }
    return { make: "point", p: b, d };
  }
  return { make: "measure", d };
}

/** 从点起手、点在边上时：拖动的垂直成分占多少才算「要平行线」（0.8 ≈ 离边 53°；拐角沿对角线拖 = 0.71 = 分不清 → 点）。 */
export const PERP_FRACTION = 0.8;
const POINT_KINDS = new Set<SnapKind>(["endpoint", "midpoint", "intersection", "origin", "guide-point", "guide-cross", "align-combo"]);
const LINE_KINDS = new Set<SnapKind>(["on-edge", "edge-align", "on-guide"]);
/** 栅格开着时，求解器把「边上 / 参考线上」改写成落格的点（「格点 · 边上」）；调用方确认这点正落在那条边 / 参考线上才给 lineDir（D23，2026-10-25 Opus）。 */
const ON_LATTICE = new Set<SnapKind>(["grid-point", "increment"]);

/** 按吸附结果给起点定身份：边 / 参考线 → 带方向；点类 → 参考点；其余 → 只量。edgeDir / guideDir 由调用方按命中补。 */
export function classifyStart(sn: Snap3, lineDir: Pt3 | null, pointLines?: Pt3[]): TapeStart {
  if (sn.kind && (LINE_KINDS.has(sn.kind) || ON_LATTICE.has(sn.kind)) && lineDir) return { kind: "line", p: sn.p, dir: normalize3(lineDir) };
  if (sn.kind === "guide-point") return { kind: "through", p: sn.p };   // 从参考点再拉一次 = 过两点的线（不删点）
  if (sn.kind && POINT_KINDS.has(sn.kind)) return pointLines?.length ? { kind: "point", p: sn.p, lines: pointLines.map((d) => normalize3(d)) } : { kind: "point", p: sn.p };
  return { kind: "measure", p: sn.p };
}

