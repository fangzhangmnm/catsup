// 视图 ☰ 的单选组 = 一行下拉（user 2026-10-25「线稿粗细，单位都做成下拉框，整个汉堡目录排查一下，能下拉框的就做，以及也许可以做成那种可以滚动可以点开的下拉框」）：
// 名字 + 当前值 ▾；点开旁边一层（choice-layer.ts），选了生效、层关、☰ 留着且值跟着变；再点同一行 = 收起；Esc 先收层再收菜单。created 2026-10-25 by Claude Opus 5.5
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const url = process.argv[2] ?? "http://127.0.0.1:8765/";
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 1000, height: 800 } });
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(url, { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1000);
const w = (ms) => page.waitForTimeout(ms);
const val = (id) => page.evaluate((id) => document.querySelector(`.popup-menu:not(.choice-layer) [data-menu-id="${id}"] .menu-value`)?.textContent ?? null, id);
const state = () => page.evaluate(() => ({ menu: !!document.querySelector(".popup-menu:not(.choice-layer)"), layer: document.querySelectorAll(".choice-layer").length, g: globalThis.__catsup.editor.grid, screen: globalThis.__catsup.editor.renderer3.getScreen(), unit: globalThis.__catsup.editor.vcbUnit }));
const res = {};
await page.click(".gizmo-menu"); await w(120);
await page.click('.popup-menu [data-menu-tab="display"]'); await w(80);
res.flatRows = await page.evaluate(() => document.querySelectorAll('.popup-menu [data-menu-id^="screen:"]:not([data-menu-id="screen:pick"]), .popup-menu [data-menu-id^="unit:"]:not([data-menu-id="unit:pick"])').length);   // 平铺的单选行没了
await page.click('[data-menu-id="screen:pick"]'); await w(100);
res.lwOpen = await state();
await page.click('.choice-layer [data-choice-id="screen:pixel2"]'); await w(100);
res.lwAfter = { ...(await state()), val: await val("screen:pick") };
await page.click('[data-menu-id="unit:pick"]'); await w(80);
await page.click('[data-menu-id="unit:pick"]'); await w(80);   // 再点同一行 = 收起
res.unitToggle = await state();
await page.click('[data-menu-id="unit:pick"]'); await w(80);
await page.click('.choice-layer [data-choice-id="unit:cm"]'); await w(80);
res.unitAfter = { ...(await state()), val: await val("unit:pick") };
await page.click('.popup-menu [data-menu-tab="grid"]'); await w(80);
await page.click('[data-menu-id="preset:si"]'); await w(80);
await page.click('.choice-layer [data-choice-id="preset:dnd"]'); await w(100);
res.preset = { ...(await state()), val: await val("preset:si"), step: await page.evaluate(() => document.querySelector('.popup-menu [data-menu-id^="step:"] .menu-value')?.textContent) };
await page.click('[data-menu-id="plane:xy"]'); await w(80);
await page.keyboard.press("Escape"); await w(60);
res.esc1 = await state();
await page.keyboard.press("Escape"); await w(60);
res.esc2 = await state();
console.log(JSON.stringify(res));
const ok = res.flatRows === 0
  && res.lwOpen.menu && res.lwOpen.layer === 1
  && res.lwAfter.screen === "pixel2" && res.lwAfter.menu && res.lwAfter.layer === 0 && res.lwAfter.val === "像素 ×2"
  && res.unitToggle.layer === 0 && res.unitToggle.menu
  && res.unitAfter.unit === "cm" && res.unitAfter.val === "厘米"
  && res.preset.g.preset === "dnd" && res.preset.val === "D&D 格子" && /^5'/.test(res.preset.step ?? "")
  && res.esc1.menu && res.esc1.layer === 0 && !res.esc2.menu
  && !errs.length;
if (errs.length) console.log(errs);
console.log(ok ? "PROBE OK" : "PROBE FAIL");
await b.close(); process.exit(ok ? 0 : 1);
