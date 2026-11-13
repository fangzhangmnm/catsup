// probe-knife-bend.mjs —— 刀在面中间拐弯（笔的设计稿第七节第 4 步 / 第八节第 6 条验收里要真编辑器的几条）。created 2026-11-13 by Claude Opus 5.5
// 鼠标点（点一下 = 下点）：
//   ① 方块右侧面：从前竖边进、面里点两下拐弯、切到上边 = 一刀 = 一条指令 = 一步撤销，面 +1、自检干净；撤销一步回去。
//   ② 顶面上折线自己交叉 = 不切、提示行说「刀线自己交叉了」，一条指令都没有；Esc 放弃 = 什么都没发生。
//   ③ 拐了一个弯之后点到另一张面上 = 不下点、说原因。
//   ④ 画过的方块（开始画、一张面一块）：右侧面拐弯切一刀 → 两张新面每个角的贴图坐标 = 原面那张平面映射在那一点的值（画都在原位），空出来的地方一个框都不多。
//   ⑤ 强行对称开着（X 轴）：右侧面拐弯切一刀 → 左侧面也切出对称的一刀，所有点都有镜像的孪生点。
//   ⑥ 用笔（带压力的 pointer 事件，走 seek-input 和重按判断那条真路；统筹 11-13）：画过的方块先在右侧面上用画笔画一笔草稿 → 换刀：轻按着滑 = 不下点、边上重按 = 起刀、
//      面里重按两下 = 两个拐点、另一条边上重按 = 切到、抬笔 = 收刀。验：整条 = 一条指令一步撤销；轻按滑动途中一个点都没多下；草稿那一笔还在原来的三维位置
//      （屏幕上同几个点下面还是有墨 + 画板字节一样 + 贴图坐标照第 ④ 组）；空位不变；抬笔后刀收了。反例：起刀、只下了面里的拐点、没切到边就抬笔 = 什么都没发生。
//   ⑦ 环切跟上（第七节第 5 步）：Ctrl+R 之后报压感的笔轻按着滑到一条边上 = 只找（预演整圈、不切）；重按 = 切一圈（一步）；
//      再预备一次、轻轻点一下 = 不切、还预备着；Esc = 不预备了。
//   ⑧ 环切 + 不报压感的笔（恒 0.5，新开一页：这支笔从没报过压感）：点一下 = 切一圈。
// 跑法：python3 -m http.server 8765 后 node test/probes/probe-knife-bend.mjs [地址]（或 PROBE_URL）
import { createRequire } from "node:module";
const { chromium } = createRequire(new URL("../../../20260524 WeebPaint/package.json", import.meta.url))("playwright");
const url = process.argv.slice(2).find((a) => a.startsWith("http")) ?? process.env.PROBE_URL ?? "http://127.0.0.1:8765/";
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const errs = [];
/** 新开一页：一个方块（x 从 x0 到 x0 + 1，y / z 0–1）变成网格体组件、进去、拿起刀。setup / body 在页面里跑，从 globalThis.__kbEnv 拿工具（setup 在拿刀之前：开始画 / 开镜像）。 */
async function run(x0, setup, body) {
  const page = await browser.newPage({ viewport: { width: 1000, height: 800 } });
  page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
  await page.goto(url, { waitUntil: "load" }); await page.waitForTimeout(1000);
  await page.evaluate(async (x0) => {
    const C = globalThis.__catsup, e = C.editor, hud = C.hud, P = (x, y, z = 0) => ({ x, y, z }), sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const c = document.getElementById("board"), r = c.getBoundingClientRect(), px = (p) => e.cam.angularPx(p, e.vp());
    const fire = (type, q, buttons) => c.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: r.left + q.x, clientY: r.top + q.y, pointerId: 5, pointerType: "mouse", isPrimary: true, button: 0, buttons }));
    const tap = async (p) => { const q = px(p); fire("pointermove", { x: q.x + 2, y: q.y + 2 }, 0); await sleep(10); fire("pointermove", q, 0); await sleep(15); fire("pointerdown", q, 1); await sleep(10); fire("pointerup", q, 0); await sleep(30); };
    const esc = async () => { window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", code: "Escape", bubbles: true, cancelable: true })); await sleep(30); };
    const B = [[x0, 0], [x0 + 1, 0], [x0 + 1, 1], [x0, 1]], segs = [];
    for (let i = 0; i < 4; i++) { const a = B[i], d = B[(i + 1) % 4]; segs.push([P(a[0], a[1], 0), P(d[0], d[1], 0)]); segs.push([P(a[0], a[1], 1), P(d[0], d[1], 1)]); segs.push([P(a[0], a[1], 0), P(a[0], a[1], 1)]); }
    e.setGrid({ ...e.grid, on: false });
    e.commitOp({ op: "addEdges", at: e.activePool(), segs }); e.selectAll(); e.runAction("brep.orientOutward", { curvature: 3 }); e.makeComponent("块"); e.runAction("object.toMesh"); await sleep(20);
    const S = () => e.scene, inst = [...S().def(S().root).instances.values()][0], def = inst.def, m = () => S().mesh(def).kernel;
    e.cam.setView("iso"); e.zoomExtents(); e.cam.halfH *= 1.4; e.draw();
    e.selectedPools.clear(); e.selectedPools.set(`i${inst.id}`, { kind: "instance", instance: inst.id }); e.enterSelected(); await sleep(30);
    globalThis.__kbEnv = { C, e, hud, P, sleep, tap, esc, m, def, S };
  }, x0);
  await page.evaluate(setup);   // 拿刀之前（开始画 / 开镜像）：函数直接递进页面（页面的 CSP 不许 eval 字符串）
  await page.evaluate(async () => { globalThis.__kbEnv.e.setTool("knife"); await new Promise((r) => setTimeout(r, 20)); });
  const out = await page.evaluate(body);
  await page.close();
  return out;
}
const res = {};
// ①②③ 白方块
res.plain = await run(0, async () => {}, async () => { const { e, hud, P, tap, esc, m } = globalThis.__kbEnv;
  const out = {}, f0 = m().faceCount(), pos0 = e.history.position();
  await tap(P(1, 0, 0.5)); await tap(P(1, 0.4, 0.3)); await tap(P(1, 0.6, 0.6));
  out.pending = { steps: e.history.position() - pos0, bend: e.handlers.knife.describe().meshKnife.bend, hint: hud.status() };
  await tap(P(1, 0.75, 1));
  out.cut = { df: m().faceCount() - f0, steps: e.history.position() - pos0, check: m().check().join(";"), hint: hud.status(), active: e.isGestureActive() };
  await esc(); e.undo(); await new Promise((r) => setTimeout(r, 30));
  out.undo = { df: m().faceCount() - f0 };
  e.redo(); await new Promise((r) => setTimeout(r, 30));
  // ② 顶面：折线自己交叉
  const f1 = m().faceCount(), pos1 = e.history.position();
  for (const q of [P(0.5, 0, 1), P(0.2, 0.7, 1), P(0.8, 0.7, 1), P(0.2, 0.3, 1), P(0.8, 0.3, 1), P(0.5, 1, 1)]) await tap(q);
  out.cross = { df: m().faceCount() - f1, steps: e.history.position() - pos1, hint: hud.status() };
  await esc(); out.crossEsc = { df: m().faceCount() - f1, steps: e.history.position() - pos1 };
  // ③ 顶面拐了一个弯，再点右侧面上的一点
  await tap(P(0.3, 0, 1)); await tap(P(0.3, 0.5, 1)); await tap(P(1, 0.3, 0.2));
  out.other = { bend: e.handlers.knife.describe().meshKnife.bend, hint: hud.status(), steps: e.history.position() - pos1 };
  await esc();
  return out;
});
// ④ 画过的方块
res.paint = await run(0, async () => { const { e, def, m } = globalThis.__kbEnv;
  const G = crypto.randomUUID(), g = () => crypto.randomUUID();
  e.commitOp({ op: "startPaint", def, faces: m().faces(), uvSet: G, textureGuid: g(), materialGuid: g(), names: { uvSet: "UV", paint: "画", material: "画" }, color: [0.3, 0.5, 0.7], density: 16 });
  globalThis.__kb = { G };
}, async () => { const { C, P, tap, esc, m, def, S } = globalThis.__kbEnv;
  const G = globalThis.__kb.G, mx = Math.max(...m().verts().map((v) => m().pt(v).x)), right = m().faces().find((f) => m().facePts(f).every((p) => Math.abs(p.x - mx) < 1e-9));   // 右侧面（组件的定义坐标：原点在底面中心）
  /** 右侧面上 (y, z) → 贴图坐标：用原面三个角定一个平面映射（方的面 = 仿射），第四个角拿来核。 */
  const ps = m().facePts(right), uv = C.paint.uv.at(def, right, G), at = (i) => [uv[2 * i], uv[2 * i + 1]];
  const [A, Bp, Cp] = [0, 1, 2].map((i) => ({ y: ps[i].y, z: ps[i].z, uv: at(i) }));
  const det = (Bp.y - A.y) * (Cp.z - A.z) - (Cp.y - A.y) * (Bp.z - A.z);
  const map = (y, z) => { const s = ((y - A.y) * (Cp.z - A.z) - (Cp.y - A.y) * (z - A.z)) / det, t = ((Bp.y - A.y) * (z - A.z) - (y - A.y) * (Bp.z - A.z)) / det; return [0, 1].map((k) => A.uv[k] + (Bp.uv[k] - A.uv[k]) * s + (Cp.uv[k] - A.uv[k]) * t); };
  const fourthOk = Math.hypot(map(ps[3].y, ps[3].z)[0] - at(3)[0], map(ps[3].y, ps[3].z)[1] - at(3)[1]) < 1e-9;
  const freed0 = [...(S().uvSets.get(G)?.freed ?? [])].join(), before = new Set(m().faces());
  await tap(P(1, 0, 0.5)); await tap(P(1, 0.4, 0.3)); await tap(P(1, 0.6, 0.6)); await tap(P(1, 0.75, 1)); await esc();
  const fresh = m().faces().filter((f) => !before.has(f)), two = [right, ...fresh];
  let worst = 0;
  for (const f of two) { const q = m().facePts(f), u = C.paint.uv.at(def, f, G); if (!u) { worst = Infinity; continue; } q.forEach((p, i) => { const w = map(p.y, p.z); worst = Math.max(worst, Math.hypot(w[0] - u[2 * i], w[1] - u[2 * i + 1])); }); }
  const uvMax = Math.max(...two.flatMap((f) => [...(C.paint.uv.at(def, f, G) ?? [])].map(Math.abs))), uvArr = C.paint.uv.at(def, right, G)?.constructor?.name;
  return { fourthOk, newFaces: fresh.length, worstUvOff: worst, uvMax, uvArr, freedSame: [...(S().uvSets.get(G)?.freed ?? [])].join() === freed0, check: m().check().join(";") };
});
// ⑤ 强行对称（组件的定义坐标原点在底面中心 = 方块本来就跨着 X 镜像面）
res.mirror = await run(0, async () => { globalThis.__kbEnv.e.setMirror("force", 0); }, async () => { const { P, tap, esc, m } = globalThis.__kbEnv;
  const f0 = m().faceCount();
  await tap(P(1, 0, 0.5)); await tap(P(1, 0.4, 0.3)); await tap(P(1, 0.6, 0.6)); await tap(P(1, 0.75, 1)); await esc();
  const vs = m().verts().map((v) => m().pt(v)), has = (q) => vs.some((p) => Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z) < 1e-6);
  return { df: m().faceCount() - f0, twins: vs.every((p) => has({ x: -p.x, y: p.y, z: p.z })), check: m().check().join(";") };
});
// ⑥ 用笔：草稿 → 沿草稿切
res.pen = await run(0, async () => {
  const { e, def, m } = globalThis.__kbEnv, G = crypto.randomUUID(), T = crypto.randomUUID(), g = () => crypto.randomUUID();
  e.commitOp({ op: "startPaint", def, faces: m().faces(), uvSet: G, textureGuid: T, materialGuid: g(), names: { uvSet: "UV", paint: "画", material: "画" }, color: [0.95, 0.95, 0.95], density: 16 });
  globalThis.__kb = { G, T };
}, async () => {
  const { C, e, P, sleep, esc, m, def, S } = globalThis.__kbEnv, { G, T } = globalThis.__kb;
  const c = document.getElementById("board"), r = c.getBoundingClientRect(), px = (p) => e.cam.angularPx(p, e.vp());
  let pid = 60;
  const pf = (type, q, p) => c.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, clientX: r.left + q.x, clientY: r.top + q.y, pointerId: pid, pointerType: "pen", isPrimary: true, button: type === "pointermove" ? -1 : 0, buttons: type === "pointerup" ? 0 : 1, pressure: type === "pointerup" ? 0 : p }));
  const lerp = (a, z, u) => ({ x: a.x + (z.x - a.x) * u, y: a.y + (z.y - a.y) * u });
  const frame = async () => { e.draw(); await new Promise((ok) => requestAnimationFrame(ok)); };
  // —— 草稿：画画工作台、画笔、在右侧面上横着画一笔（真的笔事件，压力 0.3–0.5 变）——
  C.pickWorkbench("paint"); e.setTool("paintPen"); await frame(); await frame();
  const sketch = []; for (let i = 0; i <= 12; i++) sketch.push(P(1, 0.15 + 0.7 * (i / 12), 0.5));
  pid++; const s0 = px(sketch[0]); pf("pointerdown", s0, 0.3); await sleep(10);
  for (const w of sketch.slice(1)) { pf("pointermove", px(w), 0.35 + 0.1 * Math.random()); await sleep(10); }
  pf("pointerup", px(sketch[sketch.length - 1]), 0); await sleep(60); await frame(); await frame();
  const board = () => { const b = C.paint.boards.get(T); if (!b) return "没有画板"; const d = b.wp.exportData(); let h = 2166136261; for (const n of d.nodes) if (n.pixels) for (const v of n.pixels.bytes) { h ^= v; h = Math.imul(h, 16777619); } return (h >>> 0).toString(16); };
  const inkAt = () => { const b = C.paint.boards.get(T); let n = 0, k = 0; for (const w of sketch.slice(1, -1)) { const q = px(w), cc = C.paint.cellAt(T, q.x, q.y); if (!cc?.cell) continue; k++; const v = b?.pixelAt(cc.cell[0], cc.cell[1]); if (v && v[3] > 0) n++; } return { inked: n, asked: k }; };
  const ink0 = inkAt(), board0 = board(), steps0 = e.history.position();
  // —— 换刀（回自由建模）——
  C.pickWorkbench("freeform"); e.setTool("knife"); await frame();
  const mx = Math.max(...m().verts().map((v) => m().pt(v).x)), right = m().faces().find((f) => m().facePts(f).every((p) => Math.abs(p.x - mx) < 1e-9));
  const ps = m().facePts(right), uv = C.paint.uv.at(def, right, G), at = (i) => [uv[2 * i], uv[2 * i + 1]];
  const [A, Bp, Cp] = [0, 1, 2].map((i) => ({ y: ps[i].y, z: ps[i].z, uv: at(i) }));
  const det = (Bp.y - A.y) * (Cp.z - A.z) - (Cp.y - A.y) * (Bp.z - A.z);
  const map = (y, z) => { const s1 = ((y - A.y) * (Cp.z - A.z) - (Cp.y - A.y) * (z - A.z)) / det, t = ((Bp.y - A.y) * (z - A.z) - (y - A.y) * (Bp.z - A.z)) / det; return [0, 1].map((kk) => A.uv[kk] + (Bp.uv[kk] - A.uv[kk]) * s1 + (Cp.uv[kk] - A.uv[kk]) * t); };
  const freed0 = [...(S().uvSets.get(G)?.freed ?? [])].join(), f0 = m().faceCount(), before = new Set(m().faces()), h0 = e.history.position();
  const k = e.handlers.knife, state = () => { const d = k.describe().meshKnife; return { start: d.start, bend: d.bend?.n ?? 0, steps: e.history.position() - h0, faces: m().faceCount() - f0 }; };
  const pdown = async (w) => { pid++; const q = px(w); pf("pointerdown", q, 0.1); await sleep(10); for (let i = 0; i < 12; i++) { pf("pointermove", q, 0.15 + (i % 2 ? 0.01 : -0.01)); await sleep(10); } };
  const glide = async (a, z) => { const qa = px(a), qz = px(z); for (let i = 1; i <= 10; i++) { pf("pointermove", lerp(qa, qz, i / 10), 0.15 + (i % 2 ? 0.01 : -0.01)); await sleep(10); } };
  const hard = async (w) => { const q = px(w); for (const p of [0.3, 0.45, 0.6, 0.6, 0.6, 0.35, 0.2, 0.15, 0.15]) { pf("pointermove", q, p); await sleep(8); } };
  const lift = async (w) => { pf("pointerup", px(w), 0); await sleep(140); };
  const F0 = P(1, 0.5, 0.8), EA = P(1, 0, 0.3), I1 = P(1, 0.35, 0.7), I2 = P(1, 0.65, 0.25), EB = P(1, 1, 0.6);
  const out = { ink0, board0Drawn: board0 !== "没有画板" };
  await pdown(F0); await glide(F0, EA); out.slideToEdge = state();                     // 轻按着滑到边上：一个点都没下
  await hard(EA); out.afterStart = state();                                              // 边上重按 = 起刀
  await glide(EA, I1); out.slideToI1 = state(); await hard(I1); out.afterI1 = state();   // 面里重按 = 拐点
  await glide(I1, I2); await hard(I2); out.afterI2 = state();
  await glide(I2, EB); out.slideToEdgeB = state(); await hard(EB); out.afterCut = state();   // 另一条边上重按 = 切到
  await lift(EB); out.lifted = { active: e.isGestureActive(), start: k.describe().meshKnife.start };
  const fresh = m().faces().filter((f) => !before.has(f));
  let worst = 0; for (const f of [right, ...fresh]) { const q = m().facePts(f), u = C.paint.uv.at(def, f, G); if (!u) { worst = Infinity; continue; } q.forEach((p, i) => { const w = map(p.y, p.z); worst = Math.max(worst, Math.hypot(w[0] - u[2 * i], w[1] - u[2 * i + 1])); }); }
  await frame(); await frame();
  out.after = { ink: inkAt(), boardSame: board() === board0, worstUvOff: worst, freedSame: [...(S().uvSets.get(G)?.freed ?? [])].join() === freed0, check: m().check().join(";"), newFaces: fresh.length, sketchSteps: h0 - steps0 };
  // 反例：起刀、面里拐一个弯、没切到边就抬笔 = 什么都没发生
  const h1 = e.history.position(), f1 = m().faceCount(), T0 = P(0.5, 0.5, 1), TE = P(0.5, 0, 1), TI = P(0.4, 0.4, 1);
  await pdown(T0); await glide(T0, TE); await hard(TE); await glide(TE, TI); await hard(TI); const mid = state();
  await lift(TI);
  out.counter = { midBend: mid.bend, steps: e.history.position() - h1, faces: m().faceCount() - f1, active: e.isGestureActive(), start: k.describe().meshKnife.start };
  e.undo(); await sleep(30); out.undoFaces = m().faceCount() - f0;
  return out;
});
// ⑦ 环切 + 报压感的笔
res.loopPen = await run(0, async () => {}, async () => {
  const { e, P, sleep, esc, m } = globalThis.__kbEnv;
  const c = document.getElementById("board"), r = c.getBoundingClientRect(), px = (p) => e.cam.angularPx(p, e.vp());
  let pid = 80;
  const pf = (type, q, p) => c.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, clientX: r.left + q.x, clientY: r.top + q.y, pointerId: pid, pointerType: "pen", isPrimary: true, button: type === "pointermove" ? -1 : 0, buttons: type === "pointerup" ? 0 : 1, pressure: type === "pointerup" ? 0 : p }));
  const lerp = (a, z, u) => ({ x: a.x + (z.x - a.x) * u, y: a.y + (z.y - a.y) * u });
  const pdown = async (w) => { pid++; const q = px(w); pf("pointerdown", q, 0.1); await sleep(10); for (let i = 0; i < 12; i++) { pf("pointermove", q, 0.15 + (i % 2 ? 0.01 : -0.01)); await sleep(10); } };
  const glide = async (a, z) => { const qa = px(a), qz = px(z); for (let i = 1; i <= 10; i++) { pf("pointermove", lerp(qa, qz, i / 10), 0.15 + (i % 2 ? 0.01 : -0.01)); await sleep(10); } };
  const hard = async (w) => { const q = px(w); for (const p of [0.3, 0.45, 0.6, 0.6, 0.6, 0.35, 0.2, 0.15, 0.15]) { pf("pointermove", q, p); await sleep(8); } };
  const lift = async (w) => { pf("pointerup", px(w), 0); await sleep(140); };
  const k = e.handlers.knife, out = {}, f0 = m().faceCount(), h0 = e.history.position(), F = P(1, 0.5, 0.5), E = P(1, 0, 0.5);
  e.armLoopCut(); await sleep(20);
  await pdown(F); await glide(F, E); await sleep(30);
  out.seek = { faces: m().faceCount() - f0, steps: e.history.position() - h0, preview: !!e.liveMesh, armed: k.active() };
  await hard(E); out.cut = { faces: m().faceCount() - f0, steps: e.history.position() - h0, armed: k.describe().meshKnife ? k.active() : null };
  await lift(E); out.afterLift = { steps: e.history.position() - h0 };
  // 再预备一次：轻轻点一下 = 不切、还预备着；Esc = 不预备了
  const f1 = m().faceCount(), h1 = e.history.position(), E2 = P(0.5, 0, 1);
  e.armLoopCut(); await sleep(20); pid++; const q2 = px(E2); pf("pointerdown", q2, 0.08); await sleep(8); pf("pointermove", q2, 0.14); await sleep(8); await lift(E2);
  out.lightTap = { faces: m().faceCount() - f1, steps: e.history.position() - h1, armed: k.active() };
  await esc(); out.escaped = { armed: k.active() };
  return out;
});
// ⑧ 环切 + 不报压感的笔（新开一页）
res.loopFlat = await run(0, async () => {}, async () => {
  const { e, P, sleep, m } = globalThis.__kbEnv;
  const c = document.getElementById("board"), r = c.getBoundingClientRect(), q = e.cam.angularPx(P(1, 0, 0.5), e.vp());
  const pf = (type, p) => c.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, clientX: r.left + q.x, clientY: r.top + q.y, pointerId: 90, pointerType: "pen", isPrimary: true, button: 0, buttons: type === "pointerup" ? 0 : 1, pressure: p }));
  const f0 = m().faceCount(), h0 = e.history.position();
  e.armLoopCut(); await sleep(20);
  pf("pointerdown", 0.5); await sleep(20); pf("pointerup", 0); await sleep(140);
  return { faces: m().faceCount() - f0, steps: e.history.position() - h0, armed: e.handlers.knife.active() };
});
await browser.close();
res.errs = errs;
const checks = {
  "① 拐弯途中不提交（只是预演）、记着两个拐点": res.plain.pending.steps === 0 && res.plain.pending.bend?.n === 2,
  "① 切到边 = 一条指令一步撤销、面 +1、自检干净": res.plain.cut.df === 1 && res.plain.cut.steps === 1 && res.plain.cut.check === "" && res.plain.cut.active,
  "① 撤销一步回去": res.plain.undo.df === 0,
  "② 折线自己交叉 = 不切、说原因": res.plain.cross.df === 0 && res.plain.cross.steps === 0 && /刀线自己交叉了/.test(res.plain.cross.hint),
  "② Esc 放弃 = 什么都没发生": res.plain.crossEsc.df === 0 && res.plain.crossEsc.steps === 0,
  "③ 拐弯后点到另一张面 = 不下点、说原因": res.plain.other.bend?.n === 1 && /另一张面/.test(res.plain.other.hint) && res.plain.other.steps === 0,
  "④ 原面的映射是平面映射（第四个角对得上）": res.paint.fourthOk,
  "④ 切出两张面、每个角的贴图坐标 = 原面映射在那一点（画都在原位；贴图坐标存在 1/1024 格的网格上 = 施工单十八第四节，差不超过一格）": res.paint.newFaces === 1 && res.paint.worstUvOff <= 1 / 1024,
  "④ 空出来的地方一个框都不多": res.paint.freedSame,
  "④ 自检干净": res.paint.check === "",
  "⑤ 强行对称：两边都切了（跨镜像面的四张面也被劈开，强行对称本来的做法）、每个点都有镜像孪生": res.mirror.df >= 2 && res.mirror.twins && res.mirror.check === "",
  "⑥ 笔：草稿画上了（画板有字节、草稿下面有墨）": res.pen.board0Drawn && res.pen.ink0.inked > 0 && res.pen.ink0.inked === res.pen.ink0.asked,
  "⑥ 笔：轻按着滑到边上 = 一个点都没下": res.pen.slideToEdge.start === null && res.pen.slideToEdge.steps === 0,
  "⑥ 笔：边上重按 = 起刀（还没有指令）": res.pen.afterStart.start !== null && res.pen.afterStart.steps === 0 && res.pen.afterStart.bend === 0,
  "⑥ 笔：轻按滑进面里 = 没多下点": res.pen.slideToI1.bend === 0 && res.pen.slideToI1.steps === 0,
  "⑥ 笔：面里重按两下 = 两个拐点（还没提交）": res.pen.afterI1.bend === 1 && res.pen.afterI2.bend === 2 && res.pen.afterI2.steps === 0 && res.pen.slideToEdgeB.bend === 2,
  "⑥ 笔：另一条边上重按 = 切到，整条 = 一条指令一步撤销、面 +1": res.pen.afterCut.steps === 1 && res.pen.afterCut.faces === 1 && res.pen.afterCut.bend === 0,
  "⑥ 笔：抬笔 = 收刀": !res.pen.lifted.active && res.pen.lifted.start === null,
  "⑥ 笔：草稿那一笔还在原来的三维位置（同几个点下面还有墨、画板字节一样、贴图坐标 = 原面映射）": res.pen.after.ink.inked === res.pen.ink0.inked && res.pen.after.ink.asked === res.pen.ink0.asked && res.pen.after.boardSame && res.pen.after.worstUvOff <= 1 / 1024,
  "⑥ 笔：空位不变、自检干净": res.pen.after.freedSame && res.pen.after.check === "" && res.pen.after.newFaces === 1,
  "⑥ 笔反例：只下了面里的拐点就抬笔 = 什么都没发生": res.pen.counter.midBend === 1 && res.pen.counter.steps === 0 && res.pen.counter.faces === 0 && !res.pen.counter.active && res.pen.counter.start === null,
  "⑥ 笔：撤销一步 = 那一刀撤掉": res.pen.undoFaces === 0,
  "⑦ 环切 + 笔：轻按着滑到边上 = 只找（预演整圈、不切、还预备着）": res.loopPen.seek.faces === 0 && res.loopPen.seek.steps === 0 && res.loopPen.seek.preview && res.loopPen.seek.armed,
  "⑦ 环切 + 笔：重按 = 切一圈（面 +4、一步）": res.loopPen.cut.faces === 4 && res.loopPen.cut.steps === 1 && res.loopPen.afterLift.steps === 1,
  "⑦ 环切 + 笔：轻轻点一下 = 不切、还预备着；Esc = 不预备了": res.loopPen.lightTap.faces === 0 && res.loopPen.lightTap.steps === 0 && res.loopPen.lightTap.armed && !res.loopPen.escaped.armed,
  "⑧ 环切 + 不报压感的笔：点一下 = 切一圈": res.loopFlat.faces === 4 && res.loopFlat.steps === 1 && !res.loopFlat.armed,
  "⑨ 没有页面错误": errs.length === 0,
};
const ok = Object.values(checks).every(Boolean);
console.log(JSON.stringify({ checks, res }, null, 1));
console.log(ok ? "probe-knife-bend OK" : "probe-knife-bend FAIL");
process.exit(ok ? 0 : 1);
