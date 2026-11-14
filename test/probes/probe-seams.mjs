#!/usr/bin/env node
// probe-seams.mjs —— 接缝（施工单二十二第 1 刀，统筹 11-12 定的 A / B）在真 app 里：标、看得见、只在该看的地方看得见、撤得回去。created 2026-11-12 by Claude Opus 5.5
// ① 盒子 → 组件 → 网格体 → 进去（自由建模）：还没有接缝 = 画面上没有接缝色
// ② 选一条边 → 右键「接缝 ›」→「标成接缝」：那条边带上接缝位、一步撤销、提示行说了；画面上出现接缝色
// ③ 换到表面工作台（不画接缝）→ 没有；回自由建模 → 又有；画画工作台 → 有
// ④ 锁上（演示锁 = 只看）→ 没有；解锁 → 又有
// ⑤ 开始画 → 画布小窗里接缝那组线有这条边（在画布上出现几次就几段），没标的照旧粗 / 细
// ⑥ 撤销到标接缝之前 → 位没了、画面上没有接缝色
// ⑦ 什么都不选，物件菜单（工作台下拉左边的「物件」钮）「接缝 ›」→「自动标接缝…」：盒子的 12 条棱补上、补的选中、一步、提示行说理由和片数、撤销回去 ⑧ 没有页面错误
// 接缝色按画布像素数（gl.readPixels 紧跟 editor.draw()，和截图基线同一个读法）：PALETTE.edgeAccent = #f0440f，判 r > 215、40 ≤ g ≤ 110、b < 40（X 轴 / 悬停红 #cc3333 的 b = 51，不算）。
// 用法：python3 -m http.server 8765 后 node test/probes/probe-seams.mjs [url]
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
const here = path.dirname(fileURLToPath(import.meta.url));
const { chromium } = createRequire(path.join(here, "../../../20260524 WeebPaint/package.json"))("playwright");
const url = process.argv.slice(2).find((a) => a.startsWith("http")) ?? process.env.PROBE_URL ?? "http://127.0.0.1:8765/";
let pass = 0, failN = 0;
const check = (ok, what, extra = "") => { if (ok) { pass++; console.log("  ✓", what); } else { failN++; process.exitCode = 1; console.error("  ✗", what, extra ? `  ← ${extra}` : ""); } };
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 900, height: 700 }, deviceScaleFactor: 1 });
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
const S = (f, a) => page.evaluate(f, a);
await page.goto(url, { waitUntil: "load" }); await page.waitForFunction(() => globalThis.__catsup?.editor && globalThis.__catsup.session); await page.waitForTimeout(600);
await S(() => {
  /** 画面上接缝色的像素数。 */
  globalThis.__seamPx = () => {
    const e = globalThis.__catsup.editor; e.draw();
    const c = document.getElementById("board"), gl = c.getContext("webgl2") ?? c.getContext("webgl"), w = c.width, h = c.height, px = new Uint8Array(w * h * 4);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
    let n = 0; for (let i = 0; i < px.length; i += 4) if (px[i] > 215 && px[i + 1] >= 40 && px[i + 1] <= 110 && px[i + 2] < 40) n++;
    return n;
  };
});
const seamPx = () => S(() => globalThis.__seamPx());

console.log("\n① 盒子 → 网格体 → 自由建模；还没有接缝");
const setup = await S(() => {
  const C = globalThis.__catsup, e = C.editor, P = (x, y, z = 0) => ({ x, y, z });
  e.setGrid({ ...e.grid, on: false });
  const B = [[0, 0], [1, 0], [1, 1], [0, 1]], segs = []; for (let i = 0; i < 4; i++) { const a = B[i], d = B[(i + 1) % 4]; segs.push([P(a[0], a[1], 0), P(d[0], d[1], 0)]); segs.push([P(a[0], a[1], 1), P(d[0], d[1], 1)]); segs.push([P(a[0], a[1], 0), P(a[0], a[1], 1)]); }
  e.commitOp({ op: "addEdges", at: e.activePool(), segs }); e.selectAll(); e.runAction("brep.orientOutward", { curvature: 3 }); e.makeComponent("盒"); e.runAction("object.toMesh");
  const Sc = e.sceneRef, inst = [...Sc.def(Sc.root).instances.values()][0];
  e.exitTo(0); e.selectedPools.clear(); e.selectedPools.set(`i${inst.id}`, { kind: "instance", instance: inst.id }); e.enterSelected();
  e.cam.setView("iso"); e.zoomExtents(); e.deselectAll(); e.draw();
  const k = Sc.mesh(inst.def).kernel;
  // 看得见的那条：顶面朝镜头那条边（iso 从 +x −y 那边看过来；挑 z = 1、y = 0 的边）
  const vs = k.edges().flatMap((x) => [k.pt(k.edgeA[x]), k.pt(k.edgeB[x])]), zMax = Math.max(...vs.map((p) => p.z)), yMin = Math.min(...vs.map((p) => p.y)), near = (a, b) => Math.abs(a - b) < 1e-6;
  const edge = k.edges().find((x) => { const a = k.pt(k.edgeA[x]), b = k.pt(k.edgeB[x]); return near(a.z, zMax) && near(b.z, zMax) && near(a.y, yMin) && near(b.y, yMin); });
  return { def: inst.def, edge, mode: e.modeId, seams: k.edges().filter((x) => k.edgeValue(x, "uv_seam") === 1).length };
});
check(setup.mode === "freeform" && typeof setup.edge === "number", "进了网格体、在自由建模", JSON.stringify(setup));
const px0 = await seamPx();
check(px0 === 0, `还没有接缝 = 没有接缝色（${px0}）`);

console.log("\n② 选一条边 → 右键「接缝 ›」→「标成接缝」");
const marked = await S(async ([def, edge]) => {
  const C = globalThis.__catsup, e = C.editor, sleep = (ms) => new Promise((r) => setTimeout(r, ms)), k = e.sceneRef.mesh(def).kernel;
  e.deselectAll(); e.selection.edges.add(edge); e.draw();
  const p0 = e.history.position();
  const c = document.getElementById("board"), r = c.getBoundingClientRect();
  c.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: r.left + 40, clientY: r.top + 40, button: 2 })); await sleep(60);
  const menu = document.querySelector(".popup-menu:not(.choice-layer)"), row = menu?.querySelector('[data-menu-id="submenu:接缝"]');
  if (!row) return { noRow: true, items: [...(menu?.querySelectorAll("[data-menu-id]") ?? [])].map((x) => x.getAttribute("data-menu-id")) };
  row.dispatchEvent(new MouseEvent("click", { bubbles: true })); await sleep(40);
  const it = document.querySelector('.popup-menu.choice-layer [data-choice-id="action:mesh.markSeam"]');
  if (!it) return { noItem: true };
  it.dispatchEvent(new MouseEvent("click", { bubbles: true })); await sleep(60);
  document.querySelectorAll(".popup-menu").forEach((m) => m.remove());
  return { flag: k.edgeValue(edge, "uv_seam") === 1 ? 4 : 0, steps: e.history.position() - p0, hint: document.getElementById("hint")?.textContent ?? "", others: k.edges().filter((x) => x !== edge && k.edgeValue(x, "uv_seam") === 1).length };
}, [setup.def, setup.edge]);
check(!marked.noRow && !marked.noItem, "菜单里有「接缝 ›」→「标成接缝」", JSON.stringify(marked));
check((marked.flag & 4) === 4 && marked.others === 0 && marked.steps === 1, "那条边带上接缝位、别的边没有、一步", JSON.stringify(marked));
check(/接缝/.test(marked.hint), `提示行说了（${marked.hint}）`);
await S(() => globalThis.__catsup.editor.deselectAll());
const px1 = await seamPx();
check(px1 > 20, `画面上出现接缝色（${px1} 个像素）`);

console.log("\n③ 换工作台：表面不画、自由建模画、画画画");
const byMode = {};
for (const m of ["surface", "freeform", "paint", "freeform"]) { await S((m) => globalThis.__catsup.pickWorkbench(m), m); byMode[m] = { mode: await S(() => globalThis.__catsup.editor.modeId), px: await seamPx() }; console.log("   ", m, JSON.stringify(byMode[m])); }
check(byMode.surface.px === 0 && byMode.surface.mode === "surface", "表面工作台：没有接缝色", JSON.stringify(byMode.surface));
check(byMode.paint.px > 20 && byMode.paint.mode === "paint", "画画工作台：有", JSON.stringify(byMode.paint));
check(byMode.freeform.px > 20, "回自由建模：有", JSON.stringify(byMode.freeform));

console.log("\n④ 锁上（只看）→ 没有；解锁 → 又有");
await S(async () => { await globalThis.__catsup.session.setLocked(true); }); await page.waitForTimeout(120);
const pxLocked = await seamPx();
await S(async () => { await globalThis.__catsup.session.setLocked(false); }); await page.waitForTimeout(120);
const pxUnlocked = await seamPx();
check(pxLocked === 0 && pxUnlocked > 20, `锁着 ${pxLocked}、解锁 ${pxUnlocked}`);

console.log("\n⑤ 开始画 → 画布小窗里接缝那组线有这条边");
const win = await S(async ([def, edge]) => {
  const C = globalThis.__catsup, e = C.editor, sleep = (ms) => new Promise((r) => setTimeout(r, ms)), k = e.sceneRef.mesh(def).kernel;
  C.pickWorkbench("paint");
  const faces = k.eFaces(edge), w = e.worldGeom();
  e.selectExpand({ face: w.global(faces[0]) }, 0, "replace"); for (const f of faces.slice(1)) e.selectExpand({ face: w.global(f) }, 0, "add");
  e.runAction("mesh.startPaint", { canvas: 256, arrange: "patches" }); e.deselectAll(); e.draw(); await sleep(40);
  document.querySelector(".gizmo-canvas")?.dispatchEvent(new MouseEvent("click", { bubbles: true })); await sleep(120);
  const cw = C.canvasWin(); if (!cw) return { noWin: true };
  cw.sync?.(); const p = cw.probe(); delete p.screenOf;
  return { open: p.open, seam: p.seam, thin: p.thin, thick: p.thick, faces: p.faces.length, patches: p.patches };
}, [setup.def, setup.edge]);
check(win.open && win.seam === (win.patches === 2 ? 2 : 1), `小窗开着、接缝那组 = 这条边在画布上出现几次就几段（两张面分成两片 = 每片一段；${JSON.stringify(win)}）`);
check(win.faces === 2 && win.thin + win.thick + win.seam === 8 - (win.thin ? 1 : 0), "两张面的别的边照旧粗 / 细（共用的那条只画一次）", JSON.stringify(win));

console.log("\n⑥ 撤销到标接缝之前 → 位没了、画面上没有接缝色");
const un = await S(([def, edge]) => {
  const C = globalThis.__catsup, e = C.editor, k = () => e.sceneRef.mesh(def).kernel;
  for (let i = 0; i < 40 && k().edgeValue(edge, "uv_seam") === 1; i++) e.undo();
  C.pickWorkbench("freeform"); e.deselectAll();
  return { flag: k().edgeValue(edge, "uv_seam") === 1 ? 4 : 0, mode: e.modeId };
}, [setup.def, setup.edge]);
const px2 = await seamPx();
check(un.flag === 0 && px2 === 0, `撤回去了：位 ${un.flag}、接缝色 ${px2}`, JSON.stringify(un));

console.log("\n⑦ 什么都不选，物件菜单「接缝 ›」→「自动标接缝…」：盒子的 12 条棱补上、补的那几条选中、一步、提示行说理由和片数；撤销回去");
const auto = await S(async (def) => {
  const C = globalThis.__catsup, e = C.editor, sleep = (ms) => new Promise((r) => setTimeout(r, ms)), k = () => e.sceneRef.mesh(def).kernel;
  C.pickWorkbench("freeform"); e.deselectAll(); e.draw();
  const p0 = e.history.position();
  document.querySelector(".gizmo-object")?.dispatchEvent(new MouseEvent("click", { bubbles: true })); await sleep(80);   // 工作台下拉左边的「物件」钮 = 这一层的物件菜单（弹出菜单）
  document.querySelector('.popup-menu [data-menu-tab="kind"]')?.dispatchEvent(new MouseEvent("click", { bubbles: true })); await sleep(40);   // 第 1 版第五节第 2 条：修复面板 / 接缝住种类那一页
  const body = document.querySelector(".popup-menu:not(.choice-layer)"), row = body?.querySelector('[data-menu-id="submenu:接缝"]');
  if (!row) return { noRow: true, items: [...(body?.querySelectorAll("[data-menu-id]") ?? [])].map((x) => x.getAttribute("data-menu-id")) };
  row.dispatchEvent(new MouseEvent("click", { bubbles: true })); await sleep(40);
  const it = document.querySelector('.popup-menu.choice-layer [data-choice-id="action:mesh.autoSeams"]');
  if (!it) return { noItem: true, items: [...document.querySelectorAll(".popup-menu.choice-layer [data-choice-id]")].map((x) => x.getAttribute("data-choice-id")) };
  it.dispatchEvent(new MouseEvent("click", { bubbles: true })); await sleep(80);
  document.querySelectorAll(".popup-menu").forEach((m) => m.remove());
  const seams = k().edges().filter((x) => k().edgeValue(x, "uv_seam") === 1), sel = [...e.selection.edges].sort((a, b) => a - b);
  const out = { seams: seams.length, sel: sel.join(","), seamIds: seams.join(","), steps: e.history.position() - p0, hint: document.getElementById("hint")?.textContent ?? "" };
  e.undo(); out.afterUndo = k().edges().filter((x) => k().edgeValue(x, "uv_seam") === 1).length;
  return out;
}, setup.def);
check(!auto.noRow && !auto.noItem, "物件菜单里有「接缝 ›」→「自动标接缝…」（管整个网格体）", JSON.stringify(auto));
check(auto.seams === 12 && auto.sel === auto.seamIds && auto.steps === 1, "12 条棱都补上、补的那几条选中、一步", JSON.stringify(auto));
check(/补了 12 条接缝/.test(auto.hint) && /6 片/.test(auto.hint), `提示行（${auto.hint}）`);
check(auto.afterUndo === 0, "撤销 = 一条都没了");
check(errs.length === 0, "没有页面错误", errs.slice(0, 2).join(" | "));
console.log(`\nprobe-seams ${failN ? "FAIL" : "OK"}（${pass} ✓ / ${failN} ✗）`);
await browser.close();
