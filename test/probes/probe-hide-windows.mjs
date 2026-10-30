// test/probes/probe-hide-windows.mjs —— 一键藏起所有窗（ui/hide-windows.ts；四指轻点 / \ 键）。无头。created 2026-10-30 by Claude Opus 5.5
// user 10-30「以后可以加一个「一键藏起所有窗」，像 Procreate 四指轻点全屏。 现在就可以做」。
import { createRequire } from "node:module";
const { chromium } = createRequire(new URL("../../../20260524 WeebPaint/package.json", import.meta.url))("playwright");
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 1000, height: 800 } });
const errs = []; page.on("pageerror", (e) => errs.push(e.message));
await page.goto(process.argv[2] ?? "http://127.0.0.1:8765/", { waitUntil: "load" }); await page.waitForTimeout(700);
const fails = []; const check = (ok, msg) => { console.log((ok ? "  ✓ " : "  ✗ ") + msg); if (!ok) fails.push(msg); };
const vis = () => page.evaluate(() => ({ hier: (() => { const el = document.querySelector('.float-win[data-win="hierarchy"]'); return !!el && getComputedStyle(el).display !== "none" && !el.hidden; })(), view: (() => { const el = document.querySelector('.float-win[data-win="view"]'); return !!el && getComputedStyle(el).display !== "none" && !el.hidden; })(), hierOpen: !document.querySelector('.float-win[data-win="hierarchy"]')?.hidden, hint: document.getElementById("hint")?.textContent ?? "" }));
await page.mouse.click(500, 400);
await page.keyboard.press("\\"); await page.waitForTimeout(80);
const none = await vis();
check(/没有开着的窗/.test(none.hint) && !(await page.evaluate(() => document.documentElement.classList.contains("windows-hidden"))), `一扇都没开 = 只说一句、不进藏的状态：${none.hint}`);
await page.click(".gizmo-hier"); await page.click(".gizmo-menu"); await page.waitForTimeout(150);
const v0 = await vis();
await page.mouse.click(500, 400); await page.keyboard.press("\\"); await page.waitForTimeout(100);
const v1 = await vis();
check(v0.hier && v0.view && !v1.hier && !v1.view && v1.hierOpen && /藏起了 2 扇窗/.test(v1.hint), `按 \\ = 两扇都藏（开关状态没变）：${JSON.stringify(v1)}`);
await page.keyboard.press("\\"); await page.waitForTimeout(100);
const v2 = await vis();
check(v2.hier && v2.view, "再按 = 原样回来");
await page.keyboard.press("\\"); await page.waitForTimeout(80);
await page.click(".gizmo-hier"); await page.waitForTimeout(120);
const v3 = await vis();
check(v3.hier && v3.view, "藏着时点层级钮 = 第一下只叫回（没把层级窗关掉）");
// 四指轻点（合成触摸指针事件）= 同一个开关
const four = async () => page.evaluate(() => {
  const c = document.querySelector("canvas"), r = c.getBoundingClientRect(), pts = [0, 1, 2, 3].map((i) => ({ x: r.left + 300 + i * 40, y: r.top + 300 }));
  pts.forEach((p, i) => c.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerId: 20 + i, pointerType: "touch", isPrimary: i === 0, clientX: p.x, clientY: p.y })));
  pts.forEach((p, i) => c.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerId: 20 + i, pointerType: "touch", isPrimary: i === 0, clientX: p.x, clientY: p.y })));
});
await page.waitForTimeout(700);   // 过掌触门
const rev0 = await page.evaluate(() => globalThis.__catsup.editor.revision);
await four(); await page.waitForTimeout(120);
const v4 = await vis();
await four(); await page.waitForTimeout(120);
const v5 = await vis();
check(!v4.hier && !v4.view && v5.hier && v5.view && (await page.evaluate(() => globalThis.__catsup.editor.revision)) === rev0, `四指轻点 = 藏 / 回来，不碰模型（没当成重做）：${JSON.stringify([v4.hint, v5.hint])}`);
check(errs.length === 0, `页面没报错${errs.length ? "：" + errs.join(" | ") : ""}`);
await browser.close();
console.log(fails.length ? `✗ probe-hide-windows：${fails.length} 条没过` : "✓ probe-hide-windows");
process.exit(fails.length ? 1 : 0);
