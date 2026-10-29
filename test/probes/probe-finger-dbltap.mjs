// 手指双击进出组件层级（gestures.ts + Editor.hierarchyTapAt；created 2026-10-28 by Claude Opus 5.5；user 10-28 夜「手指双击能不能也能进出hierarchy」）。
// 触屏设备：① 手指在组件上快速点两下 = 进去（层级 1）② 在空处快速点两下 = 退出来（层级 0）③ 点一下 = 照旧「取消」（不进不出）
// ④ 两下隔得太久 = 不算双击。跑法：python3 -m http.server 8765 后 node test/probes/probe-finger-dbltap.mjs
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const ctx = await b.newContext({ viewport: { width: 900, height: 900 }, hasTouch: true, isMobile: true });
const page = await ctx.newPage(); page.setDefaultTimeout(4000);
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto("http://127.0.0.1:8765/", { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1200);
const c = await page.evaluate(() => {
  const e = globalThis.__catsup.editor, P = (x, y, z = 0) => ({ x, y, z });
  const B = [[0, 0], [1, 0], [1, 1], [0, 1]], segs = []; for (let i = 0; i < 4; i++) { const a = B[i], d = B[(i + 1) % 4]; segs.push([P(a[0], a[1], 0), P(d[0], d[1], 0)]); segs.push([P(a[0], a[1], 1), P(d[0], d[1], 1)]); segs.push([P(a[0], a[1], 0), P(a[0], a[1], 1)]); }
  e.commitOp({ op: "addEdges", at: e.activePool(), segs }); e.selectAll(); e.makeComponent("块"); e.deselectAll();
  e.cam.setView("iso"); e.zoomExtents(); e.cam.halfH *= 1.6; e.draw();
  return e.cam.angularPx(P(0.5, 0.5, 1), e.vp());
});
const tap = (x, y) => page.evaluate(([x, y]) => { const c = document.getElementById("board"), q = c.getBoundingClientRect(); const o = (t, b) => new PointerEvent(t, { bubbles: true, clientX: q.left + x, clientY: q.top + y, pointerType: "touch", pointerId: 31, isPrimary: true, button: 0, buttons: b }); c.dispatchEvent(o("pointerdown", 1)); c.dispatchEvent(o("pointerup", 0)); }, [x, y]);
const depth = () => page.evaluate(() => globalThis.__catsup.editor.ctx.chain.length);
const r = {};
await tap(c.x, c.y); await page.waitForTimeout(120); await tap(c.x, c.y); await page.waitForTimeout(120);
r.enter = await depth();
await page.waitForTimeout(500);
await tap(60 + 700, 120); await page.waitForTimeout(120); await tap(60 + 700, 122); await page.waitForTimeout(120);
r.exit = await depth();
await page.waitForTimeout(500);
await tap(c.x, c.y); await page.waitForTimeout(150);
r.single = await depth();
await page.waitForTimeout(500);
await tap(c.x, c.y); await page.waitForTimeout(600); await tap(c.x, c.y); await page.waitForTimeout(120);
r.slow = await depth();
await b.close();
r.errs = errs;
console.log(JSON.stringify(r));
const ok = r.enter === 1 && r.exit === 0 && r.single === 0 && r.slow === 0 && errs.length === 0;
console.log(ok ? "probe-finger-dbltap OK" : "probe-finger-dbltap FAIL");
process.exit(ok ? 0 : 1);
