// 软选择（比例编辑；mesh/soft-select.ts + tools/mesh-transform.ts + app/soft-slider.ts；created 2026-10-28 by Claude Opus 5.5）。
// user 10-28 夜「为什么不先做软选择，然后weebpaint的slider放哪里」。网格体盒子细分两次（一团圆的），选最高那个点——
// ① 软选择关着：G Z 0.5 回车 = 只有它动 ② O 打开：工具条有「软选择」开、左边竖滑条露出来；G Z 0.5 回车 = 它走满 0.5、附近的走一部分（0 < dz < 0.5）、远处（底下）不动；一步
// ③ 拖的过程中画半径圈 ④ ] 键 = 半径变大 ⑤ 换成选择工具 = 竖滑条收起。跑法：python3 -m http.server 8765 后 node test/probes/probe-soft-select.mjs [截图路径]
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 1000, height: 800 } });
page.setDefaultTimeout(4000);
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
const shot = process.argv[2] && !process.argv[2].startsWith("http") ? process.argv[2] : null;
await page.goto("http://127.0.0.1:8765/", { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1200);
const def = await page.evaluate(async () => {
  const e = globalThis.__catsup.editor, P = (x, y, z = 0) => ({ x, y, z }), sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const B = [[0, 0], [1, 0], [1, 1], [0, 1]], segs = []; for (let i = 0; i < 4; i++) { const a = B[i], d = B[(i + 1) % 4]; segs.push([P(a[0], a[1], 0), P(d[0], d[1], 0)]); segs.push([P(a[0], a[1], 1), P(d[0], d[1], 1)]); segs.push([P(a[0], a[1], 0), P(a[0], a[1], 1)]); }
  e.setGrid({ ...e.grid, on: false });
  e.commitOp({ op: "addEdges", at: e.activePool(), segs }); e.selectAll(); e.makeComponent("团"); e.runAction("object.toMesh"); await sleep(20);
  const s = e.scene, inst = [...s.def(s.root).instances.values()][0];
  e.selectedPools.clear(); e.selectedPools.set(`i${inst.id}`, { kind: "instance", instance: inst.id }); e.enterSelected(); await sleep(30);
  e.runAction("mesh.subdivide"); e.runAction("mesh.subdivide"); await sleep(20);
  e.cam.setView("iso"); e.zoomExtents(); e.draw(); globalThis.__catsup.hud.pick("move");
  return inst.def;
});
const snap = () => page.evaluate((d) => { const m = globalThis.__catsup.editor.scene.mesh(d).kernel; return Object.fromEntries(m.verts().map((v) => [v, m.pt(v).z])); }, def);
const selectTop = () => page.evaluate((d) => {   // 按屏幕位置拾取最高那个点再选（走正规入口：选区带「网格体」种类，键盘起手才认它）
  const e = globalThis.__catsup.editor, m = e.scene.mesh(d).kernel, top = m.verts().reduce((a, v) => (m.pt(v).z > m.pt(a).z ? v : a));
  const X = e.scene.xformOfContext(e.ctx), p = m.pt(top), w = { x: X[0] * p.x + X[1] * p.y + X[2] * p.z + X[3], y: X[4] * p.x + X[5] * p.y + X[6] * p.z + X[7], z: X[8] * p.x + X[9] * p.y + X[10] * p.z + X[11] }, s = e.cam.angularPx(w, e.vp());
  e.deselectAll(); e.selectExpand(e.pickAt(s.x, s.y), 0); globalThis.__catsup.hud.pick("move");
  return { top, sel: [...e.selection.verts] };
}, def);
const hover = async () => { await page.mouse.move(500, 380); await page.mouse.move(510, 390); await page.waitForTimeout(40); };
const keys = async (...ks) => { for (const k of ks) { await page.keyboard.press(k); await page.waitForTimeout(40); } };
const diff = (a, z) => Object.fromEntries(Object.keys(a).map((k) => [k, +(z[k] - a[k]).toFixed(6)]));
const r = {};
// ①
let sel = await selectTop(), top = sel.sel[0]; r.sel1 = sel.sel; await hover();
let z0 = await snap(); await keys("g", "z", "0", ".", "5", "Enter");
let d = diff(z0, await snap());
r.off = { top: d[top], moved: Object.values(d).filter((x) => Math.abs(x) > 1e-9).length };
await page.evaluate(() => globalThis.__catsup.editor.undo()); await page.waitForTimeout(40);
// ②
sel = await selectTop(); top = sel.sel[0]; r.sel2 = sel.sel; await hover();
await keys("o"); await page.waitForTimeout(60);
await page.evaluate(() => globalThis.__catsup.editor.config.set("soft", "radius", 400));   // 默认 120 像素在这个缩放下只有十几厘米，罩不到邻点
r.ui = await page.evaluate(() => ({ on: globalThis.__catsup.editor.config.get("soft", "on"), strip: /软选择/.test(document.getElementById("toolStrip")?.textContent ?? ""), slider: !document.querySelector(".soft-slider")?.hidden }));
z0 = await snap(); const st = await page.evaluate(() => globalThis.__catsup.editor.history.steps());
await keys("g", "z", "0", ".", "5");
await page.mouse.move(520, 380); await page.waitForTimeout(60);
r.midHint = await page.evaluate(() => globalThis.__catsup.hud.status());
r.midSoft = await page.evaluate(() => { const H = globalThis.__catsup.editor.toolHandler("move"); return H?.soft ? { n: H.soft.dist.size, minD: Math.min(...H.soft.dist.values()), maxD: Math.max(...H.soft.dist.values()) } : null; });
r.ring = await page.evaluate(() => { const s = document.getElementById("softRing"); return !!s && !s.hidden && Number(s.querySelector("circle")?.getAttribute("r")) > 0; });
if (shot) await page.screenshot({ path: shot });
await keys("Enter");
d = diff(z0, await snap());
const part = Object.entries(d).filter(([k, x]) => Number(k) !== top && x > 1e-6 && x < 0.5 - 1e-6).length, still = Object.values(d).filter((x) => Math.abs(x) < 1e-9).length;
r.on = { top: d[top], partial: part, still, steps: (await page.evaluate(() => globalThis.__catsup.editor.history.steps())) - st, ringAfter: await page.evaluate(() => !!document.getElementById("softRing")?.hidden) };
// ④
const r0 = await page.evaluate(() => globalThis.__catsup.editor.config.get("soft", "radius"));
await keys("]"); r.bigger = (await page.evaluate(() => globalThis.__catsup.editor.config.get("soft", "radius"))) > r0;
// ⑤
await page.evaluate(() => globalThis.__catsup.hud.pick("select")); await page.waitForTimeout(60);
r.sliderOnSelect = await page.evaluate(() => !document.querySelector(".soft-slider")?.hidden);
await b.close();
r.errs = errs;
console.log(JSON.stringify(r, null, 1));
const ok = Math.abs(r.off.top - 0.5) < 1e-9 && r.off.moved === 1 && r.ui.on && r.ui.strip && r.ui.slider && r.ring
  && Math.abs(r.on.top - 0.5) < 1e-9 && r.on.partial >= 3 && r.on.still >= 10 && r.on.steps === 1 && r.on.ringAfter && r.bigger && !r.sliderOnSelect && errs.length === 0;
console.log(ok ? "probe-soft-select OK" : "probe-soft-select FAIL");
process.exit(ok ? 0 : 1);
