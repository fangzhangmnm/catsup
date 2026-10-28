// 慢的修复先问、不静默跳过（user 2026-10-26「不要因为性能静默不做，宁愿弹警告问yes no。诚实性问题」；v0.14.70）。
// 把「估计多少秒才问」临时调成 0（小模型上也触发）→ 清理碎渣（要擦一条同平面的线）→ 弹应用内确认框（不是系统弹窗）→
// 点「不做」：模型没动、提示「没做（你选了不做）」→ 再来一次点「做」：真的做了。修复面板「应用」同一道确认。created 2026-10-26 by Claude Opus 5.5
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 1000, height: 800 } });
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
let nativeDialog = false; page.on("dialog", async (d) => { nativeDialog = true; await d.dismiss(); });
await page.goto(process.argv[2] ?? "http://127.0.0.1:8765/", { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1200);
await page.evaluate(() => {
  const e = globalThis.__catsup.editor, at = e.activePool(), P = (x, y, z = 0) => ({ x, y, z });
  e.constructor.ERASE_ASK_SECONDS = 0;   // 测试用：小模型上也问
  const r = [P(0, 0), P(2, 0), P(2, 1), P(0, 1)];
  e.commitOp({ op: "addEdges", at, segs: r.map((p, i) => [p, r[(i + 1) % 4]]) });
  e.commitOp({ op: "addEdges", at, segs: [[P(1, 0), P(1, 1)]] });
  e.deselectAll(); e.draw();
});
const state = () => page.evaluate(() => ({ faces: globalThis.__catsup.editor.kernel.faces().length, hint: document.getElementById("hint")?.textContent ?? "", sheet: !document.getElementById("sheetConfirm")?.closest("[hidden]") && !!document.getElementById("sheetConfirm")?.offsetParent, title: document.getElementById("sheetTitle")?.textContent ?? "" }));
const out = {};
await page.evaluate(() => globalThis.__catsup.hud.pick("action:brep.cleanup")); await page.waitForTimeout(200);
out.ask1 = await state();
await page.click("#sheetCancel"); await page.waitForTimeout(200);
out.no = await state();
await page.evaluate(() => globalThis.__catsup.hud.pick("action:brep.cleanup")); await page.waitForTimeout(200);
out.ask2 = await state();
await page.click("#sheetConfirm"); await page.waitForTimeout(300);
out.yes = await state();
// 修复面板「应用」：勾上清理碎渣 → 同一道确认；点「不做」→ 没动
await page.evaluate(() => { const e = globalThis.__catsup.editor, at = e.activePool(), P = (x, y, z = 0) => ({ x, y, z }); e.commitOp({ op: "addEdges", at, segs: [[P(0.5, 0), P(0.5, 1)]] }); e.deselectAll(); e.beginRepairPanel(); e.setParam("cleanup", true); e.pressParam("apply"); });
await page.waitForTimeout(200);
out.panelAsk = await state();
await page.click("#sheetCancel"); await page.waitForTimeout(200);
out.panelNo = await state();
console.log(JSON.stringify(out));
const ok = out.ask1.sheet && /要等一会儿/.test(out.ask1.title) && out.no.faces === 2 && /没做（你选了不做）/.test(out.no.hint) && !out.no.sheet
  && out.ask2.sheet && out.yes.faces === 1 && /清理了/.test(out.yes.hint)
  && out.panelAsk.sheet && /修复：要等一会儿/.test(out.panelAsk.title) && out.panelNo.faces === 2 && /修复：没做（你选了不做）/.test(out.panelNo.hint) && !nativeDialog && !errs.length;
console.log(errs.length ? "PAGEERRORS:\n" + errs.join("\n") : "(no page errors)"); console.log(ok ? "PROBE OK" : "PROBE FAIL");
await b.close(); process.exit(ok ? 0 : 1);
