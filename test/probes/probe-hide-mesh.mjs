#!/usr/bin/env node
// probe-hide-mesh.mjs —— 自由建模里藏面藏边（统筹 11-13：H = 藏选中的、Shift+H = 藏没选中的、Alt+H = 全部显示；右键也有；a = 全部显示算上网格体；b = 转回硬表面带上藏面；第 6 条 = 画画时藏面落不上）。
// created 2026-11-13 by Claude Opus 5.5。真的编辑器 + 真的键盘 / 鼠标，无头 swiftshader。
// ① 方块网格体选顶面按 H：顶面藏、它的边还挨着露着的面 = 不藏；选区清掉；一步；视图菜单「全部显示（1）」露着
// ② 撤销一步 = 顶面回来；重做 = 又藏
// ③ 选底面按 Shift+H：另外五张面 + 只挨着它们的八条边藏、底面还选着；一步
// ④ Alt+H = 全部放回来；一步
// ⑤ 右键：选着面时「隐藏」「隐藏没选中的」都露着、点了就做；只选了点按 H = 说「点不单独藏」、不长步
// ⑥ 硬表面里：「隐藏没选中的」不露、Shift+H 不做事
// ⑦ b：硬表面藏两张面 → 菜单「转成网格体」→「转回硬表面体」两圈：面数不变、那两张还藏着；Alt+H 放得回来
// ⑧ b：背靠背一藏一露的网格体「转回硬表面体」= 先弹框说带不过去；取消 = 没转；照样转 = 转了、那张露着
// ⑨ 画画：藏起一张画过的面之后，落点（光标下打到哪）从不是它；油漆桶点在它原来的地方、笔拖过它原来的地方 = 它那块的格一格不变（别的面确实画上了）
// 用法：python3 -m http.server 8765 后 node test/probes/probe-hide-mesh.mjs [url]（≈ 25 s）
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
const here = path.dirname(fileURLToPath(import.meta.url));
const { chromium } = createRequire(path.join(here, "../../../20260524 WeebPaint/package.json"))("playwright");
const url = process.argv.slice(2).find((a) => a.startsWith("http")) ?? process.env.PROBE_URL ?? "http://127.0.0.1:8765/";
let pass = 0, failN = 0;
const check = (ok, what, extra = "") => { if (ok) { pass++; console.log("  ✓", what); } else { failN++; process.exitCode = 1; console.error("  ✗", what, extra ? `  ← ${typeof extra === "string" ? extra : JSON.stringify(extra)}` : ""); } };
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 1100, height: 820 }, deviceScaleFactor: 1 });
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
const S = (f, a) => page.evaluate(f, a);
const frames = (n = 3) => S(async (n) => { for (let i = 0; i < n; i++) { globalThis.__catsup.editor.draw(); await new Promise((r) => requestAnimationFrame(r)); } }, n);
await page.goto(url, { waitUntil: "load" }); await page.waitForFunction(() => globalThis.__catsup?.editor); await page.waitForTimeout(600);

// 场景：一个方块网格体组件（硬表面画的方块 → 转网格体），进去、拿选择工具
const def = await S(async () => {
  const C = globalThis.__catsup, e = C.editor, P = (x, y, z = 0) => ({ x, y, z }), sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  e.setGrid({ ...e.grid, on: false });
  const B = [[0, 0], [1, 0], [1, 1], [0, 1]], segs = [];
  for (let i = 0; i < 4; i++) { const a = B[i], d = B[(i + 1) % 4]; segs.push([P(a[0], a[1], 0), P(d[0], d[1], 0)]); segs.push([P(a[0], a[1], 1), P(d[0], d[1], 1)]); segs.push([P(a[0], a[1], 0), P(a[0], a[1], 1)]); }
  e.commitOp({ op: "addEdges", at: e.activePool(), segs }); e.selectAll(); e.runAction("brep.orientOutward", { curvature: 3 }); e.makeComponent("块"); e.runAction("object.toMesh");
  const S0 = e.sceneRef, inst = [...S0.def(S0.root).instances.values()][0];
  e.exitTo(0); e.selectedPools.clear(); e.selectedPools.set(`i${inst.id}`, { kind: "instance", instance: inst.id }); e.enterSelected(); await sleep(20); C.hud.pick("select");
  e.cam.setView("iso"); e.zoomExtents(); e.draw();
  return inst.def;
});
await frames(2);
const st = () => S((def) => {
  const e = globalThis.__catsup.editor, m = e.sceneRef.mesh(def).kernel, fc = m.column("hide_poly"), ec = m.column("hide_edge");
  return { hf: fc ? m.faces().filter((f) => fc.data[f] === 1).length : 0, he: ec ? m.edges().filter((x) => ec.data[x] === 1).length : 0, selF: e.selection.faces.size, selE: e.selection.edges.size, steps: e.history.steps(), hint: document.getElementById("hint")?.textContent ?? "", count: e.hiddenCount(), mode: e.modeId,
    rows: globalThis.__catsup.hud.edits().filter((x) => !x.hidden).map((x) => `${x.id}:${x.label}`) };
}, def);
const pickFace = (which) => S(([def, which]) => {
  const e = globalThis.__catsup.editor, m = e.sceneRef.mesh(def).kernel, z = (f) => m.faceVerts(f).reduce((s, v) => s + m.pt(v).z, 0) / m.faceVerts(f).length;
  const f = m.faces().reduce((a, b) => ((which === "top" ? z(b) > z(a) : z(b) < z(a)) ? b : a));
  e.deselectAll(); e.selection.faces.add(f); e.draw(); return f;
}, [def, which]);

console.log("自由建模：H / Shift+H / Alt+H");
const s0 = await st();
check(s0.mode === "freeform", "进了网格体 = 自由建模工作台", s0.mode);
await pickFace("top"); let a = await st(); const steps0 = a.steps;
await page.keyboard.press("h"); await frames(2);
let b = await st();
check(b.hf === 1 && b.he === 0, "① H：顶面藏、它的四条边还挨着露着的面 = 不藏", b);
check(b.selF === 0 && b.steps === steps0 + 1 && /藏起来了/.test(b.hint), "① 选区清掉、一步、提示行说藏起来了", b);
check(b.rows.includes("unhideAll:全部显示（1）") && b.count.faces === 1, "a：视图菜单「全部显示（1）」把网格体的藏面算上了", b.rows);
await S(() => globalThis.__catsup.editor.undo()); await frames(1); const u = await st();
await S(() => globalThis.__catsup.editor.redo()); await frames(1); const r = await st();
check(u.hf === 0 && r.hf === 1, "② 撤销一步 = 顶面回来；重做 = 又藏", { undo: u.hf, redo: r.hf });

await page.keyboard.press("Alt+h"); await frames(1);
await pickFace("bottom"); a = await st();
await page.keyboard.press("Shift+H"); await frames(2);
b = await st();
check(b.hf === 5 && b.he === 8, "③ Shift+H：另外五张面 + 只挨着它们的八条边藏", b);
check(b.selF === 1 && b.steps === a.steps + 1 && /藏起没选中的/.test(b.hint), "③ 底面还选着、一步、提示行说了", b);
await page.keyboard.press("Alt+h"); await frames(1);
const c = await st();
check(c.hf === 0 && c.he === 0 && c.steps === b.steps + 1 && JSON.stringify(c.count) === JSON.stringify({ instances: 0, faces: 0, edges: 0 }), "④ Alt+H = 全部放回来、一步", c);

console.log("右键菜单；只选了点");
await pickFace("top"); a = await st();
check(a.rows.some((x) => x.startsWith("hideGeometry:")) && a.rows.some((x) => x.startsWith("hideOthers:")), "⑤ 选着面：右键「隐藏」「隐藏没选中的」都露着（不是只有键盘能用）", a.rows);
await S(() => globalThis.__catsup.hud.pick("hideOthers")); await frames(1); b = await st();
await S(() => globalThis.__catsup.hud.pick("unhideAll")); await frames(1); const b2 = await st();
await pickFace("top"); await S(() => globalThis.__catsup.hud.pick("hideGeometry")); await frames(1); const b3 = await st();
check(b.hf === 5 && b2.hf === 0 && b3.hf === 1, "⑤ 点「隐藏没选中的」= 五张；「全部显示」= 0；点「隐藏」= 一张", { others: b.hf, all: b2.hf, one: b3.hf });
await S(() => globalThis.__catsup.hud.pick("unhideAll")); await frames(1);
await S((def) => { const e = globalThis.__catsup.editor, m = e.sceneRef.mesh(def).kernel; e.deselectAll(); e.selection.verts.add(m.verts()[0]); e.draw(); }, def);
a = await st(); await page.keyboard.press("h"); await frames(1); b = await st();
check(b.steps === a.steps && b.hf === 0 && /点不单独藏/.test(b.hint), "⑤ 只选了点按 H = 说「点不单独藏」、什么都没藏、不长步", b);

console.log("硬表面里");
const hard = await S(async () => {
  const C = globalThis.__catsup, e = C.editor; e.exitTo(0); await new Promise((r) => setTimeout(r, 20)); C.hud.pick("select");
  const k = e.kernel, f = k.faces()[0]; e.deselectAll(); if (f) e.selection.faces.add(f.id); e.draw();
  return { mode: e.modeId, rows: C.hud.edits().filter((x) => !x.hidden).map((x) => x.id), steps: e.history.steps(), faces: k.faces().length };
});
await page.keyboard.press("Shift+H"); await frames(1);
const hard2 = await S(() => ({ steps: globalThis.__catsup.editor.history.steps() }));
check(hard.mode === "geometry" && !hard.rows.includes("hideOthers") && hard2.steps === hard.steps, "⑥ 硬表面里「隐藏没选中的」不露、Shift+H 不做事", { hard, hard2 });

console.log("b：转换来回带上藏面");
const conv = await S(async () => {
  const C = globalThis.__catsup, e = C.editor, P = (x, y, z = 0) => ({ x, y, z }), sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const B = [[3, 0], [4, 0], [4, 1], [3, 1]], segs = [];
  for (let i = 0; i < 4; i++) { const a = B[i], d = B[(i + 1) % 4]; segs.push([P(a[0], a[1], 0), P(d[0], d[1], 0)]); segs.push([P(a[0], a[1], 1), P(d[0], d[1], 1)]); segs.push([P(a[0], a[1], 0), P(a[0], a[1], 1)]); }
  e.exitTo(0); e.deselectAll(); e.commitOp({ op: "addEdges", at: e.activePool(), segs }); e.selectAll(); e.selectedPools.clear(); e.runAction("brep.orientOutward", { curvature: 3 }); e.makeComponent("盒");
  const S0 = () => e.sceneRef, insts = () => [...S0().def(S0().root).instances.values()], inst = insts().find((i) => S0().def(i.def).name === "盒");
  const pickInst = () => { e.exitTo(0); e.deselectAll(); e.selectedPools.set(`i${inst.id}`, { kind: "instance", instance: inst.id }); };
  pickInst(); e.enterSelected(); await sleep(10);
  const k = e.kernel, two = k.faces().slice(1, 3).map((f) => f.id); e.deselectAll(); for (const f of two) e.selection.faces.add(f); e.hideSelection();
  const st = () => { const d = S0().def(inst.def); if (d.body.kind !== "brep") return { kind: d.body.kind }; const kk = d.body.kernel; return { kind: "brep", faces: kk.faces().length, hidden: kk.faces().filter((f) => kk.isFaceHidden(f.id)).length }; };
  const out = { before: st(), rounds: [] };
  for (let i = 0; i < 2; i++) { pickInst(); e.runAction("object.toMesh"); await sleep(10); const mid = S0().mesh(inst.def).kernel, fc = mid.column("hide_poly"); pickInst(); e.runAction("object.toBrep"); await sleep(10); out.rounds.push({ meshHidden: fc ? mid.faces().filter((f) => fc.data[f] === 1).length : 0, ...st() }); }
  out.sheetSeen = !document.getElementById("sheetConfirm")?.closest("[hidden]");
  e.unhideAll(); out.after = st();
  return out;
});
check(conv.before.kind === "brep" && conv.before.hidden === 2, "⑦ 硬表面藏了两张面", conv.before);
check(conv.rounds.every((x) => x.kind === "brep" && x.faces === conv.before.faces && x.hidden === 2 && x.meshHidden === 2), "⑦ 两圈（转成网格体 → 转回硬表面体）：网格体里也藏着两张；回来面数不变、那两张还藏着", conv.rounds);
check(!conv.sheetSeen, "⑦ 带得过去 = 不弹框");
check(conv.after.hidden === 0 && conv.after.faces === conv.before.faces, "⑦ Alt+H（全部显示）放得回来", conv.after);

const twinSetup = await S(async () => {
  const C = globalThis.__catsup, e = C.editor, S0 = e.sceneRef, inst = [...S0.def(S0.root).instances.values()].find((i) => S0.def(i.def).name === "块");
  e.exitTo(0); e.deselectAll(); e.selectedPools.set(`i${inst.id}`, { kind: "instance", instance: inst.id }); e.enterSelected(); await new Promise((r) => setTimeout(r, 10));
  const m = S0.mesh(inst.def).kernel, top = m.faces().reduce((a, b) => (m.faceVerts(b).reduce((s, v) => s + m.pt(v).z, 0) > m.faceVerts(a).reduce((s, v) => s + m.pt(v).z, 0) ? b : a));
  const fs0 = new Set(m.faces());
  e.commitOp({ op: "meshDuplicate", def: inst.def, faces: [top] });   // 原地复制一张（自己的点）
  const twin = m.faces().find((f) => !fs0.has(f));
  e.commitOp({ op: "meshFlip", def: inst.def, faces: [twin] });   // 翻过来 = 背靠背的第二张（朝里）
  e.commitOp({ op: "setHidden", at: { def: inst.def, group: null }, meshFaces: [top], on: true });   // 朝外那张藏起来、朝里那张露着
  e.exitTo(0); e.deselectAll(); e.selectedPools.set(`i${inst.id}`, { kind: "instance", instance: inst.id });
  e.runAction("object.toBrep");
  await new Promise((r) => setTimeout(r, 60));
  const ok = document.getElementById("sheetConfirm"), msg = document.getElementById("sheetMessage")?.textContent ?? "";
  return { inst: inst.id, def: inst.def, shown: !!ok && !ok.closest("[hidden]"), msg, kind: S0.kindOf(inst.def) };
});
check(twinSetup.shown && /带不过去|会露出来/.test(twinSetup.msg + (await S(() => document.getElementById("sheetTitle")?.textContent ?? ""))) && /藏着的面 1 张/.test(twinSetup.msg), "⑧ 背靠背一藏一露：转之前弹框、说 1 张藏着的面会露出来", twinSetup);
await S(() => document.getElementById("sheetCancel")?.click()); await frames(1);
const afterCancel = await S((def) => globalThis.__catsup.editor.sceneRef.kindOf(def), twinSetup.def);
check(afterCancel === "mesh", "⑧ 取消 = 没转（还是网格体）", afterCancel);
await S((id) => { const e = globalThis.__catsup.editor; e.exitTo(0); e.deselectAll(); e.selectedPools.set(`i${id}`, { kind: "instance", instance: id }); e.runAction("object.toBrep"); }, twinSetup.inst);
await page.waitForTimeout(60); await S(() => document.getElementById("sheetConfirm")?.click()); await page.waitForTimeout(150);
const twinDone = await S((def) => { const S0 = globalThis.__catsup.editor.sceneRef; if (S0.kindOf(def) !== "brep") return { kind: S0.kindOf(def) }; const k = S0.brep(def).kernel; return { kind: "brep", faces: k.faces().length, hidden: k.faces().filter((f) => k.isFaceHidden(f.id)).length }; }, twinSetup.def);
check(twinDone.kind === "brep" && twinDone.hidden === 0, "⑧ 照样转 = 转了、合成的那张膜露着（框里说的就是这个）", twinDone);

console.log("画画：藏着的面落不上");
const paint = await S(async () => {
  const C = globalThis.__catsup, e = C.editor, P = (x, y, z = 0) => ({ x, y, z }), g = () => crypto.randomUUID(), sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const B = [[6, 0], [7, 0], [7, 1], [6, 1]], segs = [];
  for (let i = 0; i < 4; i++) { const a = B[i], d = B[(i + 1) % 4]; segs.push([P(a[0], a[1], 0), P(d[0], d[1], 0)]); segs.push([P(a[0], a[1], 1), P(d[0], d[1], 1)]); segs.push([P(a[0], a[1], 0), P(a[0], a[1], 1)]); }
  e.exitTo(0); e.deselectAll(); e.commitOp({ op: "addEdges", at: e.activePool(), segs }); e.selectAll(); e.selectedPools.clear(); e.runAction("brep.orientOutward", { curvature: 3 }); e.makeComponent("画盒"); e.runAction("object.toMesh");
  const S0 = e.sceneRef, inst = [...S0.def(S0.root).instances.values()].find((i) => S0.def(i.def).name === "画盒");
  e.exitTo(0); e.selectedPools.clear(); e.selectedPools.set(`i${inst.id}`, { kind: "instance", instance: inst.id }); e.enterSelected(); await sleep(10);
  const k = S0.mesh(inst.def).kernel, tex = g();
  e.commitOp({ op: "startPaint", def: inst.def, faces: k.faces(), uvSet: g(), textureGuid: tex, materialGuid: g(), names: { uvSet: "UV", paint: "画", material: "画" }, color: [0.3, 0.5, 0.7], canvas: 256 });
  C.paint.ensure(tex); C.pickWorkbench("paint");
  e.cam.setView("iso"); e.zoomExtents(); e.draw();
  return { tex, def: inst.def };
});
await page.waitForFunction((t) => globalThis.__catsup.paint.state(t) === "hot", paint.tex, { timeout: 15000 });
await frames(4);
const board = await page.locator("#board").boundingBox();
const spots = await S((tex) => {
  const C = globalThis.__catsup, vp = C.editor.vp(), got = new Map();
  for (let y = 10; y < vp.h; y += 10) for (let x = 10; x < vp.w; x += 10) { const h = C.paint.cellAt(tex, x, y); if (h && h.cell) { if (!got.has(h.face)) got.set(h.face, []); got.get(h.face).push([x, y]); } }
  const out = {};
  for (const [f, ps] of got) { if (ps.length < 20) continue; const mx = ps.reduce((s, p) => s + p[0], 0) / ps.length, my = ps.reduce((s, p) => s + p[1], 0) / ps.length; out[f] = { at: ps.reduce((a, b) => (Math.hypot(b[0] - mx, b[1] - my) < Math.hypot(a[0] - mx, a[1] - my) ? b : a)), all: ps }; }
  return out;
}, paint.tex);
const faces = Object.keys(spots).map(Number).sort((x, y) => spots[y].all.length - spots[x].all.length);
const X = faces[0], others = faces.slice(1, 3);   // 屏幕上露得最多的那张 = 要藏的
const tableOf = () => S((tex) => { globalThis.__catsup.paint.prep.ensure(tex); const t = globalThis.__catsup.paint.prep.take(tex).geo.table; return { owner: Array.from(t.owner), polyOf: Object.fromEntries([...t.faces].map(([f, fp]) => [f, fp.poly])) }; }, paint.tex);
const bytes = () => S((tex) => Array.from(globalThis.__catsup.paint.boards.get(tex).composeBytes()), paint.tex);
await S(([def, X]) => { const e = globalThis.__catsup.editor; e.commitOp({ op: "setHidden", at: { def, group: null }, meshFaces: [X], on: true }); e.draw(); }, [paint.def, X]);
await page.waitForFunction((t) => globalThis.__catsup.paint.state(t) === "hot", paint.tex, { timeout: 15000 });
await frames(4);
const hitsX = await S(([tex, pts, X]) => pts.filter(([x, y]) => globalThis.__catsup.paint.cellAt(tex, x, y)?.face === X).length, [paint.tex, spots[X].all, X]);
check(hitsX === 0, `⑨ 藏起来之后，它原来露着的 ${spots[X].all.length} 个屏幕点上落点一次都不是它`, hitsX);
const T = await tableOf(), mine = new Set(T.owner.map((p, i) => (p === T.polyOf[X] ? i : -1)).filter((i) => i >= 0));
const changedIn = (a, bb) => { let inX = 0, out = 0; for (let c = 0; c < a.length / 4; c++) { const i = 4 * c; if (a[i] !== bb[i] || a[i + 1] !== bb[i + 1] || a[i + 2] !== bb[i + 2] || a[i + 3] !== bb[i + 3]) { if (mine.has(c)) inX++; else out++; } } return { inX, out }; };
check(mine.size > 0, "⑨ 藏着的面在归属表里照样占着它那块（格数 > 0）", mine.size);
const P = (p) => ({ x: board.x + p[0], y: board.y + p[1] });
await S(() => { const C = globalThis.__catsup; C.editor.setTool("paintBucket"); C.paint.color.set([1, 0, 0]); }); await frames(1);
let b0 = await bytes();
await page.mouse.move(P(spots[X].at).x, P(spots[X].at).y); await page.mouse.down(); await page.mouse.up(); await frames(4);
let b1 = await bytes(), d = changedIn(b0, b1);
check(d.inX === 0, "⑨ 油漆桶点在它原来的地方：它那块的格一格不变（射线穿过去打到后面那张）", d);
await S(() => { const C = globalThis.__catsup; C.editor.setTool("paintPen"); C.editor.config.set("paintPen", "size", 40); C.paint.color.set([0, 1, 0]); }); await frames(1);
b0 = await bytes();
const path3 = [spots[others[0]].at, spots[X].at, spots[others[1]].at];
await page.mouse.move(P(path3[0]).x, P(path3[0]).y); await page.mouse.down();
for (const q of path3.slice(1)) { await page.mouse.move(P(q).x, P(q).y, { steps: 16 }); await frames(1); }
await page.mouse.up(); await frames(6);
b1 = await bytes(); d = changedIn(b0, b1);
check(d.inX === 0 && d.out > 0, "⑨ 笔拖过它原来的地方：它那块的格一格不变、别的面画上了", d);

check(errs.length === 0, "没有脚本错误", errs.join(" | "));
await browser.close();
console.log(`\n${pass} ✓  ${failN} ✗`);
