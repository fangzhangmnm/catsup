#!/usr/bin/env node
// probe-tiled-paint.mjs —— 平铺的画（施工单二十一第 3 刀，CATSUP_textures 1.2）。created 2026-11-12 by Claude Opus 5.5
// 真的编辑器 + 真的小窗 + 真的存盘（文件夹当家、OPFS）；无头 swiftshader。
// ① 一张画都没有的网格体、画画工作台：小窗按钮在；新建平铺的画（调试钩子 = 「…」里那一项建的那一半）= 一步；小窗切过去、先变热、大小 = 选的像素
// ② 小窗里画一笔：图层变了、一步
// ③ 涂到面上：渲染器拿到的是带平铺标记的活的图，显示图重复平铺（GL 的 WRAP = REPEAT）；铺在坐标上的画的显示图照旧夹边（对照）
// ④ 模型上拿笔落到这些面上：不画、说原因（「平铺的画只在画布小窗里画」）、不长步、图层不动
// ⑤ 撤三步（涂面、画、新建）：画回到空白、平铺的画没了、小窗切走；重做三步：回来、图层和撤之前逐字节一样
// ⑥ 存盘 → 重新打开：还是平铺的画；冷的显示合成图（带平铺标记）；小窗里切过去 = 变热、图层和存之前逐字节一样；另一张一笔没画就存的，再打开画得上
// ⑦ 锁着：新建不建、小窗里画不上（图层不动、不长步）
// 用法：python3 -m http.server 8765 后 node test/probes/probe-tiled-paint.mjs [url]
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
const here = path.dirname(fileURLToPath(import.meta.url));
const { chromium } = createRequire(path.join(here, "../../../20260524 WeebPaint/package.json"))("playwright");
const url = process.argv.slice(2).find((a) => a.startsWith("http")) ?? process.env.PROBE_URL ?? "http://127.0.0.1:8765/";
const BENIGN = /注入的毛病|Not signed in|CloudNetworkError|Failed to fetch|net::ERR|msal|favicon|GPU stall due to ReadPixels|not persisted yet/i;
let pass = 0, failN = 0;
const check = (ok, what, extra = "") => { if (ok) { pass++; console.log("  ✓", what); } else { failN++; process.exitCode = 1; console.error("  ✗", what, extra ? `  ← ${extra}` : ""); } };
/** 假的「选一个文件夹」：OPFS 下的一个子目录（照 probe-paint-save）。 */
const FAKE_FSA = (folder) => {
  window.showDirectoryPicker = async () => (await navigator.storage.getDirectory()).getDirectoryHandle(folder, { create: true });
  const P = globalThis.FileSystemHandle?.prototype;
  if (P) { P.queryPermission = async () => "granted"; P.requestPermission = async () => "granted"; }
};
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const ctx = await browser.newContext({ viewport: { width: 1100, height: 820 }, deviceScaleFactor: 1 });
await ctx.addInitScript(FAKE_FSA, "tiled-paint");
const page = await ctx.newPage();
const errs = [];
page.on("pageerror", (e) => errs.push("pageerror: " + e.message));
page.on("console", (m) => { if (m.type() === "error" && !BENIGN.test(m.text())) errs.push(`console.error: ${m.text()}`); });
const S = (f, a) => page.evaluate(f, a);
const frames = (n = 3) => S(async (n) => { for (let i = 0; i < n; i++) { globalThis.__catsup.editor.draw(); await new Promise((r) => requestAnimationFrame(r)); } }, n);
const ready = () => page.waitForFunction(() => globalThis.__catsup?.session && globalThis.__catsup.home);
const reloaded = async (act) => { const nav = page.waitForEvent("load", { timeout: 30000 }); await act(); await nav; await ready(); await page.waitForTimeout(900); };
await page.goto(url, { waitUntil: "load" }); await ready(); await page.waitForTimeout(600);
// 选夹当家 → 图库新建一份（照 probe-paint-save）
void page.evaluate(() => { void globalThis.__catsup.home.openGallery(); });
await page.waitForFunction(() => !document.getElementById("sheet").hidden, null, { timeout: 8000 });
await reloaded(() => page.click(`#sheetChoices button:has-text("选一个文件夹")`));
await page.evaluate(() => globalThis.__catsup.galleryHost.open());
await page.waitForFunction(() => !document.getElementById("galleryFull").hidden);
await page.click("#galleryNew");
await page.waitForFunction(() => globalThis.__catsup.session.home.kind === "gallery" && document.getElementById("galleryFull").hidden);
await page.evaluate(() => { for (const n of [...document.querySelectorAll("#noticeStack > *")]) n.remove(); });

// 盒子 → 组件 → 网格体 → 进去（不开始画：一张画都没有）→ 画画工作台、笔
const def = await S(async () => {
  const C = globalThis.__catsup, e = C.editor, P = (x, y, z = 0) => ({ x, y, z }), sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  e.setGrid({ ...e.grid, on: false });
  const B = [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]], segs = [];
  for (let i = 0; i < 4; i++) { const a = B[i], d = B[(i + 1) % 4]; segs.push([P(a[0], a[1], 0), P(d[0], d[1], 0)]); segs.push([P(a[0], a[1], 1), P(d[0], d[1], 1)]); segs.push([P(a[0], a[1], 0), P(a[0], a[1], 1)]); }
  e.commitOp({ op: "addEdges", at: e.activePool(), segs }); e.selectAll(); e.runAction("brep.orientOutward", { curvature: 3 }); e.makeComponent("块"); e.runAction("object.toMesh"); await sleep(10);
  const Sc = e.sceneRef, inst = [...Sc.def(Sc.root).instances.values()][0];
  e.selectedPools.clear(); e.selectedPools.set(`i${inst.id}`, { kind: "instance", instance: inst.id }); e.enterSelected(); await sleep(10);
  C.pickWorkbench("paint"); e.setTool("paintPen"); e.cam.setView("iso"); e.zoomExtents(); e.draw();
  return inst.def;
});
await frames(3);
const pos = () => S(() => globalThis.__catsup.editor.history.position());
const hint = () => S(() => document.getElementById("hint")?.textContent ?? "");
const W = () => S(() => { const p = globalThis.__catsup.canvasWin()?.probe(); if (p) delete p.screenOf; return p ?? null; });
/** 这张画的图层（画板导出的每一层像素）的哈希。 */
const H = (t) => S((t) => { const b = globalThis.__catsup.paint.boards.get(t); if (!b) return null; const d = b.wp.exportData(), h = (u) => { let x = 2166136261; for (let i = 0; i < u.length; i++) { x ^= u[i]; x = Math.imul(x, 16777619); } return (x >>> 0).toString(16); }; return d.nodes.map((n) => (n.pixels ? h(n.pixels) : "·")).join(",") + `@${d.width}x${d.height}`; }, t);
const at = (x, y) => S(([x, y]) => globalThis.__catsup.canvasWin().probe().screenOf(x, y), [x, y]);
const pe = (type, p, o = {}) => S(([type, p, o]) => { const cv = document.querySelector(".canvas-win-view canvas"); cv.dispatchEvent(new PointerEvent(type, { pointerId: o.id ?? 7, pointerType: o.type ?? "pen", clientX: p.x, clientY: p.y, button: 0, buttons: type === "pointerup" ? 0 : 1, pressure: 0.6, bubbles: true, cancelable: true })); }, [type, p, o]);
/** 小窗里一笔（格坐标的一条线）。 */
const line = async (y, x0, x1) => {
  await pe("pointerdown", await at(x0, y)); await frames(1);
  for (let i = 1; i <= 12; i++) { await pe("pointermove", await at(x0 + ((x1 - x0) * i) / 12, y)); await frames(1); }
  await pe("pointerup", await at(x1, y)); await frames(2);
};
/** 渲染器里这张画的显示图：带不带平铺标记、GL 的 WRAP_S 是不是 REPEAT（读完把绑定还回去）。 */
const wrapOf = (t) => S((t) => {
  const C = globalThis.__catsup, img = C.paint.boards.board(t)?.image, R3 = C.editor.renderer3, live = R3.live, e = live?.entries?.get(img);
  if (!img || !e?.disp) return { tile: img?.tile ?? null, wrap: null };
  const gl = R3.renderer.getContext(); gl.bindTexture(gl.TEXTURE_2D, e.disp); const w = gl.getTexParameter(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S); gl.bindTexture(gl.TEXTURE_2D, null); R3.renderer.resetState();
  return { tile: !!img.tile, wrap: w === gl.REPEAT ? "repeat" : w === gl.CLAMP_TO_EDGE ? "clamp" : String(w) };
}, t);

console.log("\n① 新建平铺的画：小窗按钮在（一张画都没有）；一步；小窗切过去、变热、大小 = 选的像素");
check(await S(() => !document.querySelector(".gizmo-canvas").hidden), "画画工作台里、一张画都没有：小窗按钮在");
const p0 = await pos();
const tex = await S(() => globalThis.__catsup.paint.newTiled(32, 0.5));
check(typeof tex === "string" && (await pos()) === p0 + 1, "新建 = 一步", JSON.stringify({ tex, steps: (await pos()) - p0 }));
const row = await S((t) => { const Sc = globalThis.__catsup.editor.sceneRef, r = Sc.textures.get(t), m = Sc.materials.find((x) => Sc.tiledPaintOf(x)?.textureDoc.guid === t); return r ? { kind: r.content.kind, ora: r.content.ora?.length ?? 0, sizeM: r.sizeM, layout: r.layout ?? null, mat: m?.name ?? null } : null; }, tex);
check(row?.kind === "layered" && row.ora > 0 && JSON.stringify(row.sizeM) === "[0.5,0.5]" && row.layout === null && !!row.mat, "贴图行 = 分层（出生就带字节）+ sizeM、没有 layout；有材质指着它", JSON.stringify(row));
await page.waitForFunction((t) => globalThis.__catsup.paint.state(t) === "hot", tex, { timeout: 15000 });
await frames(3);
const w1 = await W();
check(w1?.open && w1.tiled === tex && w1.width === 32 && w1.height === 32, "小窗开着、显示这张平铺的画、变热了、32 × 32", JSON.stringify(w1 && { open: w1.open, tiled: w1.tiled, w: w1.width, h: w1.height }));

console.log("\n② 小窗里画一笔：图层变了、一步");
const L0 = await H(tex), p1 = await pos();
await line(12, 3, 28);
const L1 = await H(tex);
check(L1 !== L0 && (await pos()) === p1 + 1, "画上了、一步", JSON.stringify({ steps: (await pos()) - p1, changed: L1 !== L0, hint: await hint() }));

console.log("\n③ 涂到面上：渲染器拿到带平铺标记的活的图、显示图重复平铺");
const p2 = await pos();
await S((def) => { const C = globalThis.__catsup, e = C.editor, Sc = e.sceneRef, mi = Sc.materials.findIndex((m) => Sc.tiledPaintOf(m)), k = Sc.mesh(def).kernel; e.commitOp({ op: "meshPaintFaces", def, faces: k.faces(), material: mi }); }, def);
await frames(4);
check((await pos()) === p2 + 1, "涂面 = 一步");
const wr = await wrapOf(tex);
check(wr.tile === true && wr.wrap === "repeat", "活的图带平铺标记、显示图 WRAP = REPEAT", JSON.stringify(wr));

console.log("\n④ 模型上拿笔落到这些面上：不画、说原因、不长步");
const p3 = await pos(), L3 = await H(tex);
await S(() => { const c = document.getElementById("board"), r = c.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2, ev = (type, dx) => c.dispatchEvent(new PointerEvent(type, { pointerId: 9, pointerType: "pen", clientX: x + dx, clientY: y, button: 0, buttons: type === "pointerup" ? 0 : 1, pressure: 0.6, bubbles: true, cancelable: true })); ev("pointerdown", 0); ev("pointermove", 6); ev("pointermove", 12); ev("pointerup", 12); });
await frames(3);
const h4 = await hint();
check(/平铺的画/.test(h4) && /只在画布小窗里画/.test(h4) && (await pos()) === p3 && (await H(tex)) === L3, "不画、提示行说原因、不长步、图层不动", JSON.stringify({ hint: h4, steps: (await pos()) - p3 }));

console.log("\n⑤ 撤三步、重做三步");
await S(() => { const e = globalThis.__catsup.editor; e.undo(); e.undo(); }); await frames(3);
check((await H(tex)) === L0, "撤两步（涂面、画）：画回到空白");
await S(() => globalThis.__catsup.editor.undo()); await frames(3);
const gone = await S((t) => !globalThis.__catsup.editor.sceneRef.textures.has(t), tex), w5 = await W();
check(gone && w5?.tiled === null, "再撤一步（新建）：平铺的画没了、小窗切走", JSON.stringify({ gone, tiled: w5?.tiled }));
await S(() => { const e = globalThis.__catsup.editor; e.redo(); e.redo(); e.redo(); }); await frames(4);
check(await S((t) => globalThis.__catsup.editor.sceneRef.textures.has(t), tex) && (await H(tex)) === L1, "重做三步：回来了、图层和撤之前逐字节一样");

console.log("\n⑥ 存盘 → 重新打开：还是平铺的画；冷的显示带平铺标记的合成图；小窗里切过去 = 变热、图层一样");
const tex2 = await S(() => globalThis.__catsup.paint.newTiled(16, 1));   // 第二张：一笔都不画就存（守空白分层字节：以前那一层没有 id，再打开画不上）
check(typeof tex2 === "string", "又建了一张（一笔不画）");
check(await S(async () => globalThis.__catsup.session.save()) === true && await S(() => !globalThis.__catsup.session.dirty()), "存上了、不脏");
await reloaded(() => page.reload());
await frames(4);
const r6 = await S((t) => { const C = globalThis.__catsup, Sc = C.editor.sceneRef, m = Sc.materials.find((x) => Sc.tiledPaintOf(x)?.textureDoc.guid === t), sh = C.paint.boards.board(t); return { tiled: !!m, state: C.paint.state(t), coldTile: sh && sh.image && "paint" in sh.image ? !!sh.image.paint?.tile : null }; }, tex);
check(r6.tiled && r6.state === "cold" && r6.coldTile === true, "读回来还是平铺的画；冷的；显示的合成图带平铺标记", JSON.stringify(r6));
await S((t) => { document.querySelector(".gizmo-canvas").click(); globalThis.__catsup.canvasWin().showTiled(t); }, tex);
await page.waitForFunction((t) => globalThis.__catsup.paint.state(t) === "hot", tex, { timeout: 15000 });
await frames(3);
check((await H(tex)) === L1 && (await W())?.tiled === tex, "小窗里切过去 = 变热；图层和存之前逐字节一样");

const tool6 = await S(async () => { const C = globalThis.__catsup, e = C.editor, Sc = e.sceneRef, inst = [...Sc.def(Sc.root).instances.values()][0]; if (Sc.defOfContext(e.context) === Sc.root) { e.selectedPools.clear(); e.selectedPools.set(`i${inst.id}`, { kind: "instance", instance: inst.id }); e.enterSelected(); } C.pickWorkbench("paint"); e.setTool("paintPen"); return e.tool; });   // 重新打开后回到画画工作台、拿笔
check(tool6 === "paintPen", "重新打开后回到画画工作台、手上是笔", String(tool6));
await S((t) => globalThis.__catsup.canvasWin().showTiled(t), tex2);
await page.waitForFunction((t) => globalThis.__catsup.paint.state(t) === "hot", tex2, { timeout: 15000 });
await frames(3);
const L6a = await H(tex2), p6 = await pos();
await line(8, 2, 14);
check((await H(tex2)) !== L6a && (await pos()) === p6 + 1, "一笔没画就存的那张：重新打开后切过去画得上（空白分层字节的图层号是好的）", JSON.stringify({ hint: await hint() }));

console.log("\n⑦ 锁着：新建不建、小窗里画不上");
await S(async () => { await globalThis.__catsup.session.setLocked(true); globalThis.__catsup.editor.draw(); }); await frames(2);
const p7 = await pos(), n7 = await S(() => globalThis.__catsup.editor.sceneRef.textures.size);
const t7 = await S(() => globalThis.__catsup.paint.newTiled(16, 1));
check(t7 === null && (await S(() => globalThis.__catsup.editor.sceneRef.textures.size)) === n7 && (await pos()) === p7, "锁着：新建没建、不长步", JSON.stringify({ t7 }));
const L7 = await H(tex);
await line(20, 3, 28);
check((await H(tex)) === L7 && (await pos()) === p7, "锁着：小窗里画不上（图层不动、不长步）");
await S(async () => { await globalThis.__catsup.session.setLocked(false); });

check(errs.length === 0, "没有页面错误", errs.slice(0, 3).join(" | "));
console.log(`\nprobe-tiled-paint ${failN ? "FAIL" : "OK"}（${pass} ✓ / ${failN} ✗）`);
await browser.close();
