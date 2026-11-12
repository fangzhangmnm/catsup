#!/usr/bin/env node
// probe-canvas-paint.mjs —— 在画布小窗里画（施工单二十一第 2 刀）。created 2026-11-12 by Claude Opus 5.5
// 真的编辑器 + 真的小窗 + 合成的 PointerEvent（笔 / 鼠标 / 手指）落在小窗的画布上；无头 swiftshader。读数角标的「核对」开着。
// ① 画画工作台、笔：在小窗里画一笔——一笔当中小窗跟着变（小窗那张图 = 画板显示的那张，逐字节）、三维那边每帧核对对上、图层不动；抬笔 = 一步、图层变了、小窗 = 落定那张
// ② 鼠标：左键拖 = 画；中键拖 = 挪（不画）；手指拖 = 挪（不画）
// ③ 吸管：点小窗里画过的一格 → 颜色 = 那一格；取完回到笔
// ④ 两块画面来回画：模型上一笔、小窗里一笔、撤两下、重做两下——每一步小窗那张图 = 画板落定那张、图层逐字节回到当时
// ⑤ 模型上画一笔（小窗开着）：一笔当中小窗跟着变、只读回变了的那块（比整张小）
// ⑥ 锁着：小窗里画不上（图层不动、不长步、提示行说锁）；不在画画工作台（自由建模）：小窗里拖 = 挪，不画
// 用法：python3 -m http.server 8765 后 node test/probes/probe-canvas-paint.mjs [url]
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
const here = path.dirname(fileURLToPath(import.meta.url));
const { chromium } = createRequire(path.join(here, "../../../20260524 WeebPaint/package.json"))("playwright");
const url = process.argv.slice(2).find((a) => a.startsWith("http")) ?? process.env.PROBE_URL ?? "http://127.0.0.1:8765/";
let pass = 0, failN = 0;
const check = (ok, what, extra = "") => { if (ok) { pass++; console.log("  ✓", what); } else { failN++; process.exitCode = 1; console.error("  ✗", what, extra ? `  ← ${extra}` : ""); } };
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 1100, height: 820 }, deviceScaleFactor: 1 });
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
const S = (f, a) => page.evaluate(f, a);
const frames = (n = 3) => S(async (n) => { for (let i = 0; i < n; i++) { globalThis.__catsup.editor.draw(); await new Promise((r) => requestAnimationFrame(r)); } }, n);
await page.goto(url, { waitUntil: "load" }); await page.waitForFunction(() => globalThis.__catsup?.editor); await page.waitForTimeout(600);

// 盒子 → 组件 → 网格体 → 进去 → 开始画 256 → 画画工作台 → 开小窗
const tex = await S(async () => {
  const C = globalThis.__catsup, e = C.editor, P = (x, y, z = 0) => ({ x, y, z }), g = () => crypto.randomUUID(), sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  e.setGrid({ ...e.grid, on: false });
  const B = [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]], segs = [];
  for (let i = 0; i < 4; i++) { const a = B[i], d = B[(i + 1) % 4]; segs.push([P(a[0], a[1], 0), P(d[0], d[1], 0)]); segs.push([P(a[0], a[1], 1), P(d[0], d[1], 1)]); segs.push([P(a[0], a[1], 0), P(a[0], a[1], 1)]); }
  e.commitOp({ op: "addEdges", at: e.activePool(), segs }); e.selectAll(); e.runAction("brep.orientOutward", { curvature: 3 }); e.makeComponent("块"); e.runAction("object.toMesh"); await sleep(10);
  const Sc = e.sceneRef, inst = [...Sc.def(Sc.root).instances.values()][0];
  e.selectedPools.clear(); e.selectedPools.set(`i${inst.id}`, { kind: "instance", instance: inst.id }); e.enterSelected(); await sleep(10);
  const def = inst.def, k = e.sceneRef.mesh(def).kernel, tex = g();
  e.commitOp({ op: "startPaint", def, faces: k.faces(), uvSet: g(), textureGuid: tex, materialGuid: g(), names: { uvSet: "UV", paint: "画", material: "画" }, color: [0.3, 0.5, 0.7], canvas: 256, arrange: "patches" });
  C.paint.ensure(tex); C.pickWorkbench("paint"); e.setTool("paintPen");
  e.cam.setView("iso"); e.zoomExtents(); e.draw();
  C.paint.diag.setCheck(true);
  return tex;
});
await page.waitForFunction((t) => globalThis.__catsup.paint.state(t) === "hot", tex, { timeout: 15000 });
await frames(3);
await page.click(".gizmo-canvas"); await frames(4);
await S(() => globalThis.__catsup.canvasWin().sync()); await frames(2);
const W = () => S(() => { const p = globalThis.__catsup.canvasWin().probe(); delete p.screenOf; return p; });
check((await W()).open && (await W()).tex === tex, "小窗开着、显示这张画");
const H = (t) => S((t) => { const C = globalThis.__catsup, b = C.paint.boards.get(t), d = b.wp.exportData(), h = (u) => { let x = 2166136261; for (let i = 0; i < u.length; i++) { x ^= u[i]; x = Math.imul(x, 16777619); } return (x >>> 0).toString(16); }; return d.nodes.map((n) => (n.pixels ? `${n.pixels.rect.x},${n.pixels.rect.y},${n.pixels.rect.w},${n.pixels.rect.h}:${h(new Uint8Array(n.pixels.bytes.buffer, n.pixels.bytes.byteOffset, n.pixels.bytes.byteLength))}` : "空")).join("|"); }, t);
/** 画板的两张：显示那张（带正在画的那一笔）/ 落定那张（存盘用的）的哈希。 */
const boardHashes = (t) => S((t) => { const b = globalThis.__catsup.paint.boards.get(t), h = (u) => { let x = 2166136261; for (let i = 0; i < u.length; i++) { x ^= u[i]; x = Math.imul(x, 16777619); } return (x >>> 0).toString(16); }; const shown = b.shownBytes(); return { shown: shown ? h(shown.px) : null, committed: h(b.composeBytes()) }; }, t);
/** 小窗里格 (x, y) → 页面坐标。 */
const at = (x, y) => S(([x, y]) => globalThis.__catsup.canvasWin().probe().screenOf(x, y), [x, y]);
/** 在小窗的画布上发一个指针事件。 */
const pe = (type, p, o = {}) => S(([type, p, o]) => { const cv = document.querySelector(".canvas-win-view canvas"); cv.dispatchEvent(new PointerEvent(type, { pointerId: o.id ?? 7, pointerType: o.type ?? "pen", clientX: p.x, clientY: p.y, button: o.button ?? 0, buttons: type === "pointerup" ? 0 : (o.buttons ?? 1), pressure: o.pressure ?? 0.6, bubbles: true, cancelable: true, isPrimary: true })); }, [type, p, o]);
/** 小窗里一笔（格坐标的一条线），mid = 按着的时候回调。 */
const line = async (y, x0, x1, o = {}, mid) => {
  await pe("pointerdown", await at(x0, y), o); await frames(1);
  for (let i = 1; i <= 16; i++) { await pe("pointermove", await at(x0 + ((x1 - x0) * i) / 16, y + 3 * Math.sin(i / 3)), o); await frames(1); if (i === 8 && mid) await mid(); }
  await pe("pointerup", await at(x1, y), o); await frames(2);
};
const pos = () => S(() => globalThis.__catsup.editor.history.position());

console.log("\n① 笔在小窗里画一笔：一笔当中小窗跟着变、三维每帧核对对上、图层不动；抬笔一步");
const L0 = await H(tex), w0 = await W(), p0 = await pos();
let mid1 = null;
await line(80, 30, 200, {}, async () => {
  const w = await W(), b = await boardHashes(tex), wh = await S(() => globalThis.__catsup.canvasWin().probe().workHash());
  mid1 = { drawing: w.drawing, live: w.liveReads - w0.liveReads, layers: (await H(tex)) === L0, sameAsShown: wh?.hash === b.shown, notCommitted: wh?.hash !== b.committed, check: await S(() => globalThis.__catsup.paint.diag.check()), busy: await S(() => globalThis.__catsup.hand.busy()) };
});
check(mid1?.drawing && mid1.live > 0 && mid1.layers && mid1.sameAsShown && mid1.notCommitted && mid1.check && mid1.busy, "一笔当中：小窗在画、跟着变（小窗那张 = 画板显示那张，带着这一笔）、图层还没动、三维核对对上、名册说手上忙着", JSON.stringify(mid1));
const L1 = await H(tex), w1 = await W(), b1 = await boardHashes(tex), wh1 = await S(() => globalThis.__catsup.canvasWin().probe().workHash());
check(L1 !== L0 && (await pos()) === p0 + 1 && !w1.drawing, "抬笔：图层变了、撤销栈长了一步", JSON.stringify({ steps: (await pos()) - p0 }));
check(wh1?.hash === b1.committed && b1.shown === b1.committed, "抬笔后小窗那张 = 落定那张（逐字节）", JSON.stringify({ wh1, b1 }));
check(await S(() => globalThis.__catsup.paint.diag.check()), "抬笔后核对对上");

console.log("\n② 鼠标左键拖 = 画；中键拖 = 挪；手指拖 = 挪");
const L2a = await H(tex);
await line(120, 40, 180, { type: "mouse", id: 1, button: 0, buttons: 1 });
const L2b = await H(tex);
check(L2b !== L2a, "鼠标左键拖：画上了");
const sc0 = await S(() => globalThis.__catsup.canvasWin().probe().screenOf(10, 10));
await line(150, 40, 180, { type: "mouse", id: 1, button: 1, buttons: 4 });
const sc1 = await S(() => globalThis.__catsup.canvasWin().probe().screenOf(10, 10));
check((await H(tex)) === L2b && (sc1.x !== sc0.x || sc1.y !== sc0.y), "鼠标中键拖：画面挪了、没画", JSON.stringify({ sc0, sc1 }));
await line(170, 40, 180, { type: "touch", id: 3, buttons: 1 });
const sc2 = await S(() => globalThis.__catsup.canvasWin().probe().screenOf(10, 10));
check((await H(tex)) === L2b && (sc2.x !== sc1.x || sc2.y !== sc1.y), "手指拖：画面挪了、没画", JSON.stringify({ sc1, sc2 }));

console.log("\n③ 吸管：点画过的一格 → 颜色 = 那一格；取完回到笔");
await S(() => { globalThis.__catsup.paint.color.set([0.1, 0.8, 0.2]); globalThis.__catsup.editor.setTool("eyedrop"); });
const want = await S((t) => { const b = globalThis.__catsup.paint.boards.get(t), p = b.pixelAt(100, 80); return [p[0], p[1], p[2]]; }, tex);
const pt = await at(100.5, 80.5);
await pe("pointerdown", pt); await pe("pointerup", pt); await frames(2);
const got = await S(() => ({ c: globalThis.__catsup.paint.color.get().map((v) => Math.round(v * 255)), tool: globalThis.__catsup.editor.tool }));
check(got.c.join() === want.join() && got.tool === "paintPen", `取到的颜色 = 那一格（${got.c.join()}）、回到笔`, JSON.stringify({ want, got }));

console.log("\n④ 两块画面来回画：模型上一笔、小窗里一笔、撤两下、重做两下");
const s0 = { L: await H(tex), B: await boardHashes(tex) };
const vp = await S(() => { const e = globalThis.__catsup.editor, V = e.vp(), pts = []; for (let i = 0; i <= 24; i++) pts.push({ x: V.w * (0.35 + 0.3 * i / 24), y: V.h * (0.45 + 0.1 * i / 24) }); return pts; });
await S(([t, pts]) => globalThis.__catsup.paint.stroke({ guid: t, points: pts, kind: "pen", size: 24, hardness: 0.8, color: [0.9, 0.7, 0.1] }), [tex, vp]); await frames(2);
const s1 = { L: await H(tex), B: await boardHashes(tex) };
await line(200, 20, 230); await frames(2);
const s2 = { L: await H(tex), B: await boardHashes(tex) };
const winIs = async (want) => (await S(() => globalThis.__catsup.canvasWin().probe().workHash()))?.hash === want;
const seq = [];
await S(() => globalThis.__catsup.editor.undo()); await frames(3); seq.push((await H(tex)) === s1.L && await winIs(s1.B.committed));
await S(() => globalThis.__catsup.editor.undo()); await frames(3); seq.push((await H(tex)) === s0.L && await winIs(s0.B.committed));
await S(() => globalThis.__catsup.editor.redo()); await frames(3); seq.push((await H(tex)) === s1.L && await winIs(s1.B.committed));
await S(() => globalThis.__catsup.editor.redo()); await frames(3); seq.push((await H(tex)) === s2.L && await winIs(s2.B.committed));
check(s1.L !== s0.L && s2.L !== s1.L && seq.every(Boolean), `每一步：图层逐字节回到当时、小窗那张 = 画板落定那张（${seq.join(" / ")}）`);
check(await S(() => globalThis.__catsup.paint.diag.check()), "核对对上");

console.log("\n⑤ 模型上画一笔（小窗开着）：一笔当中小窗跟着变、只读回变了的那块");
const w5 = await W();
let mid5 = null;
await S(([t, pts]) => { const C = globalThis.__catsup; C.paint.stroke({ guid: t, points: pts, kind: "pen", size: 10, hardness: 0.8, color: [0.2, 0.2, 0.9], midway: () => { C.editor.draw(); } }); }, [tex, vp.map((p) => ({ x: p.x, y: p.y + 30 }))]);
await frames(1);
mid5 = await W();
const reads = mid5.liveReads - w5.liveReads, cells = mid5.liveCells - w5.liveCells;
check(reads > 0 && cells / reads < 256 * 256, `一笔当中小窗读回 ${reads} 次、平均每次 ${reads ? Math.round(cells / reads) : 0} 格（整张 ${256 * 256}）`, JSON.stringify({ reads, cells }));
check((await S(() => globalThis.__catsup.canvasWin().probe().workHash()))?.hash === (await boardHashes(tex)).committed, "抬笔后小窗 = 落定那张");

console.log("\n⑥ 锁着：小窗里画不上；不在画画工作台：小窗里拖 = 挪");
const L6 = await H(tex), p6 = await pos();
await S(async () => { await globalThis.__catsup.session.setLocked(true); }); await frames(2);
const locked = await S(() => globalThis.__catsup.editor.tool);   // 锁着只留只读工具：画画工作台的笔拿不到，小窗里落不了笔
await S(() => { globalThis.__catsup.pickWorkbench("paint"); globalThis.__catsup.editor.setTool("paintPen"); }); await frames(1);
await line(230, 20, 200); await frames(2);
const hint6 = await S(() => document.querySelector("#hint")?.textContent ?? "");
check((await H(tex)) === L6 && (await pos()) === p6, `锁着（手上 = ${locked}）：图层不动、不长步（提示行：${hint6}）`);
await S(async () => { await globalThis.__catsup.session.setLocked(false); }); await frames(2);
await S(() => globalThis.__catsup.pickWorkbench("freeform")); await frames(2);
const sc6 = await S(() => globalThis.__catsup.canvasWin().probe().screenOf(10, 10));
await line(100, 40, 180); await frames(2);
const sc7 = await S(() => globalThis.__catsup.canvasWin().probe().screenOf(10, 10));
check((await H(tex)) === L6 && (sc7.x !== sc6.x || sc7.y !== sc6.y), "自由建模里在小窗拖：挪了、没画", JSON.stringify({ tool: await S(() => globalThis.__catsup.editor.tool), sc6, sc7 }));

const bad = errs.filter((e) => !/favicon|Not signed in|net::ERR/i.test(e));
check(bad.length === 0, "页面没有脚本错误", bad.join(" | "));
await browser.close();
console.log(failN ? `\nprobe-canvas-paint FAIL（${pass} ✓ / ${failN} ✗）` : `\nprobe-canvas-paint OK（${pass} ✓ / 0 ✗）`);
