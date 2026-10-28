// 自由建模工作台的拉（2026-10-27 Claude Opus 5.5；tools/mesh-pull.ts）：网格体盒子里——
// ① 在顶面上按下往上拖 = 顶面沿法向挤出（面 6 → 10、点 8 → 12）、顶面留在选区、一步撤销；② 接着挪（选区 = 顶面）；
// ③ 拉一条边 + 锁 Z = 长一张墙、新边留在选区、新点只差 z；④ 拉一个点 = 一条裸线；⑤ 拉 0 不做；⑥ 撤到头 / 重做到头不崩。
// 跑法：python3 -m http.server 8765 后 node test/probes/probe-mesh-pull.mjs
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
  out.rail = e.modeTools().join(",");
  // ① 拉顶面
  e.setTool("pp"); const st0 = stat(), pos0 = e.history.position();
  { const a = px(P(0.5, 0.5, 1)); await drag(a, { x: a.x, y: a.y - 70 }); }
  const st1 = stat(), topNow = [...e.selection.faces], topZ = topNow.length ? Math.min(...m().faceVerts(topNow[0]).map((v) => m().pt(v).z)) : null;
  out.pullFace = { st0, st1, steps: e.history.position() - pos0, selFaces: topNow.length, topZ: topZ !== null ? +topZ.toFixed(3) : null, check: m().check().join(";"), hint: hud.status() };
  // ② 接着挪：选区 = 顶面，锁 Z 往上
  e.setTool("move"); e.lockKey("z", false);
  { const a = px(P(0.5, 0.5, 1.4)); await drag(a, { x: a.x + 20, y: a.y - 40 }); }
  const topZ2 = Math.min(...m().faceVerts(topNow[0]).map((v) => m().pt(v).z));
  out.thenMove = { up: topZ2 > topZ + 1e-6, steps: e.history.position() - pos0 };
  key("z"); await sleep(30); key("z"); await sleep(30);
  out.undo2 = { back: JSON.stringify(stat()) === JSON.stringify(st0), sel: e.selection.faces.size };
  // ③ 拉一条边 + 锁 Z：先选边（底面前沿那条，从 y=0 那一侧看得见），再拉
  e.deselectAll(); e.setTool("select"); await click(P(0.5, 0, 1));
  out.edgeSel = e.selection.edges.size;
  const eSel = [...e.selection.edges][0], ea = eSel !== undefined ? [m().edgeA[eSel], m().edgeB[eSel]].map((v) => m().pt(v)) : [];
  e.setTool("pp"); e.lockKey("z", false);
  { const a = px(P(0.5, 0, 1)); await drag(a, { x: a.x + 30, y: a.y - 50 }); }
  const st3 = stat(), newE = [...e.selection.edges][0], nb = newE !== undefined ? [m().edgeA[newE], m().edgeB[newE]].map((v) => m().pt(v)) : [];
  out.pullEdge = { d: { f: st3.f - st0.f, v: st3.v - st0.v }, selEdges: e.selection.edges.size, onlyZ: nb.length === 2 && nb.every((p) => ea.some((o) => Math.abs(o.x - p.x) < 1e-9 && Math.abs(o.y - p.y) < 1e-9 && p.z > o.z)), check: m().check().join(";") };
  key("z"); await sleep(30);
  // ④ 拉一个点（选中再拉）
  e.deselectAll(); e.setTool("select"); await click(P(1, 0, 1)); out.vertSel = e.selection.verts.size;
  e.setTool("pp");
  { const a = px(P(1, 0, 1)); await drag(a, { x: a.x + 40, y: a.y - 10 }); }
  const st4 = stat(); out.pullVert = { dv: st4.v - st0.v, de: st4.e - st0.e, df: st4.f - st0.f, selVerts: e.selection.verts.size };
  key("z"); await sleep(30);
  // ⑤ 拉 0：按下不动就松手 = 点一下（底座进「预览，再点一下落定」）；同一处再点 = 底座吞掉；Esc 取消 = 什么都没做
  e.deselectAll(); const pos5 = e.history.position();
  { const a = px(P(0.5, 0.5, 1)); fire("pointermove", a.x, a.y, 0); await sleep(10); fire("pointerdown", a.x, a.y, 1); await sleep(10); fire("pointerup", a.x, a.y, 0); await sleep(30); fire("pointerdown", a.x, a.y, 1); await sleep(10); fire("pointerup", a.x, a.y, 0); await sleep(30); }
  const armed = e.isGestureActive();
  window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", code: "Escape", bubbles: true, cancelable: true })); await sleep(30);
  out.zero = { steps: e.history.position() - pos5, armed, activeAfterEsc: e.isGestureActive() };
  // ⑥ 撤到头 / 重做到头
  let threw = false;
  try { for (let i = 0; i < 20 && e.history.position() > 0; i++) { key("z"); await sleep(20); } for (let i = 0; i < 20; i++) { const p0 = e.history.position(); key("y"); await sleep(20); if (e.history.position() === p0) break; } } catch { threw = true; }
  out.undoRedoAll = { threw, kind: S().kindOf(def), mode: e.modeId };
  return out;
});
await b.close();
res.errs = errs;
const ok = res.rail === "select,pp,move,rotate,scale"
  && res.pullFace.st1.f === res.pullFace.st0.f + 4 && res.pullFace.st1.v === res.pullFace.st0.v + 4 && res.pullFace.steps === 1 && res.pullFace.selFaces === 1 && res.pullFace.topZ > 1 && res.pullFace.check === ""
  && res.thenMove.up && res.thenMove.steps === 2 && res.undo2.back
  && res.edgeSel === 1 && res.pullEdge.d.f === 1 && res.pullEdge.d.v === 2 && res.pullEdge.selEdges === 1 && res.pullEdge.onlyZ && res.pullEdge.check === ""
  && res.vertSel === 1 && res.pullVert.dv === 1 && res.pullVert.de === 1 && res.pullVert.df === 0 && res.pullVert.selVerts === 1
  && res.zero.steps === 0 && res.zero.armed && !res.zero.activeAfterEsc
  && !res.undoRedoAll.threw && errs.length === 0;
console.log(JSON.stringify(res, null, 1));
console.log(ok ? "probe-mesh-pull OK" : "probe-mesh-pull FAIL");
process.exit(ok ? 0 : 1);
