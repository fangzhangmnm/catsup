// settle-hold —— 「等某个 promise 落地（成功或失败都算），但最多等 maxMs」的纯函数。
// created 2026-09-05 by Claude Fable 5.1。
//
// 首消费者：app.ts 的 PWA 外壳接线——SW 更新通知与 reload 要等 boot 期 auth 初始化落地
//   （MSAL redirect 回程 handleRedirectPromise 正在用 URL 里的 code 换 token 时 reload = code 丢失 →
//   回来只剩「有缓存账号但没登上」的假离线；user 2026-09-05 iPad 报「reconnect 与 update 同时弹，
//   点了 reconnect 刷新后一直斜杠云」）。封顶是为了 auth 初始化 hang 住时更新不被永远扣押。
// 永不 reject：拒绝也是「落地」。timer 用注入的 setTimeout（测试可换假钟）。

const REAL_TIMERS = {
  setTimeout: (fn: () => void, ms: number): unknown => setTimeout(fn, ms),
  clearTimeout: (h: unknown): void => clearTimeout(h as ReturnType<typeof setTimeout>),
};

export function holdUntilSettled(
  p: Promise<unknown>,
  maxMs: number,
  timers: { setTimeout: (fn: () => void, ms: number) => unknown; clearTimeout: (h: unknown) => void } = REAL_TIMERS,
): Promise<"settled" | "timeout"> {
  return new Promise((resolve) => {
    let done = false;
    const finish = (how: "settled" | "timeout") => { if (done) return; done = true; timers.clearTimeout(h); resolve(how); };
    const h = timers.setTimeout(() => finish("timeout"), Math.max(0, maxMs));
    p.then(() => finish("settled"), () => finish("settled"));
  });
}
