// 血槽位披露（app/budget-notice.ts）：连续超才说、说一次、回到预算内才重新计。created 2026-10-29 by Claude Opus 5.5
import { describe, it, eq, assert } from "./runner.mjs";
import { makeBudgetWatch, BUDGET_STREAK } from "../src/app/budget-notice.ts";
import { checkBudget } from "../src/minccino/budget.ts";

const B = { frameMs: 16.7, vramMb: 256, drawCalls: 200 };
const ok = checkBudget({ frameMs: 5, vramMb: 20, drawCalls: 30 }, B), over = checkBudget({ frameMs: 40, vramMb: 20, drawCalls: 30 }, B);

describe("血槽位披露", () => {
  it("一帧慢（编着色器）不说；连续 3 帧超才说一次；说过不刷屏", () => {
    const w = makeBudgetWatch(() => null);
    eq(w.feed(over), null); eq(w.feed(ok), null);
    for (let i = 1; i < BUDGET_STREAK; i++) eq(w.feed(over), null);
    const said = w.feed(over);
    assert(!!said && said.includes("每帧毫秒 40.0 ms / 16.7 ms") && !said.includes("风格"), said ?? "");
    eq(w.feed(over), null); eq(w.feed(over), null);
  });
  it("回到预算内再超 = 重新计、再说一次；开着风格时指路换回白模；没核对的帧不算", () => {
    const w = makeBudgetWatch(() => "CRT Tron");
    for (let i = 0; i < BUDGET_STREAK; i++) w.feed(over);
    eq(w.feed(ok), null); eq(w.feed(null), null);
    let said: string | null = null;
    for (let i = 0; i < BUDGET_STREAK; i++) said = w.feed(over) ?? said;
    assert(!!said && said.includes("「CRT Tron」") && said.includes("换回白模"), said ?? "");
  });
});
