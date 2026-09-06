// 页面侧 PWA shell：注册 service worker + 4 路更新检测 → onUpdateAvailable 回调（JRP 函数形 + WeebPaint 教训）。
// created 2026-09-03 by Claude Fable 5.1
//   路径 1 冷启动遇 registration.waiting · 2 updatefound→installed · 3 SW postMessage asset-updated · 4 回前台/焦点/10min poke
//   （4 = iPad/Quest 命门：standalone PWA 不会自己 updatefound）。
//   prod 与 dev(/dev/) 都注册（worker 按 scope 分 cache-first / network-first）；只跳 localhost（dev server 无 SW）。
//   onForeground **无条件挂**（不寄生在 SW 注册成功路径上——WeebPaint v409 坑）。
//   模块顶层调用（不进 window.load：type=module 时 load 可能早已过去——RealHome 坑 #0）。

// created 2026-09-03 by Claude Fable 5.1（WebXiaoHeiWu 原件）；抄进 CatsUp 2026-09-06 by Claude Fable 5.1（去掉模型包缓存豁免）

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", ""]);

export interface PwaShellOptions {
  onUpdateAvailable: () => void;
  onForeground?: () => void;
  onBeforeReload?: () => void | Promise<void>;
}
export interface PwaShell {
  readonly isDevRoute: boolean;
  /** 应用等待中的新 SW 并 reload（toast「刷新」按钮调）。 */
  reload: () => Promise<void>;
  /** 清缓存重启（PWA 卡旧版的逃生舱）：unregister 全部 SW + 清 Cache Storage（模型包缓存 pwa-models 除外）+ reload。IDB（文档缓存）不碰。 */
  forceReset: () => Promise<void>;
}

export function initPwaShell(opts: PwaShellOptions): PwaShell {
  const isDevRoute = location.pathname.includes("/dev/") || LOCAL_HOSTS.has(location.hostname);
  let registration: ServiceWorkerRegistration | null = null;

  async function reload(): Promise<void> {
    try { await opts.onBeforeReload?.(); } catch { /* 落盘失败也得让用户能刷 */ }
    const reg = registration ?? (await navigator.serviceWorker?.getRegistration()) ?? null;
    if (!reg || !reg.waiting) { location.reload(); return; }
    let done = false;
    const doReload = () => { if (done) return; done = true; location.reload(); };
    navigator.serviceWorker.addEventListener("controllerchange", doReload, { once: true });
    reg.waiting.postMessage({ type: "skip-waiting" });
    setTimeout(doReload, 5000);
  }

  // 加固（user 2026-09-04 Quest「点强制刷新没有自动重启」，原因不明且无法远程复现）：这条链不许无声——
  //   前置 flush 加超时（挂住也走）；导航用带时间戳的 replace（绕 HTTP 缓存；reload 被吞也能走）；2.5s 看门狗再踢一脚；
  //   重启后 boot 见 ?reset= 弹「已清缓存重启 · 版本」（app.ts），用户看得到到底有没有重启、到了哪一版。
  async function forceReset(): Promise<void> {
    const settle = (p: void | Promise<void>, ms: number) => Promise.race([Promise.resolve(p).catch(() => undefined), new Promise<void>((r) => setTimeout(r, ms))]);
    await settle(opts.onBeforeReload?.(), 4000);
    try {
      if (navigator.serviceWorker) for (const r of await navigator.serviceWorker.getRegistrations()) await r.unregister().catch(() => {});
      if (typeof caches !== "undefined") for (const k of await caches.keys()) await caches.delete(k).catch(() => {});
    } catch { /* best-effort — reload anyway */ }
    const target = `${location.pathname}?reset=${Date.now()}`;
    setTimeout(() => location.replace(target), 150);
    setTimeout(() => { location.href = target; }, 2500);   // 看门狗：第一脚没走再踢一次
  }

  const onFg = () => {
    registration?.update().catch(() => {});
    opts.onForeground?.();
  };
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") onFg(); });
  window.addEventListener("focus", onFg);

  if ("serviceWorker" in navigator && !LOCAL_HOSTS.has(location.hostname)) {
    navigator.serviceWorker.addEventListener("message", (e: MessageEvent) => {
      if ((e.data as { type?: string } | null)?.type === "asset-updated") opts.onUpdateAvailable();
    });
    navigator.serviceWorker.register("./service-worker.js").then((reg) => {
      registration = reg;
      if (reg.waiting && navigator.serviceWorker.controller) opts.onUpdateAvailable();
      reg.addEventListener("updatefound", () => {
        const sw = reg.installing;
        if (!sw) return;
        sw.addEventListener("statechange", () => {
          if (sw.state === "installed" && navigator.serviceWorker.controller) opts.onUpdateAvailable();
        });
      });
      setInterval(() => { reg.update().catch(() => {}); }, 10 * 60 * 1000);
    }).catch((err: unknown) => { console.warn("[pwa] SW register failed", err); });
  }

  return { isDevRoute, reload, forceReset };
}
