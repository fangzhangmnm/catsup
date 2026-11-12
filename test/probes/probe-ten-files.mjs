#!/usr/bin/env node
// probe-ten-files.mjs —— 连开十份画过的文件（统筹 11-11：图库「新建」在长跑里卡住撞上第三次；流畅那一批 1-4d 细则「开关 10 个画过的文件」）。created 2026-11-11 by Claude Opus 5.5
// 每轮 = 图库 → 新建 → 盒子 → 网格体 → 开始画 1024 → 画两笔 → 存。量：新建花多久；画板、活的图、准备的条目、图块池、显卡上活着的图 / 帧缓冲、
// three 记着的几何、还被引用着的缓冲区（弱引用 + 强制回收：被丢掉、等着回收的不算）。
// 过关：每次新建都在 5 秒内；第 2 轮之后这些数都回到同一个水平（不随开过几份涨）。
// 性能档（--perf，底账 perfArgs；2026-11-12 user：2048 是标准低配、必量）：每份开 2048；防漏那几条照判，新建多久只打数。
// 量出来的那个漏（v0.19.29 前）：每换一次文件，每个槽的「标记粗线」几何没还（three 一直记着它）= 每份文件漏一份。
// 用法：python3 -m http.server 8765 后 node test/probes/probe-ten-files.mjs [url]
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
const here = path.dirname(fileURLToPath(import.meta.url));
const { chromium } = createRequire(path.join(here, "../../../20260524 WeebPaint/package.json"))("playwright");
const url = process.argv.slice(2).find((a) => a.startsWith("http")) ?? process.env.PROBE_URL ?? "http://127.0.0.1:8765/";
const PERF = process.argv.includes("--perf");   // 性能档：每份开 2048（只打数的那几项见下）
const ROUNDS = 10, FOLDER = "ten-files";
let pass = 0, failN = 0;
const check = (ok, what, extra = "") => { if (ok) { pass++; console.log("  ✓", what); } else { failN++; process.exitCode = 1; console.error("  ✗", what, extra ? `  ← ${extra}` : ""); } };
const FAKE_FSA = (folder) => { window.showDirectoryPicker = async () => (await navigator.storage.getDirectory()).getDirectoryHandle(folder, { create: true }); const P = globalThis.FileSystemHandle?.prototype; if (P) { P.queryPermission = async () => "granted"; P.requestPermission = async () => "granted"; } };
const GL = () => {   // 给 WebGL 记账：图 / 帧缓冲按建删数；缓冲区按弱引用数（app 丢掉的、垃圾回收会收走的不算）
  const P = WebGL2RenderingContext.prototype, tex = new Set(), fb = new Set(), bufs = new Map(), ids = new WeakMap(); let next = 1;
  const fin = new FinalizationRegistry((id) => bufs.delete(id));
  const wrap = (mk, del, set) => { const m = P[mk], d = P[del]; P[mk] = function () { const o = m.apply(this, arguments); if (o) set.add(o); return o; }; P[del] = function (o) { set.delete(o); return d.apply(this, arguments); }; };
  wrap("createTexture", "deleteTexture", tex); wrap("createFramebuffer", "deleteFramebuffer", fb);
  const cb = P.createBuffer, db = P.deleteBuffer;
  P.createBuffer = function () { const b = cb.apply(this, arguments); if (b) { const id = next++; ids.set(b, id); fin.register(b, id); bufs.set(id, new WeakRef(b)); } return b; };
  P.deleteBuffer = function (b) { const id = ids.get(b); if (id) bufs.delete(id); return db.apply(this, arguments); };
  globalThis.__gl = () => { for (const [id, r] of bufs) if (!r.deref()) bufs.delete(id); return { tex: tex.size, fb: fb.size, buf: bufs.size }; };
};
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--js-flags=--expose-gc"] });
const ctx = await browser.newContext({ viewport: { width: 900, height: 700 }, deviceScaleFactor: 1 });
await ctx.addInitScript(FAKE_FSA, FOLDER); await ctx.addInitScript(GL);
if (PERF) await ctx.addInitScript(() => { globalThis.__TF_CANVAS = 2048; });   // 性能档：每份开 2048（页面重载也在）
const page = await ctx.newPage();
const errs = []; page.on("pageerror", (e) => errs.push(e.message));
const S = (f, a) => page.evaluate(f, a);
const ready = () => page.waitForFunction(() => globalThis.__catsup?.session && globalThis.__catsup.home);
await page.goto(url, { waitUntil: "load" }); await ready(); await page.waitForTimeout(600);
void page.evaluate(() => { void globalThis.__catsup.home.openGallery(); });
await page.waitForFunction(() => !document.getElementById("sheet").hidden, null, { timeout: 8000 });
{ const nav = page.waitForEvent("load"); await page.click(`#sheetChoices button:has-text("选一个文件夹")`); await nav; await ready(); await page.waitForTimeout(900); }
const stat = () => S(async () => {
  for (let i = 0; i < 3; i++) { globalThis.gc?.(); await new Promise((q) => setTimeout(q, 100)); }
  const C = globalThis.__catsup, t = C.paint.tiles();
  return { boards: C.paint.boards.guids().length, live: C.paint.stats().images, prep: C.paint.prep.stats().entries, tiles: `${t.count}/${t.rawBytes}/${t.compressedBytes}`, geos: C.editor.renderer3.renderer.info.memory.geometries, ...globalThis.__gl() };
});
console.log(`连开 ${ROUNDS} 份画过的文件`);
const rows = [];
for (let r = 0; r < ROUNDS; r++) {
  await S(() => globalThis.__catsup.galleryHost.open());
  await page.waitForFunction(() => !document.getElementById("galleryFull").hidden, null, { timeout: 60000 });
  const t1 = performance.now();
  await page.click("#galleryNew");
  let ok = true;
  try { await page.waitForFunction(() => globalThis.__catsup.session.home.kind === "gallery" && document.getElementById("galleryFull").hidden, null, { timeout: 30000 }); } catch { ok = false; }
  const newS = (performance.now() - t1) / 1000;
  if (!ok) { console.log("    卡在新建：黑匣子最后 40 行\n" + (await S(() => globalThis.__catsup.debugLog.toText().split("\n").slice(-40).join("\n"))).replace(/^/gm, "      ")); check(false, `第 ${r + 1} 份：新建 30 秒都没好`); break; }
  await S(() => { for (const n of [...document.querySelectorAll("#noticeStack > *")]) n.remove(); });
  const saved = await S(async () => {
    const C = globalThis.__catsup, e = C.editor, P = (x, y, z = 0) => ({ x, y, z }); e.setGrid({ ...e.grid, on: false });
    const B = [[0, 0], [1, 0], [1, 1], [0, 1]], segs = []; for (let i = 0; i < 4; i++) { const a = B[i], d = B[(i + 1) % 4]; segs.push([P(a[0], a[1], 0), P(d[0], d[1], 0)]); segs.push([P(a[0], a[1], 1), P(d[0], d[1], 1)]); segs.push([P(a[0], a[1], 0), P(a[0], a[1], 1)]); }
    e.commitOp({ op: "addEdges", at: e.activePool(), segs }); e.selectAll(); e.runAction("brep.orientOutward", { curvature: 3 }); e.makeComponent("盒"); e.runAction("object.toMesh");
    const S0 = e.sceneRef, inst = [...S0.def(S0.root).instances.values()][0]; e.exitTo(0); e.selectedPools.clear(); e.selectedPools.set(`i${inst.id}`, { kind: "instance", instance: inst.id }); e.enterSelected();
    C.pickWorkbench("paint"); e.runAction("mesh.startPaint", { canvas: globalThis.__TF_CANVAS ?? 1024, arrange: "patches" }); e.cam.setView("top"); e.zoomExtents(); e.draw();
    const t = [...e.sceneRef.textures.values()].find((x) => x.content.kind === "layered")?.guid;
    for (const y of [0.4, 0.6]) { const V = e.vp(), pts = []; for (let i = 0; i <= 20; i++) pts.push({ x: V.w * (0.3 + 0.4 * i / 20), y: V.h * y }); C.paint.stroke({ guid: t, points: pts, size: 24, color: [0.8, 0.1, 0.1] }); }
    for (let i = 0; i < 3; i++) { e.draw(); await new Promise((q) => requestAnimationFrame(q)); }
    return C.session.save();
  });
  rows.push({ newS, saved, ...(await stat()) });
  console.log(`    第 ${r + 1} 份：${JSON.stringify(rows[rows.length - 1])}`);
}
if (rows.length === ROUNDS) {
  if (PERF) { check(rows.every((x) => x.saved), `${ROUNDS} 份（2048）都存上了`); console.log(`    （性能档，只打数）新建最慢 ${Math.max(...rows.map((x) => x.newS)).toFixed(2)} 秒、中位 ${[...rows.map((x) => x.newS)].sort((a, b) => a - b)[rows.length >> 1].toFixed(2)} 秒`); }
  else check(rows.every((x) => x.newS < 5 && x.saved), `${ROUNDS} 次新建都在 5 秒内、都存上了（最慢 ${Math.max(...rows.map((x) => x.newS)).toFixed(2)} 秒）`);
  const a = rows[1], z = rows[ROUNDS - 1];
  for (const k of ["boards", "live", "prep", "tiles", "tex", "fb", "geos"]) check(String(a[k]) === String(z[k]), `${k}：第 2 份 ${a[k]} = 第 ${ROUNDS} 份 ${z[k]}（不随开过几份涨）`);
  check(z.buf <= a.buf + 12, `还被引用着的缓冲区：第 2 份 ${a.buf}、第 ${ROUNDS} 份 ${z.buf}（不随开过几份涨；差一点 = 上一份还没回收完）`);
}
console.log("正在存的时候点「新建」（统筹 11-11 卡住的根：以前这一下被吞掉、什么都不说）");
for (let r = 0; r < 3; r++) {
  await S(() => { const C = globalThis.__catsup, e = C.editor, P = (x, y, z = 0) => ({ x, y, z }); e.commitOp({ op: "addEdges", at: e.activePool(), segs: [[P(0.1 + 0.1 * Math.random(), 0.2, 2), P(0.8, 0.8, 2)]] }); });   // 脏一下
  const t0 = performance.now();
  await S(async () => { const C = globalThis.__catsup; void C.session.save(); await C.galleryHost.open(); });   // 一份在存，同时开图库
  await page.waitForFunction(() => !document.getElementById("galleryFull").hidden, null, { timeout: 30000 });
  const during = await S(() => globalThis.__catsup.session.saveState?.() ?? "");
  await page.click("#galleryNew");
  let ok = true;
  try { await page.waitForFunction(() => globalThis.__catsup.session.home.kind === "gallery" && document.getElementById("galleryFull").hidden, null, { timeout: 15000 }); } catch { ok = false; }
  check(ok, `第 ${r + 1} 次：存着的时候点「新建」= 等它存完、照样新建（${((performance.now() - t0) / 1000).toFixed(1)} 秒；点的时候 ${during}）`);
  if (!ok) break;
  await S(() => { for (const n of [...document.querySelectorAll("#noticeStack > *")]) n.remove(); });
}
check(errs.length === 0, "没有报错", errs.slice(0, 3).join(" | "));
console.log(`\nprobe-ten-files ${failN ? "FAIL" : "OK"}（${pass} ✓ / ${failN} ✗）`);
await browser.close();
