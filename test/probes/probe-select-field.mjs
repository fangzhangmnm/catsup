// 下拉标准件（B40）：页面里没有原生 <select>；编辑模式下拉点开 = 弹层、点「表面」= 切到表面模式；工具选项条的枚举也是标准件；单位在 ☰ 视图菜单里一排可勾选。created 2026-10-24 by Claude Opus 5.5
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const url = process.argv[2] ?? "http://127.0.0.1:8765/";
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 1000, height: 800 } });
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(url, { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1500); await page.evaluate(() => globalThis.__catsup?.editor?.setGrid({ on: false }));   // v0.13.64 新文档吸附默认开；本探针测的不是栅格
const res = {};
res.nativeSelects = await page.evaluate(() => document.querySelectorAll("select").length);
res.modeFace0 = await page.locator("#modeSelect").textContent();
await page.locator("#modeSelect").click(); await page.waitForTimeout(150);
const surf = page.locator("button", { hasText: "表面" }).last();
res.menuHasSurface = await surf.count();
if (res.menuHasSurface) { await surf.click(); await page.waitForTimeout(150); }
res.modeAfter = await page.evaluate(() => globalThis.__catsup.editor.modeId);
res.modeFace1 = await page.locator("#modeSelect").textContent();
await page.evaluate(() => globalThis.__catsup.editor.setMode("geometry"));
// 工具选项条：圆工具有「段数」之类的枚举？任挑一个带 enum 的工具，数 .strip-select.select-field
res.stripFields = await page.evaluate(async () => { const out = {}; for (const t of ["rect", "arc", "circle", "erase", "paint", "select"]) { globalThis.__catsup.hud.pick(t); await new Promise((r) => setTimeout(r, 60)); out[t] = document.querySelectorAll(".strip-select.select-field").length; } return out; });
res.nativeSelects2 = await page.evaluate(() => document.querySelectorAll("select").length);
// ☰ 视图菜单：单位一排可勾选，点「英尺英寸」→ vcbUnit = ft
await page.evaluate(() => globalThis.__catsup.hud.pick("select"));
await page.locator('#viewGizmo .gizmo-btn[title="视图"]').click(); await page.waitForTimeout(150);
const ftItem = page.locator("button", { hasText: "英尺英寸" }).last();
res.unitItem = await ftItem.count();
if (res.unitItem) { await ftItem.click(); await page.waitForTimeout(120); }
res.unitAfter = await page.evaluate(() => globalThis.__catsup.editor.vcbUnit);
console.log(JSON.stringify(res));
const ok = res.nativeSelects === 0 && res.nativeSelects2 === 0 && res.menuHasSurface > 0 && res.modeAfter !== "geometry" && res.modeFace0 !== res.modeFace1 && Object.values(res.stripFields).some((n) => n > 0) && res.unitItem > 0 && res.unitAfter === "ft";
console.log(errs.length ? "PAGEERRORS:\n" + errs.join("\n") : "(no page errors)"); console.log(ok ? "PROBE OK" : "PROBE FAIL");
await b.close(); process.exit(ok ? 0 : 1);
