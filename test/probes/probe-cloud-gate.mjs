#!/usr/bin/env node
// test/probes/probe-cloud-gate.mjs —— 同步闸门 + 掉登录 / 没网闸门的无头验收（工单 C；设计稿 ai-docs/20261103-cloud-gate-design.md §7）。created 2026-11-03 by Claude Opus 5.5
//   真 bundle、真库；假的只有两头：MSAL 脚本（路由换成桩，静默续签结果可控）和 Graph（内存小网盘，可挂起、可计数）。
//   用法：python3 -m http.server 8765 后 `node test/probes/probe-cloud-gate.mjs [url]`（≈ 40 s，⑤′ 真等 8 s）。headless。
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
const here = path.dirname(fileURLToPath(import.meta.url));
const { chromium } = createRequire(path.join(here, "../../../20260524 WeebPaint/package.json"))("playwright");
const url = process.argv[2] ?? "http://127.0.0.1:8765/";
const failures = [];
const eq = (a, b, what) => { if (a !== b) { failures.push(what); console.error(`  ✗ ${what}: expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); } else console.log("  ✓", what); };
const ok = (c, what) => eq(!!c, true, what);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- 假 MSAL：行为由 localStorage 的测试键控制（跨刷新）----
const MSAL_STUB = `
(() => {
  const mode = () => localStorage.getItem("__fake_msal") || "ok";
  const account = { homeAccountId: "u1.t1", username: "probe@example.com" };
  class PublicClientApplication {
    constructor() {}
    async initialize() {}
    async handleRedirectPromise() { return null; }
    getAllAccounts() { return mode() === "none" ? [] : [account]; }
    getAccountByHomeId() { return account; }
    setActiveAccount() {}
    async clearCache() { localStorage.setItem("__fake_msal", "none"); }
    async loginRedirect() { window.__fakeLogins = (window.__fakeLogins || 0) + 1; }
    async acquireTokenSilent() {
      window.__fakeSilent = (window.__fakeSilent || 0) + 1;
      const m = mode();
      if (m === "hang") return new Promise(() => {});
      if (m === "interaction") throw Object.assign(new Error("AADSTS: login_required"), { name: "InteractionRequiredAuthError", errorCode: "login_required", subError: "" });
      if (m === "network") throw Object.assign(new Error("network"), { name: "BrowserAuthError", errorCode: "no_network_connectivity", subError: "" });
      return { accessToken: "fake-token", account };
    }
  }
  window.msal = { LogLevel: { Error: 0, Warning: 1, Info: 2 }, PublicClientApplication };
})();`;

// ---- 假 Graph：内存小网盘 ----
function fakeDrive() {
  const items = new Map();   // path → { id, name, eTag, bytes, lastModifiedDateTime }
  let seq = 1;
  const d = { items, requests: 0, hangMeta: false, hangDownload: null, metaGate: null };
  const json = (route, status, body) => route.fulfill({ status, contentType: "application/json", headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-expose-headers": "*" }, body: JSON.stringify(body) });
  const view = (it) => ({ id: it.id, name: it.name, size: it.bytes.length, eTag: it.eTag, lastModifiedDateTime: it.lastModifiedDateTime, file: {}, "@microsoft.graph.downloadUrl": `https://fake-dl.test/${it.id}` });
  d.bump = (p) => { const it = items.get(p); it.eTag = `"e${seq++}"`; it.lastModifiedDateTime = new Date().toISOString(); };
  d.attach = async (ctx) => {
    await ctx.route(/fake-dl\.test\//, async (route) => {
      if (d.hangDownload) await d.hangDownload;
      const id = new URL(route.request().url()).pathname.slice(1);
      const it = [...items.values()].find((x) => x.id === id);
      await route.fulfill({ status: it ? 200 : 404, headers: { "access-control-allow-origin": "*" }, contentType: "application/octet-stream", body: it ? Buffer.from(it.bytes) : "" });
    });
    await ctx.route(/graph\.microsoft\.com\/v1\.0\//, async (route) => {
      const req = route.request();
      if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" } });
      d.requests++;
      const u = new URL(req.url());
      const p = decodeURIComponent(u.pathname.replace("/v1.0", ""));
      let m;
      if (p === "/me/drive/special/approot") return json(route, 200, { id: "root" });
      if (/\/children$/.test(p)) { const dir = p.replace("/me/drive/special/approot", "").replace(/^:\//, "").replace(/:?\/children$/, ""); return json(route, 200, { value: [...items.entries()].filter(([k]) => (k.includes("/") ? k.slice(0, k.lastIndexOf("/")) : "") === dir).map(([, v]) => view(v)) }); }
      if ((m = /^\/me\/drive\/special\/approot:\/(.+):\/content$/.exec(p)) && req.method() === "PUT") {
        const key = m[1], prev = items.get(key), ifMatch = req.headers()["if-match"];
        const fail = u.searchParams.get("@microsoft.graph.conflictBehavior") === "fail";
        if (prev && ifMatch && ifMatch !== prev.eTag) return json(route, 412, { error: { code: "preconditionFailed" } });
        if (prev && !ifMatch && fail) return json(route, 409, { error: { code: "nameAlreadyExists" } });
        const it = prev ?? { id: `i${seq++}`, name: key.split("/").pop() };
        it.bytes = req.postDataBuffer() ?? Buffer.alloc(0); it.eTag = `"e${seq++}"`; it.lastModifiedDateTime = new Date().toISOString();
        items.set(key, it);
        return json(route, prev ? 200 : 201, view(it));
      }
      if ((m = /^\/me\/drive\/special\/approot:\/(.+)$/.exec(p)) && req.method() === "GET") {
        if (d.hangMeta) await new Promise(() => {});
        if (d.metaGate) await d.metaGate;
        const it = items.get(m[1]);
        return it ? json(route, 200, view(it)) : json(route, 404, { error: { code: "itemNotFound" } });
      }
      if ((m = /^\/me\/drive\/items\/([^/]+)\/content$/.exec(p))) { if (d.hangDownload) await d.hangDownload; const it = [...items.values()].find((x) => x.id === m[1]); return route.fulfill({ status: it ? 200 : 404, headers: { "access-control-allow-origin": "*" }, body: it ? Buffer.from(it.bytes) : "" }); }
      if ((m = /^\/me\/drive\/items\/([^/]+)$/.exec(p)) && req.method() === "GET") { const it = [...items.values()].find((x) => x.id === m[1]); return it ? json(route, 200, view(it)) : json(route, 404, {}); }
      return json(route, 404, { error: { code: "unhandled", p } });
    });
  };
  return d;
}

const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
async function scene(opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1100, height: 720 }, deviceScaleFactor: 1 });
  const drive = fakeDrive();
  await drive.attach(ctx);
  await ctx.route(/vendor\/msal\/msal-browser\.min\.js/, (r) => r.fulfill({ contentType: "text/javascript", body: MSAL_STUB }));
  // 记录罩子每一次显形 / 收起的时刻（MutationObserver，从第一帧起）；没网用 navigator.onLine 假值（真断网刷新不了页）
  await ctx.addInitScript(() => {
    if (localStorage.getItem("__fake_offline") === "1") Object.defineProperty(navigator, "onLine", { get: () => false, configurable: true });
    window.__gateLog = [];
    const watch = () => {
      const g = document.getElementById("syncGate");
      if (!g) return false;
      const rec = () => window.__gateLog.push({ t: performance.now(), up: !g.hidden, title: document.getElementById("syncGateTitle")?.textContent ?? "", msg: document.getElementById("syncGateMessage")?.textContent ?? "" });
      new MutationObserver(rec).observe(g, { attributes: true, attributeFilter: ["hidden"], subtree: false });
      new MutationObserver(rec).observe(document.getElementById("syncGateTitle"), { childList: true, characterData: true, subtree: true });
      return true;
    };
    if (!watch()) new MutationObserver((_, o) => { if (watch()) o.disconnect(); }).observe(document, { childList: true, subtree: true });
  });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => { failures.push("pageerror: " + e.message); console.error("  ✗ pageerror:", e.message); });
  const h = {
    ctx, page, drive,
    gateUp: () => page.evaluate(() => !document.getElementById("syncGate").hidden),
    gateText: () => page.evaluate(() => document.getElementById("syncGate").textContent.replace(/\s+/g, " ").trim()),
    gateClick: (label) => page.locator("#syncGateActions button", { hasText: label }).click(),
    notices: () => page.evaluate(() => document.getElementById("noticeStack")?.textContent ?? ""),
    dirty: () => page.evaluate(() => globalThis.__catsup.store()?.files.dirty.count() ?? -1),
    rev: () => page.evaluate(() => globalThis.__catsup.editor.revision),
    home: () => page.evaluate(() => { const h = globalThis.__catsup.session.home; return h.kind === "gallery" ? h.path : h.kind; }),
    draw: async (dx = 0) => {
      const box = await page.locator("#board").boundingBox();
      const cx = box.x + box.width / 2 + dx, cy = box.y + box.height / 2;
      await page.evaluate(() => globalThis.__catsup.editor.setTool("rect"));
      await page.mouse.move(cx - 80, cy - 40); await page.mouse.down(); await page.mouse.move(cx + 80, cy + 20, { steps: 8 }); await page.mouse.up();
    },
    settled: () => page.waitForFunction(() => { const s = globalThis.__catsup.session; return !s.lazy && !s.saving && !s.dirty(); }, null, { timeout: 15000 }),
    ready: () => page.waitForFunction(() => globalThis.__catsup?.session, null, { timeout: 20000 }),
    gateDone: (timeout = 15000) => page.waitForFunction(() => !globalThis.__catsup.gate.cloudGate.isRunning(), null, { timeout }),
    log: () => page.evaluate(() => window.__gateLog),
    blackBox: () => page.evaluate(() => { const l = globalThis.__catsup.debugLog; return typeof l === "function" ? JSON.stringify(l()) : typeof l?.text === "function" ? l.text() : JSON.stringify(l?.entries?.() ?? l ?? null); }),
    /** 准备好一台设备：登录好、图库里有一份推上去的模型（gallery-attached = 1，回执条指着它）。 */
    prepare: async () => {
      await page.goto(url, { waitUntil: "load" }); await h.ready();
      await page.waitForFunction(() => globalThis.__catsup.session && !globalThis.__catsup.gate.cloudGate.isRunning());
      await page.evaluate(() => globalThis.__catsup.galleryHost.open());
      await page.waitForFunction(() => !document.getElementById("galleryFull").hidden);
      await page.click("#galleryNew");
      await page.waitForFunction(() => globalThis.__catsup.session.home.kind === "gallery" && document.getElementById("galleryFull").hidden);
      await page.waitForFunction(() => globalThis.__catsup.store()?.files && true);
      await h.draw();
      await h.settled();
      await page.waitForFunction(() => globalThis.__catsup.session.saveState?.() === "synced" || !globalThis.__catsup.session.pushPending, null, { timeout: 10000 });
      await page.evaluate(() => globalThis.__catsup.session.save());
      await h.settled();
    },
    reload: async (fakeMsal, offline = false) => {
      await page.evaluate(([m, o]) => { localStorage.setItem("__fake_msal", m); if (o) localStorage.setItem("__fake_offline", "1"); else localStorage.removeItem("__fake_offline"); }, [fakeMsal, offline]);
      drive.requests = 0;
      await page.reload({ waitUntil: "load" }); await h.ready();
    },
    close: () => ctx.close(),
  };
  return h;
}

console.log("① 没挂库：开机 / 醒来零闸");
{
  const s = await scene();
  await s.page.goto(url, { waitUntil: "load" }); await s.ready(); await sleep(800);
  eq((await s.log()).filter((e) => e.up).length, 0, "开机罩子从没显形");
  await s.page.evaluate(() => document.dispatchEvent(new Event("visibilitychange"))); await sleep(200);
  eq((await s.log()).filter((e) => e.up).length, 0, "醒来也没有");
  eq(s.drive.requests, 0, "零 Graph 请求（没登录过的新设备）");
  await s.close();
}

console.log("② 登录好 + 云端没动：罩从出现到消失 < 300 ms（醒来这一轮量；开机另报），没有面");
{
  const s = await scene();
  await s.prepare();
  ok(s.drive.items.size >= 1, "假网盘里有这份");
  await s.reload("ok");
  await s.gateDone();
  const bootLog = await s.log();
  const up = bootLog.find((e) => e.up), down = [...bootLog].reverse().find((e) => !e.up);
  console.log(`    开机罩子 ${up && down ? (down.t - up.t).toFixed(0) : "?"} ms（含本地恢复；swiftshader 无头，真机另算）`);
  eq(await s.gateUp(), false, "放行了");
  ok(!/网盘没连上/.test(await s.notices()), "没有闸");
  await s.page.evaluate(() => { globalThis.__catsup.gate.tune.recheckMs = 0; window.__gateLog.length = 0; });
  await s.page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
  await s.gateDone(); await sleep(50);
  const w = await s.log();
  const wu = w.find((e) => e.up), wd = [...w].reverse().find((e) => !e.up);
  ok(wu && wd, "醒来走了一遍");
  const ms = wd.t - wu.t;
  console.log(`    醒来罩子 ${ms.toFixed(0)} ms`);
  ok(ms < 300, `醒来 < 300 ms（实测 ${ms.toFixed(0)} ms）`);
  // 醒来时云端没回答：罩子必须等着（不是看见「已经有一趟在飞」就放行）
  let relMeta; s.drive.metaGate = new Promise((r) => { relMeta = r; });
  await s.page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
  await sleep(200);
  eq(await s.gateUp(), true, "云端没回答：罩子还在");
  relMeta(); s.drive.metaGate = null;
  await s.gateDone();
  eq(await s.gateUp(), false, "回答了：放行");
  await s.close();
}

console.log("③ 续签失败（interaction_required）：闸两个钮；离线继续 → 能编辑、常驻条 N、零 Graph / 登录请求；online + 续签成功 → 条消失、dirty 清零");
{
  const s = await scene();
  await s.prepare();
  await s.reload("interaction");
  await s.page.waitForFunction(() => document.getElementById("syncGateTitle").textContent === "网盘没连上", null, { timeout: 12000 });
  const t = await s.gateText();
  ok(/登录过期了/.test(t), "原因 = 登录过期了：" + t);
  eq(await s.page.locator("#syncGateActions button").count(), 2, "两个钮");
  // 闸门开着输入不进编辑器
  const r0 = await s.rev();
  await s.page.keyboard.press("l"); await s.page.keyboard.press("Control+z");
  const box = await s.page.locator("#board").boundingBox();
  await s.page.mouse.move(box.x + 300, box.y + 300); await s.page.mouse.down(); await s.page.mouse.move(box.x + 400, box.y + 350, { steps: 4 }); await s.page.mouse.up();
  eq(await s.rev(), r0, "闸门开着：键盘 / 指针都没进编辑器");
  await s.gateClick("离线继续");
  await s.gateDone();
  eq(await s.gateUp(), false, "放行");
  ok(/^离线|离线/.test(await s.notices()), "常驻条在");
  const silentAtOffline = await s.page.evaluate(() => window.__fakeSilent || 0);
  s.drive.requests = 0;
  await s.draw(60);
  await s.page.waitForFunction(() => globalThis.__catsup.editor.revision > 0);
  await s.page.evaluate(() => globalThis.__catsup.session.save({ implicit: true }));
  await s.settled(); await sleep(300);
  eq(await s.dirty(), 1, "改动落了本机，dirty = 1");
  ok(/还有 1 份没传上去/.test(await s.notices()), "常驻条显示份数：" + (await s.notices()).slice(0, 60));
  eq(s.drive.requests, 0, "离线期间零 Graph 请求");
  eq(await s.page.evaluate(() => window.__fakeSilent || 0), silentAtOffline, "离线期间零登录请求");
  await s.page.evaluate(() => { localStorage.setItem("__fake_msal", "ok"); window.dispatchEvent(new Event("online")); });
  await s.page.waitForFunction(() => !document.getElementById("noticeStack")?.textContent.includes("离线"), null, { timeout: 12000 });
  for (let i = 0; i < 60 && (await s.dirty()) !== 0; i++) await sleep(200);
  eq(await s.dirty(), 0, "补传完 dirty = 0");
  eq(await s.page.evaluate(() => globalThis.__catsup.gate.isUserOffline()), false, "离线记忆清了");
  ok((await s.blackBox()).includes("code=login_required"), "⑧ 黑匣子里有续签原因码");
  await s.close();
}

console.log("④ 没网（navigator.onLine=false）：直接进闸，不等超时");
{
  const s = await scene();
  await s.prepare();
  await s.reload("ok", true);
  const t0 = Date.now();
  await s.page.waitForFunction(() => document.getElementById("syncGateTitle").textContent === "网盘没连上", null, { timeout: 5000 });
  ok(Date.now() - t0 < 3000, `进闸 ${Date.now() - t0} ms`);
  ok(/现在没有网络/.test(await s.gateText()), "原因 = 现在没有网络");
  eq(s.drive.requests, 0, "零 Graph 请求");
  await s.gateClick("离线继续"); await s.gateDone();
  console.log("⑥ 已选离线且仍没网：醒来不再弹闸，条还在");
  await s.page.evaluate(() => { window.__gateLog.length = 0; document.dispatchEvent(new Event("visibilitychange")); }); await sleep(300);
  eq((await s.log()).filter((e) => e.up).length, 0, "没再弹闸");
  ok(/离线/.test(await s.notices()), "条还在");
  await s.page.evaluate(() => localStorage.removeItem("__fake_offline"));
  await s.close();
}

console.log("⑤ 云端慢：点「先离线用」立刻放行；不点，8 s 自动进闸");
{
  const s = await scene();
  await s.prepare();
  s.drive.hangMeta = true;
  await s.reload("ok");
  await s.page.waitForFunction(() => !document.getElementById("syncGate").hidden && document.getElementById("syncGateTitle").textContent.includes("核对"), null, { timeout: 8000 });
  ok(await s.page.locator("#syncGateActions button", { hasText: "先离线用" }).isVisible(), "逃生钮在");
  const t0 = Date.now();
  await s.gateClick("先离线用");
  await s.gateDone(2000);
  ok(Date.now() - t0 < 1500, `放行 ${Date.now() - t0} ms`);
  eq(await s.gateUp(), false, "罩子收了");
  eq(await s.page.evaluate(() => globalThis.__catsup.gate.isUserOffline()), true, "离线");
  await s.draw(40); await sleep(200);
  ok((await s.rev()) > 0, "能编辑");
  // 不点：真等 8 s
  await s.page.evaluate(() => localStorage.setItem("__keep", "1"));
  await s.reload("ok");
  const t1 = Date.now();
  await s.page.waitForFunction(() => document.getElementById("syncGateTitle").textContent === "网盘没连上", null, { timeout: 14000 });
  const waited = Date.now() - t1;
  ok(waited > 6000 && waited < 13000, `自动进闸 ${waited} ms`);
  ok(/网盘没有回应/.test(await s.gateText()), "原因 = 网盘没有回应");
  await s.gateClick("离线继续"); await s.gateDone();
  await s.close();
}

console.log("同步闸门：云端有新 + 本机干净 → 拉取时罩 + 锁输入；拉完换上新的；半路「先离线用」→ 分叉，不碰原来的");
{
  // 拉取不挂起的正常路
  const n = await scene();
  await n.prepare();
  const k2 = await n.home();
  n.drive.bump(k2);
  let rel2; n.drive.hangDownload = new Promise((r) => { rel2 = r; });
  const pulling = n.page.evaluate(() => globalThis.__catsup.session.refreshOpenDoc());
  void pulling.then((st) => console.log("    refreshOpenDoc →", st));
  await n.page.waitForFunction(() => !document.getElementById("syncGate").hidden && document.getElementById("syncGateTitle").textContent.includes("更新"), null, { timeout: 8000 });
  ok(true, "拉取时罩子上来了");
  ok(await n.page.locator("#syncGateActions button", { hasText: "先离线用" }).isVisible(), "拉取时也有出口");
  const r1 = await n.rev();
  await n.page.keyboard.press("l");
  const b2 = await n.page.locator("#board").boundingBox();
  await n.page.mouse.move(b2.x + 300, b2.y + 300); await n.page.mouse.down(); await n.page.mouse.move(b2.x + 400, b2.y + 340, { steps: 4 }); await n.page.mouse.up();
  eq(await n.rev(), r1, "拉取时输入不进编辑器");
  rel2(); n.drive.hangDownload = null;
  eq(await pulling, "fast-forwarded", "拉完换上新的");
  eq(await n.gateUp(), false, "罩子收了");
  await n.close();
  // 半路逃走
  const e = await scene();
  await e.prepare();
  const k3 = await e.home();
  const cloudBytes = e.drive.items.get(k3).bytes;
  e.drive.bump(k3);
  const etagNow = e.drive.items.get(k3).eTag;
  let rel3; e.drive.hangDownload = new Promise((r) => { rel3 = r; });
  const pulling3 = e.page.evaluate(() => globalThis.__catsup.session.refreshOpenDoc());
  await e.page.waitForFunction(() => !document.getElementById("syncGate").hidden && document.getElementById("syncGateTitle").textContent.includes("更新"), null, { timeout: 8000 });
  await e.gateClick("先离线用");
  eq(await pulling3, "escaped", "库回 escaped，不等拉完");
  eq(await e.gateUp(), false, "放行");
  const fork = await e.home();
  ok(/分叉/.test(fork), "画布改挂分叉名：" + fork);
  eq(await e.page.evaluate(() => globalThis.__catsup.gate.isUserOffline()), true, "离线继续");
  ok(![...e.drive.items.keys()].some((k) => k.includes("分叉")), "没改过：不产生文件");
  await e.draw(80); await e.settled();
  const forkAfter = await e.home();
  ok(/分叉/.test(forkAfter), "第一笔之后存成分叉：" + forkAfter);
  rel3(); e.drive.hangDownload = null; await sleep(200);
  eq(e.drive.items.get(k3).eTag, etagNow, "云端原来那份版本号没变");
  ok(Buffer.compare(e.drive.items.get(k3).bytes, cloudBytes) === 0, "云端原来那份字节没变");
  await e.close();
}

await browser.close();
if (failures.length) { console.error(`\n✗ ${failures.length} 条没过：\n  - ` + failures.join("\n  - ")); process.exit(1); }
console.log("\n✓ probe-cloud-gate OK");
