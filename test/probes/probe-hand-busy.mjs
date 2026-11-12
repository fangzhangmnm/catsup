#!/usr/bin/env node
// probe-hand-busy.mjs —— 一笔当中不自动保存、不拍崩溃快照（「手上还有没有一下没收」的名册，controller/hand-busy.ts；统筹 11-11）。created 2026-11-11 by Claude Opus 5.5
// 会话判断「空闲、可以自动保存 / 崩溃快照」只问名册（手上还有没有一下没收：编辑器的手势、画画的一笔……），不再直接问编辑器。
// 真的编辑器 + 真的会话 + 真的画画工作台；A / B 的笔走真的 PointerEvent（笔 → 编辑器的画画工具 → 画画控制器，和人画一样），C 绕开编辑器直接调画画控制器（调试钩子那条路）；无头 swiftshader。
// 更正（同日）：真的笔画一笔时编辑器本来就算在手势中，旧的问法在 A / B 上也挡得住；只有 C 那条路以前挡不住（v0.19.45 的提交说明说「以前真会在一笔当中存」是验错了路）。
// 会话每秒一拍（tick）；「上次改动多久了」直接拨会话的 lastEditAt（不真等 30 秒），每一拍手动走 + 另外真等两秒多让定时器自己也走几拍。
//   A 临时家（开机没选家）= 崩溃快照那条路：笔按着、上次改动已经过了 31 秒、脏、该拍 → 一拍都不拍、画也不编；抬笔 → 这一下本身算改动，空闲再满 30 秒才拍；拍的时候画的缓存 = 带着这一笔的那一版。
//   B 文件夹图库家 = 自动保存那条路：同样；存完刷新 → 画 = 存之前（逐字节）。另外记一笔当中按 Ctrl+S 现在是什么行为（只记、不判，统筹要现状）。
// 用法：python3 -m http.server 8765 后 node test/probes/probe-hand-busy.mjs [url]
import { sizeRow } from "./lib/canvas-rows.mjs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
const here = path.dirname(fileURLToPath(import.meta.url));
const { chromium } = createRequire(path.join(here, "../../../20260524 WeebPaint/package.json"))("playwright");
const url = process.argv.slice(2).find((a) => a.startsWith("http")) ?? process.env.PROBE_URL ?? "http://127.0.0.1:8765/";
const FOLDER = "hand-busy";
const BENIGN = /Not signed in|CloudNetworkError|Failed to fetch|net::ERR|msal|favicon|GPU stall due to ReadPixels|not persisted yet/i;
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
const clearNotes = (S) => S(() => { for (const n of [...document.querySelectorAll("#noticeStack > *")]) n.remove(); });

/** 盒子 → 组件 → 网格体 → 进去 → 画画工作台 → 开始画 1024。返回这张画的 guid。 */
async function boxAndStart(page, S) {
  await S(() => {
    const e = globalThis.__catsup.editor, P = (x, y, z = 0) => ({ x, y, z });
    e.setGrid({ ...e.grid, on: false });
    const B = [[0, 0], [1, 0], [1, 1], [0, 1]], segs = []; for (let i = 0; i < 4; i++) { const a = B[i], d = B[(i + 1) % 4]; segs.push([P(a[0], a[1], 0), P(d[0], d[1], 0)]); segs.push([P(a[0], a[1], 1), P(d[0], d[1], 1)]); segs.push([P(a[0], a[1], 0), P(a[0], a[1], 1)]); }
    e.commitOp({ op: "addEdges", at: e.activePool(), segs }); e.selectAll(); e.runAction("brep.orientOutward", { curvature: 3 }); e.makeComponent("盒"); e.runAction("object.toMesh");
  });
  await enterBox(S);
  await S(() => { globalThis.__catsup.pickWorkbench("paint"); });
  await page.locator('button:has-text("开始画")').first().click();
  await page.waitForFunction(() => !document.getElementById("sheet").hidden && [...document.querySelectorAll("#sheetChoices .sheet-row-label")].some((l) => /1024 × 1024$/.test(l.firstChild?.textContent ?? "")));
  await sizeRow(page, "1024 × 1024").click();
  await S(() => globalThis.__catsup.editor.draw());
  return S(() => [...globalThis.__catsup.editor.sceneRef.textures.values()].find((t) => t.content.kind === "layered")?.guid ?? null);
}
const enterBox = (S) => S(() => {
  const e = globalThis.__catsup.editor, S0 = e.sceneRef, inst = [...S0.def(S0.root).instances.values()][0];
  e.exitTo(0); e.selectedPools.clear(); e.selectedPools.set(`i${inst.id}`, { kind: "instance", instance: inst.id }); e.enterSelected();
  e.cam.setView("top"); e.zoomExtents(); e.draw();
});
/** 笔在盒子顶面上：落下 / 走 n 步 / 抬起。真的 PointerEvent（笔 → 编辑器的画画工具 → 画画控制器，和人画一样；每步画一帧）。y = 顶面上哪一行（0–1）。 */
const pen = (S, phase, y, i = 0) => S(([phase, y, i]) => {
  const C = globalThis.__catsup, e = C.editor, a = e.cam.project({ x: 0.2, y, z: 1 }, e.vp()), b = e.cam.project({ x: 0.8, y, z: 1 }, e.vp());
  const t = Math.min(1, i / 12), x = a.x + (b.x - a.x) * t, yy = a.y + (b.y - a.y) * t, c = document.getElementById("board"), r = c.getBoundingClientRect();
  c.dispatchEvent(new PointerEvent({ down: "pointerdown", move: "pointermove", up: "pointerup" }[phase], { pointerId: 5, pointerType: "pen", clientX: r.left + x, clientY: r.top + yy, bubbles: true, cancelable: true, isPrimary: true, buttons: phase === "up" ? 0 : 1, pressure: phase === "up" ? 0 : 0.5 }));
  e.draw();
}, [phase, y, i]);
/** 同样的一笔，但绕开编辑器、直接调画画控制器（调试钩子那条路）：钉住名册的 paint.stroke 那一行自己挡得住（编辑器的手势这时候是假的）。 */
const penDirect = (S, phase, y, i = 0) => S(([phase, y, i]) => {
  const C = globalThis.__catsup, e = C.editor, a = e.cam.project({ x: 0.2, y, z: 1 }, e.vp()), b = e.cam.project({ x: 0.8, y, z: 1 }, e.vp());
  const t = Math.min(1, i / 12), x = a.x + (b.x - a.x) * t, yy = a.y + (b.y - a.y) * t;
  C.paint.workbench.pointer({ tool: "paintPen", phase, x, y: yy }); e.draw();
}, [phase, y, i]);
/** 会话存盘那几条路包一层计数（save / 崩溃快照 / 画的编码）。 */
const watch = (S) => S(() => {
  const C = globalThis.__catsup, n = (globalThis.__HB = { save: 0, snapshot: 0, freeze: 0, refresh: 0 });
  for (const [o, k] of [[C.session, "save"], [C.session, "snapshot"], [C.paint.saver, "freeze"], [C.paint.saver, "refresh"]]) {
    if (o["__hb_" + k]) continue;
    const f = o[k]; o["__hb_" + k] = f;
    o[k] = function (...a) { globalThis.__HB[k]++; return f.apply(this, a); };
  }
  void n;
});
const counts = (S) => S(() => ({ ...globalThis.__HB }));
const zero = (S) => S(() => { for (const k of Object.keys(globalThis.__HB)) globalThis.__HB[k] = 0; });
/** 拨「上次改动」到 31 秒前、手动走几拍，再真等一会儿让定时器自己走几拍（笔还按着就边等边走）。 */
const idleTicks = async (page, S, { moving = false, y = 0.5, from = 0 } = {}) => {
  await S(() => { const s = globalThis.__catsup.session; s.lastEditAt = performance.now() - 31000; s.tick(); s.tick(); s.tick(); });
  for (let k = 0; k < 5; k++) { await page.waitForTimeout(500); if (moving) await pen(S, "move", y, from + k + 1); await S(() => { const s = globalThis.__catsup.session; s.lastEditAt = performance.now() - 31000; s.tick(); }); }
};
const why = (S) => S(() => { const C = globalThis.__catsup, s = C.session; return { hand: C.hand.which(), dirty: s.dirty(), snapDue: s.snapDue(), saving: s.saving, home: s.home.kind, lazy: s.lazy, luggage: !!s.luggage, idleFor: Math.round((performance.now() - s.lastEditAt) / 1000) }; });
const paintHash = (S, g) => S((g) => { const b = globalThis.__catsup.paint.boards.get(g); if (!b) return "没有画板"; const d = b.wp.exportData(); let h = 2166136261; for (const n of d.nodes) if (n.pixels) for (const v of n.pixels.bytes) { h ^= v; h = Math.imul(h, 16777619); } return (h >>> 0).toString(16); }, g);
const cacheFresh = (S, g) => S((g) => { const C = globalThis.__catsup, b = C.paint.boards.get(g), c = C.paint.saver.cache?.get(g); return !!b && !!c && c.board === b && c.version === b.wp.commitVersion; }, g);

// ---------- A 临时家：崩溃快照 ----------
console.log("\nA 临时家（开机没选家）：一笔当中不拍崩溃快照、画也不编；抬笔后空闲满 30 秒才拍，拍的是带着这一笔的");
{
  const { ctx, page, S } = await open();
  const g = await boxAndStart(page, S);
  check(!!g && (await S(() => globalThis.__catsup.session.home.kind)) === "transient", "临时家里开始画了", String(g));
  check(JSON.stringify(await S(() => globalThis.__catsup.hand.sources())) === JSON.stringify(["editor.gesture", "paint.stroke"]), "名册上两行：编辑器的手势、画画的一笔");
  await pen(S, "down", 0.3); for (let i = 1; i <= 12; i++) await pen(S, "move", 0.3, i); await pen(S, "up", 0.3, 12);   // 笔 A
  await S(() => globalThis.__catsup.session.tick());   // 会话看见这一笔（上次改动 = 现在）
  await watch(S);
  await pen(S, "down", 0.6); await pen(S, "move", 0.6, 1);   // 笔 B 按下去
  const who = await S(() => ({ stroking: globalThis.__catsup.paint.workbench.stroking, busy: globalThis.__catsup.hand.busy(), which: globalThis.__catsup.hand.which(), gesture: globalThis.__catsup.editor.isGestureActive() }));
  check(who.stroking && who.busy, `笔 B 按着：名册说手上有一下没收（${who.which}；真的笔走编辑器的画画工具，编辑器也算手势中 = ${who.gesture}）`, JSON.stringify(who));
  await zero(S);
  await idleTicks(page, S, { moving: true, y: 0.6, from: 1 });
  const w1 = await why(S), c1 = await counts(S);
  check(w1.dirty && w1.snapDue && !w1.saving && w1.luggage && w1.idleFor >= 30, `别的条件都满足（脏、该拍、没在存、有行李牌、上次改动 ${w1.idleFor} 秒前）= 只差「手上有一下没收」这一条`, JSON.stringify(w1));
  check(c1.snapshot === 0 && c1.refresh === 0 && c1.freeze === 0 && c1.save === 0, `一笔当中：快照 ${c1.snapshot}、画的编码 ${c1.refresh + c1.freeze}、保存 ${c1.save}（都该是 0）`, JSON.stringify(c1));
  await pen(S, "up", 0.6, 12);
  const revUp = await S(() => { const s = globalThis.__catsup.session; s.tick(); return Math.round((performance.now() - s.lastEditAt) / 1000); });
  await page.waitForTimeout(300);
  const c2 = await counts(S);
  check(revUp <= 1 && c2.snapshot === 0, `抬笔这一下本身算改动（上次改动 = ${revUp} 秒前）：这一拍不拍（和编辑器的手势一样，空闲再满 30 秒）`, JSON.stringify({ revUp, c2 }));
  await S(() => { const s = globalThis.__catsup.session; s.lastEditAt = performance.now() - 31000; s.tick(); });
  await page.waitForFunction(() => globalThis.__HB.snapshot > 0 && !globalThis.__catsup.session.snapRun && !globalThis.__catsup.session.refreshing, null, { timeout: 30000 }).catch(() => {});
  const c3 = await counts(S);
  check(c3.snapshot >= 1 && c3.refresh >= 1, `抬笔后空闲满 30 秒：拍了（快照 ${c3.snapshot}、画的编码 ${c3.refresh}）`, JSON.stringify(c3));
  check(await cacheFresh(S, g), "拍的时候画的缓存 = 画板现在这一版（带着笔 B）");
  await ctx.close();
}

// ---------- B 文件夹图库家：自动保存 ----------
console.log("\nB 文件夹图库家：一笔当中不自动保存；抬笔后空闲满 30 秒才存；存下来的带着这一笔（刷新对字节）；一笔当中按 Ctrl+S 现在怎样（只记）");
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
  await clearNotes(S);
  const g = await boxAndStart(page, S);
  check(!!g && (await S(() => globalThis.__catsup.session.home.kind)) === "gallery", "文件夹图库家里开始画了");
  check(await S(async () => globalThis.__catsup.session.save()) === true, "先存一次（干净）");
  await pen(S, "down", 0.3); for (let i = 1; i <= 12; i++) await pen(S, "move", 0.3, i); await pen(S, "up", 0.3, 12);   // 笔 A
  await S(() => globalThis.__catsup.session.tick());
  await watch(S);
  await pen(S, "down", 0.6); await pen(S, "move", 0.6, 1);   // 笔 B
  await zero(S);
  await idleTicks(page, S, { moving: true, y: 0.6, from: 1 });
  const w1 = await why(S), c1 = await counts(S);
  check(w1.dirty && !w1.saving && w1.home === "gallery" && !w1.lazy && w1.idleFor >= 30, `别的条件都满足（脏、没在存、图库家、不是空白、上次改动 ${w1.idleFor} 秒前）= 只差「手上有一下没收」这一条`, JSON.stringify(w1));
  check(c1.save === 0 && c1.freeze === 0 && c1.refresh === 0, `一笔当中：保存 ${c1.save}、画的编码 ${c1.freeze + c1.refresh}（都该是 0）`, JSON.stringify(c1));
  // 一笔当中按 Ctrl+S：只记现状（统筹 11-11「查一下现状报我，这次先不改」）
  await zero(S);
  const hashMid = await paintHash(S, g);
  await page.keyboard.press("Control+s");
  await page.waitForTimeout(300);
  await page.waitForFunction(() => !globalThis.__catsup.session.saving, null, { timeout: 30000 }).catch(() => {});
  const cs = await counts(S), stillDown = await S(() => globalThis.__catsup.paint.workbench.stroking), dirtyAfter = await S(() => globalThis.__catsup.session.dirty());
  console.log(`    现状：一笔当中按 Ctrl+S → 保存 ${cs.save} 次、画的编码 ${cs.freeze} 次；之后笔${stillDown ? "还按着" : "已经不在了"}、文件${dirtyAfter ? "还脏" : "干净了"}；画板（落定的那份）按之前 ${hashMid}`);
  for (let i = 7; i <= 12; i++) await pen(S, "move", 0.6, i);
  await pen(S, "up", 0.6, 12);
  const afterUp = await paintHash(S, g);
  check(afterUp !== hashMid, "笔 B 抬起：落进画里了（Ctrl+S 之后这一笔照样画完）");
  await zero(S);
  const revUp = await S(() => { const s = globalThis.__catsup.session; s.tick(); return Math.round((performance.now() - s.lastEditAt) / 1000); });
  await page.waitForTimeout(300);
  check(revUp <= 1 && (await counts(S)).save === 0, `抬笔这一下本身算改动（上次改动 = ${revUp} 秒前）：这一拍不存`);
  await S(() => { const s = globalThis.__catsup.session; s.lastEditAt = performance.now() - 31000; s.tick(); });
  await page.waitForFunction(() => globalThis.__HB.save > 0 && !globalThis.__catsup.session.saving && !globalThis.__catsup.session.dirty(), null, { timeout: 30000 }).catch(() => {});
  const c3 = await counts(S), clean = !(await S(() => globalThis.__catsup.session.dirty()));
  check(c3.save >= 1 && clean, `抬笔后空闲满 30 秒：自动存了（保存 ${c3.save}）、文件干净了`, JSON.stringify({ c3, clean }));
  await reloaded(() => page.reload());
  await clearNotes(S);
  await enterBox(S);
  await S(() => { globalThis.__catsup.pickWorkbench("paint"); globalThis.__catsup.editor.draw(); });
  await page.waitForFunction((g) => globalThis.__catsup.paint.state(g) === "hot", g, { timeout: 15000 }).catch(() => {});
  const reopened = await paintHash(S, g);
  check(reopened === afterUp, `刷新重开：画 = 自动存之前那一版（带着笔 B）`, JSON.stringify({ reopened, afterUp }));
  await ctx.close();
}

// ---------- C 绕开编辑器的那条路（调试钩子）：名册的 paint.stroke 那一行自己挡得住 ----------
console.log("\nC 绕开编辑器、直接调画画控制器（调试钩子那条路；编辑器的手势这时是假的）：一笔当中照样不拍");
{
  const { ctx, page, S } = await open();
  const g = await boxAndStart(page, S);
  await penDirect(S, "down", 0.3); for (let i = 1; i <= 12; i++) await penDirect(S, "move", 0.3, i); await penDirect(S, "up", 0.3, 12);
  await S(() => globalThis.__catsup.session.tick());
  await watch(S);
  await penDirect(S, "down", 0.6); await penDirect(S, "move", 0.6, 1);
  const who = await S(() => ({ which: globalThis.__catsup.hand.which(), gesture: globalThis.__catsup.editor.isGestureActive() }));
  check(!!g && who.which === "paint.stroke" && !who.gesture, `只有名册的 paint.stroke 那一行说忙（编辑器的手势 = ${who.gesture}）`, JSON.stringify(who));
  await zero(S);
  await S(() => { const s = globalThis.__catsup.session; s.lastEditAt = performance.now() - 31000; s.tick(); s.tick(); });
  for (let k = 0; k < 4; k++) { await page.waitForTimeout(500); await penDirect(S, "move", 0.6, 2 + k); await S(() => { const s = globalThis.__catsup.session; s.lastEditAt = performance.now() - 31000; s.tick(); }); }
  const w = await why(S), c = await counts(S);
  check(w.dirty && w.snapDue && w.idleFor >= 30 && c.snapshot === 0 && c.refresh === 0 && c.freeze === 0, `一笔当中：快照 ${c.snapshot}、画的编码 ${c.refresh + c.freeze}（别的条件都满足：脏、该拍、上次改动 ${w.idleFor} 秒前）`, JSON.stringify({ w, c }));
  await penDirect(S, "up", 0.6, 12);
  await ctx.close();
}

console.log(`\n${pass} 过 · ${failN} 红`);
if (errs.length) { console.log("页面错误：", errs.slice(0, 8)); process.exitCode = 1; }
await browser.close();
