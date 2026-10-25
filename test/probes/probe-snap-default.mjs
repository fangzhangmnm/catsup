// 新文件一定默认开栅格吸附（user 2026-10-25「新文件一定要默认开吸附」；v0.13.64 起）：开机 → 开；关掉后新建 → 开；lazyblank → 开；
// 新文件画一笔导出 → 刷新 → 关掉吸附 → 打开那份 → 开（跟着文件）。吸附钮的样子和 editor.grid.on 一致。created 2026-10-25 by Claude Opus 5.5
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const url = process.argv[2] ?? "http://127.0.0.1:8765/";
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await (await b.newContext({ viewport: { width: 1000, height: 800 } })).newPage();
const errs = []; page.on("pageerror", (e) => errs.push(String(e).slice(0, 200)));
await page.goto(url, { waitUntil: "load" }); await page.waitForTimeout(1500);
const st = () => page.evaluate(() => ({ on: globalThis.__catsup.editor.grid.on, btn: document.querySelector(".gizmo-snap")?.classList.contains("on") ?? null }));
const r = { boot: await st() };
await page.click(".gizmo-snap"); await page.waitForTimeout(100);
await page.evaluate(() => globalThis.__catsup.session.newDoc()); await page.waitForTimeout(300); r.afterNew = await st();
await page.click(".gizmo-snap"); await page.waitForTimeout(100);
await page.evaluate(() => globalThis.__catsup.session.beginLazyBlank()); await page.waitForTimeout(300); r.afterLazy = await st();
await page.evaluate(() => globalThis.__catsup.session.newDoc()); await page.waitForTimeout(300);
await page.evaluate(() => globalThis.__catsup.editor.commitOp({ op: "addEdges", segs: [[{ x: 0, y: 0, z: 0 }, { x: 2, y: 0, z: 0 }]] }));
const [dl] = await Promise.all([page.waitForEvent("download"), page.evaluate(() => globalThis.__catsup.session.exportDownload())]);
const bytes = [...(await (await import("node:fs")).promises.readFile(await dl.path()))];
await page.reload({ waitUntil: "load" }); await page.waitForTimeout(1500);
await page.click(".gizmo-snap"); await page.waitForTimeout(100);
r.opened = await page.evaluate((arr) => globalThis.__catsup.session.openLocalBytes(new Uint8Array(arr), "m.glb", null), bytes); await page.waitForTimeout(300);
r.reopened = await st();
console.log(JSON.stringify({ ...r, errs }));
const on = (s) => s.on === true && s.btn === true;
const ok = on(r.boot) && on(r.afterNew) && on(r.afterLazy) && r.opened && on(r.reopened) && !errs.length;
console.log(ok ? "PROBE OK" : "PROBE FAIL");
await b.close(); process.exit(ok ? 0 : 1);
