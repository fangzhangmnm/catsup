// 多步工具进行中看得见的「收」（白模 W-7，created 2026-11-10 by Claude Opus 5.5；施工单 ai-docs/20261110-whitebox-batch1.md 第三节 W-7）。用笔的指针事件——
// 刀（网格体盒子里；笔恒报 0.5 = 不报压感，点一下 = 下点，v0.19.96）：① 一个点都没定 = 没有「收刀」② 定了起点 = 有 ③ 切了一刀 = 还在、实心、排在「取消」前面 → 点它 = 刀收了、切出来的面还在、提示行空
// 画线（硬表面）：④ 起点之前没有「收笔」⑤ 画了一段 = 有 → 点它 = 线还在、不再拖着橡皮筋
// 手指：⑥ 见过笔之后（等过防手掌的 600 ms），手指轻点（通用的取消）仍能收刀（W-3 留下的那条）
// 跑法：python3 -m http.server 8765 后 node test/probes/probe-finish-chip.mjs [url]
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const url = process.argv[2] ?? "http://127.0.0.1:8765/";
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 1000, height: 800 } }); page.setDefaultTimeout(4000);
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
const chip = () => page.evaluate(() => { const els = [...document.querySelectorAll(".mfd .mfd-slot")].filter((s) => !s.classList.contains("empty")).map((s) => s.dataset.slot); const f = document.querySelector('.mfd-slot[data-slot="finish"] .mfd-chip'); return f ? { label: f.textContent, solid: f.classList.contains("solid"), order: els.join(",") } : null; });
// 页面里的小工具
const helpers = () => page.evaluate(() => {
  const e = globalThis.__catsup.editor, sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const c = document.getElementById("board"), R = () => c.getBoundingClientRect(), px = (p) => e.cam.angularPx(p, e.vp());
  const fire = (type, q, buttons, pointerType, id) => { const r = R(); c.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, clientX: r.left + q.x, clientY: r.top + q.y, pointerId: id, pointerType, isPrimary: true, button: 0, buttons, pressure: buttons ? 0.5 : 0 })); };
  const penSlide = async (a, z) => { fire("pointerdown", a, 1, "pen", 7); await sleep(20); for (let i = 1; i <= 8; i++) { fire("pointermove", { x: a.x + (z.x - a.x) * i / 8, y: a.y + (z.y - a.y) * i / 8 }, 1, "pen", 7); await sleep(15); } fire("pointerup", z, 0, "pen", 7); await sleep(60); };
  const penTap = async (q) => { fire("pointerdown", q, 1, "pen", 7); await sleep(20); fire("pointerup", q, 0, "pen", 7); await sleep(60); };
  const fingerTap = async (q) => { fire("pointerdown", q, 1, "touch", 11); await sleep(40); fire("pointerup", q, 0, "touch", 11); await sleep(80); };
  window.__fc = { e, sleep, px, penSlide, penTap, fingerTap, P: (x, y, z = 0) => ({ x, y, z }) };
});
const r = {};
// ---------- 刀 ----------
await page.goto(url, { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1200); await helpers();
await page.evaluate(async () => {
  const { e, sleep, P } = window.__fc;
  const B = [[0, 0], [1, 0], [1, 1], [0, 1]], segs = [];
  for (let i = 0; i < 4; i++) { const a = B[i], d = B[(i + 1) % 4]; segs.push([P(a[0], a[1], 0), P(d[0], d[1], 0)]); segs.push([P(a[0], a[1], 1), P(d[0], d[1], 1)]); segs.push([P(a[0], a[1], 0), P(a[0], a[1], 1)]); }
  e.setGrid({ ...e.grid, on: false });
  e.commitOp({ op: "addEdges", at: e.activePool(), segs }); e.selectAll(); e.runAction("brep.orientOutward", { curvature: 3 }); e.makeComponent("块"); e.runAction("object.toMesh"); await sleep(20);
  const S = e.scene, inst = [...S.def(S.root).instances.values()][0]; e.cam.setView("iso"); e.zoomExtents(); e.cam.halfH *= 1.6; e.draw();
  e.selectedPools.clear(); e.selectedPools.set(`i${inst.id}`, { kind: "instance", instance: inst.id }); e.enterSelected(); await sleep(30); e.setTool("knife"); await sleep(20);
  window.__fc.faces = () => S.mesh(inst.def).kernel.faceCount();
});
await page.evaluate(async () => { const { penTap, px, P } = window.__fc; await penTap(px(P(0.5, 0.5, 1.6))); });   // 先碰一下笔（空处）：芯片按笔的样子画
r.knifeBefore = await chip();
await page.evaluate(async () => { const { penTap, px, P } = window.__fc; await penTap(px(P(1, 0, 0.5))); });   // 起点：笔点竖边（这支笔恒 0.5 = 不报压感：点一下 = 下点；v0.19.96 起滑过去不下点）
r.knifeStarted = { chip: await chip(), active: await page.evaluate(() => window.__fc.e.isGestureActive()) };
const f0 = await page.evaluate(() => window.__fc.faces());
await page.evaluate(async () => { const { penTap, px, P } = window.__fc; await penTap(px(P(1, 0.75, 1))); });   // 切一刀到上边
r.knifeCut = { chip: await chip(), df: (await page.evaluate(() => window.__fc.faces())) - f0, active: await page.evaluate(() => window.__fc.e.isGestureActive()) };
if (await page.locator('.mfd-slot[data-slot="finish"] .mfd-chip').count()) await page.click('.mfd-slot[data-slot="finish"] .mfd-chip'); await page.waitForTimeout(100);
r.knifeFinished = { active: await page.evaluate(() => window.__fc.e.isGestureActive()), df: (await page.evaluate(() => window.__fc.faces())) - f0, hint: await page.evaluate(() => globalThis.__catsup.hud.status()), chip: await chip() };
// ⑥ 手指：笔定了起点，等过防手掌，手指轻点空处 = 收刀
await page.evaluate(async () => { const { penTap, px, P } = window.__fc; await penTap(px(P(1, 1, 0.5))); });
r.fingerBefore = await page.evaluate(() => window.__fc.e.isGestureActive());
await page.waitForTimeout(700);
await page.evaluate(async () => { const { fingerTap } = window.__fc; await fingerTap({ x: 40, y: 700 }); });
r.fingerAfter = { active: await page.evaluate(() => window.__fc.e.isGestureActive()), df: (await page.evaluate(() => window.__fc.faces())) - f0 };
// ---------- 画线 ----------
await page.goto(url, { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1200); await helpers();
await page.evaluate(async () => { const { e, sleep } = window.__fc; e.setGrid({ ...e.grid, on: false }); e.cam.setView("iso"); e.cam.halfH = 3; e.draw(); e.setTool("line"); await sleep(20); });
await page.evaluate(async () => { const { penTap } = window.__fc; await penTap({ x: 40, y: 40 }); });
await page.evaluate(() => { window.__fc.e.cancel(); });   // 上面那一下只是让芯片按笔画；万一起了手势就放掉
r.lineBefore = await chip();
const e0 = await page.evaluate(() => window.__fc.e.kernel.edges().length);
await page.evaluate(async () => { const { penTap, px, P } = window.__fc; await penTap(px(P(0, 0, 0))); });
r.lineStarted = await chip();
await page.evaluate(async () => { const { penTap, px, P } = window.__fc; await penTap(px(P(1.5, 0, 0))); });
r.lineSeg = { chip: await chip(), active: await page.evaluate(() => window.__fc.e.isGestureActive()), edges: (await page.evaluate(() => window.__fc.e.kernel.edges().length)) - e0 };
if (await page.locator('.mfd-slot[data-slot="finish"] .mfd-chip').count()) await page.click('.mfd-slot[data-slot="finish"] .mfd-chip'); await page.waitForTimeout(100);
r.lineFinished = { active: await page.evaluate(() => window.__fc.e.isGestureActive()), edges: (await page.evaluate(() => window.__fc.e.kernel.edges().length)) - e0, chip: await chip() };
await b.close();
r.errs = errs;
console.log(JSON.stringify(r, null, 1));
const ok = r.knifeBefore === null
  && r.knifeStarted.active && r.knifeStarted.chip?.label === "收刀"
  && r.knifeCut.df === 1 && r.knifeCut.active && r.knifeCut.chip?.label === "收刀" && r.knifeCut.chip.solid && /finish,cancel$/.test(r.knifeCut.chip.order)
  && !r.knifeFinished.active && r.knifeFinished.df === 1 && r.knifeFinished.hint === "" && r.knifeFinished.chip === null
  && r.fingerBefore && !r.fingerAfter.active && r.fingerAfter.df === 1
  && r.lineBefore === null && r.lineStarted?.label === "收笔"
  && r.lineSeg.active && r.lineSeg.edges >= 1 && r.lineSeg.chip?.label === "收笔"
  && !r.lineFinished.active && r.lineFinished.edges === r.lineSeg.edges && r.lineFinished.chip === null
  && errs.length === 0;
console.log(ok ? "probe-finish-chip OK" : "probe-finish-chip FAIL");
process.exit(ok ? 0 : 1);
