// D23 栅格开着时卷尺在边上起手要出平行线（user 2026-10-25「卷尺在snap模式下还是只能打点不能打线」）。created 2026-10-25 by Claude Opus 5.5
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
console.log(JSON.stringify(res));
const L = res.lines[0];
const ok = res.lines.length === 1 && res.points === 0 && L && Math.abs(Math.abs(L.dir[0]) - 1) < 1e-3 && Math.abs(L.p[1] - 0.8) < 1e-6;
console.log(errs.length ? "PAGEERRORS:\n" + errs.join("\n") : "(no page errors)"); console.log(ok ? "PROBE OK" : "PROBE FAIL");
await b.close(); process.exit(ok ? 0 : 1);
