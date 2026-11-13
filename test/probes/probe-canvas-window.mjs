#!/usr/bin/env node
// probe-canvas-window.mjs —— 画布小窗第一版（只看；施工单十六第二节，ai-docs/20261111-paint-workorders-16.md）。created 2026-11-11 by Claude Opus 5.5
// 真的编辑器 + 文件夹家（假选夹 = OPFS）+ 无头 swiftshader。一个盒子两张画（上三张面一张、下三张面一张）：
// ① 有画了右上那颗钮才露；点开 = 小窗开着、钮亮
// ② 线的条数：轮廓里的面 = 这张 atlas 上的面；每张面单独一片（盒子的面互相垂直）= 外沿每条边一条粗线、没有细线；盖住的格数 = 每张面在画布上的面积
// ③ 三维里选一张面 → 小窗里高亮的是同一张；选另一张画上的面 → 小窗自己切到那张画
// ④ 小窗里点一张面 = 三维里选中它（一步）；悬停 = 三维那边要亮的面就是它（每一份摆放里的编号）、底下一行写它是谁
// ⑤ 底下那行数：宽 × 高、片数、面占画布、打开占显存（施工单十五那套记账）、存了以后文件里分层 / 合成图的字节
// ⑥ 开着小窗画一笔：一笔当中不读回、不重算线；抬笔之后读回一次，图上那一格有了颜色
// ⑦ 「每格归谁」：面上的格子上了色、没人要的格子是棋盘格的灰
// ⑧ 关掉：三维那边不再要亮；没在编辑这个物件时点小窗里的面 = 说一句、不动选区
// 用法：python3 -m http.server 8765 后 node test/probes/probe-canvas-window.mjs [url]
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
const here = path.dirname(fileURLToPath(import.meta.url));
const { openMemory, bytesSay } = await import(path.join(here, "../../src/paint/open-memory.ts"));
const { chromium } = createRequire(path.join(here, "../../../20260524 WeebPaint/package.json"))("playwright");
const url = process.argv.slice(2).find((a) => a.startsWith("http")) ?? process.env.PROBE_URL ?? "http://127.0.0.1:8765/";
const FOLDER = "canvas-win";
const BENIGN = /Not signed in|CloudNetworkError|Failed to fetch|net::ERR|msal|favicon|GPU stall due to ReadPixels|not persisted yet/i;
let pass = 0, failN = 0;
const check = (ok, what, extra = "") => { if (ok) { pass++; console.log("  ✓", what); } else { failN++; process.exitCode = 1; console.error("  ✗", what, extra ? `  ← ${extra}` : ""); } };
const FAKE_FSA = (folder) => {
  window.showDirectoryPicker = async () => (await navigator.storage.getDirectory()).getDirectoryHandle(folder, { create: true });
  const P = globalThis.FileSystemHandle?.prototype;
  if (P) { P.queryPermission = async () => "granted"; P.requestPermission = async () => "granted"; }
};
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
await ctx.addInitScript(FAKE_FSA, FOLDER);
const page = await ctx.newPage();
const errs = [];
page.on("pageerror", (e) => errs.push("pageerror: " + e.message));
page.on("console", (m) => { if (m.type() === "error" && !BENIGN.test(m.text())) errs.push(`console.error: ${m.text()}`); });
const S = (f, a) => page.evaluate(f, a);
const ready = () => page.waitForFunction(() => globalThis.__catsup?.session && globalThis.__catsup.home);
const reloaded = async (act) => { const nav = page.waitForEvent("load", { timeout: 30000 }); await act(); await nav; await ready(); await page.waitForTimeout(900); };
const frames = (n = 4) => S(async (n) => { for (let i = 0; i < n; i++) { globalThis.__catsup.editor.draw(); await new Promise((r) => requestAnimationFrame(r)); } }, n);
/** 从「…」菜单里点一项：按菜单项的字认（等于 label，或者 label 后面紧跟「（」——画那几行是「名字（宽 × 高）」）。 */
const menu = async (label) => {
  await page.click('.float-win[data-win="canvas"] .bare-more'); await page.waitForSelector(".popup-menu .menu-item");
  const i = await S((label) => [...document.querySelectorAll(".popup-menu .menu-item")].findIndex((b) => { const t = b.textContent.trim(); return t === label || t.startsWith(label + "（") || t.startsWith(label + "调试视图"); }), label);
  if (i < 0) throw new Error(`菜单里没有「${label}」：${await S(() => [...document.querySelectorAll(".popup-menu .menu-item")].map((b) => b.textContent.trim()).join(" | "))}`);
  await page.locator(".popup-menu .menu-item").nth(i).click(); await frames(1);
  if (await S(() => !!document.querySelector(".popup-menu"))) await page.keyboard.press("Escape");   // 开关那几项点了菜单留着：收掉（菜单已经关了就别按——Esc 会落到编辑器上、退出这一层）
  await frames(1);
};
const rect = () => S(() => { const r = document.querySelector('.float-win[data-win="canvas"]').getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
const W = () => S(() => { const w = globalThis.__catsup.canvasWin(); if (!w) return null; const p = w.probe(); delete p.screenOf; return p; });
await page.goto(url, { waitUntil: "load" }); await ready(); await page.waitForTimeout(600);
void page.evaluate(() => { void globalThis.__catsup.home.openGallery(); });
await page.waitForFunction(() => !document.getElementById("sheet").hidden, null, { timeout: 8000 });
await reloaded(() => page.click(`#sheetChoices button:has-text("选一个文件夹")`));
await S(() => globalThis.__catsup.galleryHost.open());
await page.waitForFunction(() => !document.getElementById("galleryFull").hidden);
await page.click("#galleryNew");
await page.waitForFunction(() => globalThis.__catsup.session.home.kind === "gallery" && document.getElementById("galleryFull").hidden);
await S(() => { for (const n of [...document.querySelectorAll("#noticeStack > *")]) n.remove(); });

// 盒子 → 组件 → 网格体 → 进去；上三张面开一张画、下三张面再开一张
const setup = await S(async () => {
  const C = globalThis.__catsup, e = C.editor, P = (x, y, z = 0) => ({ x, y, z });
  e.setGrid({ ...e.grid, on: false });
  const B = [[0, 0], [1, 0], [1, 1], [0, 1]], segs = []; for (let i = 0; i < 4; i++) { const a = B[i], d = B[(i + 1) % 4]; segs.push([P(a[0], a[1], 0), P(d[0], d[1], 0)]); segs.push([P(a[0], a[1], 1), P(d[0], d[1], 1)]); segs.push([P(a[0], a[1], 0), P(a[0], a[1], 1)]); }
  e.commitOp({ op: "addEdges", at: e.activePool(), segs }); e.selectAll(); e.runAction("brep.orientOutward", { curvature: 3 }); e.makeComponent("盒"); e.runAction("object.toMesh");
  const S0 = e.sceneRef, inst = [...S0.def(S0.root).instances.values()][0];
  e.exitTo(0); e.selectedPools.clear(); e.selectedPools.set(`i${inst.id}`, { kind: "instance", instance: inst.id }); e.enterSelected();
  e.cam.setView("iso"); e.zoomExtents();
  C.pickWorkbench("paint");
  const k = e.sceneRef.mesh(inst.def).kernel, fs = k.faces(), w = () => e.worldGeom();
  const sel = (faces) => { e.selectExpand({ face: w().global(faces[0]) }, 0, "replace"); for (const f of faces.slice(1)) e.selectExpand({ face: w().global(f) }, 0, "add"); };
  sel(fs.slice(0, 3)); e.runAction("mesh.startPaint", { canvas: 256, arrange: "patches" });
  sel(fs.slice(3)); e.runAction("mesh.startPaint", { canvas: 256, arrange: "patches" });
  e.deselectAll(); e.draw();
  const texs = [...e.sceneRef.textures.values()].filter((t) => t.content.kind === "layered").map((t) => t.guid);
  return { def: inst.def, faces: fs, texs };
});
check(setup.texs.length === 2, "一个盒子开了两张画", JSON.stringify(setup));

console.log("\n① 钮和开窗");
check(await S(() => !document.querySelector(".gizmo-canvas").hidden), "有画了：右上那颗钮露出来");
await page.click(".gizmo-canvas"); await frames(3);
let w = await W();
check(!!w?.open && await S(() => document.querySelector(".gizmo-canvas").classList.contains("is-open")), "点开 = 小窗开着、钮亮");

console.log("\n② 线和格数");
const truth = await S((def) => {   // 和小窗无关的查法：哪张画上有哪几张面、每张面在画布上的面积
  const e = globalThis.__catsup.editor, Sc = e.sceneRef, k = Sc.mesh(def).kernel, out = {};
  for (const f of k.faces()) { const p = Sc.facePaint(def, k.faceMat[f]); if (!p) continue; const v = globalThis.__catsup.paint.uv.at(def, f, p.uvSet.guid); let a = 0; const n = v.length / 2; for (let i = 0; i < n; i++) { const j = (i + 1) % n; a += v[2 * i] * v[2 * j + 1] - v[2 * j] * v[2 * i + 1]; } (out[p.textureDoc.guid] ??= { faces: [], area: 0, w: p.uvSet.width, h: p.uvSet.height }).faces.push(f); out[p.textureDoc.guid].area += Math.abs(a) / 2; }
  return out;
}, setup.def);
const t0 = truth[w.tex];
check(!!t0 && w.faces.join(",") === t0.faces.sort((a, b) => a - b).join(","), `轮廓里的面 = 这张画上的面（${w.faces.join(",")}）`, JSON.stringify(t0));
check(w.thin === 0 && w.thick === 4 * w.faces.length && w.patches === w.faces.length, `盒子的面各自一片：${w.thick} 条粗线、${w.thin} 条细线、${w.patches} 片`);
check(Math.abs(w.covered - t0.area) <= 2 * w.faces.length * 4, `盖住的格数（格子中心数）≈ 面积（${w.covered} vs ${t0.area}）`);

console.log("\n③ 三维里选面 → 小窗高亮同一张；选另一张画上的面 → 自己切过去");
const otherTex = setup.texs.find((t) => t !== w.tex), fA = truth[w.tex].faces[1], fB = truth[otherTex].faces[0];
await S((f) => { const e = globalThis.__catsup.editor; e.selectExpand({ face: e.worldGeom().global(f) }, 0, "replace"); }, fA); await frames(2);
w = await W();
check(w.selected.join(",") === String(fA), `三维选了面 ${fA}：小窗里高亮的是 ${w.selected.join(",")}`);
await S((f) => { const e = globalThis.__catsup.editor; e.selectExpand({ face: e.worldGeom().global(f) }, 0, "replace"); }, fB); await frames(2);
w = await W();
check(w.tex === otherTex && w.selected.join(",") === String(fB), "选了另一张画上的面：小窗切到那张画、高亮它", JSON.stringify({ tex: w.tex, sel: w.selected }));

const nameOf = (t) => S((t) => globalThis.__catsup.editor.sceneRef.textures.get(t).name, t);
await menu(await nameOf(setup.texs.find((t) => t !== otherTex))); w = await W();
check(w.tex !== otherTex, `从「…」里换画：小窗切到另一张（${w.tex?.slice(0, 8)}）`);
await menu(await nameOf(otherTex)); w = await W();
check(w.tex === otherTex, "再从「…」里换回来");

console.log("\n④ 小窗里点 = 三维里选中；悬停 = 三维那边亮、底下一行写它是谁（不画画的工具：画画工作台里笔落在画布上 = 画，施工单二十一第 2 刀，那边由 probe-canvas-paint 管）");
await S(() => { globalThis.__catsup.pickWorkbench("freeform"); globalThis.__catsup.editor.setTool("select"); }); await frames(2);
const centerOf = (f) => S(([def, f]) => { const e = globalThis.__catsup.editor, Sc = e.sceneRef, k = Sc.mesh(def).kernel, p = Sc.facePaint(def, k.faceMat[f]), v = globalThis.__catsup.paint.uv.at(def, f, p.uvSet.guid); let x = 0, y = 0; const n = v.length / 2; for (let i = 0; i < n; i++) { x += v[2 * i]; y += v[2 * i + 1]; } return globalThis.__catsup.canvasWin().probe().screenOf(x / n, y / n); }, [setup.def, f]);
const fC = truth[otherTex].faces[2], hBefore = await S(() => globalThis.__catsup.editor.history.position());
const c = await centerOf(fC);
await page.mouse.move(c.x, c.y); await frames(2);
w = await W();
const peek = await S(() => [...(globalThis.__catsup.editor.viewExtras?.().peekFaces ?? [])]);
const wantPeek = await S(([def, f]) => globalThis.__catsup.editor.worldGeom().slots.filter((s) => s.pool.def === def && s.pool.group === null).map((s) => s.index * (1 << 22) + f), [setup.def, fC]);
check(w.hover === fC && peek.join(",") === wantPeek.join(","), `悬停面 ${fC}：三维那边要亮的 = ${peek.join(",")}`, JSON.stringify({ hover: w.hover, peek, wantPeek }));
check(new RegExp(`面 ${fC} · 第 \\d+ 片 · 占 \\d+ 格 · 一格约 `).test(w.hoverLine), `底下一行写它是谁：「${w.hoverLine}」`);
await page.mouse.click(c.x, c.y); await frames(2);
const picked = await S(() => globalThis.__catsup.editor.selectedMeshFaces());
check(picked.join(",") === String(fC) && await S(() => globalThis.__catsup.editor.history.position()) === hBefore + 1, `点了一下：三维里选中的是面 ${picked.join(",")}、一步`);

await S(() => globalThis.__catsup.pickWorkbench("paint")); await frames(2);   // 回画画工作台（后面几段照旧）
console.log("\n⑤ 底下那行数");
const tgt = await S(([def, fs]) => { const k = globalThis.__catsup.editor.sceneRef.mesh(def).kernel; let tris = 0; for (const f of fs) tris += Math.max(1, k.faceVerts(f).length - 2); return { faces: Math.max(1, fs.length), tris: Math.max(1, tris) }; }, [setup.def, w.faces]);
const mem = bytesSay(openMemory(truth[otherTex].w, truth[otherTex].h, tgt).fixed);   // app 自己的清单（施工单十九第 1 刀：以前探针里另抄了一份公式，清单补全后对不上）
w = await W();
const pct = Math.round((1000 * w.covered) / (w.width * w.height)) / 10;
check(!w.showNums && await S(() => document.querySelector(".canvas-win-stats").hidden), "那行数默认不显示（数照算）");
await menu("显示数字"); w = await W();
check(w.showNums && await S(() => !document.querySelector(".canvas-win-stats").hidden), "「…」里「显示数字」= 叠在画布下沿的那条出来");
check(w.statsLine.includes(`${truth[otherTex].w} × ${truth[otherTex].h}`) && w.statsLine.includes(`${w.patches} 片 · ${w.faces.length} 张面`) && w.statsLine.includes(`面占画布 ${pct}%`) && w.statsLine.includes(`打开画占显存 ${mem}`) && /存进文件占|还没编进过文件/.test(w.statsLine),
  `「${w.statsLine}」`);
console.log("\n⑥ 开着小窗画一笔：一笔当中不读回、不重算线；抬笔之后读回一次");
const before = await W();
const r = await S((t) => { const C = globalThis.__catsup, e = C.editor, V = e.vp(), pts = []; for (let i = 0; i <= 24; i++) pts.push({ x: V.w * (0.35 + 0.3 * i / 24), y: V.h * 0.5 }); let mid = null; const res = C.paint.stroke({ guid: t, points: pts, size: 40, hardness: 0.9, color: [0.9, 0.1, 0.1], beforeUp: () => { const p = C.canvasWin().probe(); mid = { readbacks: p.readbacks, outlines: p.outlines }; } }); return { mid, tips: res?.tips ?? null, refused: res?.refused ?? null }; }, otherTex);
await frames(3);
const after = await W();
check(r.mid && r.mid.readbacks === before.readbacks && r.mid.outlines === before.outlines, `一笔当中：读回 ${before.readbacks} → ${r.mid?.readbacks}、线重算 ${before.outlines} → ${r.mid?.outlines}（都不涨）`, JSON.stringify(r));
check(after.readbacks === before.readbacks + 1 && after.outlines === before.outlines, `抬笔之后：读回一次（${before.readbacks} → ${after.readbacks}），线没重算`);

await S(async () => globalThis.__catsup.session.save()); await frames(2);
// 存进文件的字节：读真的文件（glb 的 JSON 里贴图表这一节引用的字节块），和小窗那行对
const bytes = await S(async ([folder, t]) => { const s = globalThis.__catsup.session, root = await (await navigator.storage.getDirectory()).getDirectoryHandle(folder); let buf = null; for await (const [n, h] of root.entries()) if (h.kind === "file" && n === s.home.path) buf = new Uint8Array(await (await h.getFile()).arrayBuffer());
  if (!buf) return { ora: -1, png: -1 }; const dv = new DataView(buf.buffer), jl = dv.getUint32(12, true), json = JSON.parse(new TextDecoder().decode(buf.subarray(20, 20 + jl))), views = json.bufferViews ?? [], rows = json.extensions?.CATSUP_textures?.list ?? [];
  const row = rows.find((r) => r.guid === t) ?? {}; let ora = 0, png = 0; const walk = (o, key) => { if (!o || typeof o !== "object") return; if (key && typeof o.bufferView === "number") { const b = views[o.bufferView]?.byteLength ?? 0; if (key === "ora") ora += b; if (key === "png") png += b; return; } for (const [k, v] of Object.entries(o)) walk(v, k === "ora" || k === "png" ? k : key); };
  walk(row, null); return { ora, png }; }, [FOLDER, otherTex]);
await S(() => globalThis.__catsup.canvasWin().sync());
const say = (n) => (n >= 1 << 20 ? `${Number((n / (1 << 20)).toFixed(n >= 10 << 20 ? 0 : 1))} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
w = await W();
check(bytes.ora > 0 && w.statsLine.includes(`存进文件占（最近一次编的）分层 ${say(bytes.ora)} · 合成图 ${bytes.png ? say(bytes.png) : "没有"}`), `画了一笔、存了以后：文件里分层 ${bytes.ora} 字节、合成图 ${bytes.png} 字节（读的真文件），和那行对得上`, w.statsLine);

console.log("\n⑦ 「每格归谁」");
await menu("每格归谁");
const own = await S((t) => {
  const C = globalThis.__catsup, w = C.canvasWin(), p = w.probe(), cv = document.querySelector(".canvas-win-view canvas"), g = cv.getContext("2d"), r = cv.getBoundingClientRect(), dpr = cv.width / r.width;
  const at = (x, y) => { const s = p.screenOf(x, y); const d = g.getImageData(Math.round((s.x - r.left) * dpr), Math.round((s.y - r.top) * dpr), 1, 1).data; return [d[0], d[1], d[2]]; };
  const e = C.editor, Sc = e.sceneRef, k = Sc.mesh(Sc.defOfContext(e.context)).kernel, f = p.faces[0], pl = Sc.facePaint(Sc.defOfContext(e.context), k.faceMat[f]), v = C.paint.uv.at(Sc.defOfContext(e.context), f, pl.uvSet.guid); let x = 0, y = 0; const n = v.length / 2; for (let i = 0; i < n; i++) { x += v[2 * i]; y += v[2 * i + 1]; }
  return { debug: p.debugView, face: at(x / n, y / n), corner: at(p.width - 0.5, p.height - 0.5) };
}, otherTex);
const grey = (c) => c[0] === c[1] && c[1] === c[2] && (c[0] === 200 || c[0] === 235);
check(own.debug && !grey(own.face) && grey(own.corner), `面上的格子上了色 ${own.face.join(",")}、没人要的角是棋盘格的灰 ${own.corner.join(",")}`);

console.log("\n⑦½ 壳（照参考窗）：左上圆钮点 = 收起 / 恢复、拖 = 挪窗；收起后拖小图标挪位置；右下角改大小；浏览器窗口缩小后还在屏幕里");
const knob = async () => { const b = await page.locator('.float-win[data-win="canvas"] .wbe-float-knob').boundingBox(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; };
const r0 = await rect();
const railR = (await page.locator(".hud-rail-tools").boundingBox())?.x + (await page.locator(".hud-rail-tools").boundingBox())?.width;
check(r0.x + r0.w / 2 < 640 && r0.x >= railR, `第一次开在左边、让开工具柱（窗 x ${Math.round(r0.x)}，工具柱右边 ${Math.round(railR)}；user 11-12「是context aware panel，不是viewport」）`);
let k = await knob(); await page.mouse.click(k.x, k.y); await frames(2);
const r1 = await rect(), col1 = (await W()).collapsed;
k = await knob(); await page.mouse.click(k.x, k.y); await frames(2);
const r2 = await rect(), col2 = (await W()).collapsed;
check(col1 && Math.round(r1.w) === 44 && Math.round(r1.h) === 44 && Math.abs(r1.x - r0.x) < 1 && Math.abs(r1.y - r0.y) < 1 && !col2 && Math.abs(r2.w - r0.w) < 1 && Math.abs(r2.h - r0.h) < 1,
  `点左上圆钮：收成 ${Math.round(r1.w)} × ${Math.round(r1.h)}、位置不动；再点：恢复 ${Math.round(r2.w)} × ${Math.round(r2.h)}（原来 ${Math.round(r0.w)} × ${Math.round(r0.h)}）`);
k = await knob(); await page.mouse.move(k.x, k.y); await page.mouse.down(); await page.mouse.move(k.x + 60, k.y + 40, { steps: 6 }); await page.mouse.up(); await frames(2);
const r3 = await rect();
check(!(await W()).collapsed && Math.abs(r3.x - (r0.x + 60)) < 2 && Math.abs(r3.y - (r0.y + 40)) < 2, `按住左上圆钮拖：窗挪了（${Math.round(r0.x)},${Math.round(r0.y)} → ${Math.round(r3.x)},${Math.round(r3.y)}）、没收起`);
k = await knob(); await page.mouse.click(k.x, k.y); await frames(1);
k = await knob(); await page.mouse.move(k.x, k.y); await page.mouse.down(); await page.mouse.move(k.x + 50, k.y + 30, { steps: 6 }); await page.mouse.up(); await frames(2);
const r4 = await rect();
check((await W()).collapsed && Math.abs(r4.x - (r3.x + 50)) < 2 && Math.abs(r4.y - (r3.y + 30)) < 2, "收起后拖那颗小图标：挪了位置、还是收着");
k = await knob(); await page.mouse.click(k.x, k.y); await frames(1);
const r5 = await rect(), g = await page.locator('.float-win[data-win="canvas"] .wbe-float-grip').boundingBox();
await page.mouse.move(g.x + g.width / 2, g.y + g.height / 2); await page.mouse.down(); await page.mouse.move(g.x + g.width / 2 + 70, g.y + g.height / 2 + 50, { steps: 6 }); await page.mouse.up(); await frames(2);
const r6 = await rect();
check(Math.abs(r6.w - (r5.w + 70)) < 3 && Math.abs(r6.h - (r5.h + 50)) < 3, `拖右下角：${Math.round(r5.w)} × ${Math.round(r5.h)} → ${Math.round(r6.w)} × ${Math.round(r6.h)}`);
await page.setViewportSize({ width: 700, height: 520 }); await page.waitForTimeout(300); await frames(2);
const r7 = await rect();
check(r7.x >= 0 && r7.y >= 0 && r7.x + r7.w <= 700 + 0.5 && r7.y + r7.h <= 520 + 0.5, `浏览器窗口缩到 700 × 520：小窗还在屏幕里（${Math.round(r7.x)},${Math.round(r7.y)} ${Math.round(r7.w)} × ${Math.round(r7.h)}）`);
await page.setViewportSize({ width: 1280, height: 800 }); await frames(2);

console.log("\n⑧ 关掉 / 没在编辑这个物件");
await menu("每格归谁");
await S(() => { const e = globalThis.__catsup.editor; e.exitTo(0); }); await frames(2);
w = await W();
check(w.open && w.def === setup.def, "退到最外层：选着这个物件 = 小窗照样看它", JSON.stringify({ def: w.def }));
await S(() => { const e = globalThis.__catsup.editor, S0 = e.sceneRef, inst = [...S0.def(S0.root).instances.values()][0]; e.selectedPools.clear(); e.selectedPools.set(`i${inst.id}`, { kind: "instance", instance: inst.id }); globalThis.__catsup.canvasWin().sync(); });
const c2 = await centerOf(w.faces[0]);
const hpos = await S(() => globalThis.__catsup.editor.history.position());
if (c2) { await page.mouse.click(c2.x, c2.y); await frames(2); }
check(await S(() => globalThis.__catsup.editor.history.position()) === hpos && /没在编辑这个物件/.test(await S(() => document.querySelector("#hint")?.textContent ?? "")), "没在编辑这个物件时点小窗里的面：说一句、选区不动");
await page.click('.float-win[data-win="canvas"] .bare-close'); await frames(2);
check(!(await W()).open && (await S(() => globalThis.__catsup.editor.viewExtras?.().peekFaces ?? null)) === null, "关掉：三维那边不再要亮");

check(errs.length === 0, "没有报错", errs.slice(0, 3).join(" | "));
console.log(`\nprobe-canvas-window ${failN ? "FAIL" : "OK"}（${pass} ✓ / ${failN} ✗）`);
await browser.close();
