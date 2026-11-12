#!/usr/bin/env node
// probe-live-region.mjs —— 显示图只拷变了的那一块、缩小图只重做受影响的那一块（贴图主线 1-4d 第 6 条，三维这一半）。created 2026-11-11 by Claude Opus 5.5
// 证明：增量拷出来的显示图 = 整张重拷出来的，逐字节相同（第 0 级和几级缩小图）。查的时刻：一长笔画到一半（笔还按着）、抬笔之后、撤销之后、再画一笔之后。
// 量：同一长笔（2048 见方的画布），每帧拷显示图花多少（前后各读回一格当同步：含显卡真做的时间）、拷了多大一块——三种做法各一遍：只拷一块（现在的）/ 每次整张（改之前的做法，同一个缩小图着色器）/ 画的时候不做缩小图、停了再整套做。
// 笔的种类 × 极端的笔（统筹 11-11）：BRUSH_MATRIX 按 paint/brush-kinds.ts 的表一条路一组（施工单二十 1b 起按路：只是手感的数不一样的笔走同一条路）；读数角标的「走法」三档和「核对」也在这里验（核对抓得到故意丢掉的报格）。
// 软件显卡上的绝对数只作参考。用法：python3 -m http.server 8765 后 node test/probes/probe-live-region.mjs [url]
import { sizeRow } from "./lib/canvas-rows.mjs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
const here = path.dirname(fileURLToPath(import.meta.url));
const PERF = process.argv.includes("--perf");   // 性能档：量的那一半只在这里跑
const { chromium } = createRequire(path.join(here, "../../../20260524 WeebPaint/package.json"))("playwright");
const url = process.argv.slice(2).find((a) => a.startsWith("http")) ?? process.env.PROBE_URL ?? "http://127.0.0.1:8765/";
let pass = 0, failN = 0;
const check = (ok, what, extra = "") => { if (ok) { pass++; console.log("  ✓", what); } else { failN++; process.exitCode = 1; console.error("  ✗", what, extra ? `  ← ${extra}` : ""); } };
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 1000, height: 800 }, deviceScaleFactor: 1 });
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
const S = (f, a) => page.evaluate(f, a);
const frames = (n = 3) => S(async (n) => { for (let i = 0; i < n; i++) { globalThis.__catsup.editor.draw(); await new Promise((r) => requestAnimationFrame(r)); } }, n);
await page.goto(url, { waitUntil: "load" }); await page.waitForFunction(() => globalThis.__catsup?.editor); await page.waitForTimeout(600);

// 盒子 → 组件 → 网格体 → 进去 → 画画工作台 → 开始画（选 side 见方）
const setup = async (side) => {
  await S(() => {
    const e = globalThis.__catsup.editor, P = (x, y, z = 0) => ({ x, y, z });
    e.setGrid({ ...e.grid, on: false });
    const B = [[0, 0], [1, 0], [1, 1], [0, 1]], segs = []; for (let i = 0; i < 4; i++) { const a = B[i], d = B[(i + 1) % 4]; segs.push([P(a[0], a[1], 0), P(d[0], d[1], 0)]); segs.push([P(a[0], a[1], 1), P(d[0], d[1], 1)]); segs.push([P(a[0], a[1], 0), P(a[0], a[1], 1)]); }
    e.commitOp({ op: "addEdges", at: e.activePool(), segs }); e.selectAll(); e.runAction("brep.orientOutward", { curvature: 3 }); e.makeComponent("盒"); e.runAction("object.toMesh");
    const S0 = e.sceneRef, inst = [...S0.def(S0.root).instances.values()][0];
    e.exitTo(0); e.selectedPools.clear(); e.selectedPools.set(`i${inst.id}`, { kind: "instance", instance: inst.id }); e.enterSelected();
    e.cam.setView("top"); e.zoomExtents(); e.draw();
    globalThis.__catsup.pickWorkbench("paint");
  });
  await frames(2);
  await page.locator('button:has-text("开始画")').first().click();
  await page.waitForFunction(() => !document.getElementById("sheet").hidden && document.querySelectorAll("#sheetChoices .sheet-row").length >= 5);
  await page.waitForFunction(() => [...document.querySelectorAll("#sheetChoices .sheet-row-note")].every((n) => !/在算/.test(n.textContent)), null, { timeout: 20000 });
  await page.locator(`#sheetChoices .sheet-row:has-text("${side} × ${side}")`).click(); await frames(3);
};
await setup(1024);
const box = await page.locator("#board").boundingBox();
const scr = (x, y) => S(([x, y]) => { const e = globalThis.__catsup.editor; return e.cam.project({ x, y, z: 1 }, e.vp()); }, [x, y]);
const pathPts = async (n, y0) => { const pts = []; for (let i = 0; i <= n; i++) { const t = i / n, p = await scr(0.1 + 0.8 * t, y0 + 0.25 * Math.sin(t * Math.PI * 3)); pts.push({ x: box.x + p.x, y: box.y + p.y }); } return pts; };
await S(() => { globalThis.__catsup.editor.config.set("paintPen", "size", 24); });

/** 显示图第 levels 级的字节（哈希），全部登记着的图；然后（force）整张重拷一遍再读：两份一样 = 增量做对了。 */
const compare = (label) => S((label) => {
  const C = globalThis.__catsup, r3 = C.editor.renderer3, lt = r3.live, gl = lt.gl;
  const read = () => { const out = []; for (const e of lt.entries.values()) { if (!e.disp) continue; const n = Math.floor(Math.log2(Math.max(e.w, e.h))) + 1; for (const l of [0, 1, 3, 6, n - 1]) { const w = Math.max(1, e.w >> l), h = Math.max(1, e.h >> l), fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fb); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, e.disp, l); const px = new Uint8Array(w * h * 4); gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px); gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.deleteFramebuffer(fb); let hh = 2166136261, ink = 0; for (let i = 0; i < px.length; i++) { hh ^= px[i]; hh = Math.imul(hh, 16777619); } for (let i = 0; i < px.length; i += 4) if (px[i] !== px[0] || px[i + 1] !== px[1] || px[i + 2] !== px[2]) ink++; out.push({ l, h: hh >>> 0, ink }); } } r3.resetPaintState(); return out; };
  const a = read();
  for (const e of lt.entries.values()) e.ver = -1;   // 下一帧整张重拷（同一个合成结果）
  C.editor.draw();
  return new Promise((res) => requestAnimationFrame(() => { C.editor.draw(); requestAnimationFrame(() => { const b = read(); res({ label, a, b }); }); }));
}, label);
const same = (r) => r.a.length > 0 && r.a.length === r.b.length && r.a.every((x, i) => x.h === r.b[i].h);
const say = (r) => r.a.map((x, i) => `第 ${x.l} 级 ${x.h === r.b[i].h ? "=" : "≠"}（有画的格 ${x.ink}）`).join("、");

console.log("一长笔画到一半（笔还按着）、抬笔后、撤销后、再画一笔后：增量 = 整张重拷");
let pts = await pathPts(40, 0.5);
await page.mouse.move(pts[0].x, pts[0].y); await page.mouse.down();
for (const p of pts.slice(1, 24)) { await page.mouse.move(p.x, p.y, { steps: 2 }); await frames(1); }
let r = await compare("画到一半");
check(same(r) && r.a[0].ink > 50, `画到一半：${say(r)}`);
for (const p of pts.slice(24)) { await page.mouse.move(p.x, p.y, { steps: 2 }); await frames(1); }
await page.mouse.up(); await frames(4);
r = await compare("抬笔后"); check(same(r) && r.a[0].ink > 100, `抬笔后：${say(r)}`);
await S(() => globalThis.__catsup.editor.undo()); await frames(4);
r = await compare("撤销后"); check(same(r), `撤销后：${say(r)}`);
pts = await pathPts(30, 0.3);
await page.mouse.move(pts[0].x, pts[0].y); await page.mouse.down();
for (const p of pts.slice(1)) { await page.mouse.move(p.x, p.y, { steps: 2 }); await frames(1); }
await page.mouse.up(); await frames(4);
r = await compare("再画一笔后"); check(same(r) && r.a[0].ink > 50, `再画一笔后：${say(r)}`);

console.log("\n跨片的一笔（等轴看，从顶面画过棱到正面）：内核那张合成图 = 强制整张重合（逐字节）、显示图 = 整张重拷；一笔当中内核真的只合了脏格");
/** 内核那张（画板合成出来的）读回，再强制整张重合一遍读回，逐字节比；顺手报这一次走的是哪条路。 */
const kernelCompare = () => S(() => {
  const C = globalThis.__catsup, out = [];
  for (const g of C.paint.boards.guids()) {
    const b = C.paint.boards.get(g), port = b.port, r = b.compose();
    if (!r) continue;
    const path = b.gl._tree.lastPath.path, a = port.readPixels(r.fbo, 0, 0, b.width, b.height);
    b.gl.markContentDirty(); b.last = null; b.lastCommitted = null;
    const r2 = b.compose(), c = port.readPixels(r2.fbo, 0, 0, b.width, b.height);
    b.lastCommitted = b.committedKey();
    let diff = 0; for (let i = 0; i < a.length; i++) if (a[i] !== c[i]) diff++;
    out.push({ diff, path });
  }
  C.editor.renderer3.resetPaintState(); C.editor.draw();
  return out;
});
await S(() => { const e = globalThis.__catsup.editor; e.cam.setView("iso"); e.zoomExtents(); e.draw(); });
await frames(2);
const crossPts = await S(() => {
  const e = globalThis.__catsup.editor, P = (x, y, z) => ({ x, y, z }), W = [P(0.2, 0.85, 1), P(0.5, 0.5, 1), P(0.55, 0.0, 0.7), P(0.85, 0.0, 0.25)], out = [];
  for (let k = 0; k + 1 < W.length; k++) for (let i = 0; i < 14; i++) { const t = i / 14, a = W[k], b = W[k + 1]; out.push(e.cam.project(P(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, a.z + (b.z - a.z) * t), e.vp())); }
  return out;
});
const paths = [];
await page.mouse.move(box.x + crossPts[0].x, box.y + crossPts[0].y); await page.mouse.down();
for (const [i, q] of crossPts.slice(1).entries()) {
  await page.mouse.move(box.x + q.x, box.y + q.y, { steps: 2 }); await frames(1);
  paths.push(await S(() => { const C = globalThis.__catsup, g = C.paint.boards.guids()[0]; return C.paint.boards.get(g).gl._tree.lastPath.path; }));
  if (i === 20) { const k = await kernelCompare(); check(k.length > 0 && k.every((x) => x.diff === 0), `跨片画到一半（笔还按着）：内核那张 = 整张重合（差 ${k.map((x) => x.diff).join("/")} 字节，这一次走的 ${k.map((x) => x.path).join("/")}）`); }
}
await page.mouse.up(); await frames(4);
let k2 = await kernelCompare();
check(k2.length > 0 && k2.every((x) => x.diff === 0), `跨片的一笔抬笔后：内核那张 = 整张重合（差 ${k2.map((x) => x.diff).join("/")} 字节）`);
const nRects = paths.filter((x) => x === "rects").length;
check(nRects >= 10, `一笔当中内核真的只合了脏格：${nRects} / ${paths.length} 帧走 rects（${paths.join("").replace(/rects/g, "r").replace(/full/g, "f").replace(/same/g, "s")}）`);
r = await compare("跨片的一笔之后"); check(same(r) && r.a[0].ink > 50, `跨片的一笔之后显示图：${say(r)}`);
await S(() => { const e = globalThis.__catsup.editor; e.cam.setView("top"); e.zoomExtents(); e.draw(); });
await frames(2);
const regionCells = await S(() => globalThis.__catsup.editor.renderer3.live.lastCopyCells);

if (PERF) {   // 「量拷了多大」这一半进性能档（统筹 11-12：role perf；守卫档只留「增量 = 整张重合、逐字节」那一半）。不带 --perf = 不量
console.log("\n量：2048 见方，同一长笔，每帧拷显示图");
await S(() => { globalThis.__catsup.editor.undo(); });
await frames(2);
/** 画一长笔，每帧记拷了多久、多大一块；mode = 三种做法之一。 */
const measure = async (mode) => {
  await S((m) => {   // 每一帧真拷过的都记下来（编辑器自己每帧都画，事后读只读得到最后一帧）
    const C = globalThis.__catsup, lt = C.editor.renderer3.live;
    lt.mipMode = m; C.__lr = { ms: [], cells: [] };
    // 前后各等显卡做完（gl.finish）：量到的是显卡真花的时间，不只是 CPU 交活的那一下（只在这个探针里这么做）
    // gl.finish 在这里不等（Chromium 的显卡进程），所以用读回一格当同步：读显示图最小那一级（它依赖整条缩小图链）= 前面的活都做完了
    const sync = () => { const gl = lt.gl, e = [...lt.entries.values()][0]; if (!e?.disp) return; const n = Math.floor(Math.log2(Math.max(e.w, e.h))), fb = gl.createFramebuffer(), px = new Uint8Array(4); gl.bindFramebuffer(gl.FRAMEBUFFER, fb); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, e.disp, n); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.deleteFramebuffer(fb); };
    if (!lt.__orig) { lt.__orig = lt.update; lt.update = function () { sync(); const t0 = performance.now(); const r = lt.__orig.call(lt); sync(); const ms = performance.now() - t0; C.editor.renderer3.resetPaintState(); if (C.__lr && lt.frameCopyMs > 0) { C.__lr.ms.push(ms); C.__lr.cells.push(lt.lastCopyCells); } return r; }; }
  }, mode);
  const p2 = await pathPts(60, 0.6);
  await page.mouse.move(p2[0].x, p2[0].y); await page.mouse.down();
  for (const p of p2.slice(1)) {
    await page.mouse.move(p.x, p.y, { steps: 2 });
    await S(async () => { const C = globalThis.__catsup; C.editor.draw(); await new Promise((r) => requestAnimationFrame(r)); });
  }
  await page.mouse.up(); await frames(4);
  const res = await S(() => { const C = globalThis.__catsup, r = C.__lr; C.__lr = null; return r; });
  const after = res.ms.length ? res.ms[res.ms.length - 1] : 0;   // 抬笔之后最后拷的那一次（落层 / defer 补缩小图）
  await S(() => { globalThis.__catsup.editor.undo(); }); await frames(3);
  const ms = res.ms.filter((x) => x > 0).sort((a, b) => a - b), cells = res.cells.filter((x) => x > 0).sort((a, b) => a - b);
  return { mode, frames: ms.length, median: +ms[ms.length >> 1]?.toFixed(2), max: +ms[ms.length - 1]?.toFixed(2), medianCells: cells[cells.length >> 1] ?? 0, settle: +after.toFixed(2) };
};
// 换一张 2048 的：再开一份新文件太慢，同一个物件上撤到开始画之前、再开始画 2048
await S(() => { const e = globalThis.__catsup.editor; while (e.history.position() > 0 && [...e.sceneRef.textures.values()].some((t) => t.content.kind === "layered")) e.undo(); });
await frames(2);
await page.locator('button:has-text("开始画")').first().click();
await page.waitForFunction(() => !document.getElementById("sheet").hidden && document.querySelectorAll("#sheetChoices .sheet-row").length >= 5);
await page.waitForFunction(() => [...document.querySelectorAll("#sheetChoices .sheet-row-note")].every((n) => !/在算/.test(n.textContent)), null, { timeout: 20000 });
await sizeRow(page, "2048 × 2048").click(); await frames(3);
const side = await S(() => [...globalThis.__catsup.editor.renderer3.live.entries.values()][0]?.w ?? 0);
const rows = [];
for (const m of ["full", "region", "defer"]) rows.push(await measure(m));
await S(() => { globalThis.__catsup.editor.renderer3.live.mipMode = "region"; });
for (const x of rows) console.log(`    ${x.mode === "full" ? "每次整张（改之前）" : x.mode === "region" ? "只拷一块（现在）" : "画的时候不做缩小图"}：画布 ${side} 见方，${x.frames} 帧拷过，中位 ${x.median} 毫秒、最慢 ${x.max} 毫秒，中位一块 ${x.medianCells} 格；抬笔停下那一帧 ${x.settle} 毫秒`);
const full = rows[0], reg = rows[1];
check(side === 2048 && reg.medianCells < full.medianCells / 4, `只拷一块：中位一块 ${reg.medianCells} 格 < 整张 ${full.medianCells} 格的四分之一`);
check(regionCells >= 0, "（读到了最近一次拷的块）");
} else console.log("\n量：2048 见方每帧拷显示图（只拷一块 vs 整张）——只在性能档跑（--perf）");
// ───────── 笔的种类 × 几支极端的笔（统筹 11-11：「影响的半径这种我们现在的版本不会算错吧。以后碰到大喷枪之类的」）─────────
// 每一组用调试钩子按笔的种类表起一笔，画到一半（笔还按着）和抬笔后各核一次：app 自己的核对（C.paint.diag.detail：内核合成图 = 强制整张重合、显示图每一级 = 整张重拷，逐字节）。
// 场景 = 细分三次的方盒子（384 张碎面），等轴看。路来自 paint/brush-kinds.ts：表里有的路、这里没有一组 = 守卫红（test/brush-kinds.test.ts），运行时再核一遍页面上的表。
// 加一种笔 = 这里加一组（形状和它有关的极端情况：喷枪要停着不动喷、流挂要往下淌……）。
const BRUSH_MATRIX = {
  pen: [
    { what: "最小的硬笔（1 像素）", size: 1, hardness: 1, path: "across" },
    { what: "滑条最大的软笔（400 像素、硬度 0）", size: 400, hardness: 0, path: "across" },
    { what: "比一张面还大的笔（120 像素，一颗笔尖跨很多碎面）", size: 120, hardness: 0.7, path: "across" },
    { what: "贴着画布边画", size: 10, hardness: 1, path: "canvasEdge" },
    { what: "贴着岛边画（沿方盒子顶面和正面之间的棱）", size: 6, hardness: 1, path: "islandEdge" },
  ],
  eraser: [
    { what: "最小的硬橡皮（1 像素）", size: 1, hardness: 1, path: "across" },
    { what: "滑条最大的软橡皮（400 像素、硬度 0）", size: 400, hardness: 0, path: "across2" },
    { what: "比一张面还大的橡皮（120 像素）", size: 120, hardness: 0.7, path: "across" },
    { what: "橡皮贴着画布边", size: 10, hardness: 1, path: "canvasEdge" },
    { what: "橡皮贴着岛边", size: 6, hardness: 1, path: "islandEdge" },
  ],
  // 取最浓的笔（施工单二十 1b：草稿笔、勾线笔都走这条路，拿表里第一支 = 草稿笔；它还带平滑、间距 0.06、压感管粗细）
  sketch: [
    { what: "取最浓 · 最小的硬笔（1 像素）", size: 1, hardness: 1, path: "across" },
    { what: "取最浓 · 滑条最大的软笔（草稿笔上限 80 像素、硬度 0）", size: 80, hardness: 0, path: "across2" },
    { what: "取最浓 · 比一张面还大的笔（60 像素）", size: 60, hardness: 0.7, path: "across" },
    { what: "取最浓 · 贴着画布边", size: 10, hardness: 1, path: "canvasEdge" },
    { what: "取最浓 · 贴着岛边", size: 6, hardness: 1, path: "islandEdge" },
  ],
};

console.log("\n笔的种类 × 极端的笔（碎面方盒子，等轴看）：画到一半和抬笔后，内核合成图 = 强制整张重合、显示图每一级 = 整张重拷（app 自己的核对，逐字节）");
const page2 = await browser.newPage({ viewport: { width: 1000, height: 800 }, deviceScaleFactor: 1 });
page2.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
const S2 = (f, a) => page2.evaluate(f, a);
const frames2 = (n = 3) => S2(async (n) => { for (let i = 0; i < n; i++) { globalThis.__catsup.editor.draw(); await new Promise((r) => requestAnimationFrame(r)); } }, n);
await page2.goto(url, { waitUntil: "load" }); await page2.waitForFunction(() => globalThis.__catsup?.editor); await page2.waitForTimeout(600);
const pagePaths = Object.keys(await S2(() => globalThis.__catsup.paint.brushPaths)), matrixPaths = await S2((ks) => ks.map((k) => globalThis.__catsup.paint.brushPathOf(k)), Object.keys(BRUSH_MATRIX));
check(pagePaths.length > 0 && pagePaths.every((p) => matrixPaths.includes(p)), `页面上笔的表里的每一条路（${pagePaths.join(" | ")}）这里都有一组`, JSON.stringify({ pagePaths, matrixPaths }));
const scene2 = await S2(async () => {
  const C = globalThis.__catsup, e = C.editor, P = (x, y, z = 0) => ({ x, y, z }), g = () => crypto.randomUUID(), sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  e.setGrid({ ...e.grid, on: false });
  const B = [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]], segs = [];
  for (let i = 0; i < 4; i++) { const a = B[i], d = B[(i + 1) % 4]; segs.push([P(a[0], a[1], 0), P(d[0], d[1], 0)]); segs.push([P(a[0], a[1], 1), P(d[0], d[1], 1)]); segs.push([P(a[0], a[1], 0), P(a[0], a[1], 1)]); }
  e.commitOp({ op: "addEdges", at: e.activePool(), segs }); e.selectAll(); e.runAction("brep.orientOutward", { curvature: 3 }); e.makeComponent("块"); e.runAction("object.toMesh"); await sleep(10);
  const S = e.sceneRef, inst = [...S.def(S.root).instances.values()][0];
  e.selectedPools.clear(); e.selectedPools.set(`i${inst.id}`, { kind: "instance", instance: inst.id }); e.enterSelected(); await sleep(10);
  for (let i = 0; i < 3; i++) { e.runAction("mesh.subdivide"); await sleep(0); }
  e.exitTo(0); e.clearSelection?.();
  const def = inst.def, k = e.sceneRef.mesh(def).kernel, tex = g();
  e.commitOp({ op: "startPaint", def, faces: k.faces(), uvSet: g(), textureGuid: tex, materialGuid: g(), names: { uvSet: "UV", paint: "画", material: "画" }, color: [0.3, 0.5, 0.7] });
  const info = C.paint.ensure(tex);
  e.cam.setView("iso"); e.zoomExtents(); e.draw();
  return { tex, faces: k.faces().length, W: info.width, H: info.height };
});
await frames2(3);
check(scene2.faces >= 384, `碎面方盒子：${scene2.faces} 张面，画布 ${scene2.W} × ${scene2.H}`);
/** 一条路（屏幕点，CSS 像素）：across = 顶面斜着下到正面；across2 = 另一条；islandEdge = 顶面和正面之间那条棱；canvasEdge = 找画布边上的格对应的屏幕点。 */
const pathOf = (kind) => S2(([kind, tex, W, H]) => {
  const C = globalThis.__catsup, e = C.editor, P = (x, y, z) => ({ x, y, z }), seg = (W0, n = 14) => { const out = []; for (let k = 0; k + 1 < W0.length; k++) for (let i = 0; i < n; i++) { const t = i / n, a = W0[k], b = W0[k + 1]; out.push(e.cam.project(P(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, a.z + (b.z - a.z) * t), e.vp())); } return out; };
  if (kind === "across") return seg([P(-0.35, 0.35, 1), P(0, -0.1, 1), P(0.05, -0.5, 0.7), P(0.35, -0.5, 0.25)]);
  if (kind === "across2") return seg([P(-0.4, -0.2, 1), P(0.4, 0.3, 1), P(0.3, -0.5, 0.5)]);
  if (kind === "islandEdge") return seg([P(-0.45, -0.5, 1), P(0.45, -0.5, 1)], 30);
  // canvasEdge：屏幕上扫一遍，挑落在画布最边上（离边 ≤ 2 格）的那些点，按画布上的位置排成一条
  const vp = e.vp();
  //   铺法在画布边上可能留了空：取「离边最近的那些格」（最近的再往里 2 格以内），说清离边多远
  const all = [];
  for (let y = 0; y < vp.h; y += 3) for (let x = 0; x < vp.w; x += 3) { const h = C.paint.cellAt(tex, x, y); if (!h?.cell) continue; const [cx, cy] = h.cell; all.push({ x, y, cx, cy, d: Math.min(cx, cy, W - 1 - cx, H - 1 - cy) }); }
  const minD = Math.min(...all.map((q) => q.d)), hits = all.filter((q) => q.d <= minD + 2);
  globalThis.__edgeMinD = minD;
  hits.sort((a, b) => a.cx - b.cx || a.cy - b.cy);
  const pick = hits.filter((_, i) => i % Math.max(1, Math.floor(hits.length / 40)) === 0).slice(0, 40);
  return pick.map((q) => ({ x: q.x, y: q.y }));
}, [kind, scene2.tex, scene2.W, scene2.H]);
/** 用调试钩子画一笔；画到一半和抬笔后各核一次；顺手读显示图第 0 级前后差了多少像素（这一笔真改到了东西）。 */
const strokeAndCheck = (pts, v, kind) => S2(async ([pts, v, kind]) => {
  const C = globalThis.__catsup, lt = C.editor.renderer3.live, ent = () => [...lt.entries.values()][0], lv0 = () => { const e = ent(); return e?.disp ? lt.readLevels(e.disp, e.w, e.h)[0].px : null; };
  const sum = (d) => ({ ok: d.ok, kernel: d.kernel.reduce((n, k) => n + k.diff, 0), display: d.display.reduce((n, L) => n + L.diff, 0), levels: d.display.length, bad: [...d.kernel.filter((k) => k.diff).map((k) => `内核 ${k.diff}@${k.box}`), ...d.display.filter((L) => L.diff).map((L) => `第${L.level}级 ${L.diff}@${L.box}`)].slice(0, 4) });
  const b0 = lv0(); let mid = null;
  const r = C.paint.stroke({ points: pts, size: v.size, hardness: v.hardness, kind, color: [0.9, 0.2, 0.1], midway: () => { mid = sum(C.paint.diag.detail()); } });
  C.editor.draw(); await new Promise((res) => requestAnimationFrame(res)); C.editor.draw();
  const end = sum(C.paint.diag.detail()), b1 = lv0();
  let changed = 0; if (b0 && b1) for (let i = 0; i < b0.length; i += 4) if (b0[i] !== b1[i] || b0[i + 1] !== b1[i + 1] || b0[i + 2] !== b1[i + 2] || b0[i + 3] !== b1[i + 3]) changed++;
  return { tips: r.tips, refused: r.refused ?? null, mid, end, changed };
}, [pts, v, kind]);
const fmt = (x) => x ? `${x.ok ? "=" : "≠"}（内核差 ${x.kernel}、显示图 ${x.levels} 级差 ${x.display}${x.bad.length ? "：" + x.bad.join("，") : ""}）` : "没核到";
for (const kind of Object.keys(BRUSH_MATRIX)) {
  if (kind === "eraser") {   // 橡皮要有东西擦：先用大笔铺两道
    for (const pk of ["across", "across2"]) await strokeAndCheck(await pathOf(pk), { size: 300, hardness: 0.5 }, "pen");
    await frames2(2);
  }
  for (const v of BRUSH_MATRIX[kind]) {
    const pts = await pathOf(v.path);
    if (pts.length < 4) { check(false, `${v.what}：找不到路（${v.path} 只有 ${pts.length} 个点）`); continue; }
    if (v.path === "canvasEdge") console.log(`    （画布边那条路：屏幕上能点到的格离画布边最近 ${await S2(() => globalThis.__edgeMinD)} 格）`);
    const r = await strokeAndCheck(pts, v, kind);
    check(!r.refused && r.tips > 0 && r.changed > 0 && r.mid?.ok && r.end.ok, `${kind} · ${v.what}：画到一半 ${fmt(r.mid)}、抬笔后 ${fmt(r.end)}；显示图改了 ${r.changed} 像素`, JSON.stringify(r));
  }
}

console.log("\n同一笔在「自动」和「强制整张」下：显示图每一级逐字节一样（测量用那一档不比，只查它自己核对得上）");
const levelsHash = () => S2(() => { const lt = globalThis.__catsup.editor.renderer3.live, e = [...lt.entries.values()][0], out = []; for (const L of lt.readLevels(e.disp, e.w, e.h)) { let s = 2166136261; for (let k = 0; k < L.px.length; k++) { s ^= L.px[k]; s = Math.imul(s, 16777619); } out.push((s >>> 0).toString(16)); } globalThis.__catsup.editor.renderer3.resetPaintState(); return out; });
const samePts = await pathOf("across2"), runPath = async (mode) => {
  await S2((m) => globalThis.__catsup.paint.diag.setPath(m), mode); await frames2(2);
  const r = await strokeAndCheck(samePts, { size: 60, hardness: 0.6 }, "pen"); await frames2(2);
  const h = await levelsHash(), path = await S2(() => { const C = globalThis.__catsup, g = C.paint.boards.guids()[0]; return C.paint.boards.get(g).gl._tree.lastPath.path; });
  await S2(() => globalThis.__catsup.editor.undo()); await frames2(3);
  return { r, h, path };
};
const A = await runPath("auto"), F = await runPath("full"), M = await runPath("measure");
await S2(() => globalThis.__catsup.paint.diag.setPath("auto")); await frames2(2);
check(A.h.length > 3 && A.h.every((x, i) => x === F.h[i]), `自动 vs 强制整张：${A.h.length} 级逐字节一样`, JSON.stringify({ A: A.h, F: F.h }));
check(A.r.end.ok && F.r.end.ok && M.r.end.ok && A.r.mid?.ok && F.r.mid?.ok && M.r.mid?.ok, `三档各自核对都对得上（自动 ${fmt(A.r.mid)}；强制整张 ${fmt(F.r.mid)}；测量用 ${fmt(M.r.mid)}）`);

console.log("\n核对自己抓得到少报：把薄层报的格每 3 次丢 1 次（只在探针里包一层），画到一半核对必须说对不上");
await S2(() => {
  const C = globalThis.__catsup, B = C.paint.boards.get(C.paint.boards.guids()[0]), orig = B.wrapLayer.bind(B);
  B.wrapLayer = (src) => { const ext = orig(src), m = ext.markChanged.bind(ext); let n = 0; ext.markChanged = (...a) => { if (++n % 3 === 0) return; return m(...a); }; return ext; };
});
const lossy = await strokeAndCheck(await pathOf("across"), { size: 30, hardness: 1 }, "pen");
check(lossy.mid && !lossy.mid.ok && lossy.mid.kernel > 0 && lossy.mid.display > 0, `丢了报格：画到一半核对说对不上，内核和显示图都说（${fmt(lossy.mid)}）`, JSON.stringify(lossy.mid));
check(lossy.end.ok, `抬笔落层之后整张重合，又对上了（${fmt(lossy.end)}）`);

console.log("\n读数角标那一组：开读数 + 核对，画一笔 → 抬笔之后核对过、对不上 0；带着丢报再画一笔 → 对不上 ≥ 1、调试日志里有一行「核对：」");
await S2(() => { const B = globalThis.__catsup.paint.boards.get(globalThis.__catsup.paint.boards.guids()[0]); delete B.wrapLayer; });
await S2(() => { const C = globalThis.__catsup; if (!C.meter().toggle()) C.meter().toggle(); C.paint.diag.setCheck(true); /* 开读数（toggle 交回开着没有）+ 核对 */ });
await strokeAndCheck(await pathOf("across2"), { size: 20, hardness: 1 }, "pen"); await frames2(3);
const snap1 = await S2(() => globalThis.__catsup.meter().snapshot());
check(snap1.checks >= 1 && snap1.mismatches === 0, `好的一笔：角标核对 ${snap1.checks} 次、对不上 ${snap1.mismatches} 次`, JSON.stringify(snap1));
await S2(() => {
  const C = globalThis.__catsup, B = C.paint.boards.get(C.paint.boards.guids()[0]), orig = B.wrapLayer.bind(B);
  B.wrapLayer = (src) => { const ext = orig(src), m = ext.markChanged.bind(ext); let n = 0; ext.markChanged = (...a) => { if (++n % 3 === 0) return; return m(...a); }; return ext; };
});
// 丢报的那一笔：每帧都画（编辑器 afterRender → 角标），核对每 30 帧一次 + 抬笔一次；抬笔那次已经落层对上了，所以画长一点、让中途那次撞上
const longPts = [...(await pathOf("across")), ...(await pathOf("across2")), ...(await pathOf("across"))];
await strokeAndCheck(longPts, { size: 30, hardness: 1 }, "pen"); await frames2(3);
const snap2 = await S2(() => globalThis.__catsup.meter().snapshot()), log2 = await S2(() => globalThis.__catsup.paint.diag.log());
check(snap2.mismatches >= 1 && /核对：/.test(log2), `丢报的一笔：角标对不上 ${snap2.mismatches} 次、调试日志里有「核对：」`, JSON.stringify(snap2));
await S2(() => { const C = globalThis.__catsup, B = C.paint.boards.get(C.paint.boards.guids()[0]); delete B.wrapLayer; C.paint.diag.setCheck(false); });
await page2.close();

check(errs.length === 0, "页面没报错", errs.slice(0, 3).join(" | "));
console.log(`\nprobe-live-region ${failN ? "FAIL" : "OK"}（${pass} ✓ / ${failN} ✗）`);
await browser.close();
