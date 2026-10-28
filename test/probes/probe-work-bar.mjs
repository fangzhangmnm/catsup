// 要等的大活的细进度条（账本 UX7；ui/work-bar.ts；created 2026-10-28 by Claude Opus 5.5）。
// 把「要等一会儿」的门槛临时调成 0 秒（探针里的小模型本来不慢）→ 修复「清理碎渣」（擦同平面的硬内线 = 算要等的那种活）先弹确认 → 点「做」→ 顶边细条先露出来、真画上了才开跑、跑完收起；
// 点「不做」= 条不露、什么都没做。跑法：python3 -m http.server 8765 后 node test/probes/probe-work-bar.mjs
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 900, height: 700 } });
page.setDefaultTimeout(4000);
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(process.argv[2] ?? "http://127.0.0.1:8765/", { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1000);
const setup = () => page.evaluate(() => {
  const e = globalThis.__catsup.editor, P = (x, y, z = 0) => ({ x, y, z });
  e.constructor.ERASE_ASK_SECONDS = 0;   // 小模型也问（探针专用）
  e.clearAll?.();
  e.addSegments([[P(0, 0), P(2, 0)], [P(2, 0), P(2, 1)], [P(2, 1), P(0, 1)], [P(0, 1), P(0, 0)], [P(1, 0), P(1, 1)]]);   // 一张平面被中间一条线分成两半（同平面的硬内线 = 清理碎渣要擦的、算「要等」的那种活）
  globalThis.__wb = [];
  const bar = document.querySelector(".work-bar");
  new MutationObserver(() => globalThis.__wb.push({ hidden: bar.hidden, t: performance.now() })).observe(bar, { attributes: true, attributeFilter: ["hidden"] });
  globalThis.__edges0 = e.kernel.edges().length;
  e.deselectAll();
});
const r = {};
await setup();
await page.evaluate(() => { globalThis.__catsup.editor.repair("brep.cleanup", "context"); });
await page.waitForTimeout(150);
r.askShown = await page.evaluate(() => !document.getElementById("sheet").hidden && /要等一会儿/.test(document.getElementById("sheetTitle").textContent));
r.barBeforeOk = await page.evaluate(() => document.querySelector(".work-bar").hidden);
await page.click("#sheetConfirm"); await page.waitForTimeout(400);
r.yes = await page.evaluate(() => ({ seq: globalThis.__wb.map((x) => x.hidden), edgesBefore: globalThis.__edges0, edgesAfter: globalThis.__catsup.editor.kernel.edges().length, barNow: document.querySelector(".work-bar").hidden }));
// 不做
await setup();
await page.evaluate(() => { globalThis.__catsup.editor.repair("brep.cleanup", "context"); });
await page.waitForTimeout(150);
await page.click("#sheetCancel"); await page.waitForTimeout(200);
r.no = await page.evaluate(() => ({ seq: globalThis.__wb.map((x) => x.hidden), edges: globalThis.__catsup.editor.kernel.edges().length, edgesBefore: globalThis.__edges0 }));
await b.close();
r.errs = errs;
console.log(JSON.stringify(r, null, 1));
const ok = r.askShown && r.barBeforeOk && JSON.stringify(r.yes.seq) === "[false,true]" && r.yes.edgesAfter < r.yes.edgesBefore && r.yes.barNow
  && r.no.seq.length === 0 && r.no.edges === r.no.edgesBefore && errs.length === 0;
console.log(ok ? "probe-work-bar OK" : "probe-work-bar FAIL");
process.exit(ok ? 0 : 1);
