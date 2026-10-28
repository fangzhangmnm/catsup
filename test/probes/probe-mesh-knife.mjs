// 自由建模工作台的刀 + 环切（2026-10-27 Claude Opus 5.5；tools/mesh-knife.ts + mesh-edits/）：网格体盒子里——
// ① 顶面对角两个角点各点一下 = 切一刀（面 6 → 7、一步撤销）；② 接着从刚才那个点切到对边的中点（链式；不在同一张面 = 拒绝不崩）；
// ③ 侧面一条竖边点两下 = 环切一圈（4 条新边进选区）；④ 浮条「环切」：选一条边 → 一圈；⑤ 撤到头 / 重做到头不崩。
// 跑法：python3 -m http.server 8765 后 node test/probes/probe-mesh-knife.mjs
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 1000, height: 800 } });
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(process.argv[2] ?? "http://127.0.0.1:8765/", { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1200);
const res = await page.evaluate(async () => {
  const e = globalThis.__catsup.editor, hud = globalThis.__catsup.hud, P = (x, y, z = 0) => ({ x, y, z }), sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const c = document.getElementById("board"), r = c.getBoundingClientRect();
  const px = (p) => e.cam.angularPx(p, e.vp());   // 世界坐标
  const fire = (type, x, y, buttons, shift = false) => c.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: r.left + x, clientY: r.top + y, pointerId: 5, pointerType: "mouse", isPrimary: true, button: 0, buttons, shiftKey: shift }));
  const drag = async (a, z, shift = false, steps = 10) => { fire("pointermove", a.x, a.y, 0, shift); await sleep(10); fire("pointerdown", a.x, a.y, 1, shift); for (let i = 1; i <= steps; i++) { fire("pointermove", a.x + (z.x - a.x) * i / steps, a.y + (z.y - a.y) * i / steps, 1, shift); await sleep(8); } fire("pointerup", z.x, z.y, 0, shift); await sleep(40); };
  const click = async (p) => { const s = px(p); fire("pointermove", s.x, s.y, 0); await sleep(10); fire("pointerdown", s.x, s.y, 1); await sleep(10); fire("pointerup", s.x, s.y, 0); await sleep(30); };
  const key = (k, ctrl = true) => window.dispatchEvent(new KeyboardEvent("keydown", { key: k, code: "Key" + k.toUpperCase(), ctrlKey: ctrl, bubbles: true, cancelable: true }));
  const box = (x0, y0, z0, x1, y1, z1) => { const B = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], segs = []; for (let i = 0; i < 4; i++) { const a = B[i], d = B[(i + 1) % 4]; segs.push([P(a[0], a[1], z0), P(d[0], d[1], z0)]); segs.push([P(a[0], a[1], z1), P(d[0], d[1], z1)]); segs.push([P(a[0], a[1], z0), P(a[0], a[1], z1)]); } e.commitOp({ op: "addEdges", at: e.activePool(), segs }); };
  const S = () => e.scene, root = () => S().def(S().root), q = (x) => +x.toFixed(4);
  const out = {};
  e.setGrid({ ...e.grid, on: false });
  box(0, 0, 0, 1, 1, 1); e.selectAll(); e.makeComponent("块"); e.runAction("object.toMesh"); await sleep(20);
  const inst = [...root().instances.values()][0], def = inst.def, m = () => S().mesh(def).kernel;
  e.cam.setView("iso"); e.zoomExtents(); e.cam.halfH *= 1.6; e.draw();
  e.selectedPools.clear(); e.selectedPools.set(`i${inst.id}`, { kind: "instance", instance: inst.id }); e.enterSelected(); await sleep(20);
  const snap = () => m().verts().map((v) => { const p = m().pt(v); return [v, q(p.x), q(p.y), q(p.z)]; });
  const topIds = () => m().verts().filter((v) => Math.abs(m().pt(v).z - 1) < 1e-6);
  const stat = () => ({ f: m().faceCount(), v: m().vertexCount(), e: m().edgeCount() });
  const tap = async (p) => { const s = px(p); fire("pointermove", s.x, s.y, 0); await sleep(15); fire("pointerdown", s.x, s.y, 1); await sleep(10); fire("pointerup", s.x, s.y, 0); await sleep(40); };
  const esc = async () => { window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", code: "Escape", bubbles: true, cancelable: true })); await sleep(30); };
  out.rail = e.modeTools().join(",");
  // ① 顶面对角切一刀：(0,0,1) → (1,1,1)
  e.setTool("knife"); const st0 = stat(), pos0 = e.history.position();
  await tap(P(0, 0, 1)); out.started = { active: e.isGestureActive(), hint: hud.status() };
  await tap(P(1, 1, 1));
  out.cut1 = { st: stat(), steps: e.history.position() - pos0, check: m().check().join(";"), hint: hud.status(), active: e.isGestureActive() };
  // ② 接着从 (1,1,1) 切到前面那张面的底边中点 (0.5,0,0)：不在同一张面 → 拒绝；再切到顶面前沿中点 (0.5,0,1)：同一张面（对角切出来的那半）→ 切
  await tap(P(0.5, 0, 0)); out.cross = { steps: e.history.position() - pos0, hint: hud.status() };
  await tap(P(0.5, 0, 1));
  out.cut2 = { st: stat(), steps: e.history.position() - pos0, check: m().check().join(";") };
  await esc(); out.escaped = !e.isGestureActive();
  key("z"); await sleep(30); key("z"); await sleep(30);
  out.undo = JSON.stringify(stat()) === JSON.stringify(st0);
  // ③ 右侧面的一条竖边（x=1, y=0）点两下 = 环切：绕盒子一圈（水平那圈）
  const st3a = stat(); await tap(P(1, 0, 0.5)); await tap(P(1, 0, 0.52));
  out.loop = { st: stat(), d: { f: stat().f - st3a.f, v: stat().v - st3a.v }, selEdges: e.selection.edges.size, check: m().check().join(";"), hint: hud.status(), active: e.isGestureActive() };
  const ringZ = [...e.selection.edges].flatMap((x) => [m().edgeA[x], m().edgeB[x]]).map((v) => q(m().pt(v).z));
  out.loopFlat = true;   // 没选区开始的环切做完不留选区（user 10-27）：环的位置在 ④（菜单版，有选区）里核
  key("z"); await sleep(30);
  // ④ 浮条「环切」：选一条边 → 菜单里有「环切」→ 点它
  e.setTool("select"); e.deselectAll(); await sleep(700); await click(P(1, 0, 0.5));   // 隔开连击窗口（刚才环切那两下在同一处）
  const menu = e.commandMenu(); out.menu = menu.map((x) => x.id);
  if (menu.some((x) => x.id === "mesh.loopCut")) hud.pick("action:mesh.loopCut"); await sleep(30);
  out.menuLoop = { d: stat().f - st3a.f, selEdges: e.selection.edges.size, flat: [...e.selection.edges].flatMap((x) => [m().edgeA[x], m().edgeB[x]]).every((v) => q(m().pt(v).z) === 0.5) };
  // ⑤ 撤到头 / 重做到头
  let threw = false;
  try { for (let i = 0; i < 20 && e.history.position() > 0; i++) { key("z"); await sleep(20); } for (let i = 0; i < 20; i++) { const p0 = e.history.position(); key("y"); await sleep(20); if (e.history.position() === p0) break; } } catch { threw = true; }
  out.undoRedoAll = { threw, kind: S().kindOf(def), mode: e.modeId, check: m().check().join(";") };
  return out;
});
await b.close();
res.errs = errs;
const ok = res.rail.includes("knife") && res.started.active
  && res.cut1.st.f === 7 && res.cut1.steps === 1 && res.cut1.check === "" && res.cut1.active
  && res.cross.steps === 1 && /不在同一张面/.test(res.cross.hint)
  && res.cut2.st.f === 8 && res.cut2.steps === 2 && res.cut2.check === "" && res.escaped && res.undo
  && res.loop.d.f === 4 && res.loop.d.v === 4 && res.loop.selEdges === 0 && res.loop.check === "" && res.loopFlat && !res.loop.active
  && res.menu.includes("mesh.loopCut") && res.menuLoop.d === 4 && res.menuLoop.selEdges === 4 && res.menuLoop.flat
  && !res.undoRedoAll.threw && res.undoRedoAll.check === "" && errs.length === 0;
console.log(JSON.stringify(res, null, 1));
console.log(ok ? "probe-mesh-knife OK" : "probe-mesh-knife FAIL");
process.exit(ok ? 0 : 1);
