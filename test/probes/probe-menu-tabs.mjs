// A30 ☰ tab 制（user 2026-10-24「汉堡菜单应该tab制度，和weebpaint一样」）+ 文件页家族顺序（F-81：图库 → 新建 / 打开 → 保存 / 导出 → 定稿）。created 2026-10-24 by Claude Opus 5.5
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const url = process.argv[2] ?? "http://127.0.0.1:8765/";
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 1000, height: 800 } });
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(url, { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1500);
const read = () => page.evaluate(() => { const m = document.querySelector(".popup-menu"); if (!m) return null; return { tabs: [...m.querySelectorAll(".menu-tab")].map((t) => t.textContent.trim()), on: m.querySelector(".menu-tab.on")?.textContent.trim() ?? "", items: [...m.querySelectorAll(".menu-item .menu-label")].map((x) => x.textContent) }; });
const res = {};
await page.click("#btnMenu"); await page.waitForTimeout(100);
res.first = await read();
await page.click(".menu-tab[data-menu-tab='help']"); await page.waitForTimeout(80);
res.help = await read();
await page.keyboard.press("Escape"); await page.waitForTimeout(60);
await page.click("#btnMenu"); await page.waitForTimeout(100);
res.reopen = await read();
console.log(JSON.stringify(res));
const f = res.first?.items ?? [], idx = (t) => f.findIndex((x) => x.includes(t));
const ok = res.first && res.first.tabs.join() === "文件,模型,设置,帮助" && res.first.on === "文件"
  && idx("图库") === 0 && idx("新建模型") > idx("图库") && idx("打开本地") > idx("新建模型") && idx("保存") > idx("打开本地") && idx("导出 OBJ") > idx("保存") && (idx("定稿") > idx("导出 OBJ") || idx("改稿") > idx("导出 OBJ"))
  && !f.some((x) => x.includes("使用手册")) && res.help.on === "帮助" && res.help.items.some((x) => x.includes("使用手册")) && !res.help.items.some((x) => x.includes("图库"))
  && res.reopen.on === "帮助";
console.log(errs.length ? "PAGEERRORS:\n" + errs.join("\n") : "(no page errors)"); console.log(ok ? "PROBE OK" : "PROBE FAIL");
await b.close(); process.exit(ok ? 0 : 1);
