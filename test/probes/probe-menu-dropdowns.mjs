// 单选组 = 一行下拉（视图窗只剩「渲染」一页、不画页签条；单位制 / 吸附 / 栅格面 10-30 搬进 ☰「单位」页）（user 2026-10-25「线稿粗细，单位都做成下拉框，整个汉堡目录排查一下，能下拉框的就做，以及也许可以做成那种可以滚动可以点开的下拉框」）：
// 名字 + 当前值 ▾；点开旁边一层（choice-layer.ts），选了生效、层关、☰ 留着且值跟着变；再点同一行 = 收起；Esc 先收层再收菜单。created 2026-10-25 by Claude Opus 5.5
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const url = process.argv[2] ?? "http://127.0.0.1:8765/";
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 1000, height: 800 } });
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(url, { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1000);
const w = (ms) => page.waitForTimeout(ms);
const W = '.float-win[data-win="view"]';   // 视图 = 常驻浮窗（v0.17.54）
const val = (id) => page.evaluate(([W, id]) => document.querySelector(`${W} [data-menu-id="${id}"] .menu-value`)?.textContent ?? null, [W, id]);
const M = '.popup-menu:not(.choice-layer)';   // ☰
const state = () => page.evaluate((W) => ({ win: !!document.querySelector(`${W}:not([hidden])`), menu: !!document.querySelector('.popup-menu:not(.choice-layer)'), layer: document.querySelectorAll(".choice-layer").length, g: globalThis.__catsup.editor.grid, screen: globalThis.__catsup.editor.renderer3.getScreen() }), W);
const res = {};
await page.click(".gizmo-menu"); await w(150);
res.tabs = await page.evaluate((W) => [...document.querySelectorAll(`${W} .menu-tab`)].map((t) => t.textContent).join(","), W);
// 视图窗只剩一页、没页签条（10-30 单位搬进 ☰）
res.renderRows = await page.evaluate((W) => [...document.querySelectorAll(`${W} .menu-item`)].map((x) => x.dataset.menuId).join(","), W);   // 只管画风：风格 / 屏幕 / 选中色（user 10-30）
await page.click(`${W} [data-menu-id="screen:pick"]`); await w(100);
res.lwOpen = await state();
await page.click('.choice-layer [data-choice-id="screen:pixel2"]'); await w(100);
res.lwAfter = { ...(await state()), val: await val("screen:pick") };
await page.click("#btnMenu"); await w(120); await page.click(`${M} [data-menu-tab="units"]`); await w(80);
const sysRow = await page.evaluate((M) => document.querySelector(`${M} [data-menu-id^="sys:"]`)?.dataset.menuId, M);
await page.click(`${M} [data-menu-id="${sysRow}"]`); await w(80);
await page.click(`${M} [data-menu-id="${sysRow}"]`); await w(80);   // 再点同一行 = 收起
res.toggle = await state();
await page.click(`${M} [data-menu-id="${sysRow}"]`); await w(80);
await page.click('.choice-layer [data-choice-id="sys:dnd"]'); await w(100);
res.dnd = { ...(await state()), sys: await page.evaluate((M) => document.querySelector(`${M} [data-menu-id^="sys:"] .menu-value`)?.textContent, M), snap: await page.evaluate((M) => document.querySelector(`${M} [data-menu-id^="snap:"] .menu-value`)?.textContent, M) };
const planeRow = await page.evaluate((M) => document.querySelector(`${M} [data-menu-id^="plane:"]`)?.dataset.menuId, M);
await page.click(`${M} [data-menu-id="${planeRow}"]`); await w(80);
await page.click('.choice-layer [data-choice-id="plane:off"]'); await w(100);
res.off = { ...(await state()), val: await page.evaluate((M) => document.querySelector(`${M} [data-menu-id^="plane:"] .menu-value`)?.textContent, M) };
await page.click(`${M} [data-menu-id="plane:off"]`); await w(80);
await page.keyboard.press("Escape"); await w(60);
res.esc1 = await state();
console.log(JSON.stringify(res));
const ok = res.tabs === "" && res.renderRows === "style:pick,screen:pick,accent:pick"
  && res.lwOpen.win && res.lwOpen.layer === 1
  && res.lwAfter.screen === "pixel2" && res.lwAfter.win && res.lwAfter.layer === 0 && res.lwAfter.val === "像素 ×2"
  && res.toggle.layer === 0 && res.toggle.menu
  && res.dnd.g.system === "dnd" && res.dnd.sys === "D&D" && res.dnd.snap === "1 ft"
  && res.off.g.shown === false && res.off.val === "关"
  && res.esc1.menu && res.esc1.layer === 0
  && !errs.length;
if (errs.length) console.log(errs);
console.log(ok ? "PROBE OK" : "PROBE FAIL");
await b.close(); process.exit(ok ? 0 : 1);
