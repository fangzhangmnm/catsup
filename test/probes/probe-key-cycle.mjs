// 同一个键再按一下 = 在工具组里换下一把（user 2026-10-25「快捷键在工具组里怎么循环：同一个键再按一下」）。created 2026-10-25 by Claude Opus 5.5
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const url = process.argv[2] ?? "http://127.0.0.1:8765/";
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 1000, height: 800 } });
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(url, { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1500); await page.evaluate(() => globalThis.__catsup?.editor?.setGrid({ on: false }));   // v0.13.64 新文档吸附默认开；本探针测的不是栅格
await page.mouse.move(500, 400);
const seq = async (k, n) => { const out = []; for (let i = 0; i < n; i++) { await page.keyboard.press(k); await page.waitForTimeout(40); out.push(await page.evaluate(() => globalThis.__catsup.editor.tool)); } return out; };
const res = { e: await seq("e", 4), r: await seq("r", 3), t: await seq("t", 4), l: await seq("l", 2) };
await page.keyboard.press("a"); await page.waitForTimeout(40);
const arc = []; for (let i = 0; i < 4; i++) { await page.keyboard.press("a"); await page.waitForTimeout(40); arc.push(await page.evaluate(() => globalThis.__catsup.editor.config.get("arc", "mode"))); }
res.arcModes = arc;
console.log(JSON.stringify(res));
const ok = res.e.join() === "erase,weldErase,softErase,erase" && res.r.join() === "rect,rrect,rect" && res.t.join() === "tape,protractor,axes,tape" && res.l.join() === "line,line" && new Set(arc).size === 4;
console.log(errs.length ? "PAGEERRORS:\n" + errs.join("\n") : "(no page errors)"); console.log(ok ? "PROBE OK" : "PROBE FAIL");
await b.close(); process.exit(ok ? 0 : 1);
