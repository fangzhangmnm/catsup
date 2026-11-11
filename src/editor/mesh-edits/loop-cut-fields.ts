// 环切的两个参数（W-8，2026-11-10 Claude Opus 5.5）：菜单指令（mesh-edits/index.ts）和刀的 Ctrl+R（tools/mesh-knife.ts）做完都进马后炮小窗，共用这一份。
// Fable 11-10 裁定：圈数缺 = 1；N 圈均分；N > 1 时位置那一行灰掉（均分之后再滑是另一步）；N 圈是一步撤销（一条 meshLoopCut 记录）。
import type { ParamField, ParamValue } from "../param-panel.ts";

export const LOOP_CUT_FIELDS: readonly ParamField[] = [
  { key: "t", def: { kind: "number", label: "位置", min: 0.01, max: 0.99, step: 0.01 }, off: (v) => Number(v.cuts ?? 1) > 1 },
  { key: "cuts", def: { kind: "number", label: "圈数", min: 1, max: 32, step: 1 } },
];
export const LOOP_CUT_DEFAULTS: Readonly<Record<string, ParamValue>> = Object.freeze({ t: 0.5, cuts: 1 });
/** 小窗里的值 → 记录里的 t / cuts（夹到范围里；圈数取整）。 */
export function loopCutArgs(v: Readonly<Record<string, ParamValue>>): { t: number; cuts: number } {
  const t = Number(v.t ?? 0.5), cuts = Math.round(Number(v.cuts ?? 1));
  return { t: Number.isFinite(t) ? Math.min(0.99, Math.max(0.01, t)) : 0.5, cuts: Number.isFinite(cuts) ? Math.min(32, Math.max(1, cuts)) : 1 };
}
