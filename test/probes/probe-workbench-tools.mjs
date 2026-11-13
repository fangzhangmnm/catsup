#!/usr/bin/env node
// probe-workbench-tools.mjs —— 工作台只发自己的工具（统筹 11-11，v0.19.47）。created 2026-11-11 by Claude Opus 5.5
// 起因：画画工作台里按 E，以前编辑器的 setTool 悄悄换到自由建模、拿起建模的橡皮——人以为拿着画画的橡皮，拖一下删掉了模型（v0.19.46 实测「删除了 1 处」）。
// 现在：setTool 不换工作台（拒收、说在哪）；工具键跨工作台只按键表的跳转表 TOOL_KEY_JUMPS 明着跨、提示行说「换到了『X』工作台」；画画工作台不在表里。
//   A 硬表面：按 B → 表面 + 油漆桶；表面里按 C → 硬表面 + 圆（和 v0.19.46 一样，只多一句提示；v0.19.104 起 L = 选连着的一块、不再是画线，这里换成 C）
//   B 自由建模（网格体）：按 B → 表面 + 油漆桶；按 C → 不动，说「它在『硬表面建模』里，管的是别的物件」（和 v0.19.46 一样；原来用 L，同上换成 C）
//   C 画画：每个工具键按一遍 → 工作台、手上的工具、撤销栈都不变；按 E 再拖一下 = 拿着的还是画画的笔（画上了、模型一点没少）；一笔当中按 E = 这一笔照常画完
// 用法：python3 -m http.server 8765 后 node test/probes/probe-workbench-tools.mjs [url]
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
const here = path.dirname(fileURLToPath(import.meta.url));
const { chromium } = createRequire(path.join(here, "../../../20260524 WeebPaint/package.json"))("playwright");
const url = process.argv.slice(2).find((a) => a.startsWith("http")) ?? process.env.PROBE_URL ?? "http://127.0.0.1:8765/";
const BENIGN = /Not signed in|CloudNetworkError|Failed to fetch|net::ERR|msal|favicon|GPU stall due to ReadPixels|not persisted yet/i;
// 键表全局层的工具键（src/controller/keymap.ts TOOL_KEYS + K）：playwright 的键名
const TOOL_KEYS = ["Space", "l", "r", "c", "a", "m", "q", "s", "p", "f", "w", "b", "e", "t", "Tab", "x", "k"];
let pass = 0, failN = 0;
const check = (ok, what, extra = "") => { if (ok) { pass++; console.log("  ✓", what); } else { failN++; process.exitCode = 1; console.error("  ✗", what, extra ? `  ← ${extra}` : ""); } };
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const ctx = await browser.newContext({ viewport: { width: 1000, height: 760 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const errs = [];
page.on("pageerror", (e) => errs.push("pageerror: " + e.message));
page.on("console", (m) => { if (m.type() === "error" && !BENIGN.test(m.text())) errs.push(`console.error: ${m.text()}`); });
const S = (f, a) => page.evaluate(f, a);
await page.goto(url, { waitUntil: "load" });
await page.waitForFunction(() => globalThis.__catsup?.session && globalThis.__catsup.home);
await page.waitForTimeout(600);
await S(() => {
  const C = () => globalThis.__catsup, H = (globalThis.__WT = {});
  H.st = () => { const e = C().editor; return { mode: e.modeId, tool: e.tool, pos: e.history.position(), depth: e.history.depth(), hint: document.querySelector("#hint")?.textContent ?? "" }; };
  H.mesh = () => { let h = 2166136261, v = 0, f = 0; for (const d of C().editor.sceneRef.defs.values()) { const k = d.body?.kind === "mesh" ? d.body.kernel : null; if (!k) continue; v += k.vertexCount(); f += k.faceCount(); for (const i of k.verts()) for (let j = 0; j < 3; j++) { const q = Math.round(k.pos[i * 3 + j] * 1e6); for (let s = 0; s < 32; s += 8) { h ^= (q >> s) & 0xff; h = Math.imul(h, 16777619); } } } return `${v}v/${f}f/${(h >>> 0).toString(16)}`; };
  H.paint = () => { const b = [...C().paint.boards.guids()].map((g) => C().paint.boards.get(g))[0]; if (!b) return "没有画板"; const d = b.wp.exportData(); let h = 2166136261; for (const n of d.nodes) if (n.pixels) for (const x of n.pixels.bytes) { h ^= x; h = Math.imul(h, 16777619); } return (h >>> 0).toString(16); };
  H.pe = (type, x, y) => { const e = C().editor, p = e.cam.project({ x, y, z: 1 }, e.vp()), c = document.getElementById("board"), r = c.getBoundingClientRect(); c.dispatchEvent(new PointerEvent(type, { pointerId: 11, pointerType: "pen", clientX: r.left + p.x, clientY: r.top + p.y, bubbles: true, cancelable: true, isPrimary: true, buttons: type === "pointerup" ? 0 : 1, pressure: type === "pointerup" ? 0 : 0.5 })); e.draw(); };
  H.drag = (y) => { H.pe("pointerdown", 0.25, y); for (let i = 1; i <= 10; i++) H.pe("pointermove", 0.25 + 0.05 * i, y); H.pe("pointerup", 0.75, y); };
});
const st = () => S(() => globalThis.__WT.st());
const press = async (key) => { await page.keyboard.press(key); await page.waitForTimeout(60); return st(); };
const clearHint = () => S(() => { const h = document.querySelector("#hint"); if (h) h.textContent = ""; });

// ---------- A 硬表面 ----------
console.log("\nA 硬表面建模：按 B → 表面 + 油漆桶（明着跳、说一句）；表面里按 C → 硬表面 + 圆");
await S(() => {
  const e = globalThis.__catsup.editor, P = (x, y, z = 0) => ({ x, y, z });
  e.setGrid({ ...e.grid, on: false });
  const B = [[0, 0], [1, 0], [1, 1], [0, 1]], segs = []; for (let i = 0; i < 4; i++) { const a = B[i], d = B[(i + 1) % 4]; segs.push([P(a[0], a[1], 0), P(d[0], d[1], 0)]); segs.push([P(a[0], a[1], 1), P(d[0], d[1], 1)]); segs.push([P(a[0], a[1], 0), P(a[0], a[1], 1)]); }
  e.commitOp({ op: "addEdges", at: e.activePool(), segs }); e.clearSelection?.(); e.setTool("select"); e.cam.setView("top"); e.zoomExtents(); e.draw();
});
await page.mouse.move(500, 380);
const a0 = await st(); await clearHint();
const aB = await press("b");
check(a0.mode === "geometry" && aB.mode === "surface" && aB.tool === "paint" && /换到了「表面」工作台/.test(aB.hint), `硬表面按 B：${a0.mode} → ${aB.mode}、手上 ${aB.tool}、提示「${aB.hint}」`, JSON.stringify({ a0, aB }));
await clearHint();
const aL = await press("c");
check(aL.mode === "geometry" && aL.tool === "circle" && /换到了「硬表面建模」工作台/.test(aL.hint), `表面里按 C：→ ${aL.mode}、手上 ${aL.tool}、提示「${aL.hint}」`, JSON.stringify(aL));
await press("Escape"); await S(() => globalThis.__catsup.editor.setTool("select"));
const aE = await press("e");
check(aE.mode === "geometry" && aE.tool === "pp", "硬表面里按 E：推拉（统筹 11-13：橡皮不占键、在工具栏上拿），不跳", JSON.stringify(aE));
await S(() => globalThis.__catsup.editor.setTool("select"));

// ---------- B 自由建模（网格体）----------
console.log("\nB 自由建模（网格体）：按 B → 表面 + 油漆桶；按 C → 不动、说这把工具在哪");
const def = await S(() => {
  const e = globalThis.__catsup.editor; e.selectAll(); e.runAction("brep.orientOutward", { curvature: 3 }); e.makeComponent("盒"); e.runAction("object.toMesh");
  const S0 = e.sceneRef, inst = [...S0.def(S0.root).instances.values()][0]; e.exitTo(0); e.selectedPools.clear(); e.selectedPools.set(`i${inst.id}`, { kind: "instance", instance: inst.id }); e.enterSelected();
  e.cam.setView("top"); e.zoomExtents(); e.setTool("select"); e.clearSelection?.(); e.draw(); return inst.def;
});
const b0 = await st(); await clearHint();
const bB = await press("b");
check(b0.mode === "freeform" && bB.mode === "surface" && bB.tool === "paint" && /换到了「表面」工作台/.test(bB.hint), `自由建模按 B：→ ${bB.mode}、手上 ${bB.tool}、提示「${bB.hint}」`, JSON.stringify({ b0, bB }));
await S(() => { globalThis.__catsup.pickWorkbench("freeform"); globalThis.__catsup.editor.setTool("select"); }); await clearHint();
const bL = await press("c");
check(bL.mode === "freeform" && bL.tool === "select" && bL.pos === b0.pos && /「自由建模」工作台里没有这把工具（它在「硬表面建模」里，管的是别的物件）/.test(bL.hint), `自由建模按 C：不动，提示「${bL.hint}」`, JSON.stringify(bL));

// ---------- C 画画 ----------
console.log("\nC 画画：工具键按一遍 → 工作台 / 手上的工具 / 撤销栈都不变；按 E 再拖 = 还是画画的笔；一笔当中按 E = 这一笔照常");
await S((d) => { const C = globalThis.__catsup, e = C.editor; C.pickWorkbench("paint"); e.runAction("mesh.startPaint", { canvas: 512, arrange: "patches" }); e.cam.setView("top"); e.zoomExtents(); e.draw(); void d; }, def);
await page.waitForTimeout(200);
const c0 = await st(), m0 = await S(() => globalThis.__WT.mesh());
check(c0.mode === "paint" && c0.tool === "paintPen", `开始画了：画画工作台、手上是笔（撤销栈在 ${c0.pos}）`, JSON.stringify(c0));
const moved = [];
for (const k of TOOL_KEYS) {
  await clearHint();
  const r = await press(k);
  if (r.mode !== "paint" || r.tool !== "paintPen" || r.pos !== c0.pos || r.depth !== c0.depth) moved.push(`${k}: ${JSON.stringify(r)}`);
}
check(moved.length === 0, `画画工作台里按 ${TOOL_KEYS.length} 个工具键：工作台、手上的工具、撤销栈都没动`, moved.join(" | "));
await clearHint();
const cE = await press("e");
check(/「绘制」工作台里没有这把工具（它在「自由建模」里）/.test(cE.hint), `按 E 说一句：「${cE.hint}」`);
const p0 = await S(() => globalThis.__WT.paint());
await S(() => globalThis.__WT.drag(0.5));
const c1 = await st(), m1 = await S(() => globalThis.__WT.mesh()), p1 = await S(() => globalThis.__WT.paint());
check(c1.mode === "paint" && c1.tool === "paintPen" && p1 !== p0 && m1 === m0 && c1.pos === c0.pos + 1, `按 E 之后拖一下：画上了（一步）、模型一点没少（${m0} → ${m1}）`, JSON.stringify({ c1, m0, m1, p0, p1 }));
await S(() => { const W = globalThis.__WT; W.pe("pointerdown", 0.25, 0.3); for (let i = 1; i <= 5; i++) W.pe("pointermove", 0.25 + 0.05 * i, 0.3); });
const midBefore = await S(() => globalThis.__catsup.paint.workbench.stroking);
const cMid = await press("e");
const midAfter = await S(() => globalThis.__catsup.paint.workbench.stroking);
await S(() => { const W = globalThis.__WT; for (let i = 6; i <= 10; i++) W.pe("pointermove", 0.25 + 0.05 * i, 0.3); W.pe("pointerup", 0.75, 0.3); });
const c2 = await st(), p2 = await S(() => globalThis.__WT.paint()), m2 = await S(() => globalThis.__WT.mesh());
check(midBefore && midAfter && cMid.tool === "paintPen" && c2.pos === c1.pos + 1 && p2 !== p1 && m2 === m0, "一笔当中按 E：这一笔没被取消、照常画完（一步）、模型没动", JSON.stringify({ midBefore, midAfter, cMid, c2 }));

console.log(`\n${pass} 过 · ${failN} 红`);
if (errs.length) { console.log("页面错误：", errs.slice(0, 8)); process.exitCode = 1; }
await browser.close();
