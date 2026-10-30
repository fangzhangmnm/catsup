// 视图窗口的单选组 = 一行下拉（2026-10-30 改：渲染 / 单位 / 参考三页、单位制 / 吸附 / 栅格面）（user 2026-10-25「线稿粗细，单位都做成下拉框，整个汉堡目录排查一下，能下拉框的就做，以及也许可以做成那种可以滚动可以点开的下拉框」）：
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
const state = () => page.evaluate((W) => ({ win: !!document.querySelector(`${W}:not([hidden])`), layer: document.querySelectorAll(".choice-layer").length, g: globalThis.__catsup.editor.grid, screen: globalThis.__catsup.editor.renderer3.getScreen() }), W);
const res = {};
await page.click(".gizmo-menu"); await w(150);
res.tabs = await page.evaluate((W) => [...document.querySelectorAll(`${W} .menu-tab`)].map((t) => t.textContent).join(","), W);
await page.click(`${W} [data-menu-tab="render"]`); await w(80);
res.renderRows = await page.evaluate((W) => [...document.querySelectorAll(`${W} .menu-item`)].map((x) => x.dataset.menuId).join(","), W);   // 只管画风：风格 / 屏幕 / 选中色（user 10-30）
await page.click(`${W} [data-menu-id="screen:pick"]`); await w(100);
res.lwOpen = await state();
await page.click('.choice-layer [data-choice-id="screen:pixel2"]'); await w(100);
res.lwAfter = { ...(await state()), val: await val("screen:pick") };
await page.click(`${W} [data-menu-tab="units"]`); await w(80);
const sysRow = await page.evaluate((W) => document.querySelector(`${W} [data-menu-id^="sys:"]`)?.dataset.menuId, W);
await page.click(`${W} [data-menu-id="${sysRow}"]`); await w(80);
await page.click(`${W} [data-menu-id="${sysRow}"]`); await w(80);   // 再点同一行 = 收起
res.toggle = await state();
await page.click(`${W} [data-menu-id="${sysRow}"]`); await w(80);
await page.click('.choice-layer [data-choice-id="sys:dnd"]'); await w(100);
res.dnd = { ...(await state()), sys: await page.evaluate((W) => document.querySelector(`${W} [data-menu-id^="sys:"] .menu-value`)?.textContent, W), snap: await page.evaluate((W) => document.querySelector(`${W} [data-menu-id^="snap:"] .menu-value`)?.textContent, W) };
const planeRow = await page.evaluate((W) => document.querySelector(`${W} [data-menu-id^="plane:"]`)?.dataset.menuId, W);
await page.click(`${W} [data-menu-id="${planeRow}"]`); await w(80);
await page.click('.choice-layer [data-choice-id="plane:off"]'); await w(100);
res.off = { ...(await state()), val: await page.evaluate((W) => document.querySelector(`${W} [data-menu-id^="plane:"] .menu-value`)?.textContent, W) };
await page.click(`${W} [data-menu-id="plane:off"]`); await w(80);
await page.keyboard.press("Escape"); await w(60);
res.esc1 = await state();
console.log(JSON.stringify(res));
const ok = res.tabs === "渲染,单位,参考" && res.renderRows === "style:pick,screen:pick,accent:pick"
  && res.lwOpen.win && res.lwOpen.layer === 1
  && res.lwAfter.screen === "pixel2" && res.lwAfter.win && res.lwAfter.layer === 0 && res.lwAfter.val === "像素 ×2"
  && res.toggle.layer === 0 && res.toggle.win
  && res.dnd.g.system === "dnd" && res.dnd.sys === "D&D" && res.dnd.snap === "1 ft"
  && res.off.g.shown === false && res.off.val === "关"
  && res.esc1.win && res.esc1.layer === 0
  && !errs.length;
if (errs.length) console.log(errs);
console.log(ok ? "PROBE OK" : "PROBE FAIL");
await b.close(); process.exit(ok ? 0 : 1);
