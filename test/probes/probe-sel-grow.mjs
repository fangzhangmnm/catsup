// 扩 / 缩选区的拖动条（app/sel-grow-bar.ts + Editor.selGrow*；created 2026-10-28 by Claude Opus 5.5；user 10-28 夜「4我不是说了是select按第二次的的gizmos吗，做」）。
// 自由建模网格体盒子、选择工具——① 点顶面 = 选中；隔一会儿再点它 = 选区不变、出条 ② 拖条往右 30 px = 扩一圈（5 张面）、松手一步；撤销 = 回到 1 张
// ③ 点「+」= 扩一圈；点「−」= 缩回 1 张 ④ 点空处 = 条收起。跑法：python3 -m http.server 8765 后 node test/probes/probe-sel-grow.mjs
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 1000, height: 800 } });
page.setDefaultTimeout(4000);
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto("http://127.0.0.1:8765/", { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1200);
const tc = await page.evaluate(async () => {
  const e = globalThis.__catsup.editor, P = (x, y, z = 0) => ({ x, y, z }), sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const B = [[0, 0], [1, 0], [1, 1], [0, 1]], segs = []; for (let i = 0; i < 4; i++) { const a = B[i], d = B[(i + 1) % 4]; segs.push([P(a[0], a[1], 0), P(d[0], d[1], 0)]); segs.push([P(a[0], a[1], 1), P(d[0], d[1], 1)]); segs.push([P(a[0], a[1], 0), P(a[0], a[1], 1)]); }
  e.setGrid({ ...e.grid, on: false });
  e.commitOp({ op: "addEdges", at: e.activePool(), segs }); e.selectAll(); e.makeComponent("块"); e.runAction("object.toMesh"); await sleep(20);
  const s = e.scene, inst = [...s.def(s.root).instances.values()][0];
  e.selectedPools.clear(); e.selectedPools.set(`i${inst.id}`, { kind: "instance", instance: inst.id }); e.enterSelected(); await sleep(30);
  e.cam.setView("iso"); e.zoomExtents(); e.cam.halfH *= 1.4; e.draw(); globalThis.__catsup.hud.pick("select"); e.deselectAll();
  const m = s.mesh(inst.def).kernel, f = m.faces().find((f) => m.faceVerts(f).every((v) => m.pt(v).z === Math.max(...m.verts().map((u) => m.pt(u).z)))), ps = m.faceVerts(f).map((v) => m.pt(v));
  const c = ps.reduce((a, p) => ({ x: a.x + p.x / 4, y: a.y + p.y / 4, z: a.z + p.z / 4 }), { x: 0, y: 0, z: 0 }), X = s.xformOfContext(e.ctx);
  return e.cam.angularPx({ x: X[0] * c.x + X[1] * c.y + X[2] * c.z + X[3], y: X[4] * c.x + X[5] * c.y + X[6] * c.z + X[7], z: X[8] * c.x + X[9] * c.y + X[10] * c.z + X[11] }, e.vp());
});
const box = await page.locator("#board").boundingBox();
const clickAt = async (p) => { await page.mouse.move(box.x + p.x, box.y + p.y); await page.mouse.down(); await page.mouse.up(); await page.waitForTimeout(80); };
const st = () => page.evaluate(() => { const e = globalThis.__catsup.editor, bar = document.querySelector(".selgrow"); return { faces: e.selection.faces.size, bar: !!bar && !bar.hidden, steps: e.history.steps() }; });
const r = {};
// ①
await clickAt(tc); r.first = await st();
await page.waitForTimeout(700);   // 过了双击窗口
await clickAt(tc); r.again = await st();
// ②
const tr = await page.locator(".selgrow-track").boundingBox();
await page.mouse.move(tr.x + tr.width / 2, tr.y + tr.height / 2); await page.mouse.down();
for (let i = 1; i <= 6; i++) { await page.mouse.move(tr.x + tr.width / 2 + 5 * i, tr.y + tr.height / 2); await page.waitForTimeout(16); }
r.dragging = await st();
await page.mouse.up(); await page.waitForTimeout(60);
r.released = await st();
await page.evaluate(() => globalThis.__catsup.editor.undo()); await page.waitForTimeout(60);
r.undone = await st();
// ③
await page.click(".selgrow-btn:has-text('+')"); await page.waitForTimeout(60); r.plus = await st();
await page.click(".selgrow-btn:has-text('−')"); await page.waitForTimeout(60); r.minus = await st();
// ④
await clickAt({ x: 60 + 700, y: 120 }); r.away = await st();
await b.close();
r.errs = errs;
console.log(JSON.stringify(r, null, 1));
const ok = r.first.faces === 1 && !r.first.bar && r.again.faces === 1 && r.again.bar && r.dragging.faces === 5 && r.released.faces === 5 && r.released.steps === r.again.steps + 1
  && r.undone.faces === 1 && r.plus.faces === 5 && r.minus.faces === 1 && !r.away.bar && errs.length === 0;
console.log(ok ? "probe-sel-grow OK" : "probe-sel-grow FAIL");
process.exit(ok ? 0 : 1);
