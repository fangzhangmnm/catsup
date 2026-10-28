// 自由建模工作台的挪 / 转 / 缩（2026-10-27 Claude Opus 5.5；tools/mesh-transform.ts）：网格体盒子里——
// ① 挪：在顶面上按下拖走松手 = 顶面四个点一起动、别的点不动、一步撤销；② 锁 Z 挪：斜着拖也只动 z；③ 转：全选 + 锁 Z 拖一圈 = z 不变、到轴心的距离不变；
// ④ 缩：选顶面往外拖 = 顶面变大、z 不变；按住 Shift = 0.1 一档；⑤ 工作台守门：按画线键不跳进硬表面建模；⑥ 撤到头不崩。
// 跑法：python3 -m http.server 8765 后 node test/probes/probe-mesh-transform.mjs
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
  out.rail = e.modeTools().join(",");
  // ① 挪：顶面上按下、往屏幕上方拖 80 px、松手
  e.setTool("move"); const s0 = snap(), pos0 = e.history.position(), top0 = topIds();
  { const a = px(P(0.5, 0.5, 1)); await drag(a, { x: a.x, y: a.y - 80 }); }
  const s1 = snap(), moved = s1.filter((v, i) => v.join() !== s0[i].join()).map((v) => v[0]).sort().join(",");
  out.move = { moved, top: [...top0].sort().join(","), steps: e.history.position() - pos0, hint: hud.status() };
  key("z"); await sleep(30); out.moveUndo = snap().join("|") === s0.join("|");
  // ② 锁 Z 挪：斜着拖，只动 z
  e.lockKey("z", false);
  { const a = px(P(0.5, 0.5, 1)); await drag(a, { x: a.x + 60, y: a.y - 60 }); }
  const s2 = snap(), top2 = s2.filter((v) => top0.includes(v[0]));
  out.moveZ = { xyKept: top2.every((v) => { const o = s0.find((w) => w[0] === v[0]); return v[1] === o[1] && v[2] === o[2]; }), zUp: top2.every((v) => v[3] > 1), lockAfter: e.axisLock };
  key("z"); await sleep(30);
  // ③ 转：全选、锁 Z、绕轴心（盒子中心）拖四分之一圈
  key("a"); await sleep(10); e.setTool("rotate"); e.lockKey("z", false);
  { const ctr = px(P(0.5, 0.5, 0.5)), a = { x: ctr.x + 90, y: ctr.y }, z = { x: ctr.x, y: ctr.y - 90 }; fire("pointermove", a.x, a.y, 0); await sleep(10); fire("pointerdown", a.x, a.y, 1); for (let i = 1; i <= 12; i++) { const t = (i / 12) * Math.PI / 2; fire("pointermove", ctr.x + 90 * Math.cos(t), ctr.y - 90 * Math.sin(t), 1); await sleep(8); } fire("pointerup", z.x, z.y, 0); await sleep(40); }
  const s3 = snap();
  out.rotate = { zKept: s3.every((v, i) => v[3] === s0[i][3]), distKept: s3.every((v, i) => Math.abs(Math.hypot(v[1], v[2]) - Math.hypot(s0[i][1], s0[i][2])) < 1e-3), changed: s3.join("|") !== s0.join("|"), hint: hud.status() };
  key("z"); await sleep(30);
  // ④ 缩：选顶面（先取消全选再点），往外拖；再按住 Shift 拖一次（0.1 一档）
  e.deselectAll(); e.setTool("select"); await click(P(0.5, 0.5, 1)); e.setTool("scale");
  out.scaleSel = e.selection.faces.size;
  { const ctr = px(P(0.5, 0.5, 1)), a = { x: ctr.x + 50, y: ctr.y }; await drag(a, { x: ctr.x + 100, y: ctr.y }); }
  const s4 = snap(), t4 = s4.filter((v) => top0.includes(v[0]));
  out.scale = { zKept: t4.every((v) => v[3] === 1), bigger: t4.every((v) => Math.hypot(v[1], v[2]) > Math.hypot(0.5, 0.5) + 0.05), bottomKept: s4.filter((v) => !top0.includes(v[0])).every((v) => { const o = s0.find((w) => w[0] === v[0]); return v.join() === o.join(); }), hint: hud.status() };
  key("z"); await sleep(30);
  { const ctr = px(P(0.5, 0.5, 1)), a = { x: ctr.x + 50, y: ctr.y }; await drag(a, { x: ctr.x + 87, y: ctr.y }, true); }
  const t5 = snap().filter((v) => top0.includes(v[0])), f5 = Math.hypot(t5[0][1], t5[0][2]) / Math.hypot(0.5, 0.5);
  out.scaleShift = { f: +f5.toFixed(4), step: Math.abs(f5 * 10 - Math.round(f5 * 10)) < 1e-3 };
  key("z"); await sleep(30);
  // ④b 挪 + Shift = 吸附：选中右前上角那个点，按住 Shift 拖到右后上角 → 落得正正好（点 > 边 > 面）
  e.deselectAll(); e.setTool("select"); await click(P(1, 0, 1)); out.snapSel = e.selection.verts.size;
  e.setTool("move");
  { const a = px(P(1, 0, 1)), z = px(P(1, 1, 1)); await drag(a, { x: z.x + 3, y: z.y + 2 }, true); }
  const sv = [...e.selection.verts][0], sp = sv !== undefined ? m().pt(sv) : null;
  out.snapMove = { p: sp ? [q(sp.x), q(sp.y), q(sp.z)] : null, hint: hud.status() };
  key("z"); await sleep(30);
  // ⑤ 守门：画线键不跳工作台
  e.setTool("line"); out.lineGuard = { mode: e.modeId, tool: e.tool, hint: hud.status() };
  // ⑥ 撤到头 / 重做到头
  let threw = false;
  try { for (let i = 0; i < 20 && e.history.position() > 0; i++) { key("z"); await sleep(20); } for (let i = 0; i < 20; i++) { const p0 = e.history.position(); key("y"); await sleep(20); if (e.history.position() === p0) break; } } catch { threw = true; }
  out.undoRedoAll = { threw, kind: S().kindOf(def), mode: e.modeId };
  return out;
});
await b.close();
res.errs = errs;
const ok = res.rail === "select,pp,move,rotate,scale,knife,erase,offset,shrink,create"
  && res.move.moved === res.move.top && res.move.steps === 1 && res.moveUndo
  && res.moveZ.xyKept && res.moveZ.zUp
  && res.rotate.zKept && res.rotate.distKept && res.rotate.changed
  && res.scaleSel === 1 && res.scale.zKept && res.scale.bigger && res.scale.bottomKept && res.scaleShift.step
  && res.snapSel === 1 && JSON.stringify(res.snapMove.p) === JSON.stringify([0.5, 0.5, 1])
  && res.lineGuard.mode === "freeform" && res.lineGuard.tool === "move" && /没有这把工具/.test(res.lineGuard.hint)
  && !res.undoRedoAll.threw && errs.length === 0;
console.log(JSON.stringify(res, null, 1));
console.log(ok ? "probe-mesh-transform OK" : "probe-mesh-transform FAIL");
process.exit(ok ? 0 : 1);
