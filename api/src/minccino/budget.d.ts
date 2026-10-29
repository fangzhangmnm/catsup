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
export declare function checkBudget(m: Measurement, b: ViewBudget): BudgetReport;
