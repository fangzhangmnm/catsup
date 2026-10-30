// test/probes/probe-second-mode.mjs —— 再点一下左柱上拿着的工具 = 换到另一种做法 + 角标（controller/second-mode.ts）。无头。created 2026-10-30 by Claude Opus 5.5
// user 10-30「brep多次点击推拉按钮能不能切换模式就是两种ctrl模式？……也许icon上面要有区分披露」「2同意」。用法：python3 -m http.server 8765 → node test/probes/probe-second-mode.mjs
import { createRequire } from "node:module";
const { chromium } = createRequire(new URL("../../../20260524 WeebPaint/package.json", import.meta.url))("playwright");
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 1000, height: 900 } });
const errs = []; page.on("pageerror", (e) => errs.push(e.message));
await page.goto(process.argv[2] ?? "http://127.0.0.1:8765/", { waitUntil: "load" }); await page.waitForTimeout(600);
const fails = []; const check = (ok, msg) => { console.log((ok ? "  ✓ " : "  ✗ ") + msg); if (!ok) fails.push(msg); };
const btn = (label) => page.locator(".hud-rail-tools .tool", { hasText: label }).first();
const state = (tool, key) => page.evaluate(([t, k]) => ({ tool: globalThis.__catsup.editor.tool, v: globalThis.__catsup.editor.config.get(t, k), badge: [...document.querySelectorAll(".hud-rail-tools .tool")].map((b) => b.querySelector(".tool-badge")?.textContent ?? "").filter(Boolean).join(","), hint: document.getElementById("hint")?.textContent ?? "" }), [tool, key]);
await btn("推拉").click(); await page.waitForTimeout(80);
const s1 = await state("pp", "mode");
await btn("推拉").click(); await page.waitForTimeout(80);
const s2 = await state("pp", "mode");
await btn("推拉").click(); await page.waitForTimeout(80);
const s3 = await state("pp", "mode");
check(s1.tool === "pp" && s1.v === "heal" && s1.badge === "", `第一下 = 拿起推拉（接着长、没角标）：${JSON.stringify(s1)}`);
check(s2.tool === "pp" && s2.v === "ring" && s2.badge === "边" && /加边/.test(s2.hint), `再点 = 加边 + 角标「边」+ 提示行：${JSON.stringify(s2)}`);
check(s3.v === "heal" && s3.badge === "", `再点 = 换回接着长：${JSON.stringify(s3)}`);
await btn("矩形").click(); await page.waitForTimeout(80);
const r1 = await page.evaluate(() => globalThis.__catsup.editor.tool);
await page.locator(".hud-rail-tools .tool.active").first().click(); await page.waitForTimeout(80);
const r2 = await page.evaluate(() => globalThis.__catsup.editor.tool);
check(r1 === "rect" && r2 === "crect", `矩形再点 = 中心矩形：${r1} → ${r2}`);
check(errs.length === 0, `页面没报错${errs.length ? "：" + errs.join(" | ") : ""}`);
await browser.close();
console.log(fails.length ? `✗ probe-second-mode：${fails.length} 条没过` : "✓ probe-second-mode");
process.exit(fails.length ? 1 : 0);
