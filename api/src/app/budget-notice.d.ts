import type { BudgetReport } from "../minccino/index.ts";
export declare const BUDGET_STREAK = 3;
export interface BudgetWatch {
    /** 每画一帧喂一次（null = 这一帧没核对，比如截缩略图）。返回这一帧要说的话（不说 = null）。 */
    feed(b: BudgetReport | null): string | null;
}
/** styleName：现在开着的风格名（白模 = null，不指路）。 */
export declare function makeBudgetWatch(styleName: () => string | null): BudgetWatch;
