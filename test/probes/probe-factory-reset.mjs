#!/usr/bin/env node
// test/probes/probe-factory-reset.mjs —— 还原出厂（家规 2½）headless 探针：挂图库 + 存一个模型 + 开过图库（缩略图库被本页占着）→ ☰ 设置 → 还原出厂设置…
//   两步护栏（先故意输错 → 什么都没动；再输对）→ reload 带 ?factory= → store 命名空间 / 自家三个 GUID 库 / 回执条全没、session 回到新装、通知「已还原出厂设置」。
// 用法：python3 -m http.server 8765 后 `node test/probes/probe-factory-reset.mjs [url]`（≈ 10 s；localhost 不注册 SW，壳缓存那一步只能真机看）。created 2026-10-25 by Claude Fable 5.1
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
const here = path.dirname(fileURLToPath(import.meta.url));
const { chromium } = createRequire(path.join(here, "../../../20260524 WeebPaint/package.json"))("playwright");
const url = process.argv[2] ?? "http://127.0.0.1:8765/";
const BENIGN = /Not signed in|CloudNetworkError|Failed to fetch|net::ERR|msal|favicon|GPU stall due to ReadPixels|not persisted yet|\[factory-reset\]/i;
const errors = [];
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const ctx = await browser.newContext({ viewport: { width: 1100, height: 720 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
page.on("console", (m) => { if ((m.type() === "error" || m.type() === "warning") && !BENIGN.test(m.text())) errors.push(`console.${m.type()}: ${m.text()}`); });
const fail = (msg) => { console.error("✗", msg); process.exitCode = 1; };
const eq = (a, b, what) => { if (a !== b) fail(`${what}: expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); else console.log("  ✓", what); };
const OWN_PREFIX = "catsup-7c1f0d2e9a4b6c58";
const dbNames = () => page.evaluate(async () => (await indexedDB.databases()).map((d) => d.name).filter((n) => n && n.startsWith("catsup")).sort());
const lsKeys = () => page.evaluate(() => { const out = []; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith("catsup")) out.push(k); } return out.sort(); });

await page.goto(url, { waitUntil: "load" });
await page.waitForFunction(() => globalThis.__catsup?.session);
// ① 挂图库 + 存一个模型（首笔安家 = store 库出生 + 本地副本；未登录 = 这就是「只在本机」）
await page.evaluate(() => globalThis.__catsup.galleryHost.open());
await page.waitForFunction(() => !document.getElementById("galleryFull").hidden);
await page.click("#galleryNew");
await page.waitForFunction(() => globalThis.__catsup.session.home.kind === "gallery" && document.getElementById("galleryFull").hidden);
const box = await page.locator("#board").boundingBox();
const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
await page.evaluate(() => globalThis.__catsup.editor.setTool("rect"));
await page.mouse.move(cx - 100, cy - 60); await page.mouse.down(); await page.mouse.move(cx + 100, cy + 20, { steps: 10 }); await page.mouse.up();
await page.waitForFunction(() => !globalThis.__catsup.session.lazy && !globalThis.__catsup.session.saving && !globalThis.__catsup.session.dirty(), null, { timeout: 10000 });
const gpath = await page.evaluate(() => globalThis.__catsup.session.home.path);
// ② 开一次图库让缩略图库在本页被打开（= 还原时会 blocked 的那种连接），再关
await page.evaluate(() => globalThis.__catsup.galleryHost.open());
await page.waitForFunction(() => document.querySelectorAll("#galleryMount img").length >= 1, null, { timeout: 10000 }).catch(() => {});
await page.evaluate(() => globalThis.__catsup.galleryHost.close());
const before = { dbs: await dbNames(), ls: await lsKeys() };
console.log("  · before:", JSON.stringify(before));
eq(before.dbs.includes("catsup.defaultStore"), true, "store db exists before reset");
eq(before.dbs.includes(`${OWN_PREFIX}.thumbs`), true, "thumb db exists before reset (opened by this page)");
eq(before.ls.some((k) => k.startsWith("catsup.defaultStore")), true, "store kv keys exist before reset");
eq(before.ls.includes(`${OWN_PREFIX}:gallery-attached`), true, "device-kv gallery-attached flag exists before reset");

// ③ 第一轮：故意输错 → 什么都没动
await page.evaluate(() => globalThis.__catsup.factoryReset());
await page.waitForSelector("#sheet:not([hidden])");
eq(await page.evaluate(() => document.getElementById("sheetTitle").textContent), "还原出厂设置", "step 1 sheet title");
const intro = await page.evaluate(() => document.getElementById("sheetMessage").textContent);
eq(/有 1 个模型还没传上去/.test(intro), true, `step 1 warns about the 1 unsynced model (${intro.slice(0, 60)}…)`);
eq(await page.evaluate(() => document.getElementById("sheetConfirm").textContent), "继续", "step 1 ok label = 继续");
await page.click("#sheetConfirm");
await page.waitForFunction(() => !document.getElementById("sheetInput").hidden);
eq(await page.evaluate(() => document.getElementById("sheetConfirm").textContent), "还原出厂设置", "step 2 ok label");
await page.fill("#sheetInput", "随便打点什么");
await page.click("#sheetConfirm");
await page.waitForFunction(() => document.getElementById("sheet").hidden);
await page.waitForTimeout(300);
eq((await page.evaluate(() => document.getElementById("noticeStack")?.textContent ?? "")).includes("输入不一致，什么都没动"), true, "mismatch → notice, nothing changed");
eq(JSON.stringify(await dbNames()), JSON.stringify(before.dbs), "dbs untouched after mismatch");
eq(await page.evaluate(() => globalThis.__catsup.session.home.kind), "gallery", "session still at gallery home after mismatch");

// ④ 第二轮：输对 → wipe → 带 ?factory= reload → 开机收尾
await page.evaluate(() => globalThis.__catsup.factoryReset());
await page.waitForSelector("#sheet:not([hidden])");
await page.click("#sheetConfirm");
await page.waitForFunction(() => !document.getElementById("sheetInput").hidden);
await page.fill("#sheetInput", "还原出厂");
await Promise.all([page.waitForURL(/\?factory=\d+/, { timeout: 15000 }), page.click("#sheetConfirm")]);
await page.waitForFunction(() => globalThis.__catsup?.session, null, { timeout: 15000 });
await page.waitForFunction(() => (document.getElementById("noticeStack")?.textContent ?? "").includes("已还原出厂设置"), null, { timeout: 10000 }).catch(() => {});
const notice = await page.evaluate(() => document.getElementById("noticeStack")?.textContent ?? "");
eq(notice.includes("已还原出厂设置"), true, `boot notice says reset done (${notice.slice(0, 80)})`);
eq(/\?factory=/.test(page.url()), false, "marker stripped from the address bar");
const after = { dbs: await dbNames(), ls: await lsKeys() };
console.log("  · after:", JSON.stringify(after));
// 开机扫描会重新建一个空的崩溃影子库（新装也一样）；其余——store 库 / 缩略图 / 名册——必须全没
eq(JSON.stringify(after.dbs.filter((n) => n !== `${OWN_PREFIX}.crash`)), "[]", "no store / thumbs / gallery-registry databases remain (only the fresh empty crash db)");
eq((await page.evaluate(() => globalThis.__catsup.crash.listAtBoot())).length, 0, "crash db is empty after reset");
eq(after.ls.some((k) => k.startsWith("catsup.defaultStore")), false, "no store kv keys remain");
eq(after.ls.includes(`${OWN_PREFIX}:gallery-attached`), false, "gallery-attached flag gone (fresh install)");
eq(await page.evaluate(() => globalThis.__catsup.store()), null, "no store attached after reset");
eq(await page.evaluate(() => globalThis.__catsup.session.home.kind), "transient", "session boots as fresh transient");
eq(await page.evaluate(() => globalThis.__catsup.editor.kernel.faces().length), 0, "empty scene");
// 旧模型的身份不再出现在任何地方（store 库没了 → 列不出来；这里只验回执条没把它带回来）
eq(await page.evaluate(() => (globalThis.__catsup.session.home.path ?? null)), null, `old doc ${gpath} not restored`);

await browser.close();
if (errors.length) { console.error("✗ page errors / console noise:\n  " + errors.join("\n  ")); process.exitCode = 1; }
else console.log(process.exitCode ? "probe FAILED" : "probe ok, no page errors");
