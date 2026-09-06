#!/usr/bin/env node
// scripts/probe-boot.mjs —— headless 开机探针：起页、抓 console/pageerror、矩形+推拉一套手势、截图。
// created 2026-09-06 by Claude Fable 5.1（家规：不许把不确定性转嫁给人类真机——能 headless 先自己跑）
// 用法：先 python3 -m http.server 8765；node scripts/probe-boot.mjs [url] [outdir]
// 依赖：借 WeebPaint 的 playwright（家族兄弟仓 node_modules；本仓不装）。
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
const here = path.dirname(fileURLToPath(import.meta.url));
const wp = path.resolve(here, "../../20260524 WeebPaint");
const { chromium } = createRequire(path.join(wp, "package.json"))("playwright");

const url = process.argv[2] ?? "http://localhost:8765/";
const out = process.argv[3] ?? "/tmp";
const errors = [];
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 1200, height: 800 }, deviceScaleFactor: 2 });
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") errors.push(`console.${m.type()}: ${m.text()}`); });
await page.goto(url, { waitUntil: "load" });
await page.waitForTimeout(600);
const boot = await page.evaluate(() => ({ version: globalThis.__catsup?.version, build: document.getElementById("build")?.textContent, err: document.getElementById("errBanner")?.textContent ?? null }));
console.log("boot:", JSON.stringify(boot));
await page.screenshot({ path: path.join(out, "probe-1-boot.png") });

// 矩形：R 键，拖一个矩形（画布中心附近）
const canvas = page.locator("#board");
const box = await canvas.boundingBox();
const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
await page.keyboard.press("r");
await page.mouse.move(cx - 120, cy + 40);
await page.mouse.down();
await page.mouse.move(cx - 60, cy + 60, { steps: 5 });
await page.mouse.move(cx + 80, cy + 120, { steps: 10 });
await page.mouse.up();
await page.waitForTimeout(150);
const afterRect = await page.evaluate(() => ({ faces: globalThis.__catsup.editor.kernel.faces().length, edges: globalThis.__catsup.editor.kernel.edges().length }));
console.log("after rect:", JSON.stringify(afterRect));

// 推拉：P 键，按在面中心，向上拖
await page.keyboard.press("p");
const fx = cx - 20, fy = cy + 80;
await page.mouse.move(fx, fy);
await page.mouse.down();
await page.mouse.move(fx, fy - 60, { steps: 8 });
await page.mouse.move(fx, fy - 140, { steps: 8 });
await page.mouse.up();
await page.waitForTimeout(200);
const afterPP = await page.evaluate(() => ({ faces: globalThis.__catsup.editor.kernel.faces().length, edges: globalThis.__catsup.editor.kernel.edges().length, hint: document.getElementById("hint")?.textContent }));
console.log("after pp:", JSON.stringify(afterPP));
await page.screenshot({ path: path.join(out, "probe-2-box.png") });

// 菜单开合 + 视图切换 + 撤销
await page.click("#btnView");
await page.waitForTimeout(100);
await page.screenshot({ path: path.join(out, "probe-3-viewmenu.png") });
await page.keyboard.press("Escape");
await page.click("#btnMenu");
await page.waitForTimeout(100);
await page.screenshot({ path: path.join(out, "probe-4-menu.png") });
await page.keyboard.press("Escape");
await page.keyboard.press("Control+z");
const afterUndo = await page.evaluate(() => globalThis.__catsup.editor.kernel.faces().length);
console.log("after undo faces:", afterUndo);

await browser.close();
if (errors.length) { console.log("ERRORS:\n" + errors.join("\n")); process.exit(1); }
console.log("probe ok, no console/page errors");
