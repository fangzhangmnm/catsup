// 自由建模的 Blender 键位 + 删除（2026-10-27 Claude Opus 5.5；user「然后能不能blender 快捷键无缝接上」）：网格体盒子里——
// ① 选顶面按 G：光标一动顶面跟着走（不用按下）、点一下落定；Ctrl+Z 回来 ② G 中按 Z = 锁 Z ③ G 中 Esc / 右键 = 取消 ④ 没选区按 G = 只切到移动工具
// ⑤ 选顶面按 E = 挤出跟鼠标 ⑥ X 删选中的面 ⑦ 选两个对角点按 J = 连线 ⑧ Ctrl+R 再点一条竖边 = 环切 ⑨ 删除工具点一张面 = 删、Ctrl 点一条边 = 溶解。
// 跑法：python3 -m http.server 8765 后 node test/probes/probe-mesh-keymap.mjs
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
  const kd = (k, o = {}) => window.dispatchEvent(new KeyboardEvent("keydown", { key: k, code: o.code ?? (k.length === 1 ? "Key" + k.toUpperCase() : k), ctrlKey: !!o.ctrl, shiftKey: !!o.shift, bubbles: true, cancelable: true }));
  const hover = async (p) => { const s = px(p); fire("pointermove", s.x, s.y, 0); await sleep(25); return s; };
  const topZ = () => Math.max(...m().verts().map((v) => m().pt(v).z));
  const selTop = async () => { e.setTool("select"); e.deselectAll(); await sleep(400); await click(P(0.5, 0.5, 1)); };
  const st0 = stat(), pos0 = e.history.position();
  // ① G
  await selTop(); const s0 = await hover(P(0.5, 0.5, 1)); kd("g"); await sleep(20);
  out.gStart = { active: e.isGestureActive(), tool: e.tool };
  for (let i = 1; i <= 6; i++) { fire("pointermove", s0.x, s0.y - 10 * i, 0); await sleep(15); }
  out.gPreview = { committed: e.history.position() - pos0 };
  fire("pointerdown", s0.x, s0.y - 60, 1); await sleep(10); fire("pointerup", s0.x, s0.y - 60, 0); await sleep(40);
  out.gDone = { moved: topZ() !== 1 || m().verts().some((v) => { const p = m().pt(v); return p.z === 1 && (Math.abs(Math.abs(p.x) - 0.5) > 1e-9 || Math.abs(Math.abs(p.y) - 0.5) > 1e-9); }), active: e.isGestureActive(), sel: e.selection.faces.size };
  kd("z", { ctrl: true }); await sleep(40); out.gUndo = JSON.stringify(stat()) === JSON.stringify(st0) && topZ() === 1;
  // ② G + Z 锁
  await hover(P(0.5, 0.5, 1)); kd("g"); await sleep(20); kd("z"); await sleep(10); out.zLock = e.axisLock;
  for (let i = 1; i <= 6; i++) { fire("pointermove", s0.x + 8 * i, s0.y - 8 * i, 0); await sleep(15); }
  fire("pointerdown", s0.x + 48, s0.y - 48, 1); await sleep(10); fire("pointerup", s0.x + 48, s0.y - 48, 0); await sleep(40);
  out.zOnly = m().verts().filter((v) => m().pt(v).z > 1.001).length === 4 && m().verts().every((v) => { const p = m().pt(v); return Math.abs(Math.abs(p.x) - 0.5) < 1e-9 && Math.abs(Math.abs(p.y) - 0.5) < 1e-9; });
  kd("z", { ctrl: true }); await sleep(40);
  // ③ Esc / 右键 取消
  await hover(P(0.5, 0.5, 1)); kd("g"); await sleep(20); fire("pointermove", s0.x, s0.y - 40, 0); await sleep(20); kd("Escape", { code: "Escape" }); await sleep(30);
  out.esc = { active: e.isGestureActive(), same: topZ() === 1, pos: e.history.position() - pos0 };
  await hover(P(0.5, 0.5, 1)); kd("g"); await sleep(20); fire("pointermove", s0.x, s0.y - 40, 0); await sleep(20);
  c.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: r.left + s0.x, clientY: r.top + s0.y - 40, button: 2 })); await sleep(30);
  out.rclick = { active: e.isGestureActive(), same: topZ() === 1 };
  // ④ 没选区按 G
  e.deselectAll(); e.setTool("select"); await hover(P(0.5, 0.5, 1)); kd("g"); await sleep(20);
  out.gNoSel = { tool: e.tool, active: e.isGestureActive() };
  // ⑤ E
  await selTop(); await hover(P(0.5, 0.5, 1)); kd("e"); await sleep(20);
  for (let i = 1; i <= 6; i++) { fire("pointermove", s0.x, s0.y - 10 * i, 0); await sleep(15); }
  fire("pointerdown", s0.x, s0.y - 60, 1); await sleep(10); fire("pointerup", s0.x, s0.y - 60, 0); await sleep(40);
  out.eDone = { df: stat().f - st0.f, sel: e.selection.faces.size, topUp: topZ() > 1 };
  kd("z", { ctrl: true }); await sleep(40);
  // ⑥ X 删选中的面
  await selTop(); kd("x"); await sleep(30); out.xDel = { df: stat().f - st0.f }; kd("z", { ctrl: true }); await sleep(40);
  // ⑦ J：选两个对角点（点一个、Shift 点另一个）
  e.setTool("select"); e.deselectAll(); await sleep(400); await click(P(0, 0, 1)); await sleep(400);
  { const s = px(P(1, 1, 1)); fire("pointermove", s.x, s.y, 0); await sleep(10); fire("pointerdown", s.x, s.y, 1, true); await sleep(10); fire("pointerup", s.x, s.y, 0, true); await sleep(40); }
  out.jSel = e.selection.verts.size; kd("j"); await sleep(30); out.jDone = { df: stat().f - st0.f, selE: e.selection.edges.size, check: m().check().join(";") }; kd("z", { ctrl: true }); await sleep(40);
  // ⑧ Ctrl+R 再点右侧前面那条竖边
  e.deselectAll(); kd("r", { ctrl: true, code: "KeyR" }); await sleep(20); out.crTool = e.tool;
  { const s = px(P(1, 0, 0.5)); fire("pointermove", s.x, s.y, 0); await sleep(15); fire("pointerdown", s.x, s.y, 1); await sleep(10); fire("pointerup", s.x, s.y, 0); await sleep(50); }
  out.crDone = { df: stat().f - st0.f, active: e.isGestureActive(), check: m().check().join(";") }; kd("z", { ctrl: true }); await sleep(40);
  // ⑨ 删除工具：点顶面 = 删；Ctrl 点右侧前面那条竖边 = 溶解（两侧面并一张）
  e.setTool("erase"); out.eraseLabel = hud.tools().find((t) => t.id === "erase")?.label;
  await click(P(0.5, 0.5, 1)); out.eraseFace = { df: stat().f - st0.f }; kd("z", { ctrl: true }); await sleep(40);
  { const s = px(P(1, 0, 0.5)); c.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, clientX: r.left + s.x, clientY: r.top + s.y, pointerId: 5, pointerType: "mouse", isPrimary: true, buttons: 0, ctrlKey: true })); await sleep(15);
    c.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientX: r.left + s.x, clientY: r.top + s.y, pointerId: 5, pointerType: "mouse", isPrimary: true, button: 0, buttons: 1, ctrlKey: true })); await sleep(10);
    c.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, clientX: r.left + s.x, clientY: r.top + s.y, pointerId: 5, pointerType: "mouse", isPrimary: true, button: 0, buttons: 0, ctrlKey: true })); await sleep(40); }
  out.dissolve = { df: stat().f - st0.f, de: stat().e - st0.e, check: m().check().join(";"), hint: hud.status() };
  out.backToStart = (() => { let n = 0; while (e.history.position() > pos0 && n++ < 30) kd("z", { ctrl: true }); return JSON.stringify(stat()) === JSON.stringify(st0); })();
  return out;
});
await b.close();
res.errs = errs;
const ok = res.gStart.active && res.gStart.tool === "move" && res.gPreview.committed <= 1 && res.gDone.moved && !res.gDone.active && res.gUndo
  && res.zLock === "z" && res.zOnly && !res.esc.active && res.esc.same && !res.rclick.active && res.rclick.same
  && res.gNoSel.tool === "move" && !res.gNoSel.active
  && res.eDone.df === 4 && res.eDone.sel === 1 && res.eDone.topUp && res.xDel.df === -1
  && res.jSel === 2 && res.jDone.df === 1 && res.jDone.selE === 1 && res.jDone.check === ""
  && res.crTool === "knife" && res.crDone.df === 4 && !res.crDone.active && res.crDone.check === ""
  && res.eraseLabel === "删除" && res.eraseFace.df === -1 && res.dissolve.df === -1 && res.dissolve.check === ""
  && errs.length === 0;
console.log(JSON.stringify(res, null, 1));
console.log(ok ? "probe-mesh-keymap OK" : "probe-mesh-keymap FAIL");
process.exit(ok ? 0 : 1);
