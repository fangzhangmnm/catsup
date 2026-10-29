// 左柱 + 右下删除（created 2026-10-28 by Claude Opus 5.5；v0.16.31 改写）：user 10-28 夜「delete变成按钮可能不大好。吃书吧。变成右下的一个按钮？」
// 「沿法向移动和推拉合租小三角」「小三角需要长按的时间有点长」。自由建模网格体盒子——
// ① 选一张面：左柱「删除」格不变脸（没有垃圾桶）；右下工具条末尾有「删除」② 点它 = 删了那张面、一步；撤销回来 ③ 没选区 = 右下没有「删除」
// ④ 「挤出」格带小三角；长按 300 ms（> 260 ms）就弹出整组（挤出 / 沿法线）；选「沿法线」= 换成它，格子显示沿法线。跑法：python3 -m http.server 8765 后 node test/probes/probe-rail-face.mjs
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 1000, height: 800 } });
page.setDefaultTimeout(4000);
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto("http://127.0.0.1:8765/", { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1200);
const def = await page.evaluate(async () => {
  const e = globalThis.__catsup.editor, P = (x, y, z = 0) => ({ x, y, z }), sleep = (ms) => new Promise((rr) => setTimeout(rr, ms));
  const B = [[0, 0], [1, 0], [1, 1], [0, 1]], segs = []; for (let i = 0; i < 4; i++) { const a = B[i], d = B[(i + 1) % 4]; segs.push([P(a[0], a[1], 0), P(d[0], d[1], 0)]); segs.push([P(a[0], a[1], 1), P(d[0], d[1], 1)]); segs.push([P(a[0], a[1], 0), P(a[0], a[1], 1)]); }
  e.commitOp({ op: "addEdges", at: e.activePool(), segs }); e.selectAll(); e.makeComponent("块"); e.runAction("object.toMesh"); await sleep(20);
  const s = e.scene, inst = [...s.def(s.root).instances.values()][0];
  e.selectedPools.clear(); e.selectedPools.set(`i${inst.id}`, { kind: "instance", instance: inst.id }); e.enterSelected(); await sleep(30);
  e.cam.setView("iso"); e.zoomExtents(); e.draw(); globalThis.__catsup.hud.pick("select"); e.deselectAll();
  return inst.def;
});
const faces = () => page.evaluate((d) => globalThis.__catsup.editor.scene.mesh(d).kernel.faceCount(), def);
const stripHas = () => page.evaluate(() => [...document.querySelectorAll("#toolStrip button")].some((x) => x.textContent === "删除"));
const r = {};
// ①
await page.evaluate((d) => { const e = globalThis.__catsup.editor, m = e.scene.mesh(d).kernel, f = m.faces()[0], c = m.faceVerts(f).map((v) => m.pt(v)).reduce((a, p) => ({ x: a.x + p.x / 4, y: a.y + p.y / 4, z: a.z + p.z / 4 }), { x: 0, y: 0, z: 0 }); const X = e.scene.xformOfContext(e.ctx), w = { x: X[0] * c.x + X[1] * c.y + X[2] * c.z + X[3], y: X[4] * c.x + X[5] * c.y + X[6] * c.z + X[7], z: X[8] * c.x + X[9] * c.y + X[10] * c.z + X[11] }, s = e.cam.angularPx(w, e.vp()); e.selectExpand(e.pickAt(s.x, s.y), 0); globalThis.__catsup.hud.pick("select"); }, def);
await page.waitForTimeout(80);
r.one = { sel: await page.evaluate(() => globalThis.__catsup.editor.hasSelection()), trash: await page.evaluate(() => !!document.querySelector("#toolbar button.rail-face")), strip: await stripHas() };
// ②
const f0 = await faces(), st = await page.evaluate(() => globalThis.__catsup.editor.history.steps());
await page.evaluate(() => [...document.querySelectorAll("#toolStrip button")].find((x) => x.textContent === "删除")?.click()); await page.waitForTimeout(100);
r.two = { df: (await faces()) - f0, steps: (await page.evaluate(() => globalThis.__catsup.editor.history.steps())) - st };
await page.evaluate(() => globalThis.__catsup.editor.undo()); await page.waitForTimeout(60);
r.two.back = (await faces()) === f0;
// ③
await page.evaluate(() => { globalThis.__catsup.editor.deselectAll(); globalThis.__catsup.hud.pick("select"); }); await page.waitForTimeout(60);
r.three = { strip: await stripHas() };
// ④
const btn = page.locator("#toolbar button.tool").filter({ hasText: "挤出" }).first(), bb = await btn.boundingBox();
r.four = { flyMark: await btn.evaluate((x) => !!x.querySelector(".tool-flyout")) };
await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2); await page.mouse.down(); await page.waitForTimeout(300);
r.four.menu = await page.evaluate(() => [...document.querySelectorAll(".popup-menu")].map((x) => x.textContent).join(" | "));
await page.mouse.up(); await page.waitForTimeout(60);
await page.evaluate(() => [...document.querySelectorAll(".popup-menu [data-menu-id]")].find((x) => /沿法线/.test(x.textContent ?? ""))?.dispatchEvent(new MouseEvent("click", { bubbles: true }))); await page.waitForTimeout(100);
r.four.tool = await page.evaluate(() => globalThis.__catsup.editor.tool);
r.four.slot = await page.evaluate(() => [...document.querySelectorAll("#toolbar button.tool")].map((x) => x.querySelector(".tool-label")?.textContent).join(" "));
await b.close();
r.errs = errs;
console.log(JSON.stringify(r, null, 1));
const ok = r.one.sel && !r.one.trash && r.one.strip && r.two.df === -1 && r.two.steps === 1 && r.two.back && !r.three.strip
  && r.four.flyMark && /挤出/.test(r.four.menu) && /沿法线/.test(r.four.menu) && r.four.tool === "shrink" && /沿法线/.test(r.four.slot) && errs.length === 0;
console.log(ok ? "probe-rail-face OK" : "probe-rail-face FAIL");
process.exit(ok ? 0 : 1);
