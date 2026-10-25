#!/usr/bin/env node
// test/probes/probe-push-ask.mjs —— 「登录后问一次」headless 探针（user 2026-10-25「好，同意……但是必须护栏冲突」）：
//   没登录时存一个模型（= 只在本机、dirty 1）→ 走问话（dev 钩子跳过「已登录」前置）→ 「先不」什么都不动 → 再问 → 「传」→ pushAll 推不上去（没登录 = 云不可达）
//   → 如实报「1 个没传成」、文件仍 dirty、几何没动。验的是护栏那半：失败的留在本机、不覆盖、不撒谎。真登录态的「传上去」只能真机。
// 用法：python3 -m http.server 8765 后 `node test/probes/probe-push-ask.mjs [url]`（≈ 5 s）。created 2026-10-25 by Claude Fable 5.1
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
const here = path.dirname(fileURLToPath(import.meta.url));
const { chromium } = createRequire(path.join(here, "../../../20260524 WeebPaint/package.json"))("playwright");
const url = process.argv[2] ?? "http://127.0.0.1:8765/";
const BENIGN = /Not signed in|CloudNetworkError|Failed to fetch|net::ERR|msal|favicon|GPU stall due to ReadPixels|not persisted yet/i;
const errors = [];
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const ctx = await browser.newContext({ viewport: { width: 1100, height: 720 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
page.on("console", (m) => { if ((m.type() === "error" || m.type() === "warning") && !BENIGN.test(m.text())) errors.push(`console.${m.type()}: ${m.text()}`); });
const fail = (msg) => { console.error("✗", msg); process.exitCode = 1; };
const eq = (a, b, what) => { if (a !== b) fail(`${what}: expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); else console.log("  ✓", what); };
const dirtyCount = () => page.evaluate(() => globalThis.__catsup.store().files.dirty.count());
const notices = () => page.evaluate(() => document.getElementById("noticeStack")?.textContent ?? "");

await page.goto(url, { waitUntil: "load" });
await page.waitForFunction(() => globalThis.__catsup?.session);
// 没登录时存一个模型 → 只在本机
await page.evaluate(() => globalThis.__catsup.galleryHost.open());
await page.waitForFunction(() => !document.getElementById("galleryFull").hidden);
await page.click("#galleryNew");
await page.waitForFunction(() => globalThis.__catsup.session.home.kind === "gallery" && document.getElementById("galleryFull").hidden);
const box = await page.locator("#board").boundingBox();
const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
await page.evaluate(() => globalThis.__catsup.editor.setTool("rect"));
await page.mouse.move(cx - 100, cy - 60); await page.mouse.down(); await page.mouse.move(cx + 100, cy + 20, { steps: 10 }); await page.mouse.up();
await page.waitForFunction(() => !globalThis.__catsup.session.lazy && !globalThis.__catsup.session.saving && !globalThis.__catsup.session.dirty(), null, { timeout: 10000 });
eq(await dirtyCount(), 1, "one model is local-only (dirty) after saving signed-out");
eq(await page.evaluate(() => globalThis.__catsup.session.pushPending), true, "session knows the push is pending");
// 没登录 / 没 force：问话不该出现（前置挡住）
await page.evaluate(() => window.dispatchEvent(new Event("online")));
await page.waitForTimeout(400);
eq(await page.evaluate(() => document.getElementById("sheet").hidden), true, "signed-out: no ask sheet on 'online'");

// ① 「先不」
let done = page.evaluate(() => globalThis.__catsup.devPushAsk());
await page.waitForSelector("#sheet:not([hidden])");
eq(await page.evaluate(() => document.getElementById("sheetTitle").textContent), "有模型还没传上去", "ask sheet title");
const msg = await page.evaluate(() => document.getElementById("sheetMessage").textContent);
eq(/有 1 个模型只在这台设备上/.test(msg), true, "ask says 1 local-only model");
eq(/不会被覆盖/.test(msg), true, "ask states the conflict guard (cloud-newer files are not overwritten)");
eq(await page.evaluate(() => document.getElementById("sheetConfirm").textContent), "传", "ok label = 传");
eq(await page.evaluate(() => document.getElementById("sheetCancel").textContent), "先不", "cancel label = 先不");
await page.click("#sheetCancel"); await done;
eq(await dirtyCount(), 1, "「先不」→ still dirty, nothing pushed");

// ② 「传」——没登录 = 云不可达 → 库每个文件 If-Match 推失败 → 留 dirty、进 failed、如实报
done = page.evaluate(() => globalThis.__catsup.devPushAsk());
await page.waitForSelector("#sheet:not([hidden])");
await page.click("#sheetConfirm"); await done;
await page.waitForFunction(() => /没传成/.test(document.getElementById("noticeStack")?.textContent ?? ""), null, { timeout: 10000 }).catch(() => {});
const n = await notices();
eq(/传上去 0 个；1 个没传成/.test(n), true, `honest report: 0 pushed, 1 failed (${n.slice(0, 80)})`);
eq(/留在本机没动/.test(n), true, "report says the failed one stays untouched on this device");
eq(await dirtyCount(), 1, "failed push leaves the file dirty (not dropped, not overwritten)");
eq(await page.evaluate(() => globalThis.__catsup.session.pushPending), true, "session still shows push pending");
eq(await page.evaluate(() => globalThis.__catsup.editor.kernel.faces().length), 1, "geometry untouched");

await browser.close();
if (errors.length) { console.error("✗ page errors / console noise:\n  " + errors.join("\n  ")); process.exitCode = 1; }
else console.log(process.exitCode ? "probe FAILED" : "probe ok, no page errors");
