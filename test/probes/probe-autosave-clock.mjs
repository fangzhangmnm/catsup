#!/usr/bin/env node
// probe-autosave-clock.mjs —— 改完东西之后墙上钟往回跳一小时（对时 / 手动改钟），空闲满 30 秒照常自动保存、照常拍崩溃快照。created 2026-11-12 by Claude Opus 5.5（统筹 11-11 定，v0.19.52）
// 以前会话的空闲计时用墙上钟（Date.now）：钟往回校一大截，「空闲满 30 秒」要等墙上钟追回来才成立，这段时间改动只在内存里。现在用只往前走的钟（SessionDeps.clock，缺 = performance.now）。
// 「上次改动多久了」直接把会话的 lastEditAt 往前拨 31 秒（不真等 30 秒；拨的是它自己那个钟上的 31 秒，新旧代码都适用）：
//   旧代码 lastEditAt 记的是墙上钟，墙上钟这时往回跳了一小时 → 算出来的空闲是负的 → 不存不拍（红）；新代码不看墙上钟 → 照常。
//   A 临时家（开机没选家）= 崩溃快照那条路；B 文件夹图库家 = 自动保存那条路。墙上钟往回跳 = 页面里的 Date.now 整体减一小时（app 里所有读墙上钟的地方一起跳）。
// 用法：python3 -m http.server 8765 后 node test/probes/probe-autosave-clock.mjs [url]
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
const here = path.dirname(fileURLToPath(import.meta.url));
const { chromium } = createRequire(path.join(here, "../../../20260524 WeebPaint/package.json"))("playwright");
const url = process.argv.slice(2).find((a) => a.startsWith("http")) ?? process.env.PROBE_URL ?? "http://127.0.0.1:8765/";
const FOLDER = "autosave-clock";
const BENIGN = /Not signed in|CloudNetworkError|Failed to fetch|net::ERR|msal|favicon|not persisted yet/i;
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
  return { ctx, page, S, ready };
}
/** 画一圈边（= 一次改动）。 */
const edit = (S, z) => S((z) => { const e = globalThis.__catsup.editor, P = (x, y) => ({ x, y, z }); e.setGrid({ ...e.grid, on: false }); e.commitOp({ op: "addEdges", at: e.activePool(), segs: [[P(0, 0), P(1, 0)], [P(1, 0), P(1, 1)], [P(1, 1), P(0, 1)], [P(0, 1), P(0, 0)]] }); e.draw(); }, z);
/** 会话存盘那两条路包一层计数。 */
const watch = (S) => S(() => {
  const s = globalThis.__catsup.session; globalThis.__AC = { save: 0, snapshot: 0 };
  for (const k of ["save", "snapshot"]) { if (s["__ac_" + k]) continue; const f = s[k]; s["__ac_" + k] = f; s[k] = function (...a) { globalThis.__AC[k]++; return f.apply(this, a); }; }
});
/** 墙上钟往回跳一小时（页面里所有读 Date.now 的地方一起跳）。 */
const clockBack = (S) => S(() => { const real = Date.now.bind(Date); Date.now = () => real() - 3600_000; });
/** 「上次改动」往前拨 31 秒（拨它自己那个钟），走一拍。 */
const idle31 = (S) => S(() => { const s = globalThis.__catsup.session; s.lastEditAt -= 31_000; s.tick(); });

console.log("A 临时家：改完东西 → 墙上钟往回跳一小时 → 空闲满 30 秒照常拍崩溃快照");
{
  const { ctx, page, S } = await open();
  await edit(S, 0); await S(() => globalThis.__catsup.session.tick());   // 会话看见这次改动（上次改动 = 现在）
  const st = await S(() => { const s = globalThis.__catsup.session; return { home: s.home.kind, dirty: s.dirty(), luggage: !!s.luggage, snapDue: s.snapDue() }; });
  check(st.home === "transient" && st.dirty && st.luggage && st.snapDue, "临时家里有一份脏的、该拍快照", JSON.stringify(st));
  await watch(S); await clockBack(S); await idle31(S);
  await page.waitForFunction(() => globalThis.__AC.snapshot > 0 && !globalThis.__catsup.session.snapRun, null, { timeout: 10000 }).catch(() => {});
  const n = await S(() => globalThis.__AC.snapshot);
  check(n >= 1, `墙上钟往回跳了一小时，空闲满 30 秒照常拍了崩溃快照（${n} 次）`);
  await ctx.close();
}

console.log("\nB 文件夹图库家：改完东西 → 墙上钟往回跳一小时 → 空闲满 30 秒照常自动保存");
{
  const { ctx, page, S, ready } = await open();
  const reloaded = async (act) => { const nav = page.waitForEvent("load", { timeout: 30000 }); await act(); await nav; await ready(); await page.waitForTimeout(900); };
  void page.evaluate(() => { void globalThis.__catsup.home.openGallery(); });
  await page.waitForFunction(() => !document.getElementById("sheet").hidden, null, { timeout: 8000 });
  await reloaded(() => page.click(`#sheetChoices button:has-text("选一个文件夹")`));
  await S(() => globalThis.__catsup.galleryHost.open());
  await page.waitForFunction(() => !document.getElementById("galleryFull").hidden);
  await page.click("#galleryNew");
  await page.waitForFunction(() => globalThis.__catsup.session.home.kind === "gallery" && document.getElementById("galleryFull").hidden);
  await edit(S, 0);
  await page.waitForFunction(() => !globalThis.__catsup.session.lazy, null, { timeout: 8000 }).catch(() => {});   // 首笔安家
  check(await S(async () => globalThis.__catsup.session.save()) === true, "先存一次（干净）");
  await edit(S, 1); await S(() => globalThis.__catsup.session.tick());
  check(await S(() => globalThis.__catsup.session.dirty()), "又改了一次（脏）");
  await watch(S); await clockBack(S); await idle31(S);
  await page.waitForFunction(() => globalThis.__AC.save > 0 && !globalThis.__catsup.session.saving && !globalThis.__catsup.session.dirty(), null, { timeout: 15000 }).catch(() => {});
  const r = await S(() => ({ save: globalThis.__AC.save, dirty: globalThis.__catsup.session.dirty() }));
  check(r.save >= 1 && !r.dirty, `墙上钟往回跳了一小时，空闲满 30 秒照常自动保存（${r.save} 次）、文件干净了`, JSON.stringify(r));
  await ctx.close();
}

await browser.close();
if (errs.length) { console.log("页面错误：", errs.slice(0, 6)); process.exitCode = 1; }
console.log(`\nprobe-autosave-clock ${failN || errs.length ? "FAIL" : "OK"}（${pass} ✓ / ${failN} ✗）`);
