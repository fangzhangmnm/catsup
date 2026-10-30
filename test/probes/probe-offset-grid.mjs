// D22 偏移落格（user 2026-10-24 截图「推了面板显示的是5 ft但是没有对齐格子」）：距离从边量、栅格开时内环落格线。created 2026-10-24 by Claude Opus 5.5
// 地面矩形 0..3 × 0..2（在格上）；栅格 1 m / 5 = 0.2。偏移工具在离左边 0.13 m 的地方按下（不在格上），拖到 x≈0.57 → 内环应在 x = 0.6 / 2.4、y = 0.6 / 1.4。
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const url = process.argv[2] ?? "http://127.0.0.1:8765/";
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 1000, height: 800 } });
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(url, { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1500);
const box = await page.locator("#board").boundingBox();
const px = async (pts) => page.evaluate((pts) => { const e = globalThis.__catsup.editor, vp = e.vp(); return pts.map((p) => e.cam.angularPx(p, vp)); }, pts);
const drag = async (p, q) => { await page.mouse.move(box.x + p.x, box.y + p.y); await page.mouse.down(); for (let i = 1; i <= 10; i++) { await page.mouse.move(box.x + p.x + (q.x - p.x) * i / 10, box.y + p.y + (q.y - p.y) * i / 10); await page.waitForTimeout(20); } await page.waitForTimeout(250); await page.mouse.up(); await page.waitForTimeout(200); };
const run = async (grid, from, to) => {
  await page.evaluate((grid) => {
    const e = globalThis.__catsup.editor, P = (x, y) => ({ x, y, z: 0 });
    e.commitOp({ op: "clear" });
    e.commitOp({ op: "addEdges", segs: [[P(0, 0), P(3, 0)], [P(3, 0), P(3, 2)], [P(3, 2), P(0, 2)], [P(0, 2), P(0, 0)]] });
    e.setGrid({ ...e.grid, on: grid, snap: 0.2, plane: "xy" });
    globalThis.__catsup.hud.pick("offset");
  }, grid);
  const [a, c] = await px([from, to]);
  await drag(a, c);
  return page.evaluate(() => { const e = globalThis.__catsup.editor; const xs = [...new Set(e.kernel.vertices().map((v) => +v.x.toFixed(4)))].sort((p, q) => p - q); const ys = [...new Set(e.kernel.vertices().map((v) => +v.y.toFixed(4)))].sort((p, q) => p - q); return { xs, ys, faces: e.kernel.faces().length }; });
};
const on = await run(true, { x: 0.13, y: 1, z: 0 }, { x: 0.57, y: 1.03, z: 0 });
const res = { on };
console.log(JSON.stringify(res));
const eqs = (a, b) => a.length === b.length && a.every((v, i) => Math.abs(v - b[i]) < 1e-6);
const ok = eqs(on.xs, [0, 0.6, 2.4, 3]) && eqs(on.ys, [0, 0.6, 1.4, 2]) && on.faces === 2;
console.log(errs.length ? "PAGEERRORS:\n" + errs.join("\n") : "(no page errors)"); console.log(ok ? "PROBE OK" : "PROBE FAIL");
await b.close(); process.exit(ok ? 0 : 1);
