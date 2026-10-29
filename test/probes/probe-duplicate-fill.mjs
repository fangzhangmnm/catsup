// 复制 / 补洞 / 翻转法线（mesh-edits 三条指令 + Shift+D；created 2026-10-28 by Claude Opus 5.5；user 10-28 夜「12做」「67放右键」）。网格体盒子——
// ① 选顶面、Shift+D = 复制叠在原处并接着挪；Z 1 回车 = 新面到 z + 1、原来的顶面不动；整个两步（复制 + 挪），撤销两下回原样
// ② 删掉顶面、选那一圈开口边、右键菜单有「补洞」、点它 = 补回一张面、封闭 ③ 选一张面、右键「翻转法线」= 它的环反过来。跑法：python3 -m http.server 8765 后 node test/probes/probe-duplicate-fill.mjs
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 1000, height: 800 } });
page.setDefaultTimeout(4000);
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto("http://127.0.0.1:8765/", { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1200);
const def = await page.evaluate(async () => {
  const e = globalThis.__catsup.editor, P = (x, y, z = 0) => ({ x, y, z }), sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const B = [[0, 0], [1, 0], [1, 1], [0, 1]], segs = []; for (let i = 0; i < 4; i++) { const a = B[i], d = B[(i + 1) % 4]; segs.push([P(a[0], a[1], 0), P(d[0], d[1], 0)]); segs.push([P(a[0], a[1], 1), P(d[0], d[1], 1)]); segs.push([P(a[0], a[1], 0), P(a[0], a[1], 1)]); }
  e.setGrid({ ...e.grid, on: false });
  e.commitOp({ op: "addEdges", at: e.activePool(), segs }); e.selectAll(); e.makeComponent("块"); e.runAction("object.toMesh"); await sleep(20);
  const s = e.scene, inst = [...s.def(s.root).instances.values()][0];
  e.selectedPools.clear(); e.selectedPools.set(`i${inst.id}`, { kind: "instance", instance: inst.id }); e.enterSelected(); await sleep(30);
  e.cam.setView("iso"); e.zoomExtents(); e.cam.halfH *= 1.4; e.draw(); globalThis.__catsup.hud.pick("select"); e.deselectAll();
  return inst.def;
});
const M = (fn, arg) => page.evaluate(fn, [def, arg]);
const zmax = () => M(([d]) => { const m = globalThis.__catsup.editor.scene.mesh(d).kernel; return Math.max(...m.verts().map((v) => m.pt(v).z)); });
const stat = () => M(([d]) => { const m = globalThis.__catsup.editor.scene.mesh(d).kernel; return { f: m.faceCount(), v: m.vertexCount(), open: m.edges().filter((e) => m.eFaces(e).length === 1).length, check: m.check().join(";") }; });
/** 本地点 → 屏幕 */
const scr = (p) => M(([d, p]) => { const e = globalThis.__catsup.editor, X = e.scene.xformOfContext(e.ctx), w = { x: X[0] * p.x + X[1] * p.y + X[2] * p.z + X[3], y: X[4] * p.x + X[5] * p.y + X[6] * p.z + X[7], z: X[8] * p.x + X[9] * p.y + X[10] * p.z + X[11] }; return e.cam.angularPx(w, e.vp()); }, p);
const topCenter = () => M(([d]) => { const m = globalThis.__catsup.editor.scene.mesh(d).kernel, f = m.faces().find((f) => m.faceVerts(f).every((v) => Math.abs(m.pt(v).z - Math.max(...m.verts().map((u) => m.pt(u).z))) < 1e-9)); const ps = m.faceVerts(f).map((v) => m.pt(v)); return { f, c: ps.reduce((a, p) => ({ x: a.x + p.x / ps.length, y: a.y + p.y / ps.length, z: a.z + p.z / ps.length }), { x: 0, y: 0, z: 0 }) }; });
const pickSelect = async (p) => { const s = await scr(p); await page.evaluate((s) => { const e = globalThis.__catsup.editor; e.deselectAll(); e.selectExpand(e.pickAt(s.x, s.y), 0); globalThis.__catsup.hud.pick("select"); }, s); return s; };
const rmenu = async (s) => { await page.evaluate((s) => { const c = document.getElementById("board"), r = c.getBoundingClientRect(); c.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: r.left + s.x, clientY: r.top + s.y, button: 2 })); }, s); await page.waitForTimeout(80); return page.evaluate(() => [...document.querySelectorAll(".popup-menu:not(.choice-layer) .menu-label")].map((x) => x.textContent).join(" | ")); };
const menuClick = (re) => page.evaluate((src) => { const re = new RegExp(src); const it = [...document.querySelectorAll(".popup-menu:not(.choice-layer) [data-menu-id]")].find((x) => re.test(x.textContent ?? "")); it?.dispatchEvent(new MouseEvent("click", { bubbles: true })); return !!it; }, re.source);
const r = {}, EMPTY = { x: 720, y: 140 };
// ①
const t0 = await topCenter(), s0 = await stat();
const sc = await pickSelect(t0.c), st0 = await page.evaluate(() => globalThis.__catsup.editor.history.steps());
await page.mouse.move(sc.x + 5, sc.y + 5); await page.mouse.move(sc.x + 8, sc.y + 6);
await page.keyboard.press("Shift+D"); await page.waitForTimeout(60);
r.dupModal = await page.evaluate(() => ({ gesture: globalThis.__catsup.editor.isGestureActive(), tool: globalThis.__catsup.editor.tool }));
for (const k of ["z", "1", "Enter"]) { await page.keyboard.press(k); await page.waitForTimeout(40); }
r.dup = { s: await stat(), zmax: await zmax(), steps: (await page.evaluate(() => globalThis.__catsup.editor.history.steps())) - st0, origTop: await M(([d, f]) => { const m = globalThis.__catsup.editor.scene.mesh(d).kernel; return m.hasF(f) && m.faceVerts(f).every((v) => Math.abs(m.pt(v).z - 1) < 1e-9); }, t0.f) };
for (let i = 0; i < 4 && (await page.evaluate(() => globalThis.__catsup.editor.history.steps())) > st0; i++) await page.evaluate(() => globalThis.__catsup.editor.undo());
r.dupUndo = await stat();
// ② 删顶面 → 选开口那一圈（选一条开口边再 Alt 点它 = 洞）→ 右键补洞
await pickSelect(t0.c); await page.evaluate(() => { globalThis.__catsup.editor.deleteSelection(); });
r.holed = await stat();
await M(([d]) => { const e = globalThis.__catsup.editor, m = e.scene.mesh(d).kernel; e.deselectAll(); const open = m.edges().filter((x) => m.eFaces(x).length === 1); for (const x of open) e.selection.edges.add(x); e.afterSelectForProbe?.(); });
const mid = await scr({ x: t0.c.x, y: t0.c.y, z: t0.c.z }); r.mid = mid; r.t0 = t0;
r.menu2 = await rmenu(EMPTY);   // 空处右键 + 有选区 = 选区的菜单（按在几何上会把选区换成按到的那个）
r.fillClicked = await menuClick(/补洞/);
await page.waitForTimeout(80);
r.filled = await stat();
// ③ 翻转法线
const t1 = await topCenter(), ring0 = await M(([d, f]) => [...globalThis.__catsup.editor.scene.mesh(d).kernel.faceVerts(f)], t1.f);
const s3 = await pickSelect(t1.c);
r.menu3 = await rmenu(EMPTY);
r.flipClicked = await menuClick(/翻转法线/);
await page.waitForTimeout(80);
const ring1 = await M(([d, f]) => [...globalThis.__catsup.editor.scene.mesh(d).kernel.faceVerts(f)], t1.f);
r.flip = { reversed: JSON.stringify([...ring1].reverse().sort()) === JSON.stringify([...ring0].sort()) && JSON.stringify(ring1) !== JSON.stringify(ring0) };
await b.close();
r.errs = errs;
console.log(JSON.stringify(r, null, 1));
const ok = r.dupModal.gesture && r.dupModal.tool === "move" && r.dup.s.f === s0.f + 1 && r.dup.s.v === s0.v + 4 && Math.abs(r.dup.zmax - 2) < 1e-9 && r.dup.origTop && r.dup.steps === 2
  && r.dupUndo.f === s0.f && r.dupUndo.v === s0.v && r.holed.f === s0.f - 1 && r.holed.open === 4 && /补洞/.test(r.menu2) && r.fillClicked && r.filled.f === s0.f && r.filled.open === 0 && !r.filled.check
  && /翻转法线/.test(r.menu3) && r.flipClicked && r.flip.reversed && errs.length === 0;
console.log(ok ? "probe-duplicate-fill OK" : "probe-duplicate-fill FAIL");
process.exit(ok ? 0 : 1);
