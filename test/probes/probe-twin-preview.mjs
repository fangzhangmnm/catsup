// DT13：编辑组件时同一组件的其他实例实时跟着变（user 2026-10-25「编辑组件的时候能不能其他组件一起实时更新？」）。
// 两份盒子组件 → 进第一份 → 推拉顶面往上拖：途中第二份用预演内核画、且在手里（不吸）；松手两份一起高。SHOT=路径 截拖动途中的图。created 2026-10-25 by Claude Opus 5.5
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const url = process.argv[2] ?? "http://127.0.0.1:8765/";
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 1000, height: 800 } });
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(url, { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1500);
const box = await page.locator("#board").boundingBox();
const px = async (p) => page.evaluate((p) => { const e = globalThis.__catsup.editor; return e.cam.angularPx(p, e.vp()); }, p);

const setup = await page.evaluate(() => {
  const e = globalThis.__catsup.editor, P = (x, y, z = 0) => ({ x, y, z });
  e.setGrid({ ...e.grid, on: false });
  const B = [[0, 0], [1, 0], [1, 1], [0, 1]], segs = [];
  for (let i = 0; i < 4; i++) { const a = B[i], c = B[(i + 1) % 4]; segs.push([P(a[0], a[1], 0), P(c[0], c[1], 0)]); segs.push([P(a[0], a[1], 1), P(c[0], c[1], 1)]); segs.push([P(a[0], a[1], 0), P(a[0], a[1], 1)]); }
  e.commitOp({ op: "addEdges", segs });
  e.selectAll(); const made = e.makeComponent("盒"); e.cancel();
  const s = e.sceneRef, def = [...s.defs.keys()].find((id) => id !== s.root);
  e.commitOp({ op: "placeInstance", at: { def: s.root, group: null }, definition: def, xform: [1, 0, 0, 2.5, 0, 1, 0, 0, 0, 0, 1, 0] });
  const ids = [...e.sceneRef.def(e.sceneRef.root).instances.values()].map((i) => i.id);
  e.enterPool({ kind: "instance", instance: ids[0] });
  e.zoomExtents(); e.cam.halfH *= 1.6;
  globalThis.__catsup.hud.pick("pp");
  return { made, n: ids.length, depth: e.contextDepth() };
});
const from = await px({ x: 0.5, y: 0.5, z: 1 }), to = await px({ x: 0.5, y: 0.5, z: 1.8 });
await page.mouse.move(box.x + from.x, box.y + from.y); await page.mouse.down();
for (let i = 1; i <= 10; i++) { await page.mouse.move(box.x + from.x + (to.x - from.x) * i / 10, box.y + from.y + (to.y - from.y) * i / 10); await page.waitForTimeout(16); }
const mid = await page.evaluate(() => { const v = globalThis.__catsup.editor.liveWorld(); const act = v.activeSlot(); const twins = v.slots.filter((s) => !s.active && s.kernel === act.kernel); return { twins: twins.length, twinsInHand: twins.every((s) => s.overridden), liveDiffers: act.kernel !== globalThis.__catsup.editor.sceneRef.kernelOf(act.pool) }; });
if (process.env.SHOT) await page.screenshot({ path: process.env.SHOT });
await page.mouse.up(); await page.waitForTimeout(200);
const after = await page.evaluate(() => { const v = globalThis.__catsup.editor.liveWorld(); return { topZ: Math.max(...v.vertices().map((p) => p.z)), tops: v.vertices().filter((p) => Math.abs(p.z - Math.max(...v.vertices().map((q) => q.z))) < 1e-6).length }; });
const res = { setup, mid, after };
console.log(JSON.stringify(res));
const ok = setup.made && setup.n === 2 && setup.depth === 1 && mid.liveDiffers && mid.twins === 1 && mid.twinsInHand && after.topZ > 1.2 && after.tops === 8 && !errs.length;
console.log(errs.length ? "PAGEERRORS:\n" + errs.join("\n") : "(no page errors)"); console.log(ok ? "PROBE OK" : "PROBE FAIL");
await b.close(); process.exit(ok ? 0 : 1);
