// 橡皮家族（v0.13.16）：左柱橡皮格小三角 = 橡皮 / 焊边橡皮 / 软边橡皮；断口小垂线（A33）；焊边橡皮刮过断口 → 真合并、小垂线消失；
// 软边橡皮刮盒子竖棱：20° 护栏不碰 → 选项放到 90° → 软化；刮顶面的切线 → 共面删边并面；一刮一次撤销。created 2026-10-24 by Claude Fable 5.1
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const url = process.argv[2] ?? "http://127.0.0.1:8765/";
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 1000, height: 800 } });
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(url, { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1500); await page.evaluate(() => globalThis.__catsup?.editor?.setGrid({ on: false }));   // v0.13.64 新文档吸附默认开；本探针测的不是栅格
const box = await page.locator("#board").boundingBox();
const scrub = async (p, q) => { await page.mouse.move(box.x + p.x, box.y + p.y); await page.mouse.down(); await page.mouse.move(box.x + q.x, box.y + q.y, { steps: 8 }); await page.mouse.up(); await page.waitForTimeout(120); };
const labels = async () => page.evaluate(() => [...document.querySelectorAll("#toolbar .tool .tool-label, .toolbar .tool .tool-label, .tool .tool-label")].map((x) => x.textContent));
// 1. 左柱：橡皮格在；切到焊边橡皮后格子显示它
const rail0 = await labels();
await page.evaluate(() => globalThis.__catsup.hud.pick("weldErase"));
await page.waitForTimeout(100);
const rail1 = await labels();
// 2. 分两笔画的底边：断口 1 个；焊边橡皮横刮过接点两侧 → 边 5 → 4、断口 0
const setup = await page.evaluate(() => {
  const e = globalThis.__catsup.editor, P = (x, y, z = 0) => ({ x, y, z });
  e.commitOp({ op: "addEdges", segs: [[P(0, 0), P(1, 0)], [P(1, 0), P(2, 0)], [P(2, 0), P(2, 2)], [P(2, 2), P(0, 2)], [P(0, 2), P(0, 0)]] });
  const vp = e.vp();
  return { edges: e.kernel.edges().length, faces: e.kernel.faces().length, ticks: e.breakTicks().length, a: e.cam.angularPx({ x: 0.5, y: 0, z: 0 }, vp), b: e.cam.angularPx({ x: 1.5, y: 0, z: 0 }, vp) };
});
await scrub(setup.a, setup.b);
const afterWeld = await page.evaluate(() => { const e = globalThis.__catsup.editor; return { edges: e.kernel.edges().length, faces: e.kernel.faces().length, ticks: e.breakTicks().length, hint: document.querySelector("#hint")?.textContent ?? "" }; });
const undo1 = await page.evaluate(() => { const e = globalThis.__catsup.editor; e.undo(); return { edges: e.kernel.edges().length, ticks: e.breakTicks().length }; });
// 3. 软边橡皮：盒子，刮竖棱（90°）→ 20° 护栏不碰；选项 90° → 软化；顶面切线 → 删边并面（两刮各一次撤销）
const box3 = await page.evaluate(() => {
  const e = globalThis.__catsup.editor, P = (x, y, z = 0) => ({ x, y, z });
  e.commitOp({ op: "clear" });
  const B = [[0, 0], [1, 0], [1, 1], [0, 1]], segs = [];
  for (let i = 0; i < 4; i++) { const a = B[i], c = B[(i + 1) % 4]; segs.push([P(a[0], a[1], 0), P(c[0], c[1], 0)]); segs.push([P(a[0], a[1], 1), P(c[0], c[1], 1)]); segs.push([P(a[0], a[1], 0), P(a[0], a[1], 1)]); }
  e.commitOp({ op: "addEdges", segs });
  e.commitOp({ op: "addEdges", segs: [[P(0.5, 0, 1), P(0.5, 1, 1)]] });
  globalThis.__catsup.hud.pick("softErase");
  const vp = e.vp();
  return { faces: e.kernel.faces().length, rib: e.cam.angularPx({ x: 1, y: 0, z: 0.5 }, vp), cut: e.cam.angularPx({ x: 0.5, y: 0.5, z: 1 }, vp), tool: e.tool };
});
await scrub({ x: box3.rib.x - 6, y: box3.rib.y }, { x: box3.rib.x + 6, y: box3.rib.y });
const s1 = await page.evaluate(() => { const e = globalThis.__catsup.editor; const hint = document.querySelector("#hint")?.textContent ?? ""; const rib = e.kernel.edges().find((x) => { const E = e.kernel.graph.edge(x.id), a = e.kernel.graph.pt(E.a), c = e.kernel.graph.pt(E.b); return a.x === 1 && a.y === 0 && c.x === 1 && c.y === 0; }); return { hint, soft: rib ? e.kernel.isSoft(rib.id) : null, faces: e.kernel.faces().length, edges: e.kernel.edges().length }; });
await page.evaluate(() => { globalThis.__catsup.editor.config.set("softErase", "maxDeg", 90); });
await scrub({ x: box3.rib.x - 6, y: box3.rib.y }, { x: box3.rib.x + 6, y: box3.rib.y });
const s2 = await page.evaluate(() => { const e = globalThis.__catsup.editor; const rib = e.kernel.edges().find((x) => { const E = e.kernel.graph.edge(x.id), a = e.kernel.graph.pt(E.a), c = e.kernel.graph.pt(E.b); return a.x === 1 && a.y === 0 && c.x === 1 && c.y === 0; }); return { soft: rib ? e.kernel.isSoft(rib.id) : null, smooth: rib ? e.kernel.isSmooth(rib.id) : null }; });
await scrub({ x: box3.cut.x - 8, y: box3.cut.y }, { x: box3.cut.x + 8, y: box3.cut.y });
const s3 = await page.evaluate(() => { const e = globalThis.__catsup.editor; return { hint: document.querySelector("#hint")?.textContent ?? "", faces: e.kernel.faces().length, edges: e.kernel.edges().length }; });
const undo2 = await page.evaluate(() => { const e = globalThis.__catsup.editor; const findRib = () => e.kernel.edges().find((x) => { const E = e.kernel.graph.edge(x.id), p = e.kernel.graph.pt(E.a), c = e.kernel.graph.pt(E.b); return p.x === 1 && p.y === 0 && c.x === 1 && c.y === 0; }); const before = { faces: e.kernel.faces().length, edges: e.kernel.edges().length, rib: !!findRib() }; e.undo(); const a = e.kernel.faces().length, ea = e.kernel.edges().length; e.undo(); const rib = findRib(); return { before, facesAfterUndo: a, edgesAfterUndo: ea, edges2: e.kernel.edges().length, ribAfter: !!rib, softAfterUndo: rib ? e.kernel.isSoft(rib.id) : null }; });
const res = { rail0, rail1, setup: { edges: setup.edges, faces: setup.faces, ticks: setup.ticks }, afterWeld, undo1, box3: { faces: box3.faces, tool: box3.tool }, s1, s2, s3, undo2 };
console.log(JSON.stringify(res));
const ok = rail0.includes("橡皮") && !rail0.includes("焊边橡皮") && rail1.includes("焊边橡皮") && !rail1.includes("橡皮")
  && setup.edges === 5 && setup.faces === 1 && setup.ticks === 1 && afterWeld.edges === 4 && afterWeld.faces === 1 && afterWeld.ticks === 0 && undo1.edges === 5 && undo1.ticks === 1
  && box3.faces === 7 && box3.tool === "softErase" && s1.soft === false && s1.faces === 7 && s2.soft === true && s2.smooth === true && s3.faces === 6 && undo2.facesAfterUndo === 7 && undo2.softAfterUndo === false;
console.log(errs.length ? "PAGEERRORS:\n" + errs.join("\n") : "(no page errors)"); console.log(ok ? "PROBE OK" : "PROBE FAIL");
await b.close(); process.exit(ok ? 0 : 1);
