// budget-notice.ts —— 血槽位披露（Tron 纪元清单第 9 步，2026-10-29 Claude Opus 5.5）：引擎每帧核对预算（minccino/budget.ts checkBudget），
// 超了这里决定什么时候、对谁说——家族规矩「默认 + 披露」「不许因为性能静默不做」：小学还没有降档梯子（不自己降），所以只说，不改画面。
//   · 连续 STREAK 帧超预算才说一次（第一帧编着色器那种一次性的慢不算）；说过之后直到回到预算内都不再说（不刷屏）。
//   · 说两处：提示行（user 看得见）+ 调试日志（黑匣子，回执用）。开着风格时顺带指路「视图 ☰ 风格可以换回白模」。
// 右下角的读数位 user 10-25 让先空着（「右边把小窗位置都让出来」），所以不占那块。纯函数，单测 test/budget-notice.test.ts。
import type { BudgetReport } from "../minccino/index.ts";

export const BUDGET_STREAK = 3;

export interface BudgetWatch {
  /** 每画一帧喂一次（null = 这一帧没核对，比如截缩略图）。返回这一帧要说的话（不说 = null）。 */
  feed(b: BudgetReport | null): string | null;
}

/** styleName：现在开着的风格名（白模 = null，不指路）。 */
export function makeBudgetWatch(styleName: () => string | null): BudgetWatch {
  let streak = 0, told = false;
  return {
    feed(b) {
      if (!b) return null;
      if (!b.over.length) { streak = 0; told = false; return null; }
      streak++;
      if (told || streak < BUDGET_STREAK) return null;
      told = true;
      const s = styleName();
      return `${b.disclose}${s ? `——现在的风格是「${s}」，卡的话视图 ☰「风格」可以换回白模` : ""}`;
    },
  };
}
