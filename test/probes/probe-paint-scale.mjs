#!/usr/bin/env node
// probe-paint-scale.mjs —— 画画的规模样本（贴图主线 1-4c，统筹 11-11 裁定；门禁：改画的显示 / 笔 / 存盘都跑，test/probes/probe-map.json）。created 2026-11-11 by Claude Opus 5.5
// 真的编辑器 + 真的会话 + 文件夹家（假选夹 = OPFS 子目录）+ 无头 swiftshader（时间是软件模拟的显卡，比真机慢得多：只拿来比前后、找随模型涨的点）。
//
// 每次都跑、谁都能跑的一档 = 仓里现造的样本（不占仓的体积）：
//   A 细分过的方盒子（Catmull-Clark，6 × 4^n 张面）：96 / 384 / 1536 / 6144 / 24576 张面，默认密度（1024 见方铺满）各画一笔，都要画得上（只看墨）。
//   B 6144 张面整条走一遍：开始画 → 准备（量建表）→ 软笔、硬笔、跨很多面的一笔（数跨了几张面）→ 真显卡 vs 软件版在缓存的每格表上对拍（说清抽了多少格）
//     → 橡皮 → 撤销 / 重做（屏幕逐像素回到前后两个样子）→ 存盘 → 重开（冷的照合成图显示）→ 解开、再准备、再画一笔。量：建表、落笔第一帧、每帧、内存。
//   C 同一个盒子开强行对称（两半共用画布上同一块：一颗笔尖下同一块挂两张面）：B 的整条。
//   D 4194304 格（「2048 见方」那一档；「开始画」没有画布大小的参数，铺法宽度定死 1024、给密度只长高度 → 二分出正好铺满 1024 × 4096 的密度，格数、表的大小和 2048² 一样）：B 的整条。
//   E 每张面三角形的上限：72 段圆柱的顶盖（70 个三角形）量一笔的每帧；1026 段（顶盖 1024 个三角形）画得上、真显卡和软件版一样；1027 段（1025 个）准备时报那句人话、这一笔不开始。
// 手动跑的一档 = user 自己的真模型（不进仓：--models=<文件夹> 或环境变量 CATSUP_USER_MODELS；没给 = 明着说没跑，不算绿）：
//   F wip2021.glb（15534 个三角形）：B 的整条，默认密度 + 4194304 格两档。
//   G wip2020.glb（4636 个三角形，80 个面积是零）：每块都开始画 → 画一笔 → 存 → 重开 → 冷的照显示、再画一笔（只验不坏）。
//   H littlered.glb（291 个三角形）：用我们自己的铺法、按 256 见方的密度（铺法自己的二分，基准 256）；硬度 1、一格大小的笔点一下 → 屏幕读色对格子（放大到一格十来个像素，
//     每一格取它那片像素的中心比）：点到的那格是墨、周围的都不是。它自带的贴图坐标和那张图导入时怎么处理，原样报出来。
// 用法：python3 -m http.server 8765 后 node test/probes/probe-paint-scale.mjs [url] [--models=<文件夹>] [--only=A,B,…]
import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const here = path.dirname(fileURLToPath(import.meta.url));
const { chromium } = createRequire(path.join(here, "../../../20260524 WeebPaint/package.json"))("playwright");
const argv = process.argv.slice(2);
const url = argv.find((a) => a.startsWith("http")) ?? process.env.PROBE_URL ?? "http://127.0.0.1:8765/";
const models = argv.find((a) => a.startsWith("--models="))?.slice(9) ?? process.env.CATSUP_USER_MODELS ?? null;
const only = argv.find((a) => a.startsWith("--only="))?.slice(7).split(",") ?? null;
const want = (k) => !only || only.includes(k);
const FOLDER = "paint-scale";
const BENIGN = /Not signed in|CloudNetworkError|Failed to fetch|net::ERR|msal|favicon|GPU stall due to ReadPixels|not persisted yet/i;
let pass = 0, failN = 0;
const check = (ok, what, extra = "") => { if (ok) { pass++; console.log("  ✓", what); } else { failN++; process.exitCode = 1; console.error("  ✗", what, extra ? `  ← ${extra}` : ""); } };
const say = (s) => console.log(`    ${s}`);
const FAKE_FSA = (folder) => {
  window.showDirectoryPicker = async () => (await navigator.storage.getDirectory()).getDirectoryHandle(folder, { create: true });
  const P = globalThis.FileSystemHandle?.prototype;
  if (P) { P.queryPermission = async () => "granted"; P.requestPermission = async () => "granted"; }
};
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--enable-precise-memory-info"] });
const ctx = await browser.newContext({ viewport: { width: 900, height: 700 }, deviceScaleFactor: 1 });
await ctx.addInitScript(FAKE_FSA, FOLDER);
const page = await ctx.newPage();
const errs = [];
page.on("pageerror", (e) => errs.push("pageerror: " + e.message));
page.on("console", (m) => { if (m.type() === "error" && !BENIGN.test(m.text())) errs.push(`console.error: ${m.text()}`); });
const S = (f, arg) => page.evaluate(f, arg);
const ready = () => page.waitForFunction(() => globalThis.__catsup?.session && globalThis.__catsup.home);

// ---------- 页面里的小工具（每次载入后装一次）----------
function helpers() {
  const C = globalThis.__catsup, e = C.editor, L = C.paint.lab, P = (x, y, z = 0) => ({ x, y, z }), g = () => crypto.randomUUID(), sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const Sc = () => e.sceneRef, vp = () => e.vp();
  const H = (globalThis.__H = {});
  H.cube = async (levels, force) => {
    e.setGrid({ ...e.grid, on: false }); e.exitTo(0);
    const B = [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]], segs = [];
    for (let i = 0; i < 4; i++) { const a = B[i], d = B[(i + 1) % 4]; segs.push([P(a[0], a[1], 0), P(d[0], d[1], 0)]); segs.push([P(a[0], a[1], 1), P(d[0], d[1], 1)]); segs.push([P(a[0], a[1], 0), P(a[0], a[1], 1)]); }
    const before = new Set(Sc().def(Sc().root).instances.keys());
    e.commitOp({ op: "addEdges", at: e.activePool(), segs }); e.selectAll(); e.runAction("brep.orientOutward", { curvature: 3 }); e.makeComponent("块"); e.runAction("object.toMesh"); await sleep(10);
    const inst = [...Sc().def(Sc().root).instances.values()].find((i) => !before.has(i.id));
    e.selectedPools.clear(); e.selectedPools.set(`i${inst.id}`, { kind: "instance", instance: inst.id }); e.enterSelected(); await sleep(10);
    if (force) e.setMirror("force", 0);
    for (let i = 0; i < levels; i++) { e.runAction("mesh.subdivide"); await sleep(0); }
    e.exitTo(0); e.clearSelection?.();
    return inst.def;
  };
  H.addPrim = (def, kind, o, size, segments) => e.commitOp({ op: "meshAddPrimitive", def, kind, frame: { o, x: P(1, 0, 0), y: P(0, 1, 0), z: P(0, 0, 1) }, size, segments });
  H.meshDefs = () => [...Sc().defs.values()].filter((d) => d.body.kind === "mesh").map((d) => ({ def: d.id, faces: d.body.kernel.faces().length })).sort((a, b) => b.faces - a.faces);
  H.paint = (def, o = {}) => {
    const k = Sc().mesh(def).kernel, tex = g(), uv = g();
    e.commitOp({ op: "startPaint", def, faces: k.faces(), uvSet: uv, textureGuid: tex, materialGuid: g(), names: { uvSet: "UV", paint: o.name ?? "画", material: o.name ?? "画" }, color: [0.3, 0.5, 0.7], ...(o.density ? { density: o.density } : {}) });
    const info = C.paint.ensure(tex), place = Sc().mesh(def).uvSets?.get(uv);
    return { tex, faces: k.faces().length, tris: k.faces().reduce((n, f) => n + k.faceTriangles(f).length, 0), width: info.width, height: info.height, pxPerM: place?.pxPerM ?? null };
  };
  /** 最大的整数密度，铺出来的格数不超过 cells（铺法宽度定死 1024，只长高度）。 */
  H.densityForCells = (def, cells) => { const k = Sc().mesh(def).kernel, fs = k.faces(), fit = (d) => { const r = L.layoutFaces(k, fs, { density: d }); return r.ok && r.width * r.height <= cells; };
    let lo = 1, hi = 2; while (fit(hi)) { lo = hi; hi *= 2; } while (hi - lo > 1) { const m = (lo + hi) >> 1; if (fit(m)) lo = m; else hi = m; } return lo; };
  H.layoutDensity = (def, base) => { const k = Sc().mesh(def).kernel, r = L.layoutFaces(k, k.faces(), { base }); return r.ok ? r.density : null; };
  /** 这块网格体（所有摆放）在屏幕上的外接框（CSS 像素）。 */
  H.rect = (def) => {
    const k = Sc().mesh(def).kernel, V = vp(); let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const s of e.worldGeom().slots) { if (s.pool.def !== def || s.pool.group !== null) continue; const X = s.xform;
      for (const v of k.verts()) { const p = k.pt(v), w = { x: X[0] * p.x + X[1] * p.y + X[2] * p.z + X[3], y: X[4] * p.x + X[5] * p.y + X[6] * p.z + X[7], z: X[8] * p.x + X[9] * p.y + X[10] * p.z + X[11] }, q = e.cam.project(w, V);
        x0 = Math.min(x0, q.x); y0 = Math.min(y0, q.y); x1 = Math.max(x1, q.x); y1 = Math.max(y1, q.y); } }
    return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0 };
  };
  H.view = (name, persp = false) => { e.cam.projection = persp ? "persp" : "ortho"; e.cam.setView(name); e.zoomExtents(); e.draw(); };
  H.frames = async (n = 3) => { for (let i = 0; i < n; i++) { e.draw(); await new Promise((r) => requestAnimationFrame(r)); } };
  /** 屏幕一块（CSS 像素）：红的像素数 + 哈希。 */
  H.region = (x0, y0, x1, y1) => {
    e.draw();
    const gl = document.getElementById("board").getContext("webgl2"), V = vp(), dpr = gl.drawingBufferWidth / V.w;
    const x = Math.max(0, Math.round(Math.min(x0, x1) * dpr)), w = Math.max(1, Math.round(Math.abs(x1 - x0) * dpr)), y = Math.max(0, Math.round(gl.drawingBufferHeight - Math.max(y0, y1) * dpr)), h = Math.max(1, Math.round(Math.abs(y1 - y0) * dpr));
    const px = new Uint8Array(w * h * 4); gl.readPixels(x, y, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
    let s = 2166136261, red = 0; for (let k = 0; k < px.length; k++) { s ^= px[k]; s = Math.imul(s, 16777619); }
    for (let k = 0; k < px.length; k += 4) if (px[k] > px[k + 1] + 60 && px[k] > px[k + 2] + 60) red++;
    return { hash: (s >>> 0).toString(16), red };
  };
  H.line = (x0, y0, x1, y1, n = 40) => Array.from({ length: n + 1 }, (_, i) => ({ x: x0 + ((x1 - x0) * i) / n, y: y0 + ((y1 - y0) * i) / n }));
  H.stroke = (tex, pts, o = {}) => C.paint.stroke({ guid: tex, points: pts, size: 14, hardness: 0.5, color: [0.92, 0.12, 0.08], accum: "over", measure: true, ...o });
  /** 这一笔的数：第一帧（有笔尖的第一帧：移动 + 画，含建这一笔的薄层）、之后每帧的中位数和最大、抬笔。 */
  H.timing = (r) => {
    if (!r?.frames) return null;
    const fs = r.frames, k = fs.findIndex((f) => f.tips > 0), rest = fs.slice(k + 1).map((f) => f.moveMs + f.drawMs).sort((a, b) => a - b);
    return { first: k < 0 ? null : +(fs[k].moveMs + fs[k].drawMs).toFixed(1), layerBuild: +r.buildMs.toFixed(1), median: rest.length ? +rest[rest.length >> 1].toFixed(1) : null, max: rest.length ? +rest[rest.length - 1].toFixed(1) : null, up: +r.upMs.toFixed(1), tips: r.tips, frames: fs.length };
  };
  /** 一条屏幕上的线跨了几张面（按 1-3a 的落点问，每隔几个像素问一次）。 */
  H.facesAlong = (tex, pts) => { const s = new Set(); for (const p of pts) { const h = C.paint.cellAt(tex, p.x, p.y); if (h?.face !== undefined) s.add(h.face); } return s.size; };
  /** 真显卡（借缓存里的每格表）vs 软件版：一串贴在朝着相机的三角形上的笔尖（按 z 带取、按 x 排），逐格比。范围里的格子全比 + 范围外每 97 格抽一格。 */
  H.compare = (tex, band) => {
    const { geo, cells } = C.paint.prep.take(tex), gl = L.gpu(), soft = new L.SoftSpaceGpu(), W = geo.table.width, Hh = geo.table.height, n = geo.grid.face.length;
    let zmin = Infinity, zmax = -Infinity, size = 0; for (let i = 2; i < geo.wpos.length; i += 3) { zmin = Math.min(zmin, geo.wpos[i]); zmax = Math.max(zmax, geo.wpos[i]); }
    size = zmax - zmin; const zc = zmin + size * band, cand = [];
    for (let t = 0; t < n; t++) {
      const o = 9 * t, cz = (geo.wpos[o + 2] + geo.wpos[o + 5] + geo.wpos[o + 8]) / 3;
      if (Math.abs(cz - zc) > size * 0.03 || geo.wnorm[3 * t + 1] > -0.2 || !geo.target.walks(geo.grid.face[t])) continue;
      cand.push({ t, x: (geo.wpos[o] + geo.wpos[o + 3] + geo.wpos[o + 6]) / 3, y: (geo.wpos[o + 1] + geo.wpos[o + 4] + geo.wpos[o + 7]) / 3, z: cz });
    }
    cand.sort((a, b) => a.x - b.x);
    const pick = cand.filter((_, i) => i % Math.max(1, Math.floor(cand.length / 40)) === 0).slice(0, 40);
    const r = size * 0.025, tips = pick.map((c) => { const tip = { x: c.x, y: c.y, z: c.z, r, alpha: 0.6 }; return { tip, reach: L.tipReach([geo], tip, [{ ti: 0, tri: c.t }]) }; });
    if (!tips.length) return { tips: 0 };
    const out = { tips: tips.length, runs: [] };
    for (const [accum, hardness] of [["over", 0.5], ["max", 1]]) {
      const opts = { hardness, color: [0.85, 0.35, 0.15], accum, origin: tips[0].tip };
      const a = new L.SpaceLayer(gl, geo, 0, { ...opts, cells }), b = new L.SpaceLayer(soft, geo, 0, opts);
      const t0 = performance.now(); a.update(tips, tips.length); const pa = gl.read(a.frame); const glMs = performance.now() - t0;
      b.update(tips, tips.length); const pb = soft.read(b.frame), rg = a.range();
      let maxd = 0, inRange = 0, outside = 0, inked = 0;
      if (rg) for (let y = rg.y; y < rg.y + rg.h; y++) for (let x = rg.x; x < rg.x + rg.w; x++) { const c = y * W + x; inRange++; if (pa[4 * c + 3] || pb[4 * c + 3]) inked++; for (let k = 0; k < 4; k++) maxd = Math.max(maxd, Math.abs(pa[4 * c + k] - pb[4 * c + k])); }
      for (let c = 0; c < W * Hh; c += 97) { const x = c % W, y = (c / W) | 0; if (rg && x >= rg.x && x < rg.x + rg.w && y >= rg.y && y < rg.y + rg.h) continue; outside++; for (let k = 0; k < 4; k++) maxd = Math.max(maxd, pa[4 * c + k], pb[4 * c + k]); }
      out.runs.push({ accum, hardness, maxd, inRange, outside, inked, glMs: +glMs.toFixed(1) });
      a.dispose(); b.dispose();
    }
    return out;
  };
  H.mem = () => { const st = C.paint.prep.stats(); return { prepEntries: st.entries, prepMB: +(st.gpuBytes / 1048576).toFixed(1), heapMB: performance.memory ? +(performance.memory.usedJSHeapSize / 1048576).toFixed(0) : null, boards: C.paint.boards.count }; };
}
const inject = () => page.evaluate(helpers);
const reloaded = async (act) => { const nav = page.waitForEvent("load", { timeout: 60000 }); await act(); await nav; await ready(); await page.waitForTimeout(900); await inject(); };
const clearNotes = () => S(() => { for (const n of [...document.querySelectorAll("#noticeStack > *")]) n.remove(); });
const newFile = async () => {
  await S(() => globalThis.__catsup.galleryHost.open());
  await page.waitForFunction(() => !document.getElementById("galleryFull").hidden, null, { timeout: 120000 });   // 前面画过的文件多了，图库要现做缩略图（软件显卡上慢）
  await page.click("#galleryNew");
  await page.waitForFunction(() => globalThis.__catsup.session.home.kind === "gallery" && document.getElementById("galleryFull").hidden, null, { timeout: 120000 });
  await clearNotes(); await inject();
};

await page.goto(url, { waitUntil: "load" }); await ready(); await page.waitForTimeout(600);
void page.evaluate(() => { void globalThis.__catsup.home.openGallery(); });
await page.waitForFunction(() => !document.getElementById("sheet").hidden, null, { timeout: 8000 });
await reloaded(() => page.click(`#sheetChoices button:has-text("选一个文件夹")`));
const VW = 900, VH = 700;
/** 一段出了异常：记成红的、说清哪一段，接着跑下一段（不让一段卡住后面全不跑）。 */
const section = async (name, f) => { try { await f(); } catch (err) { check(false, `${name} 这一段跑到一半出了异常`, String(err?.message ?? err).split("\n")[0]); await page.reload().then(ready).then(inject).catch(() => {}); } };

/** 整条走一遍（B / C / D / F）：画已经开始了、视角摆好了。 */
async function fullFlow(label, tex, def, o = {}) {
  const prep = await S((t) => { const ms = globalThis.__catsup.paint.prep.ensure(t); return { ms: +ms.toFixed(1), items: globalThis.__catsup.paint.prep.stats().items }; }, tex);
  check(prep.items.length === 1 && prep.items[0].ok, `${label}：准备好了`, JSON.stringify(prep));
  say(`准备（进工作台时做的那一下）：一共 ${prep.ms} ms = 整份几何 ${prep.items[0]?.geoMs.toFixed(1)} ms + 每格的表（含上传）${prep.items[0]?.cellMs.toFixed(1)} ms；内存 ${JSON.stringify(await S(() => __H.mem()))}`);
  const full = { x0: VW * 0.04, y0: VH * 0.08, x1: VW * 0.96, y1: VH * 0.92 };
  const box = (pts, pad = 14) => [Math.min(...pts.map((p) => p.x)) - pad, Math.min(...pts.map((p) => p.y)) - pad, Math.max(...pts.map((p) => p.x)) + pad, Math.max(...pts.map((p) => p.y)) + pad];
  // 笔画按这块网格体在屏幕上的外接框摆（角色窄、方盒子方，同一套比例都打得中）：软笔、硬笔横着画在上 / 下三成处；跨很多面的一笔竖着从头画到脚
  const R = await S((d) => __H.rect(d), def), at = (fx, fy) => ({ x: R.x0 + R.w * fx, y: R.y0 + R.h * fy }), seg = (a, b, n = 40) => S(([p, q, k]) => __H.line(p.x, p.y, q.x, q.y, k), [a, b, n]);
  say(`这块在屏幕上 ${Math.round(R.w)} × ${Math.round(R.h)} 像素`);
  const strokes = [
    ["软笔（硬度 0.3）", await seg(at(0.3, 0.3), at(0.7, 0.3)), { hardness: 0.3, size: 22 }],
    ["硬笔（硬度 1）", await seg(at(0.3, 0.68), at(0.7, 0.68)), { hardness: 1, size: 10 }],
    ["跨很多面的一笔", await seg(at(0.5, 0.02), at(0.5, 0.98), 120), { hardness: 0.6, size: 16 }],
  ];
  for (const [what, pts, opt] of strokes) {
    const before = await S((b) => __H.region(...b), box(pts));
    const r = await S(([t, p, q]) => __H.stroke(t, p, q), [tex, pts, opt]);
    const after = await S((b) => __H.region(...b), box(pts));
    const many = what.startsWith("跨") ? await S(([t, p]) => __H.facesAlong(t, p), [tex, pts]) : null;
    check(!r?.refused && r?.tips > 0 && after.red > before.red + 10, `${label} ${what}：屏幕上有墨（红像素 ${before.red} → ${after.red}）${many !== null ? `，跨了 ${many} 张面` : ""}`, JSON.stringify({ refused: r?.refused, tips: r?.tips }));
    say(`${what}：${JSON.stringify(await S((x) => __H.timing(x), r))}`);
    if (many !== null) check(many >= (o.manyFaces ?? 20), `${label} 那一笔确实跨了很多面（${many} ≥ ${o.manyFaces ?? 20}）`);
  }
  const cmp = await S((b) => __H.compare(b[0], b[1]), [tex, 0.55]);
  for (const run of cmp.runs ?? []) {
    check(run.maxd <= 1 && run.inked > 30, `${label} 真显卡（缓存的每格表）vs 软件版 ${run.accum} 硬度 ${run.hardness}：最大差 ${run.maxd}/255（${cmp.tips} 颗笔尖；范围里 ${run.inRange} 格全比、其中有墨 ${run.inked} 格；范围外每 97 格抽一格共 ${run.outside} 格；真显卡这一笔 ${run.glMs} ms）`);
  }
  if (!cmp.runs) check(false, `${label} 对拍：没找到朝着相机的三角形`, JSON.stringify(cmp));
  // 橡皮 → 撤销 / 重做
  const ePts = await seg(at(0.35, 0.5), at(0.65, 0.5)), eb = box(ePts, 20);   // 横着擦过那一竖
  const pre = await S((b) => __H.region(...b), full.x0 !== undefined ? [full.x0, full.y0, full.x1, full.y1] : eb), preE = await S((b) => __H.region(...b), eb);
  const er = await S(([t, p]) => __H.stroke(t, p, { erase: true, size: 30, hardness: 0.8 }), [tex, ePts]);
  const post = await S((b) => __H.region(...b), [full.x0, full.y0, full.x1, full.y1]), postE = await S((b) => __H.region(...b), eb);
  check(!er?.refused && postE.red < preE.red, `${label} 橡皮擦掉了（红像素 ${preE.red} → ${postE.red}）`);
  await S(() => { globalThis.__catsup.editor.undo(); }); await S(() => __H.frames(3));
  const u = await S((b) => __H.region(...b), [full.x0, full.y0, full.x1, full.y1]);
  await S(() => { globalThis.__catsup.editor.redo(); }); await S(() => __H.frames(3));
  const rd = await S((b) => __H.region(...b), [full.x0, full.y0, full.x1, full.y1]);
  check(u.hash === pre.hash && rd.hash === post.hash, `${label} 撤销 = 擦之前的样子、重做 = 擦之后的样子（整块屏幕逐像素）`, JSON.stringify({ pre: pre.hash, u: u.hash, post: post.hash, rd: rd.hash }));
  if (o.save === false) return;
  // 存盘 → 重开 → 冷的照合成图显示 → 解开 → 再准备 → 再画
  check(await S(async () => globalThis.__catsup.session.save()) === true, `${label} 存上了`);
  const shown = await S((b) => __H.region(...b), [full.x0, full.y0, full.x1, full.y1]);
  await reloaded(() => page.reload());
  await S((v) => __H.view(v), o.view ?? "front"); await S(() => __H.frames(8)); await page.waitForTimeout(400); await S(() => __H.frames(4));
  check(await S((t) => globalThis.__catsup.paint.state(t), tex) === "cold" && await S(() => globalThis.__catsup.paint.prep.stats().entries) === 0, `${label} 重开：画是冷的，准备是空的（换文件放干净了）`);
  const cold = await S((b) => __H.region(...b), [full.x0, full.y0, full.x1, full.y1]);
  check(cold.red > shown.red * 0.8 && cold.red > 50, `${label} 重开后照合成图显示（红像素 存之前 ${shown.red}、重开 ${cold.red}）`);
  await S((t) => globalThis.__catsup.paint.warm(t), tex);
  await page.waitForFunction((t) => globalThis.__catsup.paint.state(t) === "hot", tex, { timeout: 60000 });
  await S(() => __H.frames(4));
  const hot = await S((b) => __H.region(...b), [full.x0, full.y0, full.x1, full.y1]);
  check(hot.hash === cold.hash, `${label} 重开后同一个视角：冷的（合成图）和解开后热的逐像素一样（红像素 ${cold.red} / ${hot.red}；和存之前的 ${shown.red} 不一样 = 重开后视角不同，不是显示不同）`, `${cold.hash} vs ${hot.hash}`);
  const re = await S((t) => globalThis.__catsup.paint.prep.ensure(t), tex);
  const R2 = await S((d) => __H.rect(d), def), p2 = await S(([p, q]) => __H.line(p.x, p.y, q.x, q.y), [{ x: R2.x0 + R2.w * 0.3, y: R2.y0 + R2.h * 0.85 }, { x: R2.x0 + R2.w * 0.7, y: R2.y0 + R2.h * 0.85 }]);
  const b2 = await S((b) => __H.region(...b), box(p2));
  const r2 = await S(([t, p]) => __H.stroke(t, p, { hardness: 1, size: 12, color: [0.95, 0.1, 0.1] }), [tex, p2]);
  const a2 = await S((b) => __H.region(...b), box(p2));
  check(!r2?.refused && a2.red > b2.red + 10, `${label} 重开后再准备（${re.toFixed(1)} ms）、再画一笔：有墨（${b2.red} → ${a2.red}）`);
}

// ---------- A 细分方盒子的梯子 ----------
if (want("A")) await section("A", async () => {
  console.log("\nA 细分过的方盒子：96 / 384 / 1536 / 6144 / 24576 张面，默认密度，各画一笔");
  for (const lv of [2, 3, 4, 5, 6]) {
    await newFile();
    if (lv > 2) { await S(() => __H.frames(2)); check(await S(() => globalThis.__catsup.paint.prep.stats().entries) === 0, "换了文件：上一份的准备放干净了"); }
    const def = await S((n) => __H.cube(n, false), lv), p = await S((d) => __H.paint(d), def);
    await S(() => __H.view("front"));
    const prepMs = await S((t) => globalThis.__catsup.paint.prep.ensure(t), p.tex), st = await S(() => globalThis.__catsup.paint.prep.stats());
    const pts = await S(([a, b, y]) => __H.line(a, y, b, y), [VW * 0.3, VW * 0.7, VH * 0.5]);
    const b0 = await S(() => __H.region(270, 330, 630, 370)), r = await S(([t, q]) => __H.stroke(t, q, { hardness: 0.8, size: 14 }), [p.tex, pts]), b1 = await S(() => __H.region(270, 330, 630, 370));
    check(!r?.refused && b1.red > b0.red + 10, `${p.faces} 张面（画布 ${p.width}×${p.height}）：画得上（红像素 ${b0.red} → ${b1.red}）`, JSON.stringify({ refused: r?.refused, tips: r?.tips }));
    say(`准备 ${prepMs.toFixed(1)} ms（几何 ${st.items[0]?.geoMs.toFixed(1)} + 每格的表 ${st.items[0]?.cellMs.toFixed(1)}）；这一笔 ${JSON.stringify(await S((x) => __H.timing(x), r))}`);
  }
});
// ---------- B / C / D 6144 张面整条 ----------
for (const [key, label, force, dense] of [["B", "6144 张面", false, 1], ["C", "6144 张面 + 强行对称", true, 1], ["D", "6144 张面、4194304 格", false, 2]]) {
  if (!want(key)) continue;
  await section(key, async () => {
  console.log(`\n${key} ${label}：整条走一遍`);
  await newFile();
  const def = await S((f) => __H.cube(5, f), force);
  let p = await S((d) => __H.paint(d), def);
  if (dense > 1) { await S(() => globalThis.__catsup.editor.undo()); p = await S(([d]) => __H.paint(d, { density: __H.densityForCells(d, 4194304) }), [def]); }
  say(`${p.faces} 张面、${p.tris} 个三角形；画布 ${p.width}×${p.height}（${p.width * p.height} 格），每米 ${p.pxPerM} 格`);
  if (dense > 1) check(p.width * p.height === 4194304, `${label}：格数 = 2048² = 4194304（宽 1024 定死，密度二分到正好铺满 1024 × 4096）`, `${p.width}x${p.height}`);
  await S(() => __H.view("front"));
  await fullFlow(label, p.tex, def, { manyFaces: 20 });
  });
}
// ---------- E 每张面三角形的上限 ----------
if (want("E")) await section("E", async () => {
  console.log("\nE 每张面三角形的上限：72 段顶盖（70 个）量每帧；1026 段（1024 个）画得上；1027 段（1025 个）报人话");
  for (const segs of [72, 1026, 1027]) {
    await newFile();
    const def = await S(() => __H.cube(0, false));
    await S(([d, n]) => __H.addPrim(d, "cylinder", { x: 2, y: 0, z: 0 }, [0.6, 0.6, 0.3], n), [def, segs]);
    const p = await S((d) => __H.paint(d), def);
    const capTris = await S(([d]) => { const k = globalThis.__catsup.editor.sceneRef.mesh(d).kernel; return Math.max(...k.faces().map((f) => k.faceTriangles(f).length)); }, [def]);
    await S(() => { const e = globalThis.__catsup.editor; e.cam.projection = "ortho"; e.cam.setView("top"); e.cam.target = { x: 2, y: 0, z: 0.3 }; e.cam.halfH = 0.8; e.draw(); });
    const c = await S(() => { const e = globalThis.__catsup.editor; return e.cam.project({ x: 2, y: 0, z: 0.3 }, e.vp()); });
    const prepMs = await S((t) => globalThis.__catsup.paint.prep.ensure(t), p.tex), prob = await S((t) => globalThis.__catsup.paint.prep.problem(t), p.tex);
    const pts = await S(([a, b, y]) => __H.line(a, y, b, y, 60), [c.x - 250, c.x + 250, c.y]);
    if (segs <= 1026) {
      const b0 = await S((q) => __H.region(q.x - 260, q.y - 20, q.x + 260, q.y + 20), c), r = await S(([t, q]) => __H.stroke(t, q, { hardness: 0.7, size: 24 }), [p.tex, pts]), b1 = await S((q) => __H.region(q.x - 260, q.y - 20, q.x + 260, q.y + 20), c);
      check(prob === null && !r?.refused && b1.red > b0.red + 10 && capTris === segs - 2, `顶盖 ${capTris} 个三角形：准备好了、画得上（红像素 ${b0.red} → ${b1.red}）`, JSON.stringify({ prob, refused: r?.refused }));
      say(`准备 ${prepMs.toFixed(1)} ms；顶盖上这一笔 ${JSON.stringify(await S((x) => __H.timing(x), r))}`);
      if (segs === 1026) {
        await S(() => { const e = globalThis.__catsup.editor; e.cam.setView("front"); e.zoomExtents(); e.draw(); });
        const cmp = await S((t) => { const C = globalThis.__catsup, { geo, cells } = C.paint.prep.take(t), L = C.paint.lab, gl = L.gpu(), soft = new L.SoftSpaceGpu();
          let best = -1; for (let k = 0; k < geo.grid.face.length; k++) { const o = 9 * k; if (geo.wpos[o + 2] > 0.29 && geo.wpos[o + 5] > 0.29 && geo.wpos[o + 8] > 0.29 && geo.wpos[o] > 1.2) { best = k; break; } }
          const tips = [0, 1, 2, 3, 4].map((i) => { const tip = { x: 1.7 + 0.15 * i, y: 0.1, z: 0.3, r: 0.12, alpha: 0.7 }; let b = best, bd = Infinity; for (let k = 0; k < geo.grid.face.length; k++) { const d = L.sphereTriDist(tip.x, tip.y, tip.z, geo.wpos, 9 * k); if (d < bd) { bd = d; b = k; } } return { tip, reach: L.tipReach([geo], tip, [{ ti: 0, tri: b }]) }; });
          const o = { hardness: 0.5, color: [1, 0.3, 0.1], accum: "over", origin: tips[0].tip }, a = new L.SpaceLayer(gl, geo, 0, { ...o, cells }), b = new L.SpaceLayer(soft, geo, 0, o);
          a.update(tips, tips.length); b.update(tips, tips.length); const pa = gl.read(a.frame), pb = soft.read(b.frame); let maxd = 0, inked = 0;
          for (let c = 0; c < pa.length; c += 4) { if (pa[c + 3] || pb[c + 3]) inked++; for (let k = 0; k < 4; k++) maxd = Math.max(maxd, Math.abs(pa[c + k] - pb[c + k])); }
          a.dispose(); b.dispose(); return { maxd, inked, cells: pa.length / 4 }; }, p.tex);
        check(cmp.maxd <= 1 && cmp.inked > 100, `1024 个三角形的顶盖：真显卡（着色器循环走到 1024）vs 软件版最大差 ${cmp.maxd}/255（整张 ${cmp.cells} 格全比，有墨 ${cmp.inked} 格）`);
      }
    } else {
      const r = await S(([t, q]) => __H.stroke(t, q, { hardness: 0.7, size: 24 }), [p.tex, pts]);
      check(capTris === 1025 && typeof prob === "string" && /这张面太大了/.test(prob) && /1025 个三角形/.test(prob) && r?.refused === prob, `顶盖 1025 个三角形：准备时就报「${prob}」，这一笔不开始`, JSON.stringify({ capTris, prob, r: r?.refused }));
    }
  }
});
// ---------- F / G / H 真模型（手动跑的一档）----------
const haveModels = models && ["wip2021.glb", "wip2020.glb", "littlered.glb"].every((f) => existsSync(path.join(models, f)));
if ((want("F") || want("G") || want("H")) && !haveModels) {
  console.log(`\nF / G / H 真模型：${models ? `文件夹 ${models} 里没有齐 wip2021.glb / wip2020.glb / littlered.glb` : "没给真模型的文件夹（--models=… 或 CATSUP_USER_MODELS）"}，这一段没跑（不算绿）`);
}
const importGlb = async (file) => {
  await page.setInputFiles("#glbImportFile", path.join(models, file));
  await page.waitForFunction(() => [...globalThis.__catsup.editor.sceneRef.defs.values()].some((d) => d.body.kind === "mesh"), null, { timeout: 60000 });
  await page.waitForTimeout(300);
  const notes = await S(() => [...document.querySelectorAll("#noticeStack > *")].map((n) => n.textContent.trim()).filter(Boolean));
  await clearNotes();
  return notes;
};
if (haveModels && want("F")) {
  for (const dense of [1, 2]) await section(`F${dense}`, async () => {
    const label = `wip2021${dense > 1 ? "、4194304 格" : "、默认密度"}`;
    console.log(`\nF ${label}：整条走一遍`);
    await newFile();
    const notes = await importGlb("wip2021.glb");
    say(`导入：${notes.join(" / ").slice(0, 300)}`);
    const defs = await S(() => __H.meshDefs()), def = defs[0].def;
    let p = await S((d) => __H.paint(d, { name: "规模" }), def);
    if (dense > 1) { await S(() => globalThis.__catsup.editor.undo()); p = await S(([d]) => __H.paint(d, { density: __H.densityForCells(d, 4194304), name: "规模" }), [def]); }
    say(`网格体 ${defs.length} 块，画的那块 ${p.faces} 张面、${p.tris} 个三角形；画布 ${p.width}×${p.height}（${p.width * p.height} 格），每米 ${p.pxPerM} 格`);
    await S(() => __H.view("front"));
    await fullFlow(label, p.tex, def, { manyFaces: 30 });
  });
}
if (haveModels && want("G")) await section("G", async () => {
  console.log("\nG wip2020（80 个面积是零的三角形）：开始画、画一笔、存、重开、再画");
  await newFile();
  const notes = await importGlb("wip2020.glb");
  say(`导入：${notes.join(" / ").slice(0, 300)}`);
  const defs = await S(() => __H.meshDefs()), texs = [];
  for (const d of defs) texs.push(await S(([x, i]) => __H.paint(x, { name: `块${i}` }), [d.def, texs.length]));
  check(texs.length === defs.length && texs.every((t) => t.width > 0), `${defs.length} 块网格体都开始画了（${texs.map((t) => `${t.faces} 面`).join("、")}）`);
  await S(() => __H.view("front"));
  const pts = await S(([a, b, y]) => __H.line(a, y, b, y, 90), [VW * 0.03, VW * 0.97, VH * 0.45]);
  let inked = 0;
  for (const t of texs) {
    const prob0 = await S((x) => { globalThis.__catsup.paint.prep.ensure(x); return globalThis.__catsup.paint.prep.problem(x); }, t.tex);
    const b0 = await S(() => __H.region(20, 280, 880, 360)), r = await S(([x, q]) => __H.stroke(x, q, { hardness: 0.8, size: 18 }), [t.tex, pts]), b1 = await S(() => __H.region(20, 280, 880, 360));
    if (prob0 !== null || r?.refused) check(false, `块（${t.faces} 面）准备 / 落笔被拦`, JSON.stringify({ prob0, refused: r?.refused }));
    if (b1.red > b0.red) inked++;
  }
  check(inked >= 1, `横着一笔在 ${inked} 块上画出了墨，没有哪块报错`);
  check(await S(async () => globalThis.__catsup.session.save()) === true, "wip2020 存上了");
  const shown = await S(() => __H.region(20, 60, 880, 640));
  await reloaded(() => page.reload());
  await S(() => __H.view("front")); await S(() => __H.frames(8)); await page.waitForTimeout(400); await S(() => __H.frames(4));
  const cold = await S(() => __H.region(20, 60, 880, 640));
  const notes2 = await S(() => [...document.querySelectorAll("#noticeStack > *")].map((n) => n.textContent.trim()).filter(Boolean));
  check(cold.red > shown.red * 0.8 && cold.red > 50, `wip2020 重开后照合成图显示（红像素 ${shown.red} → ${cold.red}）`);
  say(`重开时的通知：${notes2.join(" / ").slice(0, 300) || "（没有）"}`);
  const t0 = texs[0].tex;
  await S((t) => globalThis.__catsup.paint.warm(t), t0); await page.waitForFunction((t) => globalThis.__catsup.paint.state(t) === "hot", t0, { timeout: 60000 });
  await S((t) => globalThis.__catsup.paint.prep.ensure(t), t0);
  const R0 = await S((d) => __H.rect(d), defs[0].def), yy = R0.y0 + R0.h * 0.35;   // 最大那块在屏幕上的外接框，横着画过它三成五高的地方
  const pts2 = await S(([a, b, y]) => __H.line(a, y, b, y, 60), [R0.x0 - 10, R0.x1 + 10, yy]);
  const b2 = await S((y) => __H.region(20, y - 20, 880, y + 20), yy), r2 = await S(([x, q]) => __H.stroke(x, q, { hardness: 1, size: 14 }), [t0, pts2]), a2 = await S((y) => __H.region(20, y - 20, 880, y + 20), yy);
  check(!r2?.refused && r2?.tips > 0, `wip2020 重开后最大那块换一行再画一笔：没出错（红像素 ${b2.red} → ${a2.red}${a2.red > b2.red ? "" : "；这一行没打中这块"}）`);
});
if (haveModels && want("H")) await section("H", async () => {
  console.log("\nH 小红帽：按 256 见方的密度、一格大小的硬笔点一下 = 点到哪格就是哪格");
  await newFile();
  const notes = await importGlb("littlered.glb");
  say(`导入时它自带的东西怎么处理（通知原文）：${notes.join(" / ").slice(0, 400)}`);
  const defs = await S(() => __H.meshDefs()), def = defs[0].def, dens = await S(([d]) => __H.layoutDensity(d, 256), [def]);
  const p = await S(([d, den]) => __H.paint(d, { density: den, name: "小红帽" }), [def, dens]);
  say(`网格体 ${defs.length} 块（${defs.map((d) => d.faces).join(" / ")} 张面），画的那块 ${p.faces} 张面；铺法按 256 见方二分出每米 ${dens} 格 → 画布 ${p.width}×${p.height}`);
  await S((t) => globalThis.__catsup.paint.prep.ensure(t), p.tex);
  // 正面、正交，找屏幕中间打得中的一格；放大到一格十来个像素
  await S(() => __H.view("front"));
  const aim = await S((t) => { const C = globalThis.__catsup, e = C.editor, V = e.vp(); for (let dy = 0; dy < 200; dy += 7) for (const sg of [1, -1]) { const h = C.paint.cellAt(t, V.w / 2, V.h * 0.45 + sg * dy); if (h?.cell !== undefined) { const r = e.cam.ray(V.w / 2, V.h * 0.45 + sg * dy, V); return { sy: V.h * 0.45 + sg * dy, hit: h, o: r.origin, d: r.dir }; } } return null; }, p.tex);
  check(!!aim, "屏幕中间打得中小红帽");
  if (aim) {
    const zoom = await S(([t, sy]) => { const C = globalThis.__catsup, e = C.editor, V = e.vp();
      // 把相机对准那一点，一格放大到约 12 像素：先量现在一格多少像素（沿横线往外走到格子变了）
      const key = (x, y) => { const h = C.paint.cellAt(t, x, y); return h?.cell === undefined ? null : String(h.cell); };   // 格子是 [列, 行]：按字比
      const cellSpan = () => { let n = 0; const c0 = key(V.w / 2, V.h / 2); if (c0 === null) return 0; for (let x = V.w / 2; x < V.w; x++) { if (key(x, V.h / 2) !== c0) break; n++; } for (let x = V.w / 2 - 1; x > 0; x--) { if (key(x, V.h / 2) !== c0) break; n++; } return n; };
      const r = e.cam.ray(V.w / 2, sy, V); e.cam.target = { x: r.origin.x + r.dir.x * 0, y: e.cam.target.y, z: r.origin.z + r.dir.z * 0 }; e.draw();
      for (let i = 0; i < 8; i++) { const s = cellSpan(); if (s >= 10 && s <= 16) break; e.cam.halfH *= s > 0 ? Math.min(4, Math.max(0.25, s / 12)) : 2; e.draw(); }
      return cellSpan(); }, [p.tex, aim.sy]);
    // 目标格：屏幕正中那一格；它那片像素的中心 = 点的位置
    const res = await S(async ([t]) => { const C = globalThis.__catsup, e = C.editor, V = e.vp(), R = 40, cx = Math.round(V.w / 2), cy = Math.round(V.h / 2);
      const map = new Map(); for (let y = cy - R; y <= cy + R; y++) for (let x = cx - R; x <= cx + R; x++) { const h = C.paint.cellAt(t, x, y); if (h?.cell === undefined) continue; const k = String(h.cell); const m = map.get(k) ?? { n: 0, sx: 0, sy: 0 }; m.n++; m.sx += x; m.sy += y; map.set(k, m); }
      const target = String(C.paint.cellAt(t, cx, cy)?.cell), T = map.get(target);
      if (!T) return { err: "正中没有格子" };
      const px = T.sx / T.n, py = T.sy / T.n, side = Math.sqrt(T.n);
      const r = C.paint.stroke({ guid: t, points: [{ x: px, y: py }, { x: px, y: py }], size: side, hardness: 1, color: [0.95, 0.05, 0.05], accum: "over" });
      for (let i = 0; i < 3; i++) { e.draw(); await new Promise((q) => requestAnimationFrame(q)); }
      const gl = document.getElementById("board").getContext("webgl2"), px1 = new Uint8Array(4), red = (x, y) => { gl.readPixels(Math.round(x), Math.round(gl.drawingBufferHeight - y), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px1); return px1[0] > px1[1] + 60 && px1[0] > px1[2] + 60; };
      e.draw();
      let wrong = [], cellsSeen = 0;
      for (const [k, m] of map) { if (m.n < 9) continue; cellsSeen++; const isRed = red(m.sx / m.n, m.sy / m.n); if ((k === target) !== isRed) wrong.push({ cell: k, red: isRed, n: m.n }); }
      return { target, px: [+px.toFixed(1), +py.toFixed(1)], side: +side.toFixed(1), cellsSeen, wrong, refused: r?.refused ?? null, tips: r?.tips };
    }, [p.tex]);
    check(!res.err && !res.refused && res.cellsSeen >= 9 && res.wrong.length === 0, `点到的那格（屏幕上一格约 ${res.side} 像素、窗口里看了 ${res.cellsSeen} 格，各取它那片像素的中心）：只有那一格是墨`, JSON.stringify(res).slice(0, 400));
    say(`放大后一格 ${zoom} 像素（横着量）；点在 ${JSON.stringify(res.px)}`);
  }
});

console.log(`\n${pass} 过 · ${failN} 红${haveModels ? "" : " · 真模型那一档没跑"}`);
if (errs.length) { console.log("页面错误：", errs.slice(0, 8)); process.exitCode = 1; }
await browser.close();
