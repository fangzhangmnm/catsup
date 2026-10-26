#!/usr/bin/env node
// test/probes/probe-push-ask.mjs —— 「登录后有没同步好的 → 通知 → 去处理 → 图库『要处理的』视图」headless 探针。
//   2026-10-25 版验的是「问一次 → pushAll」是 / 否框；2026-10-26 user「列表面」后改成：没登录时存一个模型（= 只在本机、dirty 1）→ 走提示（dev 钩子跳过「已登录」前置）
//   → 不弹 sheet、出一条带「去处理」钮的常驻通知 → 点它 → 图库开着、顶部横幅「有 1 份没同步好」、那张卡右下角一粒可见的「处理…」钮 → 点它（没登录 = 云不可达）
//   → 库如实说离线、不撒谎、文件仍 dirty、几何没动。真登录态的三选一只能真机。
// 用法：python3 -m http.server 8765 后 `node test/probes/probe-push-ask.mjs [url]`（≈ 5 s）。created 2026-10-25 by Claude Fable 5.1 · rewritten 2026-10-26 by Claude Fable 5.1
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
// 没登录 / 没 force：提示不该出现（前置挡住）
await page.evaluate(() => window.dispatchEvent(new Event("online")));
await page.waitForTimeout(400);
eq(await page.evaluate(() => document.getElementById("sheet").hidden), true, "signed-out: no sheet on 'online'");
eq(/没同步好/.test(await notices()), false, "signed-out: no unsynced notice on 'online'");

// ① 提示：一条常驻通知 + 「去处理」钮，不是是 / 否框，不批量推
await page.evaluate(() => globalThis.__catsup.devPushAsk());
await page.waitForFunction(() => /没同步好/.test(document.getElementById("noticeStack")?.textContent ?? ""), null, { timeout: 5000 });
eq(await page.evaluate(() => document.getElementById("sheet").hidden), true, "no modal sheet (notice instead)");
const n1 = await notices();
eq(/有 1 个模型没同步好/.test(n1), true, `notice says 1 unsynced (${n1.slice(0, 60)})`);
eq(/每一个都会问你/.test(n1), true, "notice says each one will ask you which side");
eq(await page.evaluate(() => !!document.querySelector("#noticeStack button")), true, "notice has a button");
eq(await dirtyCount(), 1, "nothing pushed by the notice itself");

// ② 「去处理」→ 图库打开。**没登录时图库库不把任何卡算成「要处理」**（gallery 0.8.8：attention = 登录态 ∧ float / dirtyBoth / conflictBoth / ghost / pendingGone；
//   没有云端就没有「没同步好」），所以顶部横幅 / 卡片上的「处理…」钮在这条无头探针里看不到——那半由图库库自己的单测钉着（tileFor.attention），
//   端到端只能真机（登录态）。这里只验：通知的钮真把人带进图库、不弹 sheet、不动字节、没有 busy 死锁。
await page.click("#noticeStack button");
await page.waitForFunction(() => !document.getElementById("galleryFull").hidden, null, { timeout: 5000 });
console.log("  ✓ 去处理 opens the gallery");
await page.waitForFunction(() => document.querySelectorAll(".gallery-tile").length >= 1, null, { timeout: 5000 });
eq(await page.evaluate(() => document.getElementById("sheet").hidden), true, "no modal sheet after opening the gallery");
eq(/没同步好/.test(await notices()), false, "the unsynced notice closed itself once acted on");
eq(await dirtyCount(), 1, "still dirty (not dropped, not overwritten)");
eq(await page.evaluate(() => globalThis.__catsup.editor.kernel.faces().length), 1, "geometry untouched");
eq(errors.some((e) => /deadlock/.test(e)), false, "no busy-overlay deadlock");

await browser.close();
if (errors.length) { console.error("✗ page errors / console noise:\n  " + errors.join("\n  ")); process.exitCode = 1; }
else console.log(process.exitCode ? "probe FAILED" : "probe ok, no page errors");
