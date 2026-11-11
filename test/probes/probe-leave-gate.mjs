#!/usr/bin/env node
// probe-leave-gate.mjs —— 人点的动作不许被悄悄吞掉（统筹 11-11：图库「新建」卡住查出来的结构问题）。created 2026-11-11 by Claude Opus 5.5
// 离开一份文档（图库里点「新建」）之前要存这一份；存不成的每一条路，人都要在当时的画面上（图库开着 = 图库上面）看到一句原因、该问的问；人自己在面上点了不走的不再多说。
// 文件夹家（假选夹 = OPFS）+ 无头。每一条：造出那种状态 → 开图库点「新建」→ 画面上有那句话 / 那张面、文档没丢（还是这一份、改动还在）→ 解开那种状态再点 = 走得了。
//   A 读进来时丢过东西（lossyHold）：问「离开之前要先存这份…」（存再走 / 另存一份再走 / 先不走）；先不走 = 留下、不多说；存再走 = 存了、走了
//   B 加密的、现在锁着：说「…锁着：先解锁再保存」；解锁之后点 = 走得了
//   C 存不上（写盘出错）：说存不上；修好之后点 = 走得了
//   D 夹里那份被别处改过（撞上新版本）：弹面问（不是只亮个横幅）；取消 = 留下、不多说
// 「正在存的时候点新建」= probe-ten-files 那三次。
// 用法：python3 -m http.server 8765 后 node test/probes/probe-leave-gate.mjs [url]
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
const here = path.dirname(fileURLToPath(import.meta.url));
const { chromium } = createRequire(path.join(here, "../../../20260524 WeebPaint/package.json"))("playwright");
const url = process.argv.slice(2).find((a) => a.startsWith("http")) ?? process.env.PROBE_URL ?? "http://127.0.0.1:8765/";
const FOLDER = "leave-gate", PW = "probe-口令-1";
let pass = 0, failN = 0;
const check = (ok, what, extra = "") => { if (ok) { pass++; console.log("  ✓", what); } else { failN++; process.exitCode = 1; console.error("  ✗", what, extra ? `  ← ${extra}` : ""); } };
const FAKE_FSA = (folder) => { window.showDirectoryPicker = async () => (await navigator.storage.getDirectory()).getDirectoryHandle(folder, { create: true }); const P = globalThis.FileSystemHandle?.prototype; if (P) { P.queryPermission = async () => "granted"; P.requestPermission = async () => "granted"; } };
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const ctx = await browser.newContext({ viewport: { width: 1000, height: 760 }, deviceScaleFactor: 1 });
await ctx.addInitScript(FAKE_FSA, FOLDER);
const page = await ctx.newPage();
const errs = []; page.on("pageerror", (e) => errs.push(e.message));
const S = (f, a) => page.evaluate(f, a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ready = () => page.waitForFunction(() => globalThis.__catsup?.session && globalThis.__catsup.home);
await page.goto(url, { waitUntil: "load" }); await ready(); await page.waitForTimeout(600);
void page.evaluate(() => { void globalThis.__catsup.home.openGallery(); });
await page.waitForFunction(() => !document.getElementById("sheet").hidden, null, { timeout: 8000 });
{ const nav = page.waitForEvent("load"); await page.click(`#sheetChoices button:has-text("选一个文件夹")`); await nav; await ready(); await page.waitForTimeout(900); }

const clearNotes = () => S(() => { for (const n of [...document.querySelectorAll("#noticeStack > *")]) n.remove(); });
const galleryOpen = () => S(() => !document.getElementById("galleryFull").hidden);
const here2 = () => S(() => ({ path: globalThis.__catsup.session.home.path ?? null, kind: globalThis.__catsup.session.home.kind, lazy: !!globalThis.__catsup.session.lazy, dirty: globalThis.__catsup.session.dirty(), edges: globalThis.__catsup.editor.sceneRef.def(globalThis.__catsup.editor.sceneRef.root).body.kind === "brep" ? globalThis.__catsup.editor.kernel.graph.edgeCount?.() ?? -1 : -1 }));
/** 一份有内容、存好了的新文档。 */
const freshSaved = async () => {
  if (!(await galleryOpen())) await S(() => globalThis.__catsup.galleryHost.open());
  await page.waitForFunction(() => !document.getElementById("galleryFull").hidden, null, { timeout: 30000 });
  await page.click("#galleryNew");
  await page.waitForFunction(() => document.getElementById("galleryFull").hidden, null, { timeout: 30000 });
  await S(() => { const e = globalThis.__catsup.editor, P = (x, y, z = 0) => ({ x, y, z }); e.setGrid({ ...e.grid, on: false }); e.commitOp({ op: "addEdges", at: e.activePool(), segs: [[P(0, 0), P(2, 0)], [P(2, 0), P(2, 2)], [P(2, 2), P(0, 2)], [P(0, 2), P(0, 0)]] }); });
  await page.waitForFunction(() => !globalThis.__catsup.session.lazy && !globalThis.__catsup.session.saving && !globalThis.__catsup.session.dirty(), null, { timeout: 15000 });
  await clearNotes();
  return S(() => globalThis.__catsup.session.home.path);
};
/** 改一笔（脏）。 */
const touch = () => S(() => { const e = globalThis.__catsup.editor, P = (x, y, z = 0) => ({ x, y, z }); e.commitOp({ op: "addEdges", at: e.activePool(), segs: [[P(0.3 + Math.random(), 0.5, 0), P(1.5, 1.5, 0)]] }); });
/** 开图库、点「新建」，等一会儿（走成了 = 图库关了；没走成 = 要么有面、要么有一句话）。 */
const clickNew = async () => {
  await S(() => globalThis.__catsup.galleryHost.open());
  await page.waitForFunction(() => !document.getElementById("galleryFull").hidden, null, { timeout: 30000 });
  await page.click("#galleryNew");
  await page.waitForFunction(() => document.getElementById("galleryFull").hidden || !document.getElementById("sheet").hidden || document.querySelectorAll("#noticeStack > *").length > 0, null, { timeout: 20000 }).catch(() => {});
  await sleep(300);
};
/** 一句话在不在、在不在最上面（图库开着时盖得住它的只有面和通知）。 */
const toastOnTop = (re) => S((src) => {
  const re = new RegExp(src);
  for (const n of document.querySelectorAll("#noticeStack > *")) {
    if (!re.test(n.textContent)) continue;
    const r = n.getBoundingClientRect(), hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return { text: n.textContent.trim().slice(0, 80), onTop: !!hit && n.contains(hit) };
  }
  return null;
}, re.source);
const sheetOnTop = (re) => S((src) => {
  const sh = document.getElementById("sheet"); if (sh.hidden || !new RegExp(src).test(sh.textContent)) return null;
  const b = sh.querySelector("#sheetChoices button") ?? sh, r = b.getBoundingClientRect(), hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
  return { text: sh.textContent.trim().replace(/\s+/g, " ").slice(0, 90), onTop: !!hit && sh.contains(hit) };
}, re.source);
const noteCount = () => S(() => document.querySelectorAll("#noticeStack > *").length);

console.log("A 读进来时丢过东西：离开之前先问");
let p0 = await freshSaved();
await S(() => { globalThis.__catsup.session.noteFormat({ readNotes: { newerMinor: [], newerPatch: [], foreignPaintSlots: 2 } }); });
await touch();
await clickNew();
let sh = await sheetOnTop(/离开之前要先存这份/);
check(!!sh?.onTop && await galleryOpen(), `点「新建」= 图库上面弹面问（${sh?.text}）`);
const n0 = await noteCount();
await page.click(`#sheetChoices button:has-text("先不走")`); await sleep(400);
let st = await here2();
check(st.path === p0 && st.dirty && await galleryOpen() && (await noteCount()) === n0, "先不走 = 还是这一份、改动还在、图库开着、不多说一句");
await page.click("#galleryNew");
await page.waitForFunction(() => !document.getElementById("sheet").hidden, null, { timeout: 8000 });
await page.click(`#sheetChoices button:has-text("存（丢掉这几处）再走")`);
await page.waitForFunction(() => document.getElementById("galleryFull").hidden, null, { timeout: 15000 }).catch(() => {});
st = await here2();
check(!(await galleryOpen()) && st.path !== p0, `存再走 = 存了、走了（现在是 ${st.path ?? st.kind}）`);

console.log("\nB 加密的、现在锁着：说一句");
p0 = await freshSaved();
const enc = await S(async (pw) => { const C = globalThis.__catsup; C.crypto.answer(async () => pw); const r = await C.session.encryptCurrent(); return { r, encrypted: C.session.encrypted }; }, PW);
await page.waitForFunction(() => !globalThis.__catsup.session.saving && !globalThis.__catsup.session.dirty(), null, { timeout: 15000 }).catch(() => {});
await S(() => globalThis.__catsup.crypto.lock()); await clearNotes();
await touch();
await clickNew();
let t = await toastOnTop(/锁着/);
st = await here2();
check(enc.encrypted && !!t?.onTop && st.path === p0 && st.dirty && await galleryOpen(), `锁着点「新建」= 图库上面一句「${t?.text}」、还是这一份、改动还在`);
await S((pw) => globalThis.__catsup.crypto.setPassword(pw), PW); await clearNotes();
if (!(await galleryOpen())) await S(() => globalThis.__catsup.galleryHost.open());
await page.waitForFunction(() => !document.getElementById("galleryFull").hidden, null, { timeout: 30000 });
await page.click("#galleryNew");
await page.waitForFunction(() => document.getElementById("galleryFull").hidden, null, { timeout: 15000 }).catch(() => {});
check(!(await galleryOpen()) && (await here2()).path !== p0, "解锁之后再点 = 走得了");

console.log("\nC 存不上（写盘出错）：说一句");
p0 = await freshSaved();
await S(() => { const P = IDBObjectStore.prototype; globalThis.__put = P.put; P.put = function () { throw new DOMException("probe: disk is full", "QuotaExceededError"); }; });   // 本机那份写不进去（盘满）
await touch();
await clickNew();
t = await toastOnTop(/存|写/);
st = await here2();
const gOpenC = await galleryOpen();
check(!!t?.onTop && st.path === p0 && st.dirty && gOpenC, `存不上点「新建」= 图库上面一句「${t?.text}」、还是这一份、改动还在`, JSON.stringify({ onTop: t?.onTop, path: st.path, p0, dirty: st.dirty, gOpenC }));
await S(() => { IDBObjectStore.prototype.put = globalThis.__put; }); await clearNotes();
if (!(await galleryOpen())) await S(() => globalThis.__catsup.galleryHost.open());
await page.waitForFunction(() => !document.getElementById("galleryFull").hidden, null, { timeout: 30000 });
await page.click("#galleryNew");
await page.waitForFunction(() => document.getElementById("galleryFull").hidden, null, { timeout: 15000 }).catch(() => {});
check(!(await galleryOpen()) && (await here2()).path !== p0, "修好了再点 = 走得了");

console.log("\nD 夹里那份被别处改过（撞上新版本）：弹面问");
p0 = await freshSaved();
await S(async ([folder, p]) => { const root = await (await navigator.storage.getDirectory()).getDirectoryHandle(folder); const h = await root.getFileHandle(p); const f = await h.getFile(), b = new Uint8Array(await f.arrayBuffer()); b[b.length - 1] ^= 0x20; await new Promise((r) => setTimeout(r, 30)); const w = await h.createWritable(); await w.write(b); await w.close(); }, [FOLDER, p0]);   // 别处改了一个字节
await touch();
await clickNew();
sh = await S(() => { const s = document.getElementById("sheet"); return s.hidden ? null : s.textContent.trim().replace(/\s+/g, " ").slice(0, 120); });
t = await toastOnTop(/云端|另一版|新版本/);
st = await here2();
const kept = await S(async ([folder, p]) => { const root = await (await navigator.storage.getDirectory()).getDirectoryHandle(folder); try { await root.getFileHandle(p); return true; } catch { return false; } }, [FOLDER, p0]);
// 两种都算「没吞掉」：本机那份存不上 = 弹面问、留下；本机存上了、只是同步撞上 = 走了，那句「要你选用哪边…处理」在图库上面（文档在夹里、不丢）
check((!!sh && st.path === p0) || (!!t?.onTop && kept), `撞上新版本点「新建」：${sh ? `弹面问（${sh}）、还是这一份` : `本机存上了、走了；图库上面一句「${t?.text ?? "无"}」、原来那份还在夹里`}`);
if (sh) { const cancel = await S(() => [...document.querySelectorAll("#sheet button")].map((b) => b.textContent.trim()).find((x) => /取消|先不/.test(x)) ?? null); if (cancel) { await page.click(`#sheet button:has-text("${cancel}")`); await sleep(400); check((await here2()).path === p0 && (await here2()).dirty, `面上点「${cancel}」= 还是这一份、改动还在`); } }

check(errs.length === 0, "没有报错", errs.slice(0, 3).join(" | "));
console.log(`\nprobe-leave-gate ${failN ? "FAIL" : "OK"}（${pass} ✓ / ${failN} ✗）`);
await browser.close();
