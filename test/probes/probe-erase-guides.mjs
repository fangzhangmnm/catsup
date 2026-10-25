// 橡皮擦参考几何（D18，v0.13.3）：加一条参考线 + 一个参考点 → 橡皮在它们上面刮一下 → 两个都没了；再加一条、刮空处 → 还在。created 2026-10-24 by Claude Fable 5.1
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const url = process.argv[2] ?? "http://127.0.0.1:8765/";
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 1000, height: 800 } });
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(url, { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1500); await page.evaluate(() => globalThis.__catsup?.editor?.setGrid({ on: false }));   // v0.13.64 新文档吸附默认开；本探针测的不是栅格
const box = await page.locator("#board").boundingBox();
const setup = await page.evaluate(() => {
  const e = globalThis.__catsup.editor;
  e.addGuideLine({ x: 0, y: 1, z: 0 }, { x: 1, y: 0, z: 0 });
  e.addGuidePoint({ x: 2, y: -1, z: 0 });
  e.setTool("erase");
  const vp = e.vp();
  return { n: e.worldGeom().guides().lines.length + e.worldGeom().guides().points.length, onLine: e.cam.angularPx({ x: 0.7, y: 1, z: 0 }, vp), onPoint: e.cam.angularPx({ x: 2, y: -1, z: 0 }, vp), empty: e.cam.angularPx({ x: -3, y: -3, z: 0 }, vp) };
});
const scrub = async (p, q) => { await page.mouse.move(box.x + p.x, box.y + p.y); await page.mouse.down(); await page.mouse.move(box.x + q.x, box.y + q.y, { steps: 6 }); await page.mouse.up(); await page.waitForTimeout(80); };
await scrub(setup.onLine, { x: setup.onLine.x + 3, y: setup.onLine.y + 1 });
const afterLine = await page.evaluate(() => { const g = globalThis.__catsup.editor.worldGeom().guides(); return [g.lines.length, g.points.length]; });
await scrub(setup.onPoint, { x: setup.onPoint.x + 2, y: setup.onPoint.y - 2 });
const afterPoint = await page.evaluate(() => { const g = globalThis.__catsup.editor.worldGeom().guides(); return [g.lines.length, g.points.length]; });
await page.evaluate(() => { globalThis.__catsup.editor.addGuideLine({ x: 0, y: 1, z: 0 }, { x: 1, y: 0, z: 0 }); });
await scrub(setup.empty, { x: setup.empty.x + 10, y: setup.empty.y + 10 });
const afterEmpty = await page.evaluate(() => { const g = globalThis.__catsup.editor.worldGeom().guides(); return [g.lines.length, g.points.length]; });
const undo = await page.evaluate(() => { const e = globalThis.__catsup.editor; e.undo(); const g = e.worldGeom().guides(); return [g.lines.length, g.points.length]; });
// 边：画一条线，橡皮刮过去 → 没了；刮空处 → 还在
const edgeSetup = await page.evaluate(() => { const e = globalThis.__catsup.editor; e.commitOp({ op: "addEdges", segs: [[{ x: -2, y: 0, z: 0 }, { x: -2, y: 2, z: 0 }]] }); const vp = e.vp(); return { n: e.kernel.edges().length, on: e.cam.angularPx({ x: -2, y: 1, z: 0 }, vp) }; });
await scrub({ x: edgeSetup.on.x - 6, y: edgeSetup.on.y }, { x: edgeSetup.on.x + 6, y: edgeSetup.on.y });
const edgesAfter = await page.evaluate(() => globalThis.__catsup.editor.kernel.edges().length);
const res = { setupN: setup.n, afterLine, afterPoint, afterEmpty, undo, edgeSetupN: edgeSetup.n, edgesAfter };
console.log(JSON.stringify(res));
const ok = setup.n === 2 && afterLine[0] === 0 && afterLine[1] === 1 && afterPoint[1] === 0 && afterEmpty[0] === 1 && undo[0] === 0 && edgeSetup.n === 1 && edgesAfter === 0;
console.log(errs.length ? "PAGEERRORS:\n" + errs.join("\n") : "(no page errors)"); console.log(ok ? "PROBE OK" : "PROBE FAIL");
await b.close(); process.exit(ok ? 0 : 1);
