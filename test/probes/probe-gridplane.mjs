// 网格面 yz（v0.13.14；user「grid可以配置成xy yz xz，这样方便我吸附画立面」）：开网格 + yz → 视图 ☰「栅格」页勾着 YZ（v0.13.51 起；原来是右下芯片）；画线首点在空处悬停 = 格点，落在 x=0 的立面格点上。created 2026-10-24 by Claude Fable 5.1
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const url = process.argv[2] ?? "http://127.0.0.1:8765/";
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 1000, height: 800 } });
const errs = []; page.on("pageerror", (e) => errs.push(String(e).slice(0, 200)));
await page.goto(url, { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1500);
const box = await page.locator("#board").boundingBox();
await page.evaluate(() => { const e = globalThis.__catsup.editor; e.setGrid({ on: true, plane: "yz" }); e.cam.yaw = 0; e.cam.pitch = 0.2; e.setTool("line"); e.draw(); });
// v0.13.51：右下芯片收进视图 ☰「栅格」页（user「先把右下收到右上汉堡里」）→ 读那一页勾着的栅格面；吸附钮菜单的「栅格设置…」直接跳到这一页
await page.locator(".gizmo-snap").click({ button: "right" }); await page.waitForTimeout(150);
await page.locator(".popup-menu button", { hasText: "栅格设置…" }).click(); await page.waitForTimeout(150);
const chip = await page.evaluate(() => { const m = document.querySelector(".popup-menu"); const tab = m?.querySelector(".menu-tab.on")?.textContent ?? ""; const on = [...(m?.querySelectorAll("button") ?? [])].filter((b) => b.querySelector(".menu-check")).map((b) => b.querySelector(".menu-label")?.textContent ?? ""); return `${tab}:${on.join("|")}`; });
await page.keyboard.press("Escape"); await page.waitForTimeout(80);
const s = await page.evaluate(() => { const e = globalThis.__catsup.editor; return e.cam.angularPx({ x: 0, y: 2.13, z: 1.02 }, e.vp()); });
await page.mouse.move(box.x + s.x, box.y + s.y); await page.waitForTimeout(120);
const tip = await page.evaluate(() => { const t = document.getElementById("tip"); return t.hidden ? null : t.textContent; });
await page.mouse.down(); await page.mouse.up(); await page.waitForTimeout(80);
const anchor = await page.evaluate(() => { const e = globalThis.__catsup.editor; const p = e.anchor3; return p ? [p.x, p.y, p.z] : null; });
console.log(JSON.stringify({ chip, tip, anchor }));
const ok = /^栅格:/.test(chip) && /YZ 立面/.test(chip) && !/XY 地面/.test(chip) && tip === "格点" && !!anchor && Math.abs(anchor[0]) < 1e-9 && Math.abs(anchor[1] - 2.2) < 1e-9 && Math.abs(anchor[2] - 1) < 1e-9;
console.log(errs.length ? "PAGEERRORS " + errs.join(" | ") : "(no page errors)"); console.log(ok ? "PROBE OK" : "PROBE FAIL");
await b.close(); process.exit(ok ? 0 : 1);
