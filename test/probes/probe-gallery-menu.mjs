// 图库页 ☰（F-81，user 2026-10-25「图库页的 ☰：还没加。 做」）：回收站 / 使用手册 / 调试日志 / 强制更新；手册面板要浮在图库上面。created 2026-10-25 by Claude Opus 5.5
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const url = process.argv[2] ?? "http://127.0.0.1:8765/";
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
// v0.18.27 起图库必须先有家（没选家时点「图库」先弹「选家」的面板）：先用假选夹（OPFS 子目录，照 probe-folder-home）选好文件夹家，再从 ☰ 开图库（2026-11-11 改）
const FAKE_FSA = (folder) => {
  window.showDirectoryPicker = async () => (await navigator.storage.getDirectory()).getDirectoryHandle(folder, { create: true });
  const P = globalThis.FileSystemHandle?.prototype;
  if (P) { P.queryPermission = async () => "granted"; P.requestPermission = async () => "granted"; }
};
const ctx = await b.newContext({ viewport: { width: 1000, height: 800 } });
await ctx.addInitScript(FAKE_FSA, "gallery-menu");
const page = await ctx.newPage();
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(url, { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1500);
void page.evaluate(() => { void globalThis.__catsup.home.openGallery(); });
await page.waitForFunction(() => !document.getElementById("sheet").hidden, null, { timeout: 8000 });
{ const nav = page.waitForEvent("load"); await page.click(`#sheetChoices button:has-text("选一个文件夹")`); await nav; await page.waitForFunction(() => globalThis.__catsup?.session && globalThis.__catsup.home); await page.waitForTimeout(900); }
await page.evaluate(() => { for (const n of [...document.querySelectorAll("#noticeStack > *")]) n.remove(); if (!document.getElementById("galleryFull").hidden) document.getElementById("galleryClose")?.click(); });
await page.waitForTimeout(200);
const res = {};
await page.click("#btnMenu"); await page.waitForTimeout(100);
await page.click(".menu-item:has-text('图库')"); await page.waitForTimeout(500);
res.galleryOpen = await page.evaluate(() => !document.getElementById("galleryFull").hidden);
res.trashIconHidden = await page.evaluate(() => document.getElementById("galleryTrashBtn").hidden);
await page.click("#galleryMenuBtn"); await page.waitForTimeout(120);
res.items = await page.evaluate(() => [...document.querySelectorAll(".popup-menu .menu-label")].map((x) => x.textContent));
await page.click(".popup-menu .menu-item:has-text('回收站')"); await page.waitForTimeout(200);
res.trashBar = await page.evaluate(() => !document.getElementById("galleryTrashBar").hidden);
await page.click("#galleryMenuBtn"); await page.waitForTimeout(120);
await page.click(".popup-menu .menu-item:has-text('使用手册')"); await page.waitForTimeout(300);
res.helpHidden = await page.evaluate(() => document.getElementById("helpSheet").hidden);
res.helpOnTop = await page.evaluate(() => { const h = document.getElementById("helpClose"); if (!h) return "no helpClose"; const r = h.getBoundingClientRect(); if (!r.width) return "help not shown"; const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!top && (top === h || h.contains(top)); });
console.log(JSON.stringify(res));
const ok = res.galleryOpen && res.trashIconHidden && res.items.join() === "回收站,备份箱,使用手册,调试日志,强制更新"   /* 备份箱 = 冲突面里换下的那一版（v0.13.76 迁库加的；探针 v0.14.54 跟上，Claude Opus 5.5） */ && res.trashBar && res.helpOnTop === true;
console.log(errs.length ? "PAGEERRORS:\n" + errs.join("\n") : "(no page errors)"); console.log(ok ? "PROBE OK" : "PROBE FAIL");
await b.close(); process.exit(ok ? 0 : 1);
