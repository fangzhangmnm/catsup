// 开机拆空库不许冒英文警告（headless）：设计 = ai-docs/20261105-save-and-dispose-fixes.md §2。created 2026-11-05 by Claude Opus 5.5
// 这台浏览器建过默认库、里面 0 份模型、没登录 → 开机 settleNoHome 释放库。以前库里那个 400 ms 的本地写撞上已关的 IDB，琥珀色英文警告盖在通知栈上（「恢复」钮点不到）。
// 对照两组：第二页开机时开过图库 / 什么都没做。再开第三页：确实不留没有家的空库。用法：python3 -m http.server 8765 --bind 127.0.0.1 后 `node test/probes/probe-no-home-dispose.mjs [url]`。
import { createRequire } from "node:module";
import { MSAL_STUB, fakeDrive } from "./fake-cloud.mjs";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const url = process.argv[2] ?? "http://127.0.0.1:8765/";
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const out = {}, ok = (k, v) => { out[k] = !!v; if (!v) process.exitCode = 1; };
async function openPage(ctx) {
  const page = await ctx.newPage(); page.setDefaultTimeout(15000);
  await page.goto(url, { waitUntil: "load" });
  await page.waitForFunction(() => globalThis.__catsup?.session && !globalThis.__catsup.gate?.cloudGate?.isRunning?.());
  return page;
}
const openClose = (p) => p.evaluate(async () => { await globalThis.__catsup.galleryHost.open(); globalThis.__catsup.galleryHost.close(); });
for (const [name, touchGallery] of [["openedGallery", true], ["didNothing", false]]) {
  const ctx = await browser.newContext({ viewport: { width: 1100, height: 720 }, deviceScaleFactor: 1, serviceWorkers: "block" });
  const drive = fakeDrive(); await drive.attach(ctx);
  await ctx.route(/vendor\/msal\/msal-browser\.min\.js/, (r) => r.fulfill({ contentType: "text/javascript", body: MSAL_STUB }));
  await ctx.addInitScript((m) => { if (!localStorage.getItem("__fake_msal")) localStorage.setItem("__fake_msal", m); }, "none");
  const p1 = await openPage(ctx);
  await openClose(p1); await p1.waitForTimeout(800); await p1.close();
  const p2 = await openPage(ctx);
  if (touchGallery) await openClose(p2);
  await p2.waitForTimeout(1800);
  const r = await p2.evaluate(() => ({ log: globalThis.__catsup.debugLog.toText(), notices: document.getElementById("noticeStack")?.textContent ?? "", home: globalThis.__catsup.session.home.kind }));
  ok(`${name}.settled`, /no account, no models → no library/.test(r.log));
  // 定时器那条路（库报 warning，黑匣子里是 W）两组都不许有。开着图库那组另有一条很窄的库内竞态：目录帧读到一半撞上释放（库报 error，E；只读、压力下 18 次 2 次）= 周账 F-199，等库的决定，这里不判
  ok(`${name}.noTimerWarningInLog`, !/ W idb cache closed/.test(r.log));
  if (!touchGallery) { ok(`${name}.noWarningInLog`, !/disposed/.test(r.log)); ok(`${name}.noWarningOnScreen`, !/disposed|idb cache/.test(r.notices)); }
  ok(`${name}.fileMode`, r.home === "transient");
  await p2.close();
  const p3 = await openPage(ctx); await p3.waitForTimeout(600);
  const log3 = await p3.evaluate(() => globalThis.__catsup.debugLog.toText());
  ok(`${name}.nextBootNoStore`, /restore store=false/.test(log3));
  await ctx.close();
}
console.log(JSON.stringify(out, null, 1));
await browser.close();
