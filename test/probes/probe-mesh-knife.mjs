// 自由建模工作台的刀 + 环切（2026-10-27 Claude Opus 5.5；tools/mesh-knife.ts + mesh-edits/）：网格体盒子里——
// ① 顶面对角两个角点各点一下 = 切一刀（面 6 → 7、一步撤销）；② 接着从刚才那个点切到对边的中点（链式；不在同一张面 = 拒绝不崩）；
// ③ 同一条竖边点一下光标不动 = 没有环切预演、原地再点 = 什么都没切、刀还开着（v0.19.96：「同一处再点 = 收刀」撤了），Ctrl+R 再点它 = 环切一圈；④ 浮条「环切」：选一条边 → 一圈；⑤ 撤到头 / 重做到头不崩；
// ⑥ 落点在透视下不偏（W-1）：立方体边正中、4 m 长边五处，标记离光标 ≤ 1 像素，透视正交都是；
// ⑦ 刀 = 要先找位置的（v0.19.96，笔的设计稿第七节第 3 步）：不报压感的笔（恒 0.5）滑过去不下点、点一下下点、点着切一刀、换边重开没有旧线、面中间提示行空、转视角线不飘；
//    报压感的笔：轻按着滑只找、重按 = 下点（笔尖闪一圈）、接着滑再重按 = 切一刀、抬笔 = 收刀；抬笔 20 ms 又落下 = 当没断过接着切；报压感的笔轻轻点一下 = 不下点。
// ⑧ 落点跟吸附开关走（v0.19.91，2026-11-13 user「没有开吸附的时候，它是应该不会吸附终点的」）：鼠标底 = 关，Shift = 开；沿一条边离端点 10 像素 / 离中点 5 像素 / 离端点 1.5 像素
//    关着 = 边上那一点、边上那一点（不是 0.5）、端点（2 像素内）；开着 = 端点、中点、端点。
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
  box(0, 0, 0, 1, 1, 1); e.selectAll(); e.runAction("brep.orientOutward", { curvature: 3 }); e.makeComponent("块"); e.runAction("object.toMesh"); await sleep(20);
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
  // ③ W-2（2026-11-10）：环切只走自己的入口。竖边（x=1, y=0）点一下、光标不动 = 刀开着、没有环切预演；同一处再点一下 = 什么都没切、刀还开着（v0.19.96）；
  // Ctrl+R 再点这条边 = 环切：绕盒子一圈（水平那圈）
  const st3a = stat(), pos3 = e.history.position(), s3 = px(P(1, 0, 0.5));
  await tap(P(1, 0, 0.5)); fire("pointermove", s3.x + 0.5, s3.y, 0); await sleep(30); fire("pointermove", s3.x, s3.y, 0); await sleep(30);
  out.still = { active: e.isGestureActive(), preview: !!e.liveMesh, hint: hud.status() };
  await tap(P(1, 0, 0.52));
  out.again = { same: JSON.stringify(stat()) === JSON.stringify(st3a), steps: e.history.position() - pos3, active: e.isGestureActive() };
  key("r"); await sleep(30); await tap(P(1, 0, 0.5));
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
// ⑥ 落点在透视下不偏（W-1，2026-11-10 Claude Opus 5.5；白模第一批）：沿 Y 4 m 长、往里伸的边，屏幕上 15–85% 五处悬停，
// 标记（落点）投回屏幕离光标 ≤ 1 像素；正交同样五处；默认视角（透视）立方体边正中悬停，标记在光标下。以前按屏幕比例取点：8 / 54–160 像素。
const perspCheck = async (which) => { await page.goto(process.argv[2] ?? "http://127.0.0.1:8765/", { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1200); return page.evaluate(async (which) => {
  const e = globalThis.__catsup.editor, P = (x, y, z = 0) => ({ x, y, z }), sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const c = document.getElementById("board"), r = c.getBoundingClientRect(), px = (p) => e.cam.angularPx(p, e.vp());
  const hover = async (x, y) => { for (const [dx, dy] of [[3, 3], [0, 0]]) { c.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, clientX: r.left + x + dx, clientY: r.top + y + dy, pointerId: 5, pointerType: "mouse", isPrimary: true, buttons: 0 })); await sleep(15); } const s = e.snapInfo; if (!s) return null; const q = px(s.p); return { kind: s.kind, off: +Math.hypot(q.x - x, q.y - y).toFixed(3) }; };
  const ly = which === "cube" ? 1 : 4, B = [[0, 0], [1, 0], [1, ly], [0, ly]], segs = [];
  for (let i = 0; i < 4; i++) { const a = B[i], d = B[(i + 1) % 4]; segs.push([P(a[0], a[1], 0), P(d[0], d[1], 0)]); segs.push([P(a[0], a[1], 1), P(d[0], d[1], 1)]); segs.push([P(a[0], a[1], 0), P(a[0], a[1], 1)]); }
  e.setGrid({ ...e.grid, on: false }); const projection0 = e.cam.projection;
  e.commitOp({ op: "addEdges", at: e.activePool(), segs }); e.selectAll(); e.runAction("brep.orientOutward", { curvature: 3 }); e.makeComponent("块"); e.runAction("object.toMesh"); await sleep(20);
  const S = e.scene, inst = [...S.def(S.root).instances.values()][0]; e.cam.setView("iso"); e.zoomExtents(); e.cam.halfH *= 1.6; e.draw();
  e.selectedPools.clear(); e.selectedPools.set(`i${inst.id}`, { kind: "instance", instance: inst.id }); e.enterSelected(); await sleep(30); e.setTool("knife"); await sleep(20);
  if (which === "cube") { const mid = px(P(0.5, 0, 1)); return { defaultProjection: projection0, mid: await hover(mid.x, mid.y) }; }
  const sweep = async (projection) => {
    e.cam.projection = projection; e.cam.target = P(0.5, 2, 0.5); e.cam.halfH = 1.6; e.cam.pitch = 0.45;
    let best = null; for (let k = 0; k < 16; k++) { e.cam.yaw = (k / 16) * Math.PI * 2; const f = e.cam.forward(); if (!best || f.y > best.fy) best = { yaw: e.cam.yaw, fy: f.y }; }
    e.cam.yaw = best.yaw; e.draw(); await sleep(30);
    const qa = px(P(1, 0, 1)), qb = px(P(1, 4, 1)), rows = [];
    for (const s of [0.15, 0.3, 0.5, 0.7, 0.85]) rows.push(await hover(qa.x + (qb.x - qa.x) * s, qa.y + (qb.y - qa.y) * s));
    return rows;
  };
  return { persp: await sweep("persp"), ortho: await sweep("ortho") };
}, which); };
res.cube = await perspCheck("cube");
res.long = await perspCheck("long");
// ⑦ 要先找位置的（v0.19.96）：鼠标悬停在中点附近 = 中点（Shift）/ 边上那一点；不报压感的笔滑过去不下点、点一下下点；换一条边重新开始时屏幕上没有连到上一笔的线、标记在新起点上；
// 光标滑到面中间提示行是空的；转视角之后刀线末端还在光标下（不飘）；笔点着切一刀。之后报压感的笔：重按下点、抬笔收刀、宽限、轻点不下点、笔尖闪。
res.pen = await (async () => { await page.goto(process.argv[2] ?? "http://127.0.0.1:8765/", { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1200); return page.evaluate(async () => {
  const e = globalThis.__catsup.editor, hud = globalThis.__catsup.hud, P = (x, y, z = 0) => ({ x, y, z }), sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const c = document.getElementById("board"), r = c.getBoundingClientRect(), px = (p) => e.cam.angularPx(p, e.vp());
  const fire = (type, q, buttons, pointerType) => c.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, clientX: r.left + q.x, clientY: r.top + q.y, pointerId: pointerType === "pen" ? 7 : 5, pointerType, isPrimary: true, button: 0, buttons, pressure: buttons ? 0.5 : 0 }));
  const penSlide = async (a, z) => { fire("pointerdown", a, 1, "pen"); await sleep(20); for (let i = 1; i <= 8; i++) { fire("pointermove", { x: a.x + (z.x - a.x) * i / 8, y: a.y + (z.y - a.y) * i / 8 }, 1, "pen"); await sleep(15); } fire("pointerup", z, 0, "pen"); await sleep(40); };
  const penTap = async (q) => { fire("pointerdown", q, 1, "pen"); await sleep(20); fire("pointerup", q, 0, "pen"); await sleep(40); };
  const hover = async (q) => { fire("pointermove", { x: q.x + 2, y: q.y + 2 }, 0, "mouse"); await sleep(15); fire("pointermove", q, 0, "mouse"); await sleep(25); };
  const B = [[0, 0], [1, 0], [1, 1], [0, 1]], segs = [];
  for (let i = 0; i < 4; i++) { const a = B[i], d = B[(i + 1) % 4]; segs.push([P(a[0], a[1], 0), P(d[0], d[1], 0)]); segs.push([P(a[0], a[1], 1), P(d[0], d[1], 1)]); segs.push([P(a[0], a[1], 0), P(a[0], a[1], 1)]); }
  e.setGrid({ ...e.grid, on: false });
  e.commitOp({ op: "addEdges", at: e.activePool(), segs }); e.selectAll(); e.runAction("brep.orientOutward", { curvature: 3 }); e.makeComponent("块"); e.runAction("object.toMesh"); await sleep(20);
  const S = e.scene, inst = [...S.def(S.root).instances.values()][0], m = () => S.mesh(inst.def).kernel; e.cam.setView("iso"); e.zoomExtents(); e.cam.halfH *= 1.6; e.draw();
  e.selectedPools.clear(); e.selectedPools.set(`i${inst.id}`, { kind: "instance", instance: inst.id }); e.enterSelected(); await sleep(30); e.setTool("knife"); await sleep(20);
  const k = e.handlers.knife, line = () => k.viewExtras(e.toolCtx)?.knifeLine ?? null, esc = async () => { window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", code: "Escape", bubbles: true, cancelable: true })); await sleep(30); };
  const out = {};
  const mq = px(P(0.5, 0, 1)); await hover({ x: mq.x + 3, y: mq.y }); out.mid = e.snapInfo?.kind ?? null;   // 鼠标、没按 Shift = 吸附关着：离中点 3 像素 = 边上那一点（⑧）
  const hoverS = async (q, shift) => { for (const d of [2, 0]) { c.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, clientX: r.left + q.x + d, clientY: r.top + q.y + d, pointerId: 5, pointerType: "mouse", isPrimary: true, buttons: 0, shiftKey: shift })); await sleep(20); } };
  await hoverS({ x: mq.x + 3, y: mq.y }, true); out.midShift = e.snapInfo?.kind ?? null;
  // 不报压感的笔（恒 0.5）按在右侧面中间、滑到上边、松开 = 拖完松开不下点（只找位置）
  await penSlide(px(P(1, 0.5, 0.5)), px(P(1, 0.25, 1)));
  out.slide = { start: k.start, active: e.isGestureActive() };
  // 不报压感的笔点竖边 X（x=1, y=1）= 起点在 X（统筹审后 b：恒 0.5 的笔点一下 = 下了一个点）；Esc；再点另一条竖边 Y（x=1, y=0）：起点在 Y、屏幕上没有刀线连到 X
  await penTap(px(P(1, 1, 0.3))); out.flatTap = { onX: !!k.startW && Math.abs(k.startW.y - 1) < 1e-6 && Math.abs(k.startW.x - 1) < 1e-6 }; await esc();
  await penTap(px(P(1, 0, 0.3)));
  const L = line(), sn = e.snapInfo; out.fresh = { startIsY: !!k.startW && Math.abs(k.startW.y) < 1e-6 && Math.abs(k.startW.x - 1) < 1e-6, line: !!L && Math.hypot(L.b.x - L.a.x, L.b.y - L.a.y, L.b.z - L.a.z) > 1e-6, markerAtStart: !!sn && !!k.startW && Math.hypot(sn.p.x - k.startW.x, sn.p.y - k.startW.y, sn.p.z - k.startW.z) < 1e-9 };
  // 鼠标滑到同一张面的上边（有预演 = 提示行有字），再滑到面中间（没落点 = 提示行空）
  await hover(px(P(1, 0.25, 1))); out.hintOnEdge = hud.status();
  const fm = px(P(1, 0.6, 0.6)); await hover(fm); out.hintOnFace = hud.status();
  // 转视角（不动光标）：刀线末端投回屏幕还在光标下
  e.cam.yaw += 0.7; e.cam.pitch = Math.max(0.05, e.cam.pitch - 0.2); e.draw(); await sleep(30);
  const L2 = line(), q2 = L2 ? px(L2.b) : null; out.orbit = { line: !!L2, off: q2 ? +Math.hypot(q2.x - fm.x, q2.y - fm.y).toFixed(3) : null };
  e.cam.setView("iso"); e.zoomExtents(); e.cam.halfH *= 1.6; e.draw(); await sleep(20);
  // 不报压感的笔：点上边 = 从 Y 上的起点切一刀
  const f0 = m().faceCount(); await penTap(px(P(1, 0.75, 1)));
  out.penCut = { df: m().faceCount() - f0, active: e.isGestureActive(), check: m().check().join(";"), hint: hud.status() };
  // ⑧ 落点跟吸附开关走：前上边（y = 0, z = 1，x 从 0 到 1；上面几刀没碰它）。Esc 一次 = 收刀（再按会退出这一层）
  await esc();
  const ea = px(P(0, 0, 1)), eb = px(P(1, 0, 1)), em = px(P(0.5, 0, 1)), L0 = Math.hypot(eb.x - ea.x, eb.y - ea.y), u = { x: (eb.x - ea.x) / L0, y: (eb.y - ea.y) / L0 };
  const at = (o, d) => ({ x: o.x + u.x * d, y: o.y + u.y * d });
  const look = async (q, shift) => { await hoverS(q, shift); const h = k.hov; return h ? ("v" in h.pt ? { kind: h.kind, v: true } : { kind: h.kind, t: +h.pt.t.toFixed(4) }) : null; };
  out.snap = {};
  for (const shift of [false, true]) out.snap[shift ? "on" : "off"] = { end10: await look(at(ea, 10), shift), mid5: await look(at(em, 5), shift), end1: await look(at(ea, 1.5), shift) };
  out.snap.edgePx = +L0.toFixed(1);
  // ---- 报压感的笔（顶面 z = 1）。⑧ 只悬停、没有开着的一串；不按 Esc（再按会退出这一层） ----
  out.ctxBefore = { mode: e.modeId, tool: e.tool, active: e.isGestureActive() };
  let pid = 20, pulses = 0;
  new MutationObserver((ms) => { for (const x of ms) for (const n of x.addedNodes) if (n.classList?.contains("press-pulse")) pulses++; }).observe(document.body, { childList: true });
  const pf = (type, q, p) => c.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, clientX: r.left + q.x, clientY: r.top + q.y, pointerId: pid, pointerType: "pen", isPrimary: true, button: type === "pointermove" ? -1 : 0, buttons: type === "pointerup" ? 0 : 1, pressure: type === "pointerup" ? 0 : p }));
  const lerp = (a, z, u) => ({ x: a.x + (z.x - a.x) * u, y: a.y + (z.y - a.y) * u });
  const pdown = async (q) => { pid++; pf("pointerdown", q, 0.1); await sleep(10); for (let i = 0; i < 12; i++) { pf("pointermove", q, 0.15 + (i % 2 ? 0.01 : -0.01)); await sleep(10); } };   // 轻轻落笔、在原地轻按一会儿（过了落笔那一段）
  const glide = async (a, z) => { for (let i = 1; i <= 10; i++) { pf("pointermove", lerp(a, z, i / 10), 0.15 + (i % 2 ? 0.01 : -0.01)); await sleep(10); } };
  const hard = async (q) => { for (const p of [0.3, 0.45, 0.6, 0.6, 0.6, 0.35, 0.2, 0.15, 0.15]) { pf("pointermove", q, p); await sleep(8); } };   // 三个样本猛升、按住、退回轻按（才认下一次）
  const lift = async (q, wait = 120) => { pf("pointerup", q, 0); await sleep(wait); };
  const F = px(P(0.5, 0.5, 1)), A = px(P(0.3, 0, 1)), B2 = px(P(0.6, 1, 1)), fT = () => m().faceCount();
  // P1：面中间落笔、轻按着滑到前边 = 只找（没起点）；重按 = 第一个点；滑到后边重按 = 切一刀；抬笔 = 收刀
  const t0 = fT(); await pdown(F); await glide(F, A); const seekOnly = { start: k.start, marker: k.hov?.kind ?? null };
  await hard(A); const first = { onFront: !!k.startW && Math.abs(k.startW.y) < 1e-6 && Math.abs(k.startW.z - 1) < 1e-6 };
  await glide(A, B2); await hard(B2); const cutP = { df: fT() - t0, active: e.isGestureActive(), check: m().check().join(";") };
  await lift(B2); out.press = { seekOnly, first, cutP, endedByLift: !e.isGestureActive() && !k.start };
  // P2：抬笔宽限。左半面：左边重按 = 起点，抬笔、20 ms 又落下（另一根指针号）接着滑到后边重按 = 切一刀（没被收掉）；再抬笔等 120 ms = 收刀
  const L1 = px(P(0, 0.3, 1)), Bk = px(P(0.15, 1, 1)), Fm = px(P(0.12, 0.5, 1)), t1 = fT();
  await pdown(Fm); await glide(Fm, L1); await hard(L1); const g0 = { started: !!k.start };
  pf("pointerup", L1, 0); await sleep(20); pid++; pf("pointerdown", L1, 0.15); await sleep(10);
  await glide(L1, Bk); await hard(Bk); const g1 = { df: fT() - t1, active: e.isGestureActive() };
  await lift(Bk); out.grace = { g0, g1, ended: !e.isGestureActive() };
  // P3：报压感的笔轻轻点一下 = 不下点（抬笔，什么都没有）
  const t2 = fT(), pTap = px(P(0, 0.7, 1)); pid++; pf("pointerdown", pTap, 0.08); await sleep(8); pf("pointermove", pTap, 0.14); await sleep(8); await lift(pTap);
  out.lightTap = { start: k.start, df: fT() - t2, active: e.isGestureActive() };
  out.pulses = pulses;
  return out;
}); })();
await b.close();
res.errs = errs;
const ok = res.rail.includes("knife") && res.started.active
  && res.cut1.st.f === 7 && res.cut1.steps === 1 && res.cut1.check === "" && res.cut1.active
  && res.cross.steps === 1 && /不在同一张面/.test(res.cross.hint)
  && res.cut2.st.f === 8 && res.cut2.steps === 2 && res.cut2.check === "" && res.escaped && res.undo
  && res.still.active && !res.still.preview && res.again.same && res.again.steps === 0 && res.again.active
  && res.loop.d.f === 4 && res.loop.d.v === 4 && res.loop.selEdges === 0 && res.loop.check === "" && res.loopFlat && !res.loop.active
  && res.menu.includes("mesh.loopCut") && res.menuLoop.d === 4 && res.menuLoop.selEdges === 4 && res.menuLoop.flat
  && !res.undoRedoAll.threw && res.undoRedoAll.check === "" && errs.length === 0
  && res.cube.defaultProjection === "persp" && ["on-edge", "midpoint"].includes(res.cube.mid?.kind) && res.cube.mid.off <= 1
  && [...res.long.persp, ...res.long.ortho].every((x) => ["on-edge", "midpoint"].includes(x?.kind) && x.off <= 1)
  && res.pen.mid === "on-edge" && res.pen.midShift === "midpoint" && res.pen.slide.start === null && res.pen.flatTap.onX
  && res.pen.fresh.startIsY && !res.pen.fresh.line && res.pen.fresh.markerAtStart && res.pen.hintOnFace === "" && res.pen.hintOnEdge !== ""
  && res.pen.orbit.line && res.pen.orbit.off <= 1 && res.pen.penCut.df === 1 && res.pen.penCut.active
  && res.pen.snap.off.end10?.kind === "on-edge" && res.pen.snap.off.mid5?.kind === "on-edge" && Math.abs(res.pen.snap.off.mid5.t - 0.5) > 0.01 && res.pen.snap.off.end1?.kind === "endpoint"
  && res.pen.snap.on.end10?.kind === "endpoint" && res.pen.snap.on.mid5?.kind === "midpoint" && res.pen.snap.on.end1?.kind === "endpoint"
  && res.pen.press.seekOnly.start === null && res.pen.press.seekOnly.marker !== null && res.pen.press.first.onFront && res.pen.press.cutP.df === 1 && res.pen.press.cutP.active && res.pen.press.cutP.check === "" && res.pen.press.endedByLift
  && res.pen.grace.g0.started && res.pen.grace.g1.df === 1 && res.pen.grace.g1.active && res.pen.grace.ended
  && res.pen.lightTap.start === null && res.pen.lightTap.df === 0 && !res.pen.lightTap.active && res.pen.pulses >= 4;
console.log(JSON.stringify(res, null, 1));
console.log(ok ? "probe-mesh-knife OK" : "probe-mesh-knife FAIL");
process.exit(ok ? 0 : 1);
