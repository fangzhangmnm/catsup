// minccino/budget.ts —— 预算核对（骨架稿 v2 不变量 3：预算挂视图上、护栏归引擎、超了披露不静默）。纯函数。created 2026-10-29 by Claude Fable 5.1（步 7）
// 小学：只核对 + 给一句披露；降档梯子（DegradeStep[]）的内容归 Opus（task #91 第 9 步），这里只钉形状。
import type { Measurement } from "./contract/cost.ts";
import type { ViewBudget } from "./contract/view.ts";

export type BudgetAxis = "frameMs" | "vramMb" | "drawCalls";
export interface BudgetReport {
  /** 超了哪几项（空 = 在预算内）。 */
  readonly over: readonly BudgetAxis[];
  /** 给人看的一句（血槽位 / 状态行用）；在预算内 = null。 */
  readonly disclose: string | null;
  /** 每项用了预算的几成（0–1 以上 = 超）。 */
  readonly ratio: Readonly<Record<BudgetAxis, number>>;
}

export function checkBudget(m: Measurement, b: ViewBudget): BudgetReport {
  const ratio = { frameMs: m.frameMs / b.frameMs, vramMb: m.vramMb / b.vramMb, drawCalls: m.drawCalls / b.drawCalls };
  const over = (Object.keys(ratio) as BudgetAxis[]).filter((k) => ratio[k] > 1);
  const label: Record<BudgetAxis, string> = { frameMs: "每帧毫秒", vramMb: "显存", drawCalls: "绘制次数" };
  const disclose = over.length ? `超预算：${over.map((k) => `${label[k]} ${fmt(k, m)} / ${fmt(k, b)}`).join("、")}` : null;
  return { over, disclose, ratio };
}
const fmt = (k: BudgetAxis, v: Measurement | ViewBudget): string => (k === "frameMs" ? `${v.frameMs.toFixed(1)} ms` : k === "vramMb" ? `${v.vramMb.toFixed(0)} MB` : String(v.drawCalls));
