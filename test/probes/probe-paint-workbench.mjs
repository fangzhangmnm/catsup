#!/usr/bin/env node
// probe-paint-workbench.mjs —— 画画工作台第一版（贴图主线 1-7，施工单 ai-docs/20261111-paint-workorders-14.md）。created 2026-11-11 by Claude Opus 5.5
// 真的编辑器 + 真的会话 + 文件夹家（假选夹 = OPFS，照 probe-folder-home）+ 无头 swiftshader；鼠标 = 真的 page.mouse，笔 / 手指 = 合成的 PointerEvent。
// ① 进网格体 → 切「画画」：左柱三把（笔 / 橡皮 / 吸管）；右下「开始画」看得见、点它 = 开始画（一步撤销）
// ② 鼠标拖一笔：画上了、一步；橡皮擦一半：又一步；撤两次 = 回到刚开始画；重做一次 = 那一笔回来
// ③ 吸管：点画过的一格 → 颜色 = 那一格的颜色；取完回到笔
// ④ 手指拖 = 转视角、不画点（不长步）；笔一笔当中双指 = 相机不动
// ⑤ 出了画画工作台（自由建模）：笔点面 = 选中，和以前一样
// ⑥ 存盘 → 刷新 → 进物件 → 画画工作台：画还在（冷的照合成图），落笔先解开、再画能画
// ⑦ 截图：iPad 竖屏（820 × 1180）和桌面（1280 × 800）
// ⑧ 颜色：色块 / 填颜色代码（填错说一句、不改）走同一个入口；⑨ 量：2 万多张面的物件存了重开，进画画工作台要准备多久、画得上；6144 张面开始画之后画得上
// ⑩ 在画画工作台里撤销一步建模、紧接着落笔：要么画在对的格子上、要么明着挡住（1-4c 的准备过期了不许拿旧的表画）
// 用法：python3 -m http.server 8765 后 node test/probes/probe-paint-workbench.mjs [url] [截图目录]
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
const here = path.dirname(fileURLToPath(import.meta.url));
const { chromium } = createRequire(path.join(here, "../../../20260524 WeebPaint/package.json"))("playwright");
const url = process.argv.slice(2).find((a) => a.startsWith("http")) ?? process.env.PROBE_URL ?? "http://127.0.0.1:8765/";
const shotDir = process.argv.slice(2).find((a) => !a.startsWith("http")) ?? null;
const FOLDER = "paint-wb";
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
const hint = () => S(() => document.querySelector("#hint")?.textContent ?? "");
await page.goto(url, { waitUntil: "load" }); await ready(); await page.waitForTimeout(600);
void page.evaluate(() => { void globalThis.__catsup.home.openGallery(); });
await page.waitForFunction(() => !document.getElementById("sheet").hidden, null, { timeout: 8000 });
await reloaded(() => page.click(`#sheetChoices button:has-text("选一个文件夹")`));
await S(() => globalThis.__catsup.galleryHost.open());
await page.waitForFunction(() => !document.getElementById("galleryFull").hidden);
await page.click("#galleryNew");
await page.waitForFunction(() => globalThis.__catsup.session.home.kind === "gallery" && document.getElementById("galleryFull").hidden);
await S(() => { for (const n of [...document.querySelectorAll("#noticeStack > *")]) n.remove(); });

/** 盒子 → 组件 → 网格体 → 进去；俯视。 */
const enterBox = () => S(async () => {
  const C = globalThis.__catsup, e = C.editor, S0 = e.sceneRef, inst = [...S0.def(S0.root).instances.values()][0];
  e.exitTo(0); e.selectedPools.clear(); e.selectedPools.set(`i${inst.id}`, { kind: "instance", instance: inst.id }); e.enterSelected();
  e.cam.setView("top"); e.zoomExtents(); e.draw();
  return inst.def;
});
await S(async () => {
  const e = globalThis.__catsup.editor, P = (x, y, z = 0) => ({ x, y, z });
  e.setGrid({ ...e.grid, on: false });
  const B = [[0, 0], [1, 0], [1, 1], [0, 1]], segs = []; for (let i = 0; i < 4; i++) { const a = B[i], d = B[(i + 1) % 4]; segs.push([P(a[0], a[1], 0), P(d[0], d[1], 0)]); segs.push([P(a[0], a[1], 1), P(d[0], d[1], 1)]); segs.push([P(a[0], a[1], 0), P(a[0], a[1], 1)]); }
  e.commitOp({ op: "addEdges", at: e.activePool(), segs }); e.selectAll(); e.runAction("brep.orientOutward", { curvature: 3 }); e.makeComponent("盒"); e.runAction("object.toMesh");
});
await enterBox();

console.log("\n① 切到「画画」、开始画");
const modes = await S(() => globalThis.__catsup.editor.modes().map((m) => m.id).join(","));
check(modes.includes("paint"), "网格体里有「画画」这个工作台", modes);
await S(() => { globalThis.__catsup.pickWorkbench("paint"); });
await frames(2);
const st1 = await S(() => ({ mode: globalThis.__catsup.editor.modeId, tool: globalThis.__catsup.editor.tool, tools: globalThis.__catsup.editor.modeTools().join(",") }));
check(st1.mode === "paint" && st1.tool === "paintPen" && st1.tools === "paintPen,paintEraser,eyedrop", "工作台 = 画画、手上 = 笔、三把工具", JSON.stringify(st1));
const startBtn = page.locator('button:has-text("开始画")').first();
check(await startBtn.isVisible(), "「开始画」看得见");
await page.screenshot({ path: "/tmp/catsup-paint-wb-start.png" });
const pos0 = await S(() => globalThis.__catsup.editor.history.position());
await startBtn.click(); await frames(3);
const tex = await S(() => [...globalThis.__catsup.editor.sceneRef.textures.values()].find((t) => t.content.kind === "layered")?.guid ?? null);
check(!!tex && await S(() => globalThis.__catsup.editor.history.position()) === pos0 + 1, "开始画了：一张画、一步");
check(!(await page.locator('button:has-text("开始画")').first().isVisible().catch(() => false)), "开始画之后这颗钮收起来了");

console.log("\n② 鼠标画一笔、橡皮擦一半、撤两次、重做一次");
const box = await page.locator("#board").boundingBox();
const scr = (x, y) => S(([x, y]) => { const e = globalThis.__catsup.editor, p = e.cam.project({ x, y, z: 1 }, e.vp()); return p; }, [x, y]);
const drag = async (pts) => { await page.mouse.move(box.x + pts[0].x, box.y + pts[0].y); await page.mouse.down(); for (const p of pts.slice(1)) await page.mouse.move(box.x + p.x, box.y + p.y, { steps: 3 }); await page.mouse.up(); await frames(3); };
const line = async (x0, x1, y) => { const a = await scr(x0, y), b = await scr(x1, y), pts = []; for (let i = 0; i <= 12; i++) pts.push({ x: a.x + ((b.x - a.x) * i) / 12, y: a.y + ((b.y - a.y) * i) / 12 }); return pts; };
const px = () => S((g) => { const b = globalThis.__catsup.paint.boards.get(g); if (!b) return "没有画板"; const d = b.wp.exportData(); let h = 2166136261; for (const n of d.nodes) if (n.pixels) for (const v of n.pixels.bytes) { h ^= v; h = Math.imul(h, 16777619); } return (h >>> 0).toString(16); }, tex);
const p0 = await px(), h0 = await S(() => globalThis.__catsup.editor.history.position());
await S(() => { globalThis.__catsup.editor.config.set("paintPen", "size", 30); });
await drag(await line(0.15, 0.85, 0.5));
const p1 = await px(), h1 = await S(() => globalThis.__catsup.editor.history.position());
check(p1 !== p0 && h1 === h0 + 1, "画上了、一步", `${p0}→${p1} 步 ${h0}→${h1}`);
await S(() => { globalThis.__catsup.editor.setTool("paintEraser"); globalThis.__catsup.editor.config.set("paintEraser", "size", 40); });
await drag(await line(0.15, 0.5, 0.5));
const p2 = await px(), h2 = await S(() => globalThis.__catsup.editor.history.position());
check(p2 !== p1 && h2 === h1 + 1, "橡皮擦了一半、一步");
await S(() => { globalThis.__catsup.editor.undo(); globalThis.__catsup.editor.undo(); }); await frames(2);
check(await px() === "811c9dc5", "撤两次 = 回到刚开始画（画板是空的）", await px());   // 第一笔之前还没有画板（p0 = 没有画板）；撤回来画板留着、空的
await S(() => { globalThis.__catsup.editor.redo(); }); await frames(2);
check(await px() === p1, "重做一次 = 那一笔回来");

console.log("\n③ 吸管");
await S(() => { globalThis.__catsup.editor.setTool("eyedrop"); });
const at = await scr(0.5, 0.5);
await page.mouse.click(box.x + at.x, box.y + at.y); await frames(2);
const want = await S(([g, x, y]) => { const C = globalThis.__catsup, c = C.paint.cellAt(g, x, y); if (!c?.cell) return null; const p = C.paint.boards.get(g).pixelAt(c.cell[0], c.cell[1]); return "#" + [...p].slice(0, 3).map((v) => v.toString(16).padStart(2, "0")).join(""); }, [tex, at.x, at.y]);
const got = await S(() => globalThis.__catsup.paint.color.get().map((v) => Math.round(v * 255).toString(16).padStart(2, "0")).join(""));
check(!!want && want === "#" + got, "吸管取到的 = 那一格的颜色", `${want} vs #${got}`);
check(await S(() => globalThis.__catsup.editor.tool) === "paintEraser", "取完回到上一把笔（刚才用的是橡皮）");

console.log("\n④ 手指转视角不画；一笔当中双指相机不动");
const pe = (type, id, ptype, x, y) => S(([type, id, ptype, x, y]) => { const c = document.getElementById("board"), r = c.getBoundingClientRect(); c.dispatchEvent(new PointerEvent(type, { pointerId: id, pointerType: ptype, clientX: r.left + x, clientY: r.top + y, bubbles: true, cancelable: true, isPrimary: id === 1, buttons: type === "pointerup" ? 0 : 1, pressure: type === "pointerup" ? 0 : 0.5 })); }, [type, id, ptype, x, y]);
const camKey = () => S(() => { const c = globalThis.__catsup.editor.cam, e = c.eye(); return [e.x, e.y, e.z, c.halfH].map((v) => v.toFixed(5)).join(","); });
await S(() => { globalThis.__catsup.editor.setTool("paintPen"); });
await pe("pointerdown", 9, "pen", 5, 5); await pe("pointerup", 9, "pen", 5, 5);   // 见过笔
await page.waitForTimeout(700);   // 掌触门：笔尖活动后 600 ms 内的触摸当手掌（gestures.ts 既有规矩），等过去再用手指
const hA = await S(() => globalThis.__catsup.editor.history.position()), cA = await camKey(), pA = await px();
await pe("pointerdown", 21, "touch", at.x - 60, at.y); for (let i = 1; i <= 6; i++) await pe("pointermove", 21, "touch", at.x - 60 + i * 20, at.y + i * 4); await pe("pointerup", 21, "touch", at.x + 60, at.y + 24); await frames(2);
check(await S(() => globalThis.__catsup.editor.history.position()) === hA && await px() === pA, "手指拖：没画点、没长步");
check(await camKey() !== cA, "手指拖 = 转了视角");
const a2 = await scr(0.2, 0.3), b2 = await scr(0.8, 0.3), cB = await camKey();
await pe("pointerdown", 31, "pen", a2.x, a2.y); await pe("pointermove", 31, "pen", (a2.x + b2.x) / 2, a2.y);
await pe("pointerdown", 41, "touch", 300, 300); await pe("pointerdown", 42, "touch", 400, 300);
for (let i = 1; i <= 5; i++) { await pe("pointermove", 41, "touch", 300 + i * 30, 300 + i * 10); await pe("pointermove", 42, "touch", 400 + i * 30, 300 - i * 10); }
await pe("pointerup", 41, "touch", 450, 350); await pe("pointerup", 42, "touch", 550, 250);
check(await camKey() === cB, "一笔当中双指：相机没动");
await pe("pointermove", 31, "pen", b2.x, b2.y); await pe("pointerup", 31, "pen", b2.x, b2.y); await frames(2);
check(await S(() => globalThis.__catsup.editor.history.position()) === hA + 1, "那一笔照常落了（一步）");

console.log("\n⑤ 出了画画工作台：笔点面 = 选中");
await S(() => { globalThis.__catsup.pickWorkbench("freeform"); globalThis.__catsup.editor.setTool("select"); globalThis.__catsup.editor.clearSelection?.(); });
const c5 = await scr(0.5, 0.5);
await pe("pointerdown", 51, "pen", c5.x, c5.y); await pe("pointerup", 51, "pen", c5.x, c5.y); await frames(2);
check(await S(() => globalThis.__catsup.editor.hasActableSelection?.() ?? false), "自由建模里笔点面 = 选中了");

console.log("\n⑥ 存盘 → 刷新 → 接着画");
await S(() => { globalThis.__catsup.pickWorkbench("paint"); });
const p6 = await px();
check(await S(async () => globalThis.__catsup.session.save()) === true, "存上了");
await reloaded(() => page.reload());
await S(() => { for (const n of [...document.querySelectorAll("#noticeStack > *")]) n.remove(); });
await enterBox();
await S(() => { globalThis.__catsup.pickWorkbench("paint"); }); await frames(4);
await page.waitForFunction((g) => globalThis.__catsup.paint.state(g) === "hot", tex, { timeout: 10000 });
check(await px() === p6, "进画画工作台：画自己热起来了，内容 = 存之前");
await drag(await line(0.2, 0.8, 0.7));
check(await px() !== p6, "接着画能画");

console.log("\n⑧ 颜色：色块 / 填颜色代码（填错说一句、不改）走同一个入口");
await S(() => { globalThis.__catsup.editor.setTool("paintPen"); }); await frames(1);
await page.locator('button:has-text("颜色")').first().click();
check(await S(() => !document.getElementById("paintColorSheet").hidden), "点「颜色」= 颜色面板开了");
const before8 = await S(() => globalThis.__catsup.paint.color.get().join(","));
await page.fill("#paintColorHex", "#12345"); await page.click("#paintColorHexOk");
check(await S(() => globalThis.__catsup.paint.color.get().join(",")) === before8 && /不是颜色代码/.test(await S(() => document.getElementById("paintColorNote").textContent)), "填错：说一句、颜色没变");
await page.fill("#paintColorHex", "#e8b4a0"); await page.press("#paintColorHex", "Enter");
check(await S(() => globalThis.__catsup.paint.color.get().map((v) => Math.round(v * 255).toString(16).padStart(2, "0")).join("")) === "e8b4a0" && await S(() => document.getElementById("paintColorSheet").hidden), "填对：换了、面板收了");
await page.locator('button:has-text("颜色")').first().click();
await page.locator("#paintColorGrid .swatch").nth(3).click();
const sw = await S(() => [...document.querySelectorAll("#paintColorGrid .swatch")][3]?.title ?? "");
check(sw.includes(await S(() => "#" + globalThis.__catsup.paint.color.get().map((v) => Math.round(v * 255).toString(16).padStart(2, "0")).join(""))), "点色块：换成那一格", sw);

console.log("\n⑦ 截图");
if (shotDir) {
  await page.screenshot({ path: path.join(shotDir, "paint-wb-desktop.png") });
  await page.setViewportSize({ width: 820, height: 1180 }); await page.waitForTimeout(400);
  await S(() => { const e = globalThis.__catsup.editor; e.cam.setView("iso"); e.zoomExtents(); e.draw(); }); await frames(4);
  await page.screenshot({ path: path.join(shotDir, "paint-wb-ipad.png") });
  console.log("  截图写到", shotDir);
}

console.log("\n⑨ 量：一个 2 万多张面的物件，存了重开，进画画工作台要准备多久（施工单：超过半秒停下来报）");
await page.setViewportSize({ width: 1280, height: 800 });
await S(() => globalThis.__catsup.galleryHost.open());
await page.waitForFunction(() => !document.getElementById("galleryFull").hidden);
await page.click("#galleryNew");
await page.waitForFunction(() => globalThis.__catsup.session.home.kind === "gallery" && document.getElementById("galleryFull").hidden);
await S(async () => {
  const e = globalThis.__catsup.editor, P = (x, y, z = 0) => ({ x, y, z });
  const B = [[0, 0], [1, 0], [1, 1], [0, 1]], segs = []; for (let i = 0; i < 4; i++) { const a = B[i], d = B[(i + 1) % 4]; segs.push([P(a[0], a[1], 0), P(d[0], d[1], 0)]); segs.push([P(a[0], a[1], 1), P(d[0], d[1], 1)]); segs.push([P(a[0], a[1], 0), P(a[0], a[1], 1)]); }
  e.commitOp({ op: "addEdges", at: e.activePool(), segs }); e.selectAll(); e.runAction("brep.orientOutward", { curvature: 3 }); e.makeComponent("大"); e.runAction("object.toMesh");
});
await enterBox();
const faces = await S(() => { const e = globalThis.__catsup.editor; e.runAction("mesh.subdivide", { levels: 4 }); e.runAction("mesh.subdivide", { levels: 2 }); const S0 = e.sceneRef; return S0.mesh(S0.defOfContext(e.context)).kernel.faces().length; });
await S(() => { globalThis.__catsup.pickWorkbench("paint"); globalThis.__catsup.editor.runAction("mesh.startPaint"); }); await frames(2);
await drag(await line(0.2, 0.8, 0.5));
check(await S(async () => globalThis.__catsup.session.save()) === true, `${faces} 张面的物件画了一笔、存上了`);
await reloaded(() => page.reload());
await S(() => { for (const n of [...document.querySelectorAll("#noticeStack > *")]) n.remove(); });
await enterBox();
const m9 = await S(async () => {
  const C = globalThis.__catsup, e = C.editor, g = [...e.sceneRef.textures.values()].find((t) => t.content.kind === "layered").guid;
  const t0 = performance.now(); C.pickWorkbench("paint"); C.paint.workbench.tick(); const enterMs = performance.now() - t0;   // 切工作台 + 三角格子 + 发起解开
  while (C.paint.state(g) !== "hot") await new Promise((r) => setTimeout(r, 5));
  const warmMs = performance.now() - t0;
  e.draw();   // 热了之后的那一帧：工作台对准备（1-4c）
  const prepMs = C.paint.workbench.lastPrepMs, readyMs = performance.now() - t0, problem = C.paint.prep.problem(g);
  const vp = e.vp(), p = e.cam.project({ x: 0.5, y: 0.5, z: 1 }, vp), h0 = e.history.position();
  let threw = "";
  const t1 = performance.now();
  try { C.paint.workbench.pointer({ tool: "paintPen", phase: "down", x: p.x, y: p.y }); e.draw(); for (let i = 1; i <= 8; i++) C.paint.workbench.pointer({ tool: "paintPen", phase: "move", x: p.x + i * 6, y: p.y }); C.paint.workbench.pointer({ tool: "paintPen", phase: "up", x: p.x + 48, y: p.y }); } catch (err) { threw = String(err); }
  const strokeMs = performance.now() - t1;
  const b = C.paint.boards.get(g);
  return { enterMs: Math.round(enterMs), warmMs: Math.round(warmMs), prepMs: Math.round(prepMs), readyMs: Math.round(readyMs), problem, strokeMs: Math.round(strokeMs), board: `${b.width}x${b.height}`, threw, steps: e.history.position() - h0, hint: document.querySelector("#hint")?.textContent ?? "", stroking: C.paint.workbench.stroking };
});
console.log(`    ${faces} 张面、画布 ${m9.board}：切进画画工作台（含三角格子、发起解开）${m9.enterMs} ms；到画热好 ${m9.warmMs} ms；热了那一帧做画画的准备 ${m9.prepMs} ms（到能落笔共 ${m9.readyMs} ms）；一笔 ${m9.strokeMs} ms、长了 ${m9.steps} 步（无头 swiftshader，只作参考）`);
check(m9.enterMs < 500, `切进来 ${m9.enterMs} ms < 半秒`);
check(m9.problem === null, "热了那一帧准备就好了（落笔不用再等）", String(m9.problem));
check(!m9.threw && !m9.stroking && m9.steps === 1, `${faces} 张面的物件画得上（1-4c 之前这里画不了）`, JSON.stringify({ threw: m9.threw.slice(0, 120), steps: m9.steps, hint: m9.hint }));
// 面少一点的（6144 张面）：能画，量第一笔
await S(() => globalThis.__catsup.galleryHost.open());
await page.waitForFunction(() => !document.getElementById("galleryFull").hidden);
await page.click("#galleryNew");
await page.waitForFunction(() => globalThis.__catsup.session.home.kind === "gallery" && document.getElementById("galleryFull").hidden);
await S(async () => {
  const e = globalThis.__catsup.editor, P = (x, y, z = 0) => ({ x, y, z });
  const B = [[0, 0], [1, 0], [1, 1], [0, 1]], segs = []; for (let i = 0; i < 4; i++) { const a = B[i], d = B[(i + 1) % 4]; segs.push([P(a[0], a[1], 0), P(d[0], d[1], 0)]); segs.push([P(a[0], a[1], 1), P(d[0], d[1], 1)]); segs.push([P(a[0], a[1], 0), P(a[0], a[1], 1)]); }
  e.commitOp({ op: "addEdges", at: e.activePool(), segs }); e.selectAll(); e.runAction("brep.orientOutward", { curvature: 3 }); e.makeComponent("中"); e.runAction("object.toMesh");
});
await enterBox();
const m10 = await S(async () => {
  const C = globalThis.__catsup, e = C.editor; e.runAction("mesh.subdivide", { levels: 4 }); e.runAction("mesh.subdivide", { levels: 1 });
  const S0 = e.sceneRef, faces = S0.mesh(S0.defOfContext(e.context)).kernel.faces().length;
  const t0 = performance.now(); C.pickWorkbench("paint"); C.paint.workbench.tick(); const prepMs = performance.now() - t0;
  e.runAction("mesh.startPaint");
  e.draw();   // 下一帧：新建的画先建画板、做画画的准备（1-4c；落笔那一下不建表）
  const readyPrepMs = Math.round(C.paint.workbench.lastPrepMs);
  const vp = e.vp(), p = e.cam.project({ x: 0.5, y: 0.5, z: 1 }, vp), h0 = e.history.position();
  const t1 = performance.now(); C.paint.workbench.pointer({ tool: "paintPen", phase: "down", x: p.x, y: p.y }); e.draw(); const downMs = performance.now() - t1;
  for (let i = 1; i <= 8; i++) C.paint.workbench.pointer({ tool: "paintPen", phase: "move", x: p.x + i * 6, y: p.y });
  C.paint.workbench.pointer({ tool: "paintPen", phase: "up", x: p.x + 48, y: p.y });
  const g = [...e.sceneRef.textures.values()].find((t) => t.content.kind === "layered").guid, b = C.paint.boards.get(g);
  return { faces, prepMs: Math.round(prepMs), readyPrepMs, downMs: Math.round(downMs), steps: e.history.position() - h0, board: b ? `${b.width}x${b.height}` : "?", hint: document.querySelector("#hint")?.textContent ?? "", def: S0.defOfContext(e.context), g };
});
console.log(`    ${m10.faces} 张面、画布 ${m10.board}：切进来 ${m10.prepMs} ms；开始画之后那一帧做画画的准备 ${m10.readyPrepMs} ms；第一笔落笔（这一笔的三角形公式表 + 画一帧）${m10.downMs} ms；长了 ${m10.steps} 步`);
check(m10.steps === 1, `${m10.faces} 张面的物件能画`, m10.hint);

console.log("\n⑩ 在画画工作台里撤销一步建模，紧接着落笔：要么画在对的面上、要么明着挡住，不许拿旧的表画（统筹 11-11）");
const m11 = await S(async ([def, g]) => {
  const C = globalThis.__catsup, e = C.editor, k = () => e.sceneRef.mesh(def).kernel;
  // 出画画工作台 → 建模：顶面的点整体往 +x 挪 0.3（俯视看得出：格子落在屏幕上的位置变了）→ 回画画工作台、准备好
  C.pickWorkbench("freeform"); e.draw();
  const zMax = Math.max(...k().verts().map((v) => k().pt(v).z)), top = k().verts().filter((v) => k().pt(v).z > zMax - 0.2);   // 细分过的盒子是圆的：顶上那一圈
  const revBeforeMove = k().rev;
  e.commitOp({ op: "meshMove", def, moves: top.map((v) => { const p = k().pt(v); return { v, to: { x: p.x + 0.3, y: p.y, z: p.z } }; }) });
  const moved = { verts: top.length, changed: k().rev !== revBeforeMove };
  C.pickWorkbench("paint"); e.draw();
  const before = C.paint.prep.problem(g), revMoved = k().rev;
  // 撤销那一步建模，同一个任务里（不给它画一帧）马上落笔
  // 撤到那一步建模真的撤掉为止（前面可能还压着切工作台时的选区那一步），每一下说了什么记下来
  const said = []; let n = 0;
  while (k().rev === revMoved && n < 5) { e.undo(); n++; said.push(document.querySelector("#hint")?.textContent ?? ""); }
  const revBack = k().rev, staleRightAfterUndo = C.paint.prep.problem(g);
  const vp = e.vp(), pts = []; for (let i = 0; i <= 10; i++) { const w = { x: 0.3 + 0.04 * i, y: 0.35, z: zMax }, q = e.cam.project(w, vp); pts.push(q); }
  const stroke = () => { C.paint.workbench.pointer({ tool: "paintPen", phase: "down", x: pts[0].x, y: pts[0].y }); e.draw(); for (const q of pts.slice(1)) { C.paint.workbench.pointer({ tool: "paintPen", phase: "move", x: q.x, y: q.y }); e.draw(); } C.paint.workbench.pointer({ tool: "paintPen", phase: "up", x: pts[pts.length - 1].x, y: pts[pts.length - 1].y }); e.draw(); };
  const hA = e.history.position(); stroke(); const hB = e.history.position(), hintA = document.querySelector("#hint")?.textContent ?? "";
  // 落在哪几格：按现在的几何问落点（1-3a），那几格有墨 = 画在对的面上
  const inkAt = () => { const b = C.paint.boards.get(g); let n = 0, m = 0; for (const q of pts) { const c = C.paint.cellAt(g, q.x, q.y); if (!c?.cell) continue; m++; const px = b.pixelAt(c.cell[0], c.cell[1]); if (px && px[3] > 0) n++; } return { inked: n, asked: m }; };
  const first = inkAt();
  // 再一帧之后（准备一定重建好了）再画一笔，同样查
  await new Promise((r) => requestAnimationFrame(r)); e.draw();
  const after = C.paint.prep.problem(g);
  stroke(); const hC = e.history.position(), second = inkAt();
  return { moved, before, revMoved, revBack, staleRightAfterUndo, undos: n, said, undid: revBack !== revMoved, firstSteps: hB - hA, hintA, first, after, secondSteps: hC - hB, second };
}, [m10.def, m10.g]);
console.log(`    撤销前准备 = ${m11.before}；撤销后网格体修改号 ${m11.revMoved} → ${m11.revBack}，撤销完那一刻准备 = ${m11.staleRightAfterUndo}；紧接着那一笔：${m11.firstSteps ? `画了（落点那几格 ${m11.first.inked}/${m11.first.asked} 有墨）` : `没开始，提示「${m11.hintA}」`}`);
check(m11.moved.verts > 10 && m11.moved.changed && m11.before === null && m11.undid && m11.undos === 1 && m11.said[0] === "撤销：移动", `建模那一步挪了 ${m11.moved.verts} 个点；撤一下 =「${m11.said[0]}」，网格体修改号变了`, JSON.stringify(m11));
check((m11.firstSteps === 1 && m11.first.inked >= m11.first.asked - 1 && m11.first.asked >= 8) || (m11.firstSteps === 0 && /画布的表还在准备/.test(m11.hintA)), "紧接着那一笔：要么画在按现在的几何算的那几格上，要么明着挡住（说「画布的表还在准备」）", JSON.stringify(m11));
check(m11.after === null && m11.secondSteps === 1 && m11.second.inked >= m11.second.asked - 1 && m11.second.asked >= 8, `下一帧准备好了，再画一笔落在对的格子上（${m11.second.inked}/${m11.second.asked}）`, JSON.stringify(m11.second));

await browser.close();
if (errs.length) { console.log("页面错误：", errs.slice(0, 5)); process.exitCode = 1; }
console.log(`\nprobe-paint-workbench ${failN || errs.length ? "FAIL" : "OK"}（${pass} ✓ / ${failN} ✗）`);
