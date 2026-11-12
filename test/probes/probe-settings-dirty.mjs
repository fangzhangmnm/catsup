#!/usr/bin/env node
// probe-settings-dirty.mjs —— 住在文件设置里的那几样（网格 / 单位制 / 尺度参考），改了算改过：自动保存写了、重新打开值还在。created 2026-11-12 by Claude Opus 5.5
// 统筹 11-12 裁定（存盘忠实度清点第五节：以前只改这些就关掉 / 新建 / 开别的，改动悄悄没了）。node 那一半 = test/save-faithfulness.test.ts。
// 文件夹图库家（假选夹 = OPFS 子目录，同 probe-autosave-clock）：新建 → 画一笔 → 存干净 → 逐样改：算改过 → 「上次改动」往前拨 31 秒走一拍 → 自动保存写了、干净了 →
//   全部改完刷新页面（开机恢复上次那份）→ 每样的值都还在。另查：换画风（桌面态，契约 §5.7 = 看法）照旧不算改过。
// 用法：python3 -m http.server 8765 后 node test/probes/probe-settings-dirty.mjs [url]
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
const here = path.dirname(fileURLToPath(import.meta.url));
const { chromium } = createRequire(path.join(here, "../../../20260524 WeebPaint/package.json"))("playwright");
const url = process.argv.slice(2).find((a) => a.startsWith("http")) ?? process.env.PROBE_URL ?? "http://127.0.0.1:8765/";
const FOLDER = "settings-dirty";
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
const ctx = await browser.newContext({ viewport: { width: 1000, height: 760 }, deviceScaleFactor: 1 });
await ctx.addInitScript(FAKE_FSA, FOLDER);
const page = await ctx.newPage();
page.on("pageerror", (e) => errs.push("pageerror: " + e.message));
page.on("console", (m) => { if (m.type() === "error" && !BENIGN.test(m.text())) errs.push(`console.error: ${m.text()}`); });
const S = (f, a) => page.evaluate(f, a);
const ready = () => page.waitForFunction(() => globalThis.__catsup?.session && globalThis.__catsup.home);
const reloaded = async (act) => { const nav = page.waitForEvent("load", { timeout: 30000 }); await act(); await nav; await ready(); await page.waitForTimeout(900); };
await page.goto(url, { waitUntil: "load" }); await ready(); await page.waitForTimeout(600);

// 文件夹图库家 + 新建一份 + 画一笔（安家）+ 存干净
void page.evaluate(() => { void globalThis.__catsup.home.openGallery(); });
await page.waitForFunction(() => !document.getElementById("sheet").hidden, null, { timeout: 8000 });
await reloaded(() => page.click(`#sheetChoices button:has-text("选一个文件夹")`));
await S(() => globalThis.__catsup.galleryHost.open());
await page.waitForFunction(() => !document.getElementById("galleryFull").hidden);
await page.click("#galleryNew");
await page.waitForFunction(() => globalThis.__catsup.session.home.kind === "gallery" && document.getElementById("galleryFull").hidden);
await S(() => { const e = globalThis.__catsup.editor, P = (x, y) => ({ x, y, z: 0 }); e.commitOp({ op: "addEdges", at: e.activePool(), segs: [[P(0, 0), P(1, 0)], [P(1, 0), P(1, 1)], [P(1, 1), P(0, 1)], [P(0, 1), P(0, 0)]] }); });
await page.waitForFunction(() => !globalThis.__catsup.session.lazy, null, { timeout: 8000 }).catch(() => {});
check(await S(async () => globalThis.__catsup.session.save()) === true, "新建、画一笔、先存一次（干净）");
const path0 = await S(() => globalThis.__catsup.session.home.path);

/** 改一样 → 算改过 → 拨「上次改动」31 秒走一拍 → 自动保存写了、干净了。 */
async function step(what, act) {
  await S(act);
  const d = await S(() => ({ dirty: globalThis.__catsup.session.dirty(), rev: globalThis.__catsup.editor.docRevision }));
  check(d.dirty, `${what}：算改过`, JSON.stringify(d));
  await S(() => { const s = globalThis.__catsup.session; s.tick(); s.lastEditAt -= 31_000; s.tick(); });
  await page.waitForFunction(() => !globalThis.__catsup.session.saving && !globalThis.__catsup.session.dirty(), null, { timeout: 15000 }).catch(() => {});
  check(!(await S(() => globalThis.__catsup.session.dirty())), `${what}：空闲 30 秒自动保存写了、干净了`);
}
await step("换单位制（公制 → 英制）", () => { const e = globalThis.__catsup.editor; e.setGrid({ system: "imperial", snap: 0.3048 }); });
await step("改吸附长度", () => globalThis.__catsup.editor.setGrid({ snap: 0.0254 }));
await step("关硬表面的吸附", () => globalThis.__catsup.editor.setGrid({ on: false }));
await step("网格住 YZ 面", () => globalThis.__catsup.editor.setGrid({ plane: "yz", shown: true }));
await step("网格不显示", () => globalThis.__catsup.editor.setGrid({ shown: false }));
await step("清空尺度参考", () => globalThis.__catsup.editor.clearScaleRefs());
await step("勾一项尺度参考", () => globalThis.__catsup.editor.toggleScaleRef("interior/ALL"));

// 桌面态照旧是看法：换画风不算改过
await S(() => globalThis.__catsup.session.setView({ style: "paper" }));
check(!(await S(() => globalThis.__catsup.session.dirty())), "换画风（桌面态，契约 §5.7）照旧不算改过");

// 刷新 = 开机恢复上次那份，值都还在
await reloaded(() => page.reload());
const after = await S(() => { const e = globalThis.__catsup.editor, s = globalThis.__catsup.session; return { path: s.home.path, grid: e.docGrid, refs: [...e.scaleRefs], dirty: s.dirty() }; });
check(after.path === path0, "刷新后开的是同一份", `${after.path} vs ${path0}`);
check(after.grid.system === "imperial" && Math.abs(after.grid.snap - 0.0254) < 1e-9 && after.grid.on === false && after.grid.plane === "yz" && after.grid.shown === false, "网格五项都还在（英制 / 1 英寸 / 吸附关 / YZ 面 / 不显示）", JSON.stringify(after.grid));
check(after.refs.join() === "interior/ALL", "尺度参考还在（只勾着室内那一组）", JSON.stringify(after.refs));
check(!after.dirty, "刚打开不算改过");

await browser.close();
if (errs.length) { console.log("页面错误：", errs.slice(0, 6)); process.exitCode = 1; }
console.log(`\nprobe-settings-dirty ${failN || errs.length ? "FAIL" : "OK"}（${pass} ✓ / ${failN} ✗）`);
