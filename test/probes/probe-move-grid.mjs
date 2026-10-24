// 网格语义（v0.13.21）：网格开着 → 移动工具轴锁沿轴落到绝对格、自由移动落 3D 格点；画线在边上落格线交点。created 2026-10-24 by Claude Fable 5.1
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const url = process.argv[2] ?? "http://127.0.0.1:8765/";
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 1000, height: 800 } });
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(url, { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1500);
const box = await page.locator("#board").boundingBox();
const px = async (pts) => page.evaluate((pts) => { const e = globalThis.__catsup.editor, vp = e.vp(); return pts.map((p) => e.cam.angularPx(p, vp)); }, pts);
const drag = async (p, q, hold = 250) => { await page.mouse.move(box.x + p.x, box.y + p.y); await page.mouse.down(); for (let i = 1; i <= 10; i++) { await page.mouse.move(box.x + p.x + (q.x - p.x) * i / 10, box.y + p.y + (q.y - p.y) * i / 10); await page.waitForTimeout(16); } await page.waitForTimeout(hold); await page.mouse.up(); await page.waitForTimeout(120); };
// 盒子 1×1×1 + 网格开（1 m / 5 = 0.2）；移动工具拖顶面的分割边沿 X 0.73 m → 落 0.8
const setup = await page.evaluate(() => {
  const e = globalThis.__catsup.editor, P = (x, y, z = 0) => ({ x, y, z });
  const B = [[0, 0], [2, 0], [2, 1], [0, 1]], segs = [];
  for (let i = 0; i < 4; i++) { const a = B[i], c = B[(i + 1) % 4]; segs.push([P(a[0], a[1], 0), P(c[0], c[1], 0)]); segs.push([P(a[0], a[1], 1), P(c[0], c[1], 1)]); segs.push([P(a[0], a[1], 0), P(a[0], a[1], 1)]); }
  e.commitOp({ op: "addEdges", segs });
  e.commitOp({ op: "addEdges", segs: [[P(1, 0, 1), P(1, 1, 1)]] });
  e.setGrid({ ...e.grid, on: true, step: 1, subdiv: 5 });
  globalThis.__catsup.hud.pick("move");
  return { grid: e.grid.on };
});
const [a, bb] = await px([{ x: 1, y: 0.5, z: 1 }, { x: 1.73, y: 0.5, z: 1 }]);
await drag(a, bb);
const r1 = await page.evaluate(() => { const e = globalThis.__catsup.editor; const xs = e.kernel.vertices().map((v) => +v.x.toFixed(4)).filter((x) => x > 0.5 && x < 1.9); return { xs: [...new Set(xs)], hint: document.querySelector("#hint")?.textContent?.slice(0, 40) }; });
// 画线：从边上找点 → 落格线交点（顶面前边 y=0,z=1 上 x=0.57 → 0.6）
await page.evaluate(() => { globalThis.__catsup.hud.pick("line"); });
const [onEdge] = await px([{ x: 0.57, y: 0, z: 1 }]);
await page.mouse.move(box.x + onEdge.x, box.y + onEdge.y); await page.waitForTimeout(120);
const r2 = await page.evaluate(() => { const e = globalThis.__catsup.editor; const sn = e.snapInfo; return { kind: sn?.kind ?? null, label: sn?.label ?? "", p: sn ? [+sn.p.x.toFixed(4), +sn.p.y.toFixed(4), +sn.p.z.toFixed(4)] : null }; });
const res = { setup, r1, r2 };
console.log(JSON.stringify(res));
const ok = setup.grid && r1.xs.includes(1.8) && !r1.xs.includes(1.73) && r2.kind === "grid-point" && r2.label.includes("边上") && r2.p && Math.abs(r2.p[0] - 0.6) < 1e-6 && Math.abs(r2.p[1]) < 1e-6 && Math.abs(r2.p[2] - 1) < 1e-6;
console.log(errs.length ? "PAGEERRORS:\n" + errs.join("\n") : "(no page errors)"); console.log(ok ? "PROBE OK" : "PROBE FAIL");
await b.close(); process.exit(ok ? 0 : 1);
