// 软编辑笔刷（tools/mesh-brush.ts；created 2026-10-29 by Claude Opus 5.5；账本 UX53「笔刷小三角同意。然后算是自动折叠的不是常驻的」）。
// 顶视图、一块细分过的平板（网格体，z = 0、法向 +z）——
// ① 左柱折叠组的「…」里有 抓 / 鼓起 / 抹平 / 压平；拿起鼓起 = 左栏 dial 露（半径那格）、工具条有「力度」；悬停 = 光标处出笔刷圈
// ② 鼓起：横着刮过中间 = 路过的点往上（z > 0）、离得远的不动；一步撤销；撤销 = 全回 0
// ③ 鼓起按住 Ctrl = 压进去（z < 0）④ 抹平：先鼓一个包、再在包上刮 = 最高点变矮 ⑤ 压平：先鼓包、再压平 = 最高点变矮
// ⑥ 鼓起按住 Shift = 临时抹平（包变矮，没变高）⑦ 抓：按在中间往上拖（世界 +y）= 中间的点往 +y 走、越远走得越少、边上的不动；z 不变
// ⑧ 抓完拿起选择工具 = 左栏 dial 收。跑法：python3 -m http.server 8765 后 node test/probes/probe-brushes.mjs
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 1000, height: 800 } }); page.setDefaultTimeout(4000);
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto("http://127.0.0.1:8765/", { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1200);
const def = await page.evaluate(async () => {
  const e = globalThis.__catsup.editor, P = (x, y, z = 0) => ({ x, y, z }), sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const B = [[0, 0], [1, 0], [1, 1], [0, 1]], segs = []; for (let i = 0; i < 4; i++) { const a = B[i], d = B[(i + 1) % 4]; segs.push([P(a[0], a[1], 0), P(d[0], d[1], 0)]); segs.push([P(a[0], a[1], 1), P(d[0], d[1], 1)]); segs.push([P(a[0], a[1], 0), P(a[0], a[1], 1)]); }
  e.setGrid({ ...e.grid, on: false });
  e.commitOp({ op: "addEdges", at: e.activePool(), segs }); e.selectAll(); e.makeComponent("块"); e.runAction("object.toMesh"); await sleep(20);
  const s = e.scene, inst = [...s.def(s.root).instances.values()][0];
  e.selectedPools.clear(); e.selectedPools.set(`i${inst.id}`, { kind: "instance", instance: inst.id }); e.enterSelected(); await sleep(30);
  // 换成一块 4×4 的平板：删光盒子、长一块平面、细分三次（平板在 z = 0，法向朝上）
  e.selectAll(); e.deleteSelection(); await sleep(10);
  e.commitOp({ op: "meshAddPrimitive", def: inst.def, kind: "plane", frame: { o: P(0, 0, 0), x: P(1, 0, 0), y: P(0, 1, 0), z: P(0, 0, 1) }, size: [4, 4, 0] });
  e.commitOp({ op: "meshSubdivide", def: inst.def, levels: 3 });
  e.deselectAll(); e.cam.setView("top"); e.zoomExtents(); e.draw();
  return inst.def;
});
const scr = (p) => page.evaluate((p) => { const e = globalThis.__catsup.editor, c = document.getElementById("board").getBoundingClientRect(), X = e.scene.xformOfContext(e.ctx), w = { x: X[0] * p.x + X[1] * p.y + X[2] * p.z + X[3], y: X[4] * p.x + X[5] * p.y + X[6] * p.z + X[7], z: X[8] * p.x + X[9] * p.y + X[10] * p.z + X[11] }, s = e.cam.angularPx(w, e.vp()); return { x: c.left + s.x, y: c.top + s.y }; }, p);
const stats = () => page.evaluate((d) => { const m = globalThis.__catsup.editor.scene.mesh(d).kernel, vs = m.verts().map((v) => m.pt(v)); const zs = vs.map((p) => p.z); return { n: vs.length, maxZ: Math.max(...zs), minZ: Math.min(...zs), moved: zs.filter((z) => Math.abs(z) > 1e-9).length, corner: zs[vs.reduce((bi, p, i) => (Math.hypot(p.x, p.y) > Math.hypot(vs[bi].x, vs[bi].y) ? i : bi), 0)] }; /* 离中心最远的那个点（细分过的开口边界往里收，角不在 ±2） */ }, def);
const steps = () => page.evaluate(() => globalThis.__catsup.editor.history.steps());
const pick = (t) => page.evaluate((t) => globalThis.__catsup.hud.pick(t), t);
const stroke = async (from, to, n = 16, mods = []) => { const a = await scr(from), c = await scr(to); for (const k of mods) await page.keyboard.down(k); await page.mouse.move(a.x, a.y); await page.mouse.down(); for (let i = 1; i <= n; i++) { await page.mouse.move(a.x + (c.x - a.x) * i / n, a.y + (c.y - a.y) * i / n); await page.waitForTimeout(10); } await page.mouse.up(); for (const k of mods) await page.keyboard.up(k); await page.waitForTimeout(60); };
const r = {};
// ①
await pick("select"); await page.waitForTimeout(40);
const more = await page.$("#toolbar .rail-more"); await more.click(); await page.waitForTimeout(100);
r.one = { more: await page.evaluate(() => [...document.querySelectorAll(".popup-menu .menu-label")].map((x) => x.textContent).join(" | ")) };
await page.keyboard.press("Escape");
await pick("brushDraw"); await page.evaluate(() => globalThis.__catsup.editor.config.set("soft", "radius", 120)); await page.waitForTimeout(80);
// v0.17.55 起拿起笔刷会自动开「雕刻笔刷」浮窗（user 10-30）：它会挡住要刷的那块画布——关掉（这次会话就不再自动开）
r.brushWin = await page.evaluate(() => { const w = document.querySelector('.float-win[data-win="brush"]:not([hidden])'); if (w) w.querySelector(".float-close").click(); return !!w; });
const mid = await scr({ x: 0, y: 0, z: 0 }); await page.mouse.move(mid.x, mid.y); await page.mouse.move(mid.x + 3, mid.y); await page.waitForTimeout(40);
r.one.dial = await page.evaluate(() => !document.querySelector(".left-dial")?.hidden);
r.one.strip = await page.evaluate(() => /力度/.test(document.getElementById("toolStrip")?.textContent ?? ""));
r.one.ring = await page.evaluate(() => !document.getElementById("softRing")?.hidden);
r.one.rail = await page.evaluate(() => [...document.getElementById("toolbar").querySelectorAll(".tool-label")].map((x) => x.textContent).join(" "));
// ②
const s0 = await stats(), st0 = await steps();
await stroke({ x: -1.2, y: 0, z: 0 }, { x: 1.2, y: 0, z: 0 });
const s2 = await stats();
r.two = { maxZ: s2.maxZ, moved: s2.moved, total: s2.n, corner: s2.corner, steps: (await steps()) - st0 };
await page.evaluate(() => globalThis.__catsup.editor.undo()); await page.waitForTimeout(40);
r.two.undone = (await stats()).moved === 0;
// ③ Ctrl
await stroke({ x: -1.2, y: 0, z: 0 }, { x: 1.2, y: 0, z: 0 }, 16, ["Control"]);
r.three = { minZ: (await stats()).minZ };
await page.evaluate(() => globalThis.__catsup.editor.undo()); await page.waitForTimeout(40);
// 鼓一个包（来回刮几下）
const bump = async () => { for (let k = 0; k < 3; k++) await stroke({ x: -0.6, y: 0, z: 0 }, { x: 0.6, y: 0, z: 0 }); return (await stats()).maxZ; };
// ④ 抹平
await pick("brushDraw"); const h4 = await bump();
await pick("brushSmooth"); for (let k = 0; k < 2; k++) await stroke({ x: -0.8, y: 0, z: 0 }, { x: 0.8, y: 0, z: 0 });
r.four = { before: h4, after: (await stats()).maxZ };
// ⑤ 压平
await pick("brushDraw"); const h5 = await bump();
await pick("brushFlatten"); for (let k = 0; k < 2; k++) await stroke({ x: -0.8, y: 0, z: 0 }, { x: 0.8, y: 0, z: 0 });
r.five = { before: h5, after: (await stats()).maxZ };
// ⑥ Shift = 临时抹平
await pick("brushDraw"); const h6 = await bump();
await stroke({ x: -0.8, y: 0, z: 0 }, { x: 0.8, y: 0, z: 0 }, 16, ["Shift"]);
r.six = { before: h6, after: (await stats()).maxZ };
for (let i = 0; i < 30 && (await steps()) > st0; i++) await page.evaluate(() => globalThis.__catsup.editor.undo());
// ⑦ 抓
await pick("brushGrab"); await page.waitForTimeout(40);
const g0 = await page.evaluate((d) => { const m = globalThis.__catsup.editor.scene.mesh(d).kernel; return m.verts().map((v) => [v, m.pt(v)]); }, def);
await stroke({ x: 0, y: 0, z: 0 }, { x: 0, y: 0.5, z: 0 }, 10);
r.seven = await page.evaluate(([d, g0]) => { const m = globalThis.__catsup.editor.scene.mesh(d).kernel; let center = null, far = 0, maxDy = 0, zMoved = 0; const mid = []; for (const [v, p] of g0) { const q = m.pt(v), dy = q.y - p.y; zMoved = Math.max(zMoved, Math.abs(q.z - p.z)); if (Math.hypot(p.x, p.y) < 1e-9) center = dy; if (Math.hypot(p.x, p.y) > 1.8 && Math.abs(dy) > 1e-9) far++; maxDy = Math.max(maxDy, dy); if (Math.abs(Math.hypot(p.x, p.y) - 0.5) < 0.05) mid.push(dy); } return { center, far, maxDy, zMoved, midAvg: mid.length ? mid.reduce((a, b) => a + b, 0) / mid.length : null }; }, [def, g0]);
// ⑧
await pick("select"); await page.waitForTimeout(80);
r.eight = await page.evaluate(() => !!document.querySelector(".left-dial")?.hidden);
await b.close();
r.errs = errs;
console.log(JSON.stringify(r, null, 1));
const ok = /抓/.test(r.one.more) && /鼓起/.test(r.one.more) && /抹平/.test(r.one.more) && /压平/.test(r.one.more) && r.one.dial && r.one.strip && r.one.ring && /鼓起/.test(r.one.rail)
  && r.two.maxZ > 0.01 && r.two.moved > 0 && r.two.moved < r.two.total && r.two.corner === 0 && r.two.steps === 1 && r.two.undone
  && r.three.minZ < -0.01 && r.four.after < r.four.before - 1e-4 && r.five.after < r.five.before - 1e-4 && r.six.after < r.six.before - 1e-4
  && r.seven.center > 0.3 && r.seven.far === 0 && r.seven.zMoved < 0.05 * r.seven.maxDy /* 正对镜头的平面上拖；顶视图有 1.2° 的倾角（camera.ts pitch 1.55），所以 z 有一丁点 */ && r.seven.midAvg !== null && r.seven.midAvg < r.seven.center && r.seven.midAvg > 0 && r.eight && errs.length === 0;
console.log(ok ? "probe-brushes OK" : "probe-brushes FAIL");
process.exit(ok ? 0 : 1);
