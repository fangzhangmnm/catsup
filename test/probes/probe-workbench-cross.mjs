// 工作台下拉换种类 + 物体钮在左上（created 2026-10-28 by Claude Opus 5.5；user 10-28 夜「我希望一进来的那个物体可以变成mesh。而不是需要建立子物体，
// 然后物体属性不在视图那边，可以放在工作流左边」）——
// ① 开机（最外层 = 硬表面体、空的）：下拉里有「自由建模（转成网格体）」；选它 = 不问、直接转、进自由建模 ② 物体钮在左上那一排（工作台下拉后面），右边视图那一列没有它
// ③ 最外层有几何时选它 = 先弹确认；「不转」= 什么都没动；「转」= 转成网格体（6 张面还在）、进自由建模；撤销 = 回硬表面体
// ④ 网格体那一层的下拉里有「硬表面建模（转回硬表面体）」。跑法：python3 -m http.server 8765 后 node test/probes/probe-workbench-cross.mjs
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 1000, height: 800 } });
page.setDefaultTimeout(4000);
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto("http://127.0.0.1:8765/", { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1200);
const state = () => page.evaluate(() => { const e = globalThis.__catsup.editor; return { kind: e.activeKind(), mode: e.modeId, faces: e.layerHasGeometry() ? e.scene.viewOf(e.activePool()).faces().length : 0 }; });
const dropdown = async () => { await page.click("#modeSelect"); await page.waitForTimeout(80); const t = await page.evaluate(() => [...document.querySelectorAll(".popup-menu, .choice-layer, [role=listbox], [role=menu]")].map((x) => x.textContent).join(" | ")); await page.keyboard.press("Escape"); await page.waitForTimeout(60); return t; };
const r = {};
// ①
r.oneItems = await dropdown();
r.oneBefore = await state();
await page.evaluate(() => globalThis.__catsup.pickWorkbench("freeform")); await page.waitForTimeout(150);
r.oneAfter = await state();
r.oneSheet = await page.evaluate(() => !![...document.querySelectorAll("button")].find((x) => x.textContent === "不转" && x.offsetParent));
// ②
r.two = await page.evaluate(() => { const btn = document.querySelector(".gizmo-object"); return { inTopLeft: !!btn?.closest(".hud-topleft"), afterMode: btn?.previousElementSibling?.id === "modeSelect", inWidgets: !!document.querySelector(".gizmo-widgets .gizmo-object") }; });
r.fourItems = await dropdown();
// ③ 新开一个有几何的：撤销回硬表面体最外层，画个盒子
await page.evaluate(async () => { const e = globalThis.__catsup.editor; while (e.canUndo()) e.undo(); e.setMode("geometry");
  const P = (x, y, z = 0) => ({ x, y, z }), B = [[0, 0], [1, 0], [1, 1], [0, 1]], segs = []; for (let i = 0; i < 4; i++) { const a = B[i], d = B[(i + 1) % 4]; segs.push([P(a[0], a[1], 0), P(d[0], d[1], 0)]); segs.push([P(a[0], a[1], 1), P(d[0], d[1], 1)]); segs.push([P(a[0], a[1], 0), P(a[0], a[1], 1)]); }
  e.commitOp({ op: "addEdges", at: e.activePool(), segs }); });
await page.waitForTimeout(80);
r.threeBefore = await state();
const pick = page.evaluate(() => globalThis.__catsup.pickWorkbench("freeform"));
await page.waitForTimeout(200);
r.threeAsked = await page.evaluate(() => /转了再换工作台/.test(document.body.textContent ?? ""));
await page.evaluate(() => [...document.querySelectorAll("button")].find((x) => x.textContent === "不转" && x.offsetParent)?.click()); await pick; await page.waitForTimeout(100);
r.threeCancel = await state();
const pick2 = page.evaluate(() => globalThis.__catsup.pickWorkbench("freeform"));
await page.waitForTimeout(200);
await page.evaluate(() => [...document.querySelectorAll("button")].find((x) => x.textContent === "转" && x.offsetParent)?.click()); await pick2; await page.waitForTimeout(150);
r.threeOk = await state();
await page.evaluate(() => globalThis.__catsup.editor.undo()); await page.waitForTimeout(100);
r.threeUndo = await state();
await b.close();
r.errs = errs;
console.log(JSON.stringify(r, null, 1));
const ok = /自由建模（转成网格体）/.test(r.oneItems) && r.oneBefore.kind === "brep" && r.oneAfter.kind === "mesh" && r.oneAfter.mode === "freeform" && !r.oneSheet
  && r.two.inTopLeft && r.two.afterMode && !r.two.inWidgets && /硬表面建模（转回硬表面体）/.test(r.fourItems)
  && r.threeBefore.kind === "brep" && r.threeBefore.faces === 6 && r.threeAsked && r.threeCancel.kind === "brep" && r.threeCancel.mode === "geometry"
  && r.threeOk.kind === "mesh" && r.threeOk.mode === "freeform" && r.threeOk.faces === 6 && r.threeUndo.kind === "brep" && errs.length === 0;
console.log(ok ? "probe-workbench-cross OK" : "probe-workbench-cross FAIL");
process.exit(ok ? 0 : 1);
