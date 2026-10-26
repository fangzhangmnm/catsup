// D23 栅格开着时卷尺在边上起手要出平行线（user 2026-10-25「卷尺在snap模式下还是只能打点不能打线」）。created 2026-10-25 by Claude Opus 5.5
// ② 斜边上线模式整格（DT51，2026-10-25 Opus 加）。
// 地面矩形 0..3 × 0..2；栅格 1 m / 5 = 0.2。卷尺在底边 (1.1, 0) 按下 → 拖到 (1.1, 0.83) → 应出一条沿 X 的参考线（y ≈ 0.8，第二点落格）。
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const url = process.argv[2] ?? "http://127.0.0.1:8765/";
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 1000, height: 800 } });
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(url, { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1500);
const box = await page.locator("#board").boundingBox();
const px = (p) => page.evaluate((p) => { const e = globalThis.__catsup.editor; return e.cam.angularPx(p, e.vp()); }, p);
await page.evaluate(() => { const e = globalThis.__catsup.editor, P = (x, y) => ({ x, y, z: 0 });
  e.commitOp({ op: "addEdges", segs: [[P(0, 0), P(3, 0)], [P(3, 0), P(3, 2)], [P(3, 2), P(0, 2)], [P(0, 2), P(0, 0)]] });
  e.setGrid({ ...e.grid, on: true, step: 1, subdiv: 5, plane: "xy" }); globalThis.__catsup.hud.pick("tape"); });
const a = await px({ x: 1.1, y: 0, z: 0 }), c = await px({ x: 1.1, y: 0.83, z: 0 });
await page.mouse.move(box.x + a.x, box.y + a.y); await page.waitForTimeout(80); await page.mouse.down();
for (let i = 1; i <= 10; i++) { await page.mouse.move(box.x + a.x + (c.x - a.x) * i / 10, box.y + a.y + (c.y - a.y) * i / 10); await page.waitForTimeout(20); }
await page.waitForTimeout(250); await page.mouse.up(); await page.waitForTimeout(250);
const res = await page.evaluate(() => { const g = globalThis.__catsup.editor.worldGeom().guides(); return { lines: g.lines.map((l) => ({ p: [+l.p.x.toFixed(4), +l.p.y.toFixed(4)], dir: [+l.dir.x.toFixed(3), +l.dir.y.toFixed(3)] })), points: g.points.length }; });
// ② 斜边上的线模式整格（DT51，user 2026-10-25「卷尺的线模式和点模式应该都同时可以接incremental snap」）：边 (5,0)→(8,1)，从边上 (6.2,0.4) 垂直拖 0.83 m
//    → 平行参考线离边正好 0.8 m（从边起整格；斜边上绝对格点和整格不重合，测的是增量）
await page.evaluate(() => { const e = globalThis.__catsup.editor, P = (x, y) => ({ x, y, z: 0 }); e.commitOp({ op: "addEdges", segs: [[P(5, 0), P(8, 1)]] }); e.zoomExtents(); });
const nrm = { x: -1 / Math.sqrt(10), y: 3 / Math.sqrt(10) };
const a2 = await px({ x: 6.2, y: 0.4, z: 0 }), c2 = await px({ x: 6.2 + nrm.x * 0.83, y: 0.4 + nrm.y * 0.83, z: 0 });
await page.mouse.move(box.x + a2.x, box.y + a2.y); await page.waitForTimeout(80); await page.mouse.down();
for (let i = 1; i <= 10; i++) { await page.mouse.move(box.x + a2.x + (c2.x - a2.x) * i / 10, box.y + a2.y + (c2.y - a2.y) * i / 10); await page.waitForTimeout(20); }
await page.waitForTimeout(250); await page.mouse.up(); await page.waitForTimeout(250);
const res2 = await page.evaluate(() => globalThis.__catsup.editor.worldGeom().guides().lines.map((l) => ({ p: [l.p.x, l.p.y], dir: [l.dir.x, l.dir.y] })));
res.points2 = await page.evaluate(() => globalThis.__catsup.editor.worldGeom().guides().points.length);
const slanted = res2.find((l) => Math.abs(Math.abs(l.dir[0]) - 3 / Math.sqrt(10)) < 1e-6);
res.slantedOffset = slanted ? +Math.abs(-(slanted.p[0] - 5) / Math.sqrt(10) + 3 * slanted.p[1] / Math.sqrt(10)).toFixed(6) : null;
console.log(JSON.stringify(res));
const L = res.lines[0];
const ok = res.lines.length === 1 && res.points === 0 && L && Math.abs(Math.abs(L.dir[0]) - 1) < 1e-3 && Math.abs(L.p[1] - 0.8) < 1e-6 && res.slantedOffset === 0.8;
console.log(errs.length ? "PAGEERRORS:\n" + errs.join("\n") : "(no page errors)"); console.log(ok ? "PROBE OK" : "PROBE FAIL");
await b.close(); process.exit(ok ? 0 : 1);
