// editor/snap-hysteresis.ts —— 吸附的「粘一下」容差（光标离开上一个吸附目标多远才放手）：按吸附种类一张表。
// 2026-11-09 Claude Opus 5.5 从 editor.ts 原样搬出来（体重棘轮：计划书 20261109-audit-fixes-plan 工单 2 第 2 层在本体里加了几行，这块纯数据抵掉）。
// 桌面 = CSS 像素按视口高 800 缩放；VR = 那一帧的度量（EpsSet，桌面单位 = fovY / 800、VR = 度；A17）。调参纪律：每种目标自己的常量。
import type { EpsSet } from "./pointer-frame.ts";

function epsOfKindVR(e: EpsSet, kind: string): number {
  if (kind === "on-edge") return e.edge;
  if (kind === "edge-align" || kind === "align-combo") return e.combo;
  if (kind === "align" || kind.startsWith("axis-")) return e.line;
  return e.point;
}
const EPS_OF: Record<string, number> = {
  endpoint: 10, origin: 10, midpoint: 10, "on-edge": 7,
  "edge-align": 12, "align-combo": 12, align: 5, "axis-x": 5, "axis-y": 5, "axis-z": 5, "axis-dir": 5, "on-extension": 5, tool: 5,
};
/** 上一个吸附目标的放手容差：有这一帧的度量（VR / 新指针帧）用它，没有 = 桌面像素表 × 视口高 / 800。 */
export function snapHoldTol(kind: string, eps: EpsSet | null | undefined, viewH: number): number { return eps ? epsOfKindVR(eps, kind) : (EPS_OF[kind] ?? 8) * (viewH / 800); }
