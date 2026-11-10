// settle-hold 契约测（created 2026-09-05 by Claude Fable 5.1）：
//   成功落地 / 失败落地 都算 settled；超时才 timeout；落地后 timer 被清（不漏）。
import { describe, it, eq } from "./runner.mjs";
import { holdUntilSettled } from "../src/common/settle-hold.ts";

function fakeTimers() {
  const pending = new Map<number, () => void>();
  let id = 0;
  return {
    setTimeout: (fn: () => void, _ms: number) => { const h = ++id; pending.set(h, fn); return h; },
    clearTimeout: (h: unknown) => { pending.delete(h as number); },
    fire: () => { for (const fn of [...pending.values()]) fn(); },
    count: () => pending.size,
  };
}

describe("settle-hold · holdUntilSettled", () => {
  it("promise 成功 → settled，且 timer 被清", async () => {
    const t = fakeTimers();
    const r = await holdUntilSettled(Promise.resolve(1), 8000, t);
    eq(r, "settled");
    eq(t.count(), 0);
  });
  it("promise 失败 → 也是 settled（拒绝不是 hang）", async () => {
    const t = fakeTimers();
    const r = await holdUntilSettled(Promise.reject(new Error("boom")), 8000, t);
    eq(r, "settled");
    eq(t.count(), 0);
  });
  it("promise 不落地 → 超时 timeout，之后再落地也不改结果", async () => {
    const t = fakeTimers();
    let resolveLate: (v: unknown) => void = () => {};
    const late = new Promise((res) => { resolveLate = res; });
    const rp = holdUntilSettled(late, 8000, t);
    eq(t.count(), 1);
    t.fire();
    eq(await rp, "timeout");
    resolveLate(0);
    await Promise.resolve();
    eq(await rp, "timeout");
  });
});
