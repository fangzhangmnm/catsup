// 两个 ☰ 停在哪页跟着文件走（user 2026-10-25「两个汉堡能记住选的是哪个tab吗」「不是应该跟文件吗，看一下weebpaint…」= WeebPaint desk.menuTab 同款；住 CATSUP_desk）：
// 有边的文件切到 设置 / 相机 → 导出（= 保存同一个 encode）→ 刷新 → 打开那份文件 → 还在；新建 → 两个都回第一页；切页本身不标脏。
// （无头没有图库 store，文档的家是 transient，保存要选磁盘文件；所以用导出 + openLocalBytes 走同一条 settings 读写。）created 2026-10-25 by Claude Opus 5.5
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const url = process.argv[2] ?? "http://127.0.0.1:8765/";
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const ctx = await b.newContext({ viewport: { width: 1000, height: 800 } });
const page = await ctx.newPage();
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(url, { waitUntil: "load" }); await page.waitForTimeout(1200);
const onTab = () => page.evaluate(() => document.querySelector(".popup-menu .menu-tab.on")?.dataset.menuTab ?? null);
const tabs = async () => { const out = {}; await page.click("#btnMenu"); await page.waitForTimeout(100); out.main = await onTab(); await page.keyboard.press("Escape"); await page.click(".gizmo-menu"); await page.waitForTimeout(100); out.view = await onTab(); await page.keyboard.press("Escape"); await page.waitForTimeout(60); return out; };
const res = {};
await page.evaluate(() => { const e = globalThis.__catsup.editor; e.commitOp({ op: "addEdges", segs: [[{ x: 0, y: 0, z: 0 }, { x: 2, y: 0, z: 0 }], [{ x: 2, y: 0, z: 0 }, { x: 2, y: 2, z: 0 }], [{ x: 2, y: 2, z: 0 }, { x: 0, y: 2, z: 0 }], [{ x: 0, y: 2, z: 0 }, { x: 0, y: 0, z: 0 }]] }); });
res.rev0 = await page.evaluate(() => globalThis.__catsup.editor.revision);
await page.click("#btnMenu"); await page.waitForTimeout(100); await page.click('.popup-menu [data-menu-tab="settings"]'); await page.keyboard.press("Escape");
await page.click(".gizmo-menu"); await page.waitForTimeout(100); await page.click('.popup-menu [data-menu-tab="camera"]'); await page.keyboard.press("Escape"); await page.waitForTimeout(60);
res.rev1 = await page.evaluate(() => globalThis.__catsup.editor.revision);   // 切页不动几何版本号（dirty = revision ≠ savedRevision）= 不标脏
const [dl] = await Promise.all([page.waitForEvent("download"), page.evaluate(() => globalThis.__catsup.session.exportProject())]);
const bytes = [...(await (await import("node:fs")).promises.readFile(await dl.path()))];
await page.reload({ waitUntil: "load" }); await page.waitForTimeout(1500);
res.beforeOpen = await tabs();
res.opened = await page.evaluate((arr) => globalThis.__catsup.session.openLocalBytes(new Uint8Array(arr), "m.glb", null), bytes); await page.waitForTimeout(300);
res.edgesAfterOpen = await page.evaluate(() => globalThis.__catsup.editor.kernel.edges().length);
res.afterOpen = await tabs();
await page.evaluate(() => globalThis.__catsup.session.newDoc()); await page.waitForTimeout(400);
res.afterNew = await tabs();
console.log(JSON.stringify({ ...res, errs }));
const ok = res.rev1 === res.rev0 && res.opened && res.edgesAfterOpen > 0
  && res.beforeOpen.main === "file" && res.beforeOpen.view === "display"
  && res.afterOpen.main === "settings" && res.afterOpen.view === "camera"
  && res.afterNew.main === "file" && res.afterNew.view === "display" && !errs.length;
console.log(ok ? "PROBE OK" : "PROBE FAIL");
await b.close(); process.exit(ok ? 0 : 1);
