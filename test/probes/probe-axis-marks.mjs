// X 轴 +1 个单位处的「1 m / 1 ft」（世界文字深模块 world-labels.ts 的第一个用户）+ Z 轴刻度（user 2026-10-25）。created 2026-10-25 by Claude Opus 5.5
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const url = process.argv[2] ?? "http://127.0.0.1:8765/";
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 1000, height: 800 } });
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(url, { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1500); await page.evaluate(() => globalThis.__catsup?.editor?.setGrid({ on: false }));   // v0.13.64 新文档吸附默认开；本探针测的不是栅格
// 字 = 折线（2026-10-29 切刀第 2 步）：读辅助几何的键，unit-x 那组线的键以字开头
const keys = () => page.evaluate(() => { const e = globalThis.__catsup.editor; e.draw(); return e.renderer3.auxKeys().filter((k) => k.id === "unit-x").map((k) => `${k.id}=${k.key.split("|")[0]}`).join(","); });
const res = { metric: await keys() };
await page.evaluate(() => { const e = globalThis.__catsup.editor; e.vcbUnit = "ft"; e.setGrid({ step: 0.3048 }); });   // 英制配英制格（1 ft）
res.ft = await keys();
await page.evaluate(() => { const e = globalThis.__catsup.editor; e.setGrid({ step: 1 }); });
res.ftMetricGrid = await keys();   // 单位英尺、格子 1 m：照实写 3' 3.38"
// DT16（user 10-25「1m的标记没有跟着格子的大小更新」）：标记跟着格子走
await page.evaluate(() => { const e = globalThis.__catsup.editor; e.vcbUnit = "m"; e.setGrid({ step: 0.1 }); });
res.cm = await keys();
await page.evaluate(() => globalThis.__catsup.editor.setGrid({ step: 5 }));
res.five = await keys();
await page.evaluate(() => { const e = globalThis.__catsup.editor; e.vcbUnit = "m"; e.setGrid({ step: 1 }); });
// 表面模式不挂（只在几何模式）——这里只核换回来还在
res.back = await keys();
// 有东西了「1 m」就不要了（user「有东西了之后1m就可以不要了。它只是空场景帮你防呆的」）
await page.evaluate(() => { const e = globalThis.__catsup.editor; e.commitOp({ op: "addEdges", segs: [[{ x: 3, y: 3, z: 0 }, { x: 4, y: 3, z: 0 }]] }); });
res.withGeom = await keys();
await page.evaluate(() => globalThis.__catsup.editor.undo());
res.emptyAgain = await keys();
console.log(JSON.stringify(res));
const ok = res.metric === "unit-x=1 m" && res.ft === "unit-x=1 ft" && res.ftMetricGrid === `unit-x=3' 3.37"` && res.cm === "unit-x=10 cm" && res.five === "unit-x=5 m" && res.back === "unit-x=1 m" && res.withGeom === "" && res.emptyAgain === "unit-x=1 m";
console.log(errs.length ? "PAGEERRORS:\n" + errs.join("\n") : "(no page errors)"); console.log(ok ? "PROBE OK" : "PROBE FAIL");
await b.close(); process.exit(ok ? 0 : 1);
