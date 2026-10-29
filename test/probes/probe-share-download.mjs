// 调试日志 / 复现包：触屏分享、电脑下载（app/share-or-download.ts；created 2026-10-29 by Claude Opus 5.5；user「windows的分享就是个流氓软件」「Windows 上调试日志的「分享」改成「下载」。 做做做」）。
// 两台假设备，都假装浏览器有系统分享（navigator.share / canShare 打桩）——
// ① Windows（Edge 的 UA）：调试日志钮写「下载 .txt」、点了 = 真的下载了一个 .txt、系统分享一次都没被叫 ② iPad：钮还是「分享」、点了 = 叫了系统分享、没下载。
// 跑法：python3 -m http.server 8765 后 node test/probes/probe-share-download.mjs
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const errs = [];
const run = async (ua, touch) => {
  const ctx = await b.newContext({ viewport: { width: 1000, height: 800 }, userAgent: ua, acceptDownloads: true, ...(touch ? { hasTouch: true } : {}) });
  await ctx.addInitScript(() => { window.__shared = 0; Object.defineProperty(navigator, "share", { value: async () => { window.__shared++; }, configurable: true }); Object.defineProperty(navigator, "canShare", { value: () => true, configurable: true }); });
  const page = await ctx.newPage(); page.setDefaultTimeout(5000); page.on("pageerror", (e) => errs.push(String(e).slice(0, 200)));
  await page.goto("http://127.0.0.1:8765/", { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1200);
  await page.click("#btnMenu"); await page.waitForTimeout(100);
  await page.click('.popup-menu [data-menu-tab="help"]'); await page.waitForTimeout(80);
  await page.evaluate(() => [...document.querySelectorAll(".popup-menu [data-menu-id]")].find((x) => /调试日志/.test(x.textContent ?? ""))?.dispatchEvent(new MouseEvent("click", { bubbles: true }))); await page.waitForTimeout(150);
  const label = await page.evaluate(() => document.getElementById("debugLogShare")?.textContent?.trim() ?? null);
  let downloaded = null;
  const dl = page.waitForEvent("download", { timeout: 1500 }).then((d) => { downloaded = d.suggestedFilename(); }).catch(() => {});
  await page.click("#debugLogShare"); await dl; await page.waitForTimeout(100);
  const shared = await page.evaluate(() => window.__shared);
  await ctx.close();
  return { label, downloaded, shared };
};
const r = {};
r.windows = await run("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0", false);
r.ipad = await run("Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) EdgiOS/130.0 Version/18.0 Mobile/15E148 Safari/604.1", true);
await b.close();
r.errs = errs;
console.log(JSON.stringify(r));
const ok = /下载/.test(r.windows.label ?? "") && /\.txt$/.test(r.windows.downloaded ?? "") && r.windows.shared === 0
  && !/下载/.test(r.ipad.label ?? "下载") && r.ipad.shared === 1 && r.ipad.downloaded === null && errs.length === 0;
console.log(ok ? "probe-share-download OK" : "probe-share-download FAIL");
process.exit(ok ? 0 : 1);
