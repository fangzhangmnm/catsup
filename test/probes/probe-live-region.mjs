#!/usr/bin/env node
// probe-live-region.mjs —— 显示图只拷变了的那一块、缩小图只重做受影响的那一块（贴图主线 1-4d 第 6 条，三维这一半）。created 2026-11-11 by Claude Opus 5.5
// 证明：增量拷出来的显示图 = 整张重拷出来的，逐字节相同（第 0 级和几级缩小图）。查的时刻：一长笔画到一半（笔还按着）、抬笔之后、撤销之后、再画一笔之后。
// 量：同一长笔（2048 见方的画布），每帧拷显示图花多少（前后各读回一格当同步：含显卡真做的时间）、拷了多大一块——三种做法各一遍：只拷一块（现在的）/ 每次整张（改之前的做法，同一个缩小图着色器）/ 画的时候不做缩小图、停了再整套做。
// 软件显卡上的绝对数只作参考。用法：python3 -m http.server 8765 后 node test/probes/probe-live-region.mjs [url]
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
const here = path.dirname(fileURLToPath(import.meta.url));
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
await page.locator(`#sheetChoices .sheet-row:has-text("2048 × 2048")`).click(); await frames(3);
const side = await S(() => [...globalThis.__catsup.editor.renderer3.live.entries.values()][0]?.w ?? 0);
const rows = [];
for (const m of ["full", "region", "defer"]) rows.push(await measure(m));
await S(() => { globalThis.__catsup.editor.renderer3.live.mipMode = "region"; });
for (const x of rows) console.log(`    ${x.mode === "full" ? "每次整张（改之前）" : x.mode === "region" ? "只拷一块（现在）" : "画的时候不做缩小图"}：画布 ${side} 见方，${x.frames} 帧拷过，中位 ${x.median} 毫秒、最慢 ${x.max} 毫秒，中位一块 ${x.medianCells} 格；抬笔停下那一帧 ${x.settle} 毫秒`);
const full = rows[0], reg = rows[1];
check(side === 2048 && reg.medianCells < full.medianCells / 4, `只拷一块：中位一块 ${reg.medianCells} 格 < 整张 ${full.medianCells} 格的四分之一`);
check(regionCells >= 0, "（读到了最近一次拷的块）");
check(errs.length === 0, "页面没报错", errs.slice(0, 3).join(" | "));
console.log(`\nprobe-live-region ${failN ? "FAIL" : "OK"}（${pass} ✓ / ${failN} ✗）`);
await browser.close();
