// 左柱换脸（controller/rail-face.ts；created 2026-10-28 by Claude Opus 5.5；家族周账 F-121）：自由建模网格体盒子——
// ① 没选区：左柱那格是「删除」工具 ② 选一张面：那格变成垃圾桶「删掉选中」、提示写清点了做什么 ③ 点它 = 删掉那张面（一步）、那格变回「删除」
// ④ 撤销一下面回来 ⑤ 按着拖的半路不变脸；这时点它 = 先取消那次拖（选区不动）再删。跑法：python3 -m http.server 8765 后 node test/probes/probe-rail-face.mjs
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 1000, height: 800 } });
page.setDefaultTimeout(4000);
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto("http://127.0.0.1:8765/", { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1200);
const slot = () => page.evaluate(() => { const bs = [...document.querySelectorAll("#toolbar button.tool")], f = bs.find((x) => x.classList.contains("rail-face")), d = bs.find((x) => x.querySelector(".tool-label")?.textContent === "删除"); return { face: f ? { label: f.querySelector(".tool-label")?.textContent, title: f.title, icon: f.querySelector("use")?.getAttribute("href") ?? "" } : null, plain: !!d }; });
const r = {};
const S = await page.evaluate(async () => {
  const e = globalThis.__catsup.editor, P = (x, y, z = 0) => ({ x, y, z }), sleep = (ms) => new Promise((rr) => setTimeout(rr, ms));
  const B = [[0, 0], [1, 0], [1, 1], [0, 1]], segs = []; for (let i = 0; i < 4; i++) { const a = B[i], d = B[(i + 1) % 4]; segs.push([P(a[0], a[1], 0), P(d[0], d[1], 0)]); segs.push([P(a[0], a[1], 1), P(d[0], d[1], 1)]); segs.push([P(a[0], a[1], 0), P(a[0], a[1], 1)]); }
  e.commitOp({ op: "addEdges", at: e.activePool(), segs }); e.selectAll(); e.makeComponent("块"); e.runAction("object.toMesh"); await sleep(20);
  const s = e.scene, inst = [...s.def(s.root).instances.values()][0];
  e.selectedPools.clear(); e.selectedPools.set(`i${inst.id}`, { kind: "instance", instance: inst.id }); e.enterSelected(); await sleep(30);
  e.deselectAll(); globalThis.__catsup.hud.pick("select"); await sleep(30);
  return { def: inst.def };
});
const faces = () => page.evaluate((def) => globalThis.__catsup.editor.scene.mesh(def).kernel.faceCount(), S.def);
r.one = await slot();
await page.evaluate((def) => { const e = globalThis.__catsup.editor, m = e.scene.mesh(def).kernel; e.selection.faces.add(m.faces()[0]); e.afterSelectForProbe?.(); globalThis.__catsup.hud.pick("select"); }, S.def);
await page.waitForTimeout(80);
r.two = await slot();
r.f0 = await faces(); const steps0 = await page.evaluate(() => globalThis.__catsup.editor.history.steps());
await page.click("#toolbar button.rail-face"); await page.waitForTimeout(100);
r.three = { slot: await slot(), f: await faces(), steps: await page.evaluate(() => globalThis.__catsup.editor.history.steps()) - steps0, sel: await page.evaluate(() => globalThis.__catsup.editor.hasSelection()) };
await page.evaluate(() => globalThis.__catsup.editor.undo()); await page.waitForTimeout(80);
r.four = { f: await faces() };
// ⑤ 选上一张面、移动工具按着拖的半路：不换脸
await page.evaluate((def) => { const e = globalThis.__catsup.editor, m = e.scene.mesh(def).kernel; e.deselectAll(); e.selection.faces.add(m.faces()[0]); globalThis.__catsup.hud.pick("move"); }, S.def);
await page.waitForTimeout(60);
r.fiveBefore = await slot();
await page.evaluate(() => { const e = globalThis.__catsup.editor, c = document.getElementById("board"), q = c.getBoundingClientRect(); const P = (x, y) => ({ bubbles: true, clientX: q.left + x, clientY: q.top + y, pointerId: 19, pointerType: "mouse", isPrimary: true, button: 0 }); c.dispatchEvent(new PointerEvent("pointerdown", { ...P(500, 400), buttons: 1 })); for (let i = 1; i < 5; i++) c.dispatchEvent(new PointerEvent("pointermove", { ...P(500 + 8 * i, 400), buttons: 1 })); globalThis.__probeGesture = e.isGestureActive(); globalThis.__catsup.hud.pick?.("move"); });
r.fiveGesture = await page.evaluate(() => globalThis.__probeGesture);
r.fiveDuring = await slot();
const f5 = await faces();
await page.click("#toolbar button.rail-face"); await page.waitForTimeout(100);
r.fiveClick = { gesture: await page.evaluate(() => globalThis.__catsup.editor.isGestureActive()), f: await faces(), f5 };
await b.close();
r.errs = errs;
console.log(JSON.stringify(r, null, 1));
const ok = !r.one.face && r.one.plain && r.two.face?.label === "删掉选中" && /trash-can/.test(r.two.face.icon) && /撤销/.test(r.two.face.title) && !r.two.plain
  && r.three.f === r.f0 - 1 && r.three.steps === 1 && !r.three.sel && !r.three.slot.face && r.three.slot.plain && r.four.f === r.f0
  && r.fiveBefore.face && r.fiveGesture && r.fiveDuring.face?.label === r.fiveBefore.face.label && !r.fiveClick.gesture && r.fiveClick.f === r.fiveClick.f5 - 1 && errs.length === 0;
console.log(ok ? "probe-rail-face OK" : "probe-rail-face FAIL");
process.exit(ok ? 0 : 1);
