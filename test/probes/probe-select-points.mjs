// 选点 + 选择修饰键对齐 Blender（2026-10-26）。user：「变换点中一个点的时候应该就是变换这个点啊」「以及我们还是希望我们能选点」「ipad同意，但是我想和blender对齐？」
// 盒 [0,1]³：① 单击角点 = 只选这个点（不是连着的线）② 变换工具：手柄在这个点上，Z 箭头拖 0.5 = 只有这个点动 ③ Ctrl+Z 选区还是这个点
// ④ 双击点 = 连着的三条线 ⑤ 单击面 = 替换、Shift 点 = 切换（再点 = 拿掉）、Ctrl 点 = 减选、框选按 Ctrl = 减 ⑥ Ctrl+I 反选、Alt+A 全不选
// ⑦ iPad：右下角「选区」= 加选时，不按修饰键连点两张面 = 两张 ⑧ 删一个点 = 连着它的三条线没了。created 2026-10-26 by Claude Opus 5.5
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 1000, height: 800 } });
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(process.argv[2] ?? "http://127.0.0.1:8765/", { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1200);
if (process.env.SHOT) await page.exposeFunction("__SHOT", (n) => page.screenshot({ path: `${process.env.SHOT}-${n}.png` }));
const res = await page.evaluate(async () => {
  const e = globalThis.__catsup.editor, P = (x, y, z = 0) => ({ x, y, z }), sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const c = document.getElementById("board"), r = c.getBoundingClientRect(), px = (p) => e.cam.angularPx(p, e.vp());
  const fire = (type, x, y, buttons, m = {}) => c.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: r.left + x, clientY: r.top + y, pointerId: 5, pointerType: "mouse", isPrimary: true, button: 0, buttons, shiftKey: !!m.shift, ctrlKey: !!m.ctrl }));
  const tap = async (q, m = {}, gap = 260) => { fire("pointermove", q.x, q.y, 0, m); await sleep(20); fire("pointerdown", q.x, q.y, 1, m); await sleep(20); fire("pointerup", q.x, q.y, 0, m); await sleep(gap); };
  const drag = async (a, z, m = {}, steps = 10) => { fire("pointerdown", a.x, a.y, 1, m); for (let i = 1; i <= steps; i++) { fire("pointermove", a.x + (z.x - a.x) * i / steps, a.y + (z.y - a.y) * i / steps, 1, m); await sleep(16); } await sleep(80); fire("pointerup", z.x, z.y, 0, m); await sleep(40); };
  const key = (k, code, m = {}) => window.dispatchEvent(new KeyboardEvent("keydown", { key: k, code, ctrlKey: !!m.ctrl, altKey: !!m.alt, bubbles: true, cancelable: true }));
  const box = (x0, y0, z0, x1, y1, z1) => { const B = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], segs = []; for (let i = 0; i < 4; i++) { const a = B[i], d = B[(i + 1) % 4]; segs.push([P(a[0], a[1], z0), P(d[0], d[1], z0)]); segs.push([P(a[0], a[1], z1), P(d[0], d[1], z1)]); segs.push([P(a[0], a[1], z0), P(a[0], a[1], z1)]); } e.commitOp({ op: "addEdges", segs }); };
  const S = () => ({ v: e.selection.verts.size, e: e.selection.edges.size, f: e.selection.faces.size });
  e.setGrid({ ...e.grid, on: false });
  box(0, 0, 0, 1, 1, 1);
  e.cam.setView("iso"); e.zoomExtents(); e.cam.halfH *= 1.6;
  e.setTool("select"); await sleep(30);
  const out = {};
  // 找一个屏上拾得到的上角点
  const corner = [P(1, 0, 1), P(0, 0, 1), P(1, 1, 1), P(0, 1, 1)].find((q) => { const s = px(q); return e.pickAt(s.x, s.y).vertex !== undefined; });
  out.corner = corner;
  // ① 单击点
  await tap(px(corner));
  out.tapPoint = S();
  out.readout = e.readoutText();
  // ② 变换：Z 箭头拖 0.5
  e.setTool("transform"); await sleep(30);
  const T = e.handlers.transform, G = T.viewExtras(e.toolCtx).xformGizmo;
  out.gizmoAt = G ? [G.origin.x, G.origin.y, G.origin.z].map((v) => +v.toFixed(4)) : null;
  const zg = { x: corner.x, y: corner.y, z: corner.z + (G.start + G.arrow) / 2 }, zg2 = { ...zg, z: zg.z + 0.5 };
  await drag(px(zg), px(zg2));
  const zs = e.kernel.vertices().map((q) => +q.z.toFixed(4));
  out.movedUp = zs.filter((z) => z > 1.01).length; out.maxZ = Math.max(...zs); out.selAfterMove = S();
  if (globalThis.__SHOT) await globalThis.__SHOT("moved");
  // ③ 撤销：选区还是那个点
  key("z", "KeyZ", { ctrl: true }); await sleep(40);
  out.undoMaxZ = Math.max(...e.kernel.vertices().map((q) => q.z)); out.selAfterUndo = S();
  // ④ 双击点 = 连着的三条线
  e.setTool("select"); await sleep(20);
  await tap(px(corner), {}, 60); await tap(px(corner), {}, 260);
  out.dblPoint = S();
  // ⑤ 面：替换 / Shift 切换 / Ctrl 减选 / 框选 Ctrl 减
  const top = px(P(0.5, 0.5, 1)), front = px(P(corner.x === 1 ? 1 : 0, 0.5, 0.5)), side = px(P(0.5, corner.y === 0 ? 0 : 1, 0.5));
  const T2 = 600;   // 同一处再点要隔开双击窗口（450 ms），不然算双击
  await tap(top, {}, T2); out.f1 = S();
  await tap(side, { shift: true }, T2); out.f2 = S();
  await tap(side, { shift: true }, T2); out.f3 = S();
  await tap(side, { shift: true }, T2); await tap(top, { ctrl: true }, T2); out.f4 = S();
  e.selectAll(); await sleep(20);
  const cs = [0, 1].flatMap((x) => [0, 1].flatMap((y) => [0, 1].map((z) => px(P(x, y, z)))));
  await drag({ x: Math.min(...cs.map((q) => q.x)) - 30, y: Math.min(...cs.map((q) => q.y)) - 30 }, { x: Math.max(...cs.map((q) => q.x)) + 30, y: Math.max(...cs.map((q) => q.y)) + 30 }, { ctrl: true });
  out.boxSubtract = S();
  // ⑥ 反选 / 全不选
  await tap(top, {}, T2);
  key("i", "KeyI", { ctrl: true }); await sleep(30); out.inverted = S();
  key("a", "KeyA", { alt: true }); await sleep(30); out.none = S();
  // ⑦ 选区「多选」那一档（2026-10-28 两档，FM158；iPad 默认）：点 = 加上 / 去掉；点空处 = 清空
  e.config.set("select", "mode", "multi");
  await tap(top, {}, T2); await tap(side, {}, T2); out.addMode = S();
  await tap(side, {}, T2); out.multiToggleOff = S();
  await tap({ x: 8, y: e.vp().h - 8 }, {}, T2); out.multiEmpty = S();
  e.config.set("select", "mode", "replace");
  // ⑧ 删点
  e.deselectAll(); await tap(px(corner), {}, T2); e.deleteSelection(); await sleep(30);
  out.afterDelete = { edges: e.kernel.edges().length, faces: e.kernel.faces().length, verts: e.kernel.vertices().length };
  return out;
});
console.log(JSON.stringify(res));
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const ok = !!res.corner && eq(res.tapPoint, { v: 1, e: 0, f: 0 }) && /1 个点/.test(res.readout)
  && eq(res.gizmoAt, [res.corner.x, res.corner.y, res.corner.z]) && res.movedUp === 1 && Math.abs(res.maxZ - 1.5) < 1e-3 && res.selAfterMove.v === 1
  && Math.abs(res.undoMaxZ - 1) < 1e-9 && eq(res.selAfterUndo, { v: 1, e: 0, f: 0 })
  && eq(res.dblPoint, { v: 0, e: 3, f: 0 })
  && eq(res.f1, { v: 0, e: 0, f: 1 }) && eq(res.f2, { v: 0, e: 0, f: 2 }) && eq(res.f3, { v: 0, e: 0, f: 1 }) && eq(res.f4, { v: 0, e: 0, f: 1 })
  && eq(res.boxSubtract, { v: 0, e: 3, f: 3 })   // v0.15.35 起框选 X 光关着只框看得见的（FM44）：背面 3 边 3 面没框到、留在选区（以前全减掉）
  && eq(res.inverted, { v: 0, e: 12, f: 5 }) && eq(res.none, { v: 0, e: 0, f: 0 }) && eq(res.addMode, { v: 0, e: 0, f: 2 }) && eq(res.multiToggleOff, { v: 0, e: 0, f: 1 }) && eq(res.multiEmpty, { v: 0, e: 0, f: 0 })
  && res.afterDelete.edges === 9 && res.afterDelete.faces === 3 && !errs.length;
console.log(errs.length ? "PAGEERRORS:\n" + errs.join("\n") : "(no page errors)"); console.log(ok ? "PROBE OK" : "PROBE FAIL");
await b.close(); process.exit(ok ? 0 : 1);
