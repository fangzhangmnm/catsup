// 变换工具（2026-10-26 第二版）+ 撤销保留选区 + 移动类马后炮。user：「变换的中间应该有一个可以拖动的点…按move的逻辑snap」「先把变换的时候可以pick做一下」
// 「变换的时候右下角有一个pick pivot选项」「我们也需要scale的手柄」「变换的时候按ctrl z不应该选区也没了」「移动旋转也是ctrl复制开关吧。以及马后炮都能override」「变换能不能也支持移动的/5 *5」。
// 盒 [0,1]³：① 中心点拖 1 m（= 移动工具）② 马后炮「复制」打开 = 原件回原位 + 一份副本 ③ Ctrl+Z / Ctrl+Y 选区还在 ④ X 缩放块 ×2（绕包围盒中心）→ 数值小窗 3x = 缩放阵列
// ⑤ 选轴心拾角点 (1,1,0) → Z 环转 90° = 绕那角 ⑥ 点空处清选区、点面 = 选上、框选 ⑦ 旋转工具按住 Ctrl = 复制。created 2026-10-26 by Claude Opus 5.5
// ⑧ 轴心「自动」（默认；user 2026-10-26「选的是组件的时候应该默认是pivot…选loose geom的时候默认是bb，或者多组件的时候默认是bb」）：只选一个组件 = 手柄在它的轴原点、
//    拖中心点途中手柄跟着走（不跳回包围盒中心）；组件 + 散几何 = 包围盒中心。
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 1000, height: 800 } });
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(process.argv[2] ?? "http://127.0.0.1:8765/", { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1200);
const res = await page.evaluate(async () => {
  const e = globalThis.__catsup.editor, P = (x, y, z = 0) => ({ x, y, z }), sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const c = document.getElementById("board"), r = c.getBoundingClientRect(), px = (p) => e.cam.angularPx(p, e.vp());
  const fire = (type, x, y, buttons, extra = {}) => c.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: r.left + x, clientY: r.top + y, pointerId: 6, pointerType: "mouse", isPrimary: true, button: 0, buttons, ctrlKey: !!extra.ctrl }));
  const drag = async (a, z, steps = 10, extra = {}) => { fire("pointerdown", a.x, a.y, 1, extra); for (let i = 1; i <= steps; i++) { fire("pointermove", a.x + (z.x - a.x) * i / steps, a.y + (z.y - a.y) * i / steps, 1, extra); await sleep(16); } await sleep(80); fire("pointerup", z.x, z.y, 0, extra); await sleep(40); };
  const tap = async (q, extra = {}) => { fire("pointermove", q.x, q.y, 0, extra); await sleep(20); fire("pointerdown", q.x, q.y, 1, extra); await sleep(20); fire("pointerup", q.x, q.y, 0, extra); await sleep(260); };
  const key = (k, mods = {}) => window.dispatchEvent(new KeyboardEvent("keydown", { key: k, ctrlKey: !!mods.ctrl, bubbles: true, cancelable: true }));
  const box = (x0, y0, z0, x1, y1, z1) => { const B = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], segs = []; for (let i = 0; i < 4; i++) { const a = B[i], d = B[(i + 1) % 4]; segs.push([P(a[0], a[1], z0), P(d[0], d[1], z0)]); segs.push([P(a[0], a[1], z1), P(d[0], d[1], z1)]); segs.push([P(a[0], a[1], z0), P(a[0], a[1], z1)]); } e.commitOp({ op: "addEdges", segs }); };
  const xs = () => { const v = e.kernel.vertices().map((q) => q.x); return [Math.min(...v), Math.max(...v)].map((x) => +x.toFixed(4)); };
  const nf = () => e.kernel.faces().length, nsel = () => e.selection.faces.size;
  e.setGrid({ ...e.grid, on: false });
  box(0, 0, 0, 1, 1, 1);
  e.cam.setView("iso"); e.zoomExtents(); e.cam.halfH *= 1.6;
  e.selectAll(); e.setTool("transform"); await sleep(30);
  const out = {};
  const O = P(0.5, 0.5, 0.5);
  // ① 中心点拖 1 m（沿 X 轴推断）
  await drag(px(O), px(P(1.5, 0.5, 0.5)));
  out.centerMove = xs(); out.selAfterMove = nsel();
  // ② 马后炮：改成复制（刚落定时右下「刚才：移动」有「复制」开关）
  const pp = e.paramPanel();
  out.panel = pp ? { title: pp.title, fields: pp.fields.map((f) => f.key) } : null;
  e.setParam("copy", true); await sleep(30);
  out.copyFaces = nf(); out.copyXs = xs(); out.copySel = nsel();
  // ③ 撤销 / 重做，选区跟着（撤 = 回到这一步之前的选区；重做 = 这一步之后的）
  key("z", { ctrl: true }); await sleep(30);
  out.undoXs = xs(); out.undoSel = nsel(); out.undoFaces = nf();
  key("y", { ctrl: true }); await sleep(30);
  out.redoXs = xs(); out.redoSel = nsel(); out.redoFaces = nf();
  key("z", { ctrl: true }); await sleep(30);
  out.afterUndo = { faces: nf(), xs: xs(), sel: nsel() };
  // ④ X 缩放块 ×2（绕包围盒中心 0.5）→ 3x 缩放阵列
  // 手柄尺寸 = 垂直于视线方向上的屏幕 px（和 transform-gizmo.ts 同一把尺）
  const wppAt = (Q) => { const w = e.toolCtx.frame().viewDir(Q), r = Math.abs(w.z) < 0.9 ? P(0, 0, 1) : P(1, 0, 0), c = { x: w.y * r.z - w.z * r.y, y: w.z * r.x - w.x * r.z, z: w.x * r.y - w.y * r.x }, l = Math.hypot(c.x, c.y, c.z), a0 = px(Q), b0 = px({ x: Q.x + c.x / l, y: Q.y + c.y / l, z: Q.z + c.z / l }); return 1 / Math.hypot(a0.x - b0.x, a0.y - b0.y); };
  const cubeAt = (k) => px(P(0.5 + k * 32 * wppAt(O), 0.5, 0.5));
  await drag(cubeAt(1), cubeAt(2.03));
  out.scaled = xs();
  out.vcb3 = e.applyVcb("3x").ok; out.arrayXs = xs();
  key("z", { ctrl: true }); await sleep(30);   // 阵列那一步（替换了缩放那一步）撤掉 = 回到缩放之前
  out.backXs = xs(); out.backSel = nsel();
  // ⑤ 选轴心：拾角点 (1,1,0)，Z 环转 90°
  const H = e.handlers.transform;
  H.startPickPivot(); await tap(px(P(1, 1, 0)));
  out.pivot = H.hasTempPivot;
  const C = P(1, 1, 0), R = 56 * wppAt(C), ring = (deg) => px({ x: C.x + R * Math.cos(deg * Math.PI / 180), y: C.y + R * Math.sin(deg * Math.PI / 180), z: 0 });
  fire("pointerdown", ring(200).x, ring(200).y, 1);
  for (let d = 206; d <= 290; d += 6) { const q = ring(d); fire("pointermove", q.x, q.y, 1); await sleep(16); }
  fire("pointermove", ring(290).x, ring(290).y, 1); await sleep(60); fire("pointerup", ring(290).x, ring(290).y, 0); await sleep(40);
  out.rotXs = xs();
  key("z", { ctrl: true }); await sleep(30);
  // ⑥ 点空处清选区；点面选上；框选
  await tap(px(P(4, 4, 0)));
  out.emptyTapSel = e.hasSelection();
  await tap(px(P(0.5, 0.5, 1)));
  out.faceTapSel = nsel();
  e.cancel();
  const cs = [0, 1].flatMap((x) => [0, 1].flatMap((y) => [0, 1].map((z) => px(P(x, y, z)))));
  await drag({ x: Math.min(...cs.map((q) => q.x)) - 30, y: Math.min(...cs.map((q) => q.y)) - 30 }, { x: Math.max(...cs.map((q) => q.x)) + 30, y: Math.max(...cs.map((q) => q.y)) + 30 });
  out.boxSel = nsel();
  // ⑦ 旋转工具按住 Ctrl = 复制
  e.selectAll(); e.setTool("rotate");
  const Rc = P(0, 0, 0);
  await tap(px(Rc)); await tap(px(P(1, 0, 0)));
  const q90 = px(P(0, 1, 0)); fire("pointermove", q90.x, q90.y, 0, { ctrl: true }); await sleep(40); fire("pointerdown", q90.x, q90.y, 1, { ctrl: true }); await sleep(20); fire("pointerup", q90.x, q90.y, 0, { ctrl: true }); await sleep(60);
  out.rotCopy = { faces: nf(), xs: xs(), last: e.vcbState().kind };
  // ⑧ 轴心「自动」
  e.cancel(); e.clearAll(); e.setTool("select");
  box(0, 0, 0, 1, 1, 1);
  e.selectAll(); e.makeComponent("A");   // 原点默认 = 底面中心 (0.5,0.5,0)，选区 = 新实例
  e.setTool("transform"); await sleep(30);
  const T = e.handlers.transform, gzo = () => { const g = T.viewExtras(e.toolCtx).xformGizmo; return g ? [g.origin.x, g.origin.y, g.origin.z].map((v) => +v.toFixed(4)) : null; };
  out.autoMode = e.config.get("transform", "pivot");
  out.autoOne = gzo();
  const s0 = px(P(0, 0, 0)), s1 = px(P(1, 0, 0));
  fire("pointerdown", s0.x, s0.y, 1); for (let i = 1; i <= 10; i++) { fire("pointermove", s0.x + (s1.x - s0.x) * i / 10, s0.y + (s1.y - s0.y) * i / 10, 1); await sleep(16); }
  await sleep(60); out.autoMid = gzo(); fire("pointerup", s1.x, s1.y, 0); await sleep(40);
  out.autoAfter = gzo();
  box(3, 0, 0, 4, 1, 1);
  e.selectAll(); await sleep(20);
  out.autoMixed = gzo();
  return out;
});
console.log(JSON.stringify(res));
const ok = res.centerMove[0] === 1 && res.centerMove[1] === 2 && res.selAfterMove === 6
  && res.panel?.title === "移动" && res.panel.fields.includes("copy") && res.copyFaces === 11 && res.copyXs[0] === 0 && res.copyXs[1] === 2   // 副本贴着原件：共用那面墙 = 11 面
  && res.undoXs[0] === 0 && res.undoXs[1] === 1 && res.undoFaces === 6 && res.undoSel === 6 && res.redoFaces === 11 && res.redoSel === res.copySel
  && res.afterUndo.faces === 6 && res.afterUndo.xs[0] === 0 && res.afterUndo.sel === 6
  && res.scaled[0] === -0.5 && res.scaled[1] === 1.5 && res.vcb3 && res.arrayXs[1] === 4.5 && res.backXs[0] === 0 && res.backXs[1] === 1 && res.backSel === 6
  && res.pivot && res.rotXs[0] === 1 && res.rotXs[1] === 2
  && res.emptyTapSel === false && res.faceTapSel === 1 && res.boxSel === 6
  && res.rotCopy.faces === 11 && res.rotCopy.xs[0] === -1 && res.rotCopy.xs[1] === 1
  && res.autoMode === "auto" && String(res.autoOne) === "0.5,0.5,0" && String(res.autoMid) === "1.5,0.5,0" && String(res.autoAfter) === "1.5,0.5,0" && String(res.autoMixed) === "2.5,0.5,0.5" && !errs.length;
console.log(errs.length ? "PAGEERRORS:\n" + errs.join("\n") : "(no page errors)"); console.log(ok ? "PROBE OK" : "PROBE FAIL");
await b.close(); process.exit(ok ? 0 : 1);
