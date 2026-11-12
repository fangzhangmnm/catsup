#!/usr/bin/env node
// probe-mid-stroke-save.mjs —— 一笔当中存盘，存出来的文件自己是一致的（统筹 11-11，v0.19.46）。created 2026-11-11 by Claude Opus 5.5
// 一笔当中还会存的路（防崩溃用的，不能因为手上忙就不存）：切后台 / 失焦（session.flushForHide）、关页（flushForPageHide）。要的三条：
//   ① 分层的字节 = 落笔之前落定的（不带这一笔）；② 合成图 = 同一版落定内容整张合出来的，没有这一笔画到一半的墨（合成图的记号说「照这份分层做的」，带半笔 = 说谎）；
//   ③ 存完这一笔接着画，显示照样对（核对：显示的那张 = 整张重合）。
// 做法：笔走真的 PointerEvent（笔 → 编辑器的画画工具 → 画画控制器，和人画一样）；笔 A 落定、还没编码过（不然存盘直接拿缓存，验了等于没验）→ 记下参照
//   （落定像素的哈希、整张合成的字节）→ 笔 B 按下去画几步 → 触发存盘 → 拿那一刻编出来的字节（画的缓存；文件 / 崩溃快照里也找到同一份字节）对参照。
//   V1 失焦 → 接着画（核对每一帧）→ 抬笔；V2 iPad 的次序：先 visibilitychange（存）、后 pointercancel → 刷新重开 = 笔 A 之后那一版（分层逐像素）；
//   V3 关页 pagehide（只落本机）；V4 临时家（崩溃快照那条路：切后台先编画再拍）。
// 用法：python3 -m http.server 8765 后 node test/probes/probe-mid-stroke-save.mjs [url]
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
const here = path.dirname(fileURLToPath(import.meta.url));
const { chromium } = createRequire(path.join(here, "../../../20260524 WeebPaint/package.json"))("playwright");
const url = process.argv.slice(2).find((a) => a.startsWith("http")) ?? process.env.PROBE_URL ?? "http://127.0.0.1:8765/";
const FOLDER = "mid-save";
const BENIGN = /Not signed in|CloudNetworkError|Failed to fetch|net::ERR|msal|favicon|GPU stall due to ReadPixels|not persisted yet/i;
let pass = 0, failN = 0;
const check = (ok, what, extra = "") => { if (ok) { pass++; console.log("  ✓", what); } else { failN++; process.exitCode = 1; console.error("  ✗", what, extra ? `  ← ${extra}` : ""); } };
const FAKE_FSA = (folder) => {
  window.showDirectoryPicker = async () => (await navigator.storage.getDirectory()).getDirectoryHandle(folder, { create: true });
  const P = globalThis.FileSystemHandle?.prototype;
  if (P) { P.queryPermission = async () => "granted"; P.requestPermission = async () => "granted"; }
};
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const errs = [];

async function open() {
  const ctx = await browser.newContext({ viewport: { width: 1000, height: 760 }, deviceScaleFactor: 1 });
  await ctx.addInitScript(FAKE_FSA, FOLDER);
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errs.push("pageerror: " + e.message));
  page.on("console", (m) => { if (m.type() === "error" && !BENIGN.test(m.text())) errs.push(`console.error: ${m.text()}`); });
  const S = (f, a) => page.evaluate(f, a);
  const ready = () => page.waitForFunction(() => globalThis.__catsup?.session && globalThis.__catsup.home);
  await page.goto(url, { waitUntil: "load" }); await ready(); await page.waitForTimeout(600);
  await S(helpers);
  const reloaded = async (act) => { const nav = page.waitForEvent("load", { timeout: 30000 }); await act(); await nav; await ready(); await page.waitForTimeout(900); await S(helpers); };
  return { ctx, page, S, reloaded };
}
const clearNotes = (S) => S(() => { for (const n of [...document.querySelectorAll("#noticeStack > *")]) n.remove(); });

/** 页面里的小工具（每次载入后装一次）。 */
function helpers() {
  const C = () => globalThis.__catsup;
  const H = (globalThis.__MS = {});
  const fnv = (bytes, n = bytes.length) => { let h = 2166136261; for (let i = 0; i < n; i++) { h ^= bytes[i]; h = Math.imul(h, 16777619); } return (h >>> 0).toString(16); };
  H.paintHash = (g) => { const b = C().paint.boards.get(g); if (!b) return "没有画板"; const d = b.wp.exportData(); let h = 2166136261; for (const n of d.nodes) if (n.pixels) for (const v of n.pixels.bytes) { h ^= v; h = Math.imul(h, 16777619); } return (h >>> 0).toString(16); };
  /** 笔 B 按下去之前的参照：落定像素的哈希、整张合成的字节（和存盘同一个 composeBytes）、落定的版本。 */
  H.ref = (g) => { const b = C().paint.boards.get(g); H.r = { hash: H.paintHash(g), comp: b.composeBytes().slice(), version: b.wp.commitVersion, width: b.width }; return { hash: H.r.hash, version: H.r.version }; };
  /** 真的笔：pointerId 9、pen；坐标 = 盒子顶面上 (x, y)（0–1）。 */
  H.pe = (type, x, y) => {
    const e = C().editor, p = e.cam.project({ x, y, z: 1 }, e.vp()), c = document.getElementById("board"), r = c.getBoundingClientRect();
    c.dispatchEvent(new PointerEvent(type, { pointerId: 9, pointerType: "pen", clientX: r.left + p.x, clientY: r.top + p.y, bubbles: true, cancelable: true, isPrimary: true, buttons: type === "pointerup" || type === "pointercancel" ? 0 : 1, pressure: type === "pointerup" ? 0 : 0.5 }));
  };
  H.stroke = (y, from = 0.2, to = 0.8, steps = 12) => { H.pe("pointerdown", from, y); for (let i = 1; i <= steps; i++) H.pe("pointermove", from + ((to - from) * i) / steps, y); H.pe("pointerup", to, y); };
  /** 存出来的画（画的缓存里那一份 = 交给写盘的那一份）对参照：版本、合成图逐字节。 */
  H.saved = async (g) => {
    const b = C().paint.boards.get(g), c = C().paint.saver.cache.get(g);
    if (!c) return { ok: false, why: "缓存里没有这张画" };
    const out = { cacheVersion: c.version, refVersion: H.r.version, boardVersion: b.wp.commitVersion, sameBoard: c.board === b, oraBytes: c.ora.byteLength, png: !!c.composite };
    if (!c.composite) return { ...out, ok: false, why: "没有合成图" };
    const bmp = await createImageBitmap(new Blob([c.composite.png], { type: "image/png" }), { premultiplyAlpha: "none", colorSpaceConversion: "none" });
    const oc = new OffscreenCanvas(bmp.width, bmp.height), cx = oc.getContext("2d"); cx.drawImage(bmp, 0, 0);
    const d = cx.getImageData(0, 0, bmp.width, bmp.height).data, n = bmp.width * bmp.height * 4;
    let diff = 0, first = -1; for (let i = 0; i < n; i++) if (d[i] !== H.r.comp[i]) { diff++; if (first < 0) first = i; }
    H.lastPng = c.composite.png; H.lastOra = c.ora;
    return { ...out, w: bmp.width, h: bmp.height, refW: H.r.width, diff, firstDiffPx: first < 0 ? null : [Math.floor(first / 4) % bmp.width, Math.floor(first / 4 / bmp.width)], ofMatches: c.composite.of.bytes === c.ora.byteLength, ok: diff === 0 && c.version === H.r.version };
  };
  const find = (hay, needle) => { const f = needle[0], m = hay.length - needle.length; outer: for (let i = 0; i <= m; i++) { if (hay[i] !== f) continue; for (let j = 1; j < needle.length; j++) if (hay[i + j] !== needle[j]) continue outer; return i; } return -1; };
  /** 文件夹家里写下去的文件：找带着这份合成图和分层字节的那一个。 */
  H.inFolder = async (folder) => {
    const dir = await (await navigator.storage.getDirectory()).getDirectoryHandle(folder);
    const hits = [];
    for await (const [name, h] of dir.entries()) { if (h.kind !== "file") continue; const bytes = new Uint8Array(await (await h.getFile()).arrayBuffer()); hits.push({ name, png: find(bytes, H.lastPng) >= 0, ora: find(bytes, H.lastOra) >= 0 }); }
    return hits;
  };
  H.inBlob = async (blob) => { const bytes = new Uint8Array(await blob.arrayBuffer()); return { png: find(bytes, H.lastPng) >= 0, ora: find(bytes, H.lastOra) >= 0, bytes: bytes.length }; };
  H.hidden = (on) => { if (on) Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" }); else delete document.visibilityState; document.dispatchEvent(new Event("visibilitychange")); };
  H.fnv = fnv;
}

/** 盒子 → 组件 → 网格体 → 进去 → 画画工作台 → 开始画 1024。 */
async function boxAndStart(page, S) {
  await S(() => {
    const e = globalThis.__catsup.editor, P = (x, y, z = 0) => ({ x, y, z });
    e.setGrid({ ...e.grid, on: false });
    const B = [[0, 0], [1, 0], [1, 1], [0, 1]], segs = []; for (let i = 0; i < 4; i++) { const a = B[i], d = B[(i + 1) % 4]; segs.push([P(a[0], a[1], 0), P(d[0], d[1], 0)]); segs.push([P(a[0], a[1], 1), P(d[0], d[1], 1)]); segs.push([P(a[0], a[1], 0), P(a[0], a[1], 1)]); }
    e.commitOp({ op: "addEdges", at: e.activePool(), segs }); e.selectAll(); e.runAction("brep.orientOutward", { curvature: 3 }); e.makeComponent("盒"); e.runAction("object.toMesh");
  });
  await enterBox(S);
  await S(() => { globalThis.__catsup.pickWorkbench("paint"); });
  await page.locator('button:has-text("开始画")').first().click();
  await page.waitForFunction(() => !document.getElementById("sheet").hidden && [...document.querySelectorAll("#sheetChoices .sheet-row-label")].some((l) => /1024 × 1024$/.test(l.firstChild?.textContent ?? "")));
  await page.locator('#sheetChoices .sheet-row:has-text("1024 × 1024")').click();
  await S(() => globalThis.__catsup.editor.draw());
  return S(() => [...globalThis.__catsup.editor.sceneRef.textures.values()].find((t) => t.content.kind === "layered")?.guid ?? null);
}
const enterBox = (S) => S(() => {
  const e = globalThis.__catsup.editor, S0 = e.sceneRef, inst = [...S0.def(S0.root).instances.values()][0];
  e.exitTo(0); e.selectedPools.clear(); e.selectedPools.set(`i${inst.id}`, { kind: "instance", instance: inst.id }); e.enterSelected();
  e.cam.setView("top"); e.zoomExtents(); e.draw();
});
/** 笔 A 落定（还没编码过）→ 参照 → 笔 B 按下去画到一半（y = 这一笔在顶面上的哪一行）。 */
const aThenHalfB = async (S, g, yA, yB) => {
  await S(([y]) => globalThis.__MS.stroke(y), [yA]);
  const fresh = await S((g) => { const C = globalThis.__catsup, b = C.paint.boards.get(g), c = C.paint.saver.cache.get(g); return !!c && c.board === b && c.version === b.wp.commitVersion; }, g);
  const ref = await S((g) => globalThis.__MS.ref(g), g);
  await S(([y]) => { const M = globalThis.__MS; M.pe("pointerdown", 0.2, y); for (let i = 1; i <= 6; i++) M.pe("pointermove", 0.2 + 0.05 * i, y); }, [yB]);
  const mid = await S((g) => ({ stroking: globalThis.__catsup.paint.workbench.stroking, gesture: globalThis.__catsup.editor.isGestureActive(), hash: globalThis.__MS.paintHash(g) }), g);
  return { fresh, ref, mid };
};
const waitSaved = (page) => page.waitForFunction(() => { const s = globalThis.__catsup.session; return !s.saving && !s.refreshing && !s.snapRun; }, null, { timeout: 30000 });

// ---------- 文件夹图库家：V1 失焦 / V2 iPad 次序 / V3 关页 ----------
{
  const { ctx, page, S, reloaded } = await open();
  void page.evaluate(() => { void globalThis.__catsup.home.openGallery(); });
  await page.waitForFunction(() => !document.getElementById("sheet").hidden, null, { timeout: 8000 });
  await reloaded(() => page.click(`#sheetChoices button:has-text("选一个文件夹")`));
  await S(() => globalThis.__catsup.galleryHost.open());
  await page.waitForFunction(() => !document.getElementById("galleryFull").hidden);
  await page.click("#galleryNew");
  await page.waitForFunction(() => globalThis.__catsup.session.home.kind === "gallery" && document.getElementById("galleryFull").hidden);
  await clearNotes(S);
  const g = await boxAndStart(page, S);
  check(!!g && await S(async () => globalThis.__catsup.session.save()) === true, "文件夹图库家：开始画、先存一次");

  console.log("\nV1 一笔当中失焦（flushForHide）→ 存出来的 = 笔 A 之后那一版、没有半笔；存完接着画，核对每一帧");
  const v1 = await aThenHalfB(S, g, 0.25, 0.5);
  check(!v1.fresh && v1.mid.stroking && v1.mid.gesture && v1.mid.hash === v1.ref.hash, "笔 A 落定还没编码过；笔 B 按着（编辑器也算手势中），落定的像素没被这一笔动过", JSON.stringify(v1));
  await S(() => window.dispatchEvent(new Event("blur")));
  await waitSaved(page);
  const s1 = await S((g) => globalThis.__MS.saved(g), g);
  check(s1.ok && s1.sameBoard && s1.ofMatches, `存出来的：落定版本 ${s1.cacheVersion} = 笔 B 之前 ${s1.refVersion}；合成图 ${s1.w}×${s1.h} 和笔 B 之前整张合成逐字节一样（差 ${s1.diff} 个字节）`, JSON.stringify(s1));
  const f1 = await S(() => globalThis.__MS.inFolder("mid-save"));
  check(f1.some((h) => h.png && h.ora), `文件夹里的文件带着这一份合成图和分层字节（${f1.map((h) => `${h.name}${h.png && h.ora ? " ✓" : ""}`).join("、")}）`, JSON.stringify(f1));
  const checks1 = await S(async () => { const C = globalThis.__catsup, M = globalThis.__MS, out = []; for (let i = 7; i <= 12; i++) { M.pe("pointermove", 0.2 + 0.05 * i, 0.5); C.editor.draw(); out.push(C.paint.diag.check()); } return out; });
  check(checks1.every((x) => x === true), `存完接着画：后面 ${checks1.length} 帧每帧核对（显示 = 整张重合）都对上`, JSON.stringify(checks1));
  await S(() => { globalThis.__MS.pe("pointerup", 0.8, 0.5); globalThis.__catsup.editor.draw(); });
  const after1 = await S((g) => ({ hash: globalThis.__MS.paintHash(g), check: globalThis.__catsup.paint.diag.check(), dirty: globalThis.__catsup.session.dirty() }), g);
  check(after1.hash !== v1.ref.hash && after1.check === true && after1.dirty, "抬笔：这一笔落进画里了、核对对上、文件又脏了（等下一次存）", JSON.stringify(after1));
  const sens = await S((g) => { const b = globalThis.__catsup.paint.boards.get(g), now = b.composeBytes(), r = globalThis.__MS.r.comp; let n = 0; for (let i = 0; i < r.length; i++) if (now[i] !== r[i]) n++; globalThis.__catsup.editor.draw(); return n; }, g);
  check(sens > 0, `这个比较看得出笔 B：抬笔后整张合成和参照差 ${sens} 个字节（所以上面「差 0」= 存出来的合成图里真没有半笔）`);
  check(await S(async () => globalThis.__catsup.session.save()) === true, "存上（这一笔进文件）");

  console.log("\nV2 iPad 的次序：先 visibilitychange（存）、后 pointercancel → 刷新重开 = 笔 A 之后那一版（分层逐像素）");
  const v2 = await aThenHalfB(S, g, 0.15, 0.65);
  check(!v2.fresh && v2.mid.stroking && v2.mid.hash === v2.ref.hash, "笔 A 落定还没编码过；笔 B 按着", JSON.stringify(v2));
  await S(() => globalThis.__MS.hidden(true));
  await waitSaved(page);
  await S(() => { const M = globalThis.__MS; M.pe("pointercancel", 0.5, 0.65); globalThis.__catsup.editor.draw(); });
  await S(() => globalThis.__MS.hidden(false));
  const s2 = await S((g) => globalThis.__MS.saved(g), g);
  check(s2.ok && s2.ofMatches, `切后台那一刻存出来的：落定版本 = 笔 B 之前；合成图逐字节 = 笔 B 之前（差 ${s2.diff}）`, JSON.stringify(s2));
  const st2 = await S((g) => ({ stroking: globalThis.__catsup.paint.workbench.stroking, hash: globalThis.__MS.paintHash(g), dirty: globalThis.__catsup.session.dirty() }), g);
  check(!st2.stroking && st2.hash === v2.ref.hash && !st2.dirty, "pointercancel：这一笔取消、零痕迹；文件干净（切后台那次存的就是现在这一版）", JSON.stringify(st2));
  await reloaded(() => page.reload());
  await clearNotes(S); await enterBox(S);
  await S(() => { globalThis.__catsup.pickWorkbench("paint"); globalThis.__catsup.editor.draw(); });
  await page.waitForFunction((g) => globalThis.__catsup.paint.state(g) === "hot", g, { timeout: 15000 }).catch(() => {});
  const re2 = await S((g) => globalThis.__MS.paintHash(g), g);
  check(re2 === v2.ref.hash, `刷新重开：分层逐像素 = 笔 A 之后、笔 B 之前（${re2}）`, JSON.stringify({ re2, ref: v2.ref.hash }));

  console.log("\nV3 一笔当中关页（pagehide，只落本机）→ 存出来的 = 笔 A 之后那一版、没有半笔");
  const v3 = await aThenHalfB(S, g, 0.35, 0.75);
  check(!v3.fresh && v3.mid.stroking && v3.mid.hash === v3.ref.hash, "笔 A 落定还没编码过；笔 B 按着", JSON.stringify(v3));
  await S(() => { const ev = new PageTransitionEvent("pagehide", { persisted: false }); window.dispatchEvent(ev); });
  await waitSaved(page);
  const s3 = await S((g) => globalThis.__MS.saved(g), g);
  check(s3.ok && s3.ofMatches, `关页那一刻存出来的：落定版本 = 笔 B 之前；合成图逐字节 = 笔 B 之前（差 ${s3.diff}）`, JSON.stringify(s3));
  await S(() => { globalThis.__MS.pe("pointerup", 0.6, 0.75); globalThis.__catsup.editor.draw(); });
  check(await S(() => globalThis.__catsup.paint.diag.check()) === true, "关页那一下之后抬笔：核对对上");
  await ctx.close();
}

// ---------- 临时家：V4 崩溃快照那条路 ----------
{
  console.log("\nV4 临时家（开机没选家）一笔当中切后台 → 先编画再拍快照：编出来的 = 笔 A 之后那一版、没有半笔；快照里就是这一份");
  const { ctx, page, S } = await open();
  const g = await boxAndStart(page, S);
  check(!!g && await S(() => globalThis.__catsup.session.home.kind) === "transient", "临时家里开始画了");
  const v4 = await aThenHalfB(S, g, 0.3, 0.6);
  check(!v4.fresh && v4.mid.stroking && v4.mid.hash === v4.ref.hash, "笔 A 落定还没编码过；笔 B 按着", JSON.stringify(v4));
  await S(() => globalThis.__MS.hidden(true));
  await waitSaved(page);
  await page.waitForTimeout(300); await waitSaved(page);
  const s4 = await S((g) => globalThis.__MS.saved(g), g);
  check(s4.ok && s4.ofMatches, `切后台那一刻编出来的：落定版本 = 笔 B 之前；合成图逐字节 = 笔 B 之前（差 ${s4.diff}）`, JSON.stringify(s4));
  await S(() => globalThis.__MS.hidden(false));
  const crash = await S(async () => { const C = globalThis.__catsup, tag = C.session.luggage, blob = tag ? await C.crash.adopt(tag) : null; return blob ? globalThis.__MS.inBlob(blob) : null; });
  check(!!crash && crash.png && crash.ora, `崩溃快照里就是这一份（合成图、分层字节都在；快照 ${crash?.bytes} 字节）`, JSON.stringify(crash));
  await S(() => { globalThis.__MS.pe("pointerup", 0.6, 0.6); globalThis.__catsup.editor.draw(); });
  check(await S(() => globalThis.__catsup.paint.diag.check()) === true, "之后抬笔：核对对上");
  await ctx.close();
}

console.log(`\n${pass} 过 · ${failN} 红`);
if (errs.length) { console.log("页面错误：", errs.slice(0, 8)); process.exitCode = 1; }
await browser.close();
