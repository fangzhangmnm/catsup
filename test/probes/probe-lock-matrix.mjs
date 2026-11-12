#!/usr/bin/env node
// probe-lock-matrix.mjs —— 锁上时每个工作台 × 手上每把会改东西的工具：放下成只读工具、工作台照声明（统筹 11-11，v0.19.48）。created 2026-11-11 by Claude Opus 5.5
// 起因：v0.19.47 起 setTool 不替人换工作台，锁上时画画工作台放不下笔（停在画画里、拿着笔）；更底下的画画控制器、落层不看锁（直接调控制器能画上、撤销栈多一步）。
// 一格 = 进那个工作台 → 拿那把工具 → 锁上 → 手上必须是只读工具、工作台 = 那个工作台声明的（whenLocked：就在这里拿 / 去别处拿）→ 解锁。
// 画画那一格接着：锁着时真的笔、直接调画画控制器、调试钩子 paint.stroke 各画一笔 → 画没变、撤销栈没长；锁着进不了画画工作台。
// 只读工具的名单、每个工作台的声明都从源码读（src/editor/tool-ids.ts、src/editor/modes/*.ts），不另抄一份。
// 用法：python3 -m http.server 8765 后 node test/probes/probe-lock-matrix.mjs [url]
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const here = path.dirname(fileURLToPath(import.meta.url)), root = path.join(here, "../..");
const { chromium } = createRequire(path.join(here, "../../../20260524 WeebPaint/package.json"))("playwright");
const url = process.argv.slice(2).find((a) => a.startsWith("http")) ?? process.env.PROBE_URL ?? "http://127.0.0.1:8765/";
const BENIGN = /Not signed in|CloudNetworkError|Failed to fetch|net::ERR|msal|favicon|GPU stall due to ReadPixels|not persisted yet/i;
let pass = 0, failN = 0;
const check = (ok, what, extra = "") => { if (ok) { pass++; console.log("  ✓", what); } else { failN++; process.exitCode = 1; console.error("  ✗", what, extra ? `  ← ${extra}` : ""); } };
// 源码里的名单和声明
const READ_ONLY = JSON.parse(/READ_ONLY_TOOLS: readonly Tool\[\] = (\[[^\]]*\])/.exec(readFileSync(path.join(root, "src/editor/tool-ids.ts"), "utf8"))[1]);
const DECL = {};
for (const w of ["geometry", "surface", "freeform", "verify", "paint"]) {
  const m = /readonly whenLocked: Mode\["whenLocked"\] = \{ (tool|elsewhere): "([a-zA-Z]+)" \}/.exec(readFileSync(path.join(root, `src/editor/modes/${w}.ts`), "utf8"));
  if (!m) { check(false, `${w} 没有 whenLocked 声明`); continue; }
  DECL[w] = { kind: m[1], tool: m[2] };
}
// 身体种类 → 能用的工作台（照工作台表的先后：硬表面 · 表面 · 自由建模 · 验证 · 画画）
const KINDS = { geometry: ["brep"], surface: ["brep", "mesh"], freeform: ["mesh"], verify: ["brep"], paint: ["mesh"] }, ORDER = ["geometry", "surface", "freeform", "verify", "paint"];
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await (await browser.newContext({ viewport: { width: 1000, height: 760 }, deviceScaleFactor: 1 })).newPage();
const errs = [];
page.on("pageerror", (e) => errs.push("pageerror: " + e.message));
page.on("console", (m) => { if (m.type() === "error" && !BENIGN.test(m.text())) errs.push(`console.error: ${m.text()}`); });
const S = (f, a) => page.evaluate(f, a);
await page.goto(url, { waitUntil: "load" });
await page.waitForFunction(() => globalThis.__catsup?.session && globalThis.__catsup.home);
await page.waitForTimeout(600);
// 场景：根上一个硬表面盒子（散几何）+ 一个网格体盒子（组件，开始画了）
const meshInst = await S(() => {
  const C = globalThis.__catsup, e = C.editor, P = (x, y, z = 0) => ({ x, y, z });
  const box = (ox) => { const B = [[0, 0], [1, 0], [1, 1], [0, 1]], s = []; for (let i = 0; i < 4; i++) { const a = B[i], d = B[(i + 1) % 4]; s.push([P(ox + a[0], a[1], 0), P(ox + d[0], d[1], 0)]); s.push([P(ox + a[0], a[1], 1), P(ox + d[0], d[1], 1)]); s.push([P(ox + a[0], a[1], 0), P(ox + a[0], a[1], 1)]); } return s; };
  e.setGrid({ ...e.grid, on: false });
  e.commitOp({ op: "addEdges", at: e.activePool(), segs: box(3) }); e.selectAll(); e.runAction("brep.orientOutward", { curvature: 3 }); e.makeComponent("网"); e.runAction("object.toMesh");
  const S0 = e.sceneRef, inst = [...S0.def(S0.root).instances.values()][0];
  e.exitTo(0); e.commitOp({ op: "addEdges", at: e.activePool(), segs: box(0) }); e.deselectAll?.(); e.clearSelection?.();
  e.selectedPools.clear(); e.selectedPools.set(`i${inst.id}`, { kind: "instance", instance: inst.id }); e.enterSelected();
  C.pickWorkbench("paint"); e.runAction("mesh.startPaint", { canvas: 256, arrange: "patches" }); e.exitTo(0); e.cam.setView("top"); e.zoomExtents(); e.draw();
  return inst.id;
});
const goKind = (kind) => S(([kind, inst]) => { const e = globalThis.__catsup.editor; e.exitTo(0); if (kind === "mesh") { e.selectedPools.clear(); e.selectedPools.set(`i${inst}`, { kind: "instance", instance: inst }); e.enterSelected(); } e.cam.setView("top"); e.zoomExtents(); e.draw(); }, [kind, meshInst]);
const lock = (on) => S(async (on) => { await globalThis.__catsup.session.setLocked(on); globalThis.__catsup.editor.draw(); }, on);
const state = () => S(() => ({ mode: globalThis.__catsup.editor.modeId, tool: globalThis.__catsup.editor.tool, locked: globalThis.__catsup.editor.locked }));

console.log("\n每个工作台 × 手上每把会改东西的工具 → 锁上 → 手上是只读工具、工作台照声明");
const bad = [];
let cells = 0;
for (const w of ORDER) {
  for (const kind of KINDS[w]) {
    await lock(false); await goKind(kind);
    await S((w) => globalThis.__catsup.pickWorkbench(w), w);
    const tools = await S(() => globalThis.__catsup.editor.modeTools());
    const here = await state();
    if (here.mode !== w) { bad.push(`${w}(${kind}): 进不去（${here.mode}）`); continue; }
    const d = DECL[w], want = d.kind === "tool" ? w : ORDER.find((m) => KINDS[m].includes(kind) && m !== "paint" && m !== w && true);
    for (const t of tools.filter((t) => !READ_ONLY.includes(t))) {
      await lock(false); await goKind(kind); await S((w) => globalThis.__catsup.pickWorkbench(w), w);
      await S((t) => globalThis.__catsup.editor.setTool(t), t);
      const held = await state();
      if (held.tool !== t || held.mode !== w) { bad.push(`${w}(${kind})·${t}: 拿不起来（${held.mode}/${held.tool}）`); continue; }
      await lock(true);
      const s = await state();
      cells++;
      const okTool = READ_ONLY.includes(s.tool) && s.tool === d.tool, okMode = d.kind === "tool" ? s.mode === w : (s.mode !== "paint" && s.mode === want);
      if (!s.locked || !okTool || !okMode) bad.push(`${w}(${kind})·${t} → ${s.mode}/${s.tool}（要 ${d.kind === "tool" ? w : want}/${d.tool}）`);
    }
  }
}
await lock(false);
check(bad.length === 0 && cells > 20, `${cells} 格都放下成只读工具、工作台照声明`, bad.join(" | "));

console.log("\n画画那一格接着：锁着时三种笔各画一笔 → 画没变、撤销栈没长；锁着进不了画画工作台");
await goKind("mesh"); await S(() => { globalThis.__catsup.pickWorkbench("paint"); globalThis.__catsup.editor.setTool("paintPen"); });
const tex = await S(() => [...globalThis.__catsup.editor.sceneRef.textures.values()].find((t) => t.content.kind === "layered")?.guid);
const sig = () => S((g) => { const b = globalThis.__catsup.paint.boards.get(g); if (!b) return "没有画板"; const d = b.wp.exportData(); let h = 2166136261; for (const n of d.nodes) if (n.pixels) for (const v of n.pixels.bytes) { h ^= v; h = Math.imul(h, 16777619); } return (h >>> 0).toString(16); }, tex);
const pos = () => S(() => globalThis.__catsup.editor.history.position());
const realPen = (y) => S((y) => { const C = globalThis.__catsup, e = C.editor, c = document.getElementById("board"), r = c.getBoundingClientRect(); const at = (x) => e.cam.project({ x, y, z: 1 }, e.vp()); const ev = (type, x) => { const p = at(x); c.dispatchEvent(new PointerEvent(type, { pointerId: 13, pointerType: "pen", clientX: r.left + p.x, clientY: r.top + p.y, bubbles: true, cancelable: true, isPrimary: true, buttons: type === "pointerup" ? 0 : 1, pressure: type === "pointerup" ? 0 : 0.5 })); e.draw(); }; ev("pointerdown", 3.2); for (let i = 1; i <= 8; i++) ev("pointermove", 3.2 + 0.07 * i); ev("pointerup", 3.8); }, y);
const direct = (y) => S((y) => { const C = globalThis.__catsup, e = C.editor, a = e.cam.project({ x: 3.2, y, z: 1 }, e.vp()), b = e.cam.project({ x: 3.8, y, z: 1 }, e.vp()); C.paint.workbench.pointer({ tool: "paintPen", phase: "down", x: a.x, y: a.y }); for (let i = 1; i <= 8; i++) C.paint.workbench.pointer({ tool: "paintPen", phase: "move", x: a.x + (b.x - a.x) * i / 8, y: a.y }); C.paint.workbench.pointer({ tool: "paintPen", phase: "up", x: b.x, y: b.y }); e.draw(); }, y);
const hook = (y) => S(([y, g]) => { const C = globalThis.__catsup, e = C.editor, pts = []; for (let i = 0; i <= 10; i++) { const p = e.cam.project({ x: 3.2 + 0.06 * i, y, z: 1 }, e.vp()); pts.push({ x: p.x, y: p.y }); } return C.paint.stroke({ guid: g, points: pts, size: 16, color: [0.9, 0.1, 0.1] }); }, [y, tex]);
// 对照：没锁时三种笔都画得上（不然下面的「没变」说明不了什么）
for (const [name, f, y] of [["真的笔", realPen, 0.3], ["直接调控制器", direct, 0.5], ["调试钩子", hook, 0.7]]) {
  await S(() => { globalThis.__catsup.pickWorkbench("paint"); globalThis.__catsup.editor.setTool("paintPen"); });
  const s0 = await sig(); await f(y); await page.waitForTimeout(100);
  check((await sig()) !== s0, `没锁：${name}画得上（对照）`);
}
await lock(true);
const st = await state(), s1 = await sig(), p1 = await pos();
check(st.mode !== "paint" && READ_ONLY.includes(st.tool), `锁上：离开画画工作台、手上是只读工具（${st.mode} / ${st.tool}）`, JSON.stringify(st));
const into = await S(() => { globalThis.__catsup.pickWorkbench("paint"); return globalThis.__catsup.editor.modeId; });
check(into !== "paint", `锁着进不了画画工作台（还在 ${into}）`);
for (const [name, f, y] of [["真的笔", realPen, 0.35], ["直接调控制器", direct, 0.55], ["调试钩子", hook, 0.75]]) {
  const r = await f(y); await page.waitForTimeout(100);
  check((await sig()) === s1 && (await pos()) === p1, `锁着：${name}画一笔 → 画没变、撤销栈没长${r && r.refused ? `（钩子回：${String(r.refused).slice(0, 20)}）` : ""}`);
}
await lock(false);
console.log(`\n${pass} 过 · ${failN} 红`);
if (errs.length) { console.log("页面错误：", errs.slice(0, 8)); process.exitCode = 1; }
await browser.close();
