// N / T 拾眼前画出来的东西（锁的一轮第三步审后，统筹 11-13；2026-11-13 Claude Opus 5.5）。规矩：被挪 / 被转的照现在的位置朝向算，只有这一下动作自己新生的不算、对 N / T 透明（判法 = src/editor/born-this-gesture.ts）。
// ① 自由建模：点选斜面、按住它拖开（光标离开原位置）按 N = 这张斜面的法线（眼前它在光标下）
// ② 硬表面：盒子沿 X 拖到墙前（墙在它正后方）按 N = 盒子顶面 Z，不是墙
// ②b 硬表面：盒子拖到一根散线上、顶面被切成两块新编号，光标在其中一块上按 N = 顶面（切开的碎片算原来那张：拾到的是新编号、在 z = 1，不是往后看拾到的底面）
// ③a 画线、预演线经过光标、光标压在墙的底边上按 T = 那条边；③b 光标在空处按 T = 提示、不拾预演线
// 跑法：python3 -m http.server 8765 后 node test/probes/probe-axis-live-pick.mjs [地址]
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 1000, height: 800 } });
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(process.argv[2] ?? "http://127.0.0.1:8765/", { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1500);
const box = await page.locator("#board").boundingBox();
const P = (x, y, z = 0) => ({ x, y, z });
const px = (p) => page.evaluate((p) => { const e = globalThis.__catsup.editor; return e.cam.angularPx(p, e.vp()); }, p);
const con = () => page.evaluate(() => { const e = globalThis.__catsup.editor, k = e.axisConstraintNow(), r = (v) => v ? [+v.x.toFixed(4), +v.y.toFixed(4), +v.z.toFixed(4)] : null; return { kind: k.kind, dir: r(k.dir), hint: document.getElementById("hint")?.textContent ?? "", gest: e.isGestureActive(), tool: e.tool }; });
const res = {};
// ② 硬表面：盒子 1×1×1 在原点；墙 = 一大块竖面，垂直于视线的水平方向，放在落点 D 后面 off 米。手势里先按 X（只沿 X 走，不让光标吸到墙上）拖到 D，再按 N。
// ②a：盒子挡在墙前、不碰墙。②b（血缘）：顶面落点的平面里有一根散线（z = 1、沿 Y、x = 2），盒子拖过去顶面被它切成两块新编号；光标停在 x = 2.2 那块上
const twoCell = async (off, cut) => {
  await page.evaluate(([off, cut]) => {
    const e = globalThis.__catsup.editor, P = (x, y, z = 0) => ({ x, y, z });
    e.setTool("select"); e.selectAll(); e.deleteSelection();
    e.cam.setView("iso");
    const f = e.cam.forward(), h = Math.hypot(f.x, f.y), fx = f.x / h, fy = f.y / h, px = -fy, py = fx, D = P(2, 0.5, 1);
    const W = P(D.x + off * fx, D.y + off * fy, 0), c = (s, z) => P(W.x + s * px, W.y + s * py, z);
    const segs = []; const B = [[0, 0], [1, 0], [1, 1], [0, 1]];
    for (let i = 0; i < 4; i++) { const a = B[i], d = B[(i + 1) % 4]; segs.push([P(a[0], a[1], 0), P(d[0], d[1], 0)], [P(a[0], a[1], 1), P(d[0], d[1], 1)], [P(a[0], a[1], 0), P(a[0], a[1], 1)]); }
    segs.push([c(-5, -5), c(5, -5)], [c(5, -5), c(5, 5)], [c(5, 5), c(-5, 5)], [c(-5, 5), c(-5, -5)]);
    if (cut) segs.push([P(2, -2, 1), P(2, 3, 1)]);
    e.commitOp({ op: "addEdges", at: e.activePool(), segs }); e.setGrid({ ...e.grid, on: false }); e.zoomExtents(); e.draw();
    const k = e.kernel; e.deselectAll();
    for (const fc of k.faces()) { const n = k.planeOf(fc.id).plane.n; if (Math.max(Math.abs(n.x), Math.abs(n.y), Math.abs(n.z)) > 0.99) e.selection.faces.add(fc.id); }   // 盒子的面都正对轴；墙是斜的
    e.draw();
  }, [off, cut]);
  await page.evaluate(() => globalThis.__catsup.hud.pick("move"));
  const top = await px(P(0.5, 0.5, 1)), dst = await px(P(cut ? 2.2 : 2, 0.5, 1));
  await page.mouse.move(box.x + top.x, box.y + top.y); await page.waitForTimeout(60); await page.mouse.down();
  await page.mouse.move(box.x + top.x + 6, box.y + top.y + 2); await page.waitForTimeout(60);
  await page.keyboard.press("x"); await page.waitForTimeout(60);
  for (let i = 1; i <= 10; i++) { await page.mouse.move(box.x + top.x + (dst.x - top.x) * i / 10, box.y + top.y + (dst.y - top.y) * i / 10); await page.waitForTimeout(30); }
  await page.waitForTimeout(120);
  const hint = await page.evaluate(() => document.getElementById("hint")?.textContent ?? "");
  const picked = await page.evaluate(() => { const e = globalThis.__catsup.editor, f = e.axisKeys.p.faceUnder(); if (!f) return null; const gid = +f.ref.slice(5), pl = e.liveWorldForProbe().planeOf(gid).plane; return { gid, newId: !e.worldView().face(gid), n: [pl.n.x, pl.n.y, pl.n.z], d: pl.d }; });   // 按 N 那一刻拾到的是哪张面（同一个端口）
  await page.keyboard.press("n"); await page.waitForTimeout(80);
  const r = await con();
  await page.keyboard.press("Escape"); await page.mouse.up(); await page.waitForTimeout(100);
  return { ...r, before: hint, picked };
};
res.two = await twoCell(2.5, false);
res.twoB = await twoCell(2.5, true);
// ③ 用的场景：盒子 + x = 3 的墙
await page.evaluate(() => {
  const e = globalThis.__catsup.editor, P = (x, y, z = 0) => ({ x, y, z });
  e.setTool("select"); e.selectAll(); e.deleteSelection();
  const segs = []; const B = [[0, 0], [1, 0], [1, 1], [0, 1]];
  for (let i = 0; i < 4; i++) { const a = B[i], d = B[(i + 1) % 4]; segs.push([P(a[0], a[1], 0), P(d[0], d[1], 0)], [P(a[0], a[1], 1), P(d[0], d[1], 1)], [P(a[0], a[1], 0), P(a[0], a[1], 1)]); }
  segs.push([P(3, -1, 0), P(3, 3, 0)], [P(3, 3, 0), P(3, 3, 2.5)], [P(3, 3, 2.5), P(3, -1, 2.5)], [P(3, -1, 2.5), P(3, -1, 0)]);
  e.commitOp({ op: "addEdges", at: e.activePool(), segs }); e.cam.setView("iso"); e.zoomExtents(); e.draw();
});
// ③ 硬表面画线、预演线经过光标按 T：（a）光标下有已有的边（墙的底边）= 那条边；（b）光标在空处 = 提示
await page.evaluate(() => { const e = globalThis.__catsup.editor; e.deselectAll(); globalThis.__catsup.hud.pick("line"); });
const s0 = await px(P(-1, -2, 0)), eb = await px(P(3, 1, 0));
await page.mouse.move(box.x + s0.x, box.y + s0.y); await page.mouse.down(); await page.mouse.up(); await page.waitForTimeout(60);
await page.mouse.move(box.x + eb.x, box.y + eb.y, { steps: 6 }); await page.waitForTimeout(120);
await page.keyboard.press("t"); await page.waitForTimeout(80); res.threeA = await con();
await page.keyboard.press("Escape"); await page.waitForTimeout(60);
await page.mouse.move(box.x + s0.x, box.y + s0.y); await page.mouse.down(); await page.mouse.up(); await page.waitForTimeout(60);
const emp = await px(P(-2.5, 1.5, 0)); await page.mouse.move(box.x + emp.x, box.y + emp.y, { steps: 6 }); await page.waitForTimeout(120);
await page.keyboard.press("t"); await page.waitForTimeout(80); res.threeB = await con();
await page.keyboard.press("Escape"); await page.waitForTimeout(60); await page.keyboard.press("Escape"); await page.waitForTimeout(60);
// ① 自由建模：楔形网格体，选斜面、按住它拖开一段（光标离开原位置），按 N
await page.evaluate(async () => {
  const e = globalThis.__catsup.editor, P = (x, y, z = 0) => ({ x, y, z }), sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  e.setTool("select"); e.selectAll(); e.deleteSelection(); await sleep(20);
  const A = P(0, 0), B = P(2, 0), C = P(2, 1), D = P(0, 1), E = P(0, 0, 1), F = P(0, 1, 1);
  e.commitOp({ op: "addEdges", at: e.activePool(), segs: [[A, B], [B, C], [C, D], [D, A], [A, E], [D, F], [E, F], [E, B], [F, C]] });
  e.selectAll(); e.runAction("brep.orientOutward", { curvature: 3 }); e.makeComponent("楔"); e.runAction("object.toMesh"); await sleep(20);
  const S = e.scene, inst = [...S.def(S.root).instances.values()][0];
  e.cam.setView("iso"); e.zoomExtents(); e.cam.halfH *= 1.8; e.draw();
  e.selectedPools.clear(); e.selectedPools.set(`i${inst.id}`, { kind: "instance", instance: inst.id }); e.enterSelected(); await sleep(20);
  const m = S.mesh(inst.def).kernel; e.deselectAll();
  for (const f of m.faces()) { const vs = m.faceVerts ? m.faceVerts(f) : null; void vs; }
  e.setTool("select"); await sleep(300);
});
const slope = await px(P(1, 0.5, 0.5));
await page.mouse.move(box.x + slope.x, box.y + slope.y); await page.mouse.down(); await page.mouse.up(); await page.waitForTimeout(80);   // 点选斜面
res.oneSel = await page.evaluate(() => globalThis.__catsup.editor.selection.faces.size);
await page.evaluate(() => globalThis.__catsup.hud.pick("move"));
await page.mouse.move(box.x + slope.x, box.y + slope.y); await page.waitForTimeout(60); await page.mouse.down();
for (let i = 1; i <= 8; i++) { await page.mouse.move(box.x + slope.x + 12 * i, box.y + slope.y - 10 * i); await page.waitForTimeout(30); }
await page.waitForTimeout(120);
await page.keyboard.press("n"); await page.waitForTimeout(80); res.one = await con();
await page.keyboard.press("Escape"); await page.mouse.up(); await page.waitForTimeout(80);
const l = Math.hypot(1, 0, 2), n0 = [1 / l, 0, 2 / l];
const par = (a, b2) => !!a && Math.abs(Math.abs(a[0] * b2[0] + a[1] * b2[1] + a[2] * b2[2]) - 1) < 1e-3;
const checks = [
  ["① 自由建模拖开斜面、光标离开原位置按 N = 这张斜面的法线", res.one.kind === "line" && par(res.one.dir, n0)],
  ["② 硬表面拖着盒子挡到墙前按 N = 盒子那张面（顶面 Z）的法线，不是墙", res.two.kind === "line" && par(res.two.dir, [0, 0, 1])],
  ["②b 盒子拖到一根散线上、顶面被切成两块新编号，光标在其中一块上按 N = 顶面 Z（切开的碎片算原来那张）", res.twoB.kind === "line" && par(res.twoB.dir, [0, 0, 1]) && /分割/.test(res.twoB.before) && !!res.twoB.picked?.newId && Math.abs(Math.abs(res.twoB.picked.d) - 1) < 1e-6],   // 拾到的是新编号的碎片、且在 z = 1（顶面，不是往后看拾到的底面 z = 0）
  ["③a 画线、光标压在墙的底边上按 T = 那条边（沿 Y）", res.threeA.kind === "line" && par(res.threeA.dir, [0, 1, 0]) && res.threeA.tool === "line"],
  ["③b 画线、光标在空处按 T = 不拾预演线、提示", res.threeB.kind === "free" && res.threeB.hint.includes("T：把光标放到一条边上再按")],
  ["没有脚本错误", errs.length === 0],
];
for (const [name, ok] of checks) console.log(`${ok ? "✓" : "✗"} ${name}`);
if (checks.some(([, ok]) => !ok)) { console.log(JSON.stringify(res, null, 1)); if (errs.length) console.log(errs.join("\n")); }
console.log(`${checks.filter(([, ok]) => ok).length}/${checks.length}`);
await b.close();
process.exit(checks.every(([, ok]) => ok) ? 0 : 1);
