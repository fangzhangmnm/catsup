// X 轴 +1 个单位处的「1 m / 1 ft」（世界文字深模块 world-labels.ts 的第一个用户）+ Z 轴刻度（user 2026-10-25）。created 2026-10-25 by Claude Opus 5.5
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const url = process.argv[2] ?? "http://127.0.0.1:8765/";
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 1000, height: 800 } });
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(url, { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1500); await page.evaluate(() => globalThis.__catsup?.editor?.setGrid({ on: false }));   // v0.13.64 新文档吸附默认开；本探针测的不是栅格
const keys = () => page.evaluate(() => { const e = globalThis.__catsup.editor; e.draw(); return e.renderer3.labelKeys().map((k) => `${k.id}=${k.key.split("|").slice(2).join("|")}`).join(","); });
const res = { metric: await keys() };
await page.evaluate(() => { globalThis.__catsup.editor.vcbUnit = "ft"; });
res.ft = await keys();
await page.evaluate(() => { globalThis.__catsup.editor.vcbUnit = "m"; });
// 表面模式不挂（只在几何模式）——这里只核换回来还在
res.back = await keys();
console.log(JSON.stringify(res));
const ok = res.metric === "unit-x=1 m" && res.ft === "unit-x=1 ft" && res.back === "unit-x=1 m";
console.log(errs.length ? "PAGEERRORS:\n" + errs.join("\n") : "(no page errors)"); console.log(ok ? "PROBE OK" : "PROBE FAIL");
await b.close(); process.exit(ok ? 0 : 1);
