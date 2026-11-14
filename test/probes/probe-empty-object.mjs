// 空物体 + 摆放工作台（第 1 版施工单第四节第 5 条、第五节第 3 条；2026-11-13 Claude Opus 5.5）。
// 根上两个盒子组件 A（x 0..1）、B（x 3..4），根转成网格体，选 A、B 建组件 P：
// ① P 是空物体（只装子物体），A、B 世界位置不动 ② 进 P：工作台自动换成「摆放」、下拉框里只有它、手上 = 变换（主工具）
// ③ 拿移动工具用鼠标拖 A：A 挪了、B 没动、没有报错；撤销一步回原位 ④ 在 P 里悬停 / 点空处 / 右键空处不报错
// ⑤ 在 P 里重开模型（loadScene 同一个场景）：回到根、工作台跟着身体（自由建模），没有 DRIFT、点画面不报错
// 跑法：python3 -m http.server 8765 后 node test/probes/probe-empty-object.mjs [地址]
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 1000, height: 800 } }); page.setDefaultTimeout(6000);
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(process.argv[2] ?? "http://127.0.0.1:8765/", { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1500);
await page.evaluate(async () => {
  const e = globalThis.__catsup.editor, P = (x, y, z = 0) => ({ x, y, z }), sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const box = (x0, y0, z0, x1, y1, z1) => { const s = []; const B = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]; for (let i = 0; i < 4; i++) { const a = B[i], d = B[(i + 1) % 4]; s.push([P(a[0], a[1], z0), P(d[0], d[1], z0)], [P(a[0], a[1], z1), P(d[0], d[1], z1)], [P(a[0], a[1], z0), P(a[0], a[1], z1)]); } return s; };
  const inBox = (p, lo, hi) => p.x >= lo.x - 1e-6 && p.y >= lo.y - 1e-6 && p.z >= lo.z - 1e-6 && p.x <= hi.x + 1e-6 && p.y <= hi.y + 1e-6 && p.z <= hi.z + 1e-6;
  const selectIn = (lo, hi) => { const k = e.kernel; e.deselectAll(); e.selectedPools.clear(); for (const f of k.faces()) { const r = k.faceRings3(f.id); if (r && r.outer.every((p) => inBox(p, lo, hi))) e.selection.faces.add(f.id); } for (const ed of k.edges()) { const a = k.graph.pt(ed.a), c = k.graph.pt(ed.b); if (inBox(a, lo, hi) && inBox(c, lo, hi)) e.selection.edges.add(ed.id); } };
  const S = () => e.scene;
  const instNamed = (name) => { const d = S().def(S().defOfContext(e.ctx)); for (const i of d.instances.values()) if (S().def(i.def).name === name) return i; return null; };
  const selInsts = (...names) => { e.deselectAll(); e.selectedPools.clear(); for (const n of names) { const i = instNamed(n); e.selectedPools.set(`i${i.id}`, { kind: "instance", instance: i.id }); } e.draw(); };
  const worldBox = (name) => { const v = e.liveWorld(); let lo = null, hi = null; for (const sl of v.slots) { if (S().def(sl.pool.def).name !== name) continue; for (const vx of sl.kernel.vertices()) { const gv = vx.id + sl.index * (1 << 22); if (!v.graph.hasVertex(gv)) continue; const p = v.graph.pt(gv); lo = lo ? { x: Math.min(lo.x, p.x), y: Math.min(lo.y, p.y), z: Math.min(lo.z, p.z) } : { ...p }; hi = hi ? { x: Math.max(hi.x, p.x), y: Math.max(hi.y, p.y), z: Math.max(hi.z, p.z) } : { ...p }; } } const q = (o) => o && [o.x, o.y, o.z].map((x) => +x.toFixed(4)); return lo ? { lo: q(lo), hi: q(hi) } : null; };
  const pts = () => S().pointsOfDef(S().root).map((p) => `${p.x.toFixed(5)},${p.y.toFixed(5)},${p.z.toFixed(5)}`).sort().join(";");
  const drifts = [], thrown = [];
  const trace0 = e.host.trace; e.host.trace = (t) => { if (t.kind === "drift") drifts.push(t); trace0?.(t); };
  const onErr = (ev) => thrown.push(String(ev.message ?? ev.reason)); window.addEventListener("error", onErr); window.addEventListener("unhandledrejection", onErr);
  e.setGrid({ ...e.grid, on: false });
  e.commitOp({ op: "addEdges", at: e.activePool(), segs: box(3, 0, 0, 4, 1, 1) }); selectIn(P(3, 0, 0), P(4, 1, 1)); e.makeComponent("B");
  e.commitOp({ op: "addEdges", at: e.activePool(), segs: box(0, 0, 0, 1, 1, 1) }); selectIn(P(0, 0, 0), P(1, 1, 1)); e.makeComponent("A");
  e.setTool("select"); e.deselectAll(); e.selectedPools.clear(); e.runAction("object.toMesh"); await sleep(20);
  e.cam.setView("iso"); e.zoomExtents(); e.draw(); await sleep(100);
  window.__m = { e, P, sleep, S, instNamed, selInsts, worldBox, pts, drifts, thrown, hint: () => document.getElementById("hint")?.textContent ?? "" };
});
const ev = (fn, arg) => page.evaluate(fn, arg);
const bx = await page.locator("#board").boundingBox();
const r = {};
// ① 根（网格体）里选 A、B 建组件 = 空物体 P
r.one = await ev(async () => {
  const { e, S, selInsts, pts, sleep } = window.__m, before = pts();
  const rootKind = S().kindOf(S().root);
  selInsts("A", "B"); e.makeComponent("P"); await sleep(20);
  const top = [...S().def(S().root).instances.values()], p = top.length === 1 ? top[0] : null;
  return { rootKind, top: top.length, kind: p ? S().kindOf(p.def) : null, kids: p ? S().def(p.def).instances.size : 0, still: pts() === before };
});
// ② 进 P
r.two = await ev(async () => {
  const { e, S, instNamed, sleep } = window.__m, p = instNamed("P");
  const held = e.tool;   // 手上那把（自由建模的选择）：摆放里也有 = 留着（工作台切换的老规矩）
  e.selectedPools.clear(); e.selectedPools.set(`i${p.id}`, { kind: "instance", instance: p.id }); e.enterSelected(); await sleep(30);
  const out = { held, depth: e.contextCrumbs().length - 1, kind: S().kindOf(S().defOfContext(e.context)), mode: e.mode.id, modes: e.modes().map((m) => m.label), tool: e.tool, inMode: e.mode.tools.includes(e.tool) };
  // 拿着摆放里没有的工具（挤出）进来 = 换成摆放的默认（变换 = 主工具）：先退出来、拿挤出、再进去
  e.exitContext(); await sleep(20);
  e.setTool("pp"); out.heldOutside = e.tool;
  const p2 = instNamed("P"); e.selectedPools.clear(); e.selectedPools.set(`i${p2.id}`, { kind: "instance", instance: p2.id }); e.enterSelected(); await sleep(30);
  out.toolFromPp = e.tool; out.depth2 = e.contextCrumbs().length - 1;
  return out;
});
// ③ 拿移动工具拖 A
const aShot = await ev(() => { const { e, worldBox, P } = window.__m, w = worldBox("A"); if (!w) return null; const c = P((w.lo[0] + w.hi[0]) / 2, w.lo[1], (w.lo[2] + w.hi[2]) / 2); return e.cam.angularPx(c, e.vp()); });
r.three = { aBox0: await ev(() => window.__m.worldBox("A")), bBox0: await ev(() => window.__m.worldBox("B")) };
await ev(() => { window.__m.e.setTool("move"); window.__m.e.deselectAll(); window.__m.e.selectedPools.clear(); });
if (aShot) {
  await page.mouse.move(bx.x + aShot.x, bx.y + aShot.y, { steps: 3 }); await page.waitForTimeout(60);
  await page.mouse.down(); await page.mouse.move(bx.x + aShot.x + 80, bx.y + aShot.y + 10, { steps: 8 }); await page.mouse.up(); await page.waitForTimeout(120);
}
r.three.aBox1 = await ev(() => window.__m.worldBox("A")); r.three.bBox1 = await ev(() => window.__m.worldBox("B")); r.three.hint1 = await ev(() => window.__m.hint());
await ev(() => window.__m.e.undo()); await page.waitForTimeout(80);
r.three.aBox2 = await ev(() => window.__m.worldBox("A"));
// ④ P 里悬停 / 点空处 / 右键空处
await ev(() => window.__m.e.setTool("transform"));
for (const [x, y] of [[60, 60], [bx.width / 2, bx.height / 2], [bx.width - 80, bx.height - 120]]) { await page.mouse.move(bx.x + x, bx.y + y, { steps: 3 }); await page.waitForTimeout(40); }
await page.mouse.click(bx.x + 60, bx.y + 60); await page.waitForTimeout(60);
await page.mouse.click(bx.x + 60, bx.y + 60, { button: "right" }); await page.waitForTimeout(120);
r.four = { menuItems: await page.evaluate(() => [...document.querySelectorAll(".popup-menu button, .popup-menu [role=menuitem]")].map((x) => x.textContent?.trim()).filter(Boolean).slice(0, 12)) };
await page.keyboard.press("Escape"); await page.waitForTimeout(60);
// ⑤ 在 P 里重开模型
r.five = await ev(async () => {
  const { e, S, sleep } = window.__m;
  e.loadScene(S()); await sleep(40);
  const c = document.getElementById("board"), rr = c.getBoundingClientRect(), s0 = { x: rr.width / 2, y: rr.height / 2 };
  const fire = (type, x, y, buttons) => c.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: rr.left + x, clientY: rr.top + y, pointerId: 7, pointerType: "mouse", isPrimary: true, button: 0, buttons }));
  fire("pointermove", s0.x, s0.y, 0); await sleep(10); fire("pointerdown", s0.x, s0.y, 1); await sleep(10); fire("pointerup", s0.x, s0.y, 0); await sleep(30);
  return { depth: e.contextCrumbs().length - 1, mode: e.mode.id, fits: e.mode.kinds.includes(S().kindOf(S().defOfContext(e.context))) };
});
r.drifts = await ev(() => window.__m.drifts.length); r.thrown = await ev(() => window.__m.thrown);
await b.close();
r.errs = errs;
const moved = (a, c) => !!a && !!c && a.lo.reduce((t, x, i) => t + Math.abs(x - c.lo[i]), 0) > 1e-3;
const same = (a, c) => !!a && !!c && !moved(a, c);
const checks = [
  ["① 根转成了网格体", r.one.rootKind === "mesh"],
  ["① 建组件 = 一份空物体、装着两个子物体", r.one.top === 1 && r.one.kind === "empty" && r.one.kids === 2],
  ["① 世界里的点一个不动", r.one.still],
  ["② 进去了、这一层是空物体", r.two.depth === 1 && r.two.kind === "empty"],
  ["② 工作台 = 摆放、下拉里只有它", r.two.mode === "object" && r.two.modes.join(",") === "摆放"],
  ["② 手上那把摆放里也有 = 留着", r.two.tool === r.two.held && r.two.inMode],
  ["② 拿着摆放里没有的（挤出）进来 = 换成变换", r.two.heldOutside === "pp" && r.two.depth2 === 1 && r.two.toolFromPp === "transform"],
  ["③ 拖 A：A 挪了", moved(r.three.aBox0, r.three.aBox1)],
  ["③ 拖 A：B 没动", same(r.three.bBox0, r.three.bBox1)],
  ["③ 撤销一步回原位", same(r.three.aBox0, r.three.aBox2)],
  ["⑤ 重开：回到根、工作台跟着身体", r.five.depth === 0 && r.five.fits],
  ["没有 DRIFT", r.drifts === 0],
  ["没有报错", r.thrown.length === 0 && errs.length === 0],
];
console.log(JSON.stringify(r, null, 1));
let bad = 0; for (const [n, ok] of checks) { console.log(`${ok ? "✓" : "✗"} ${n}`); if (!ok) bad++; }
console.log(bad ? `probe-empty-object FAIL（${bad} / ${checks.length}）` : `probe-empty-object OK（${checks.length} / ${checks.length}）`);
process.exit(bad ? 1 : 0);
