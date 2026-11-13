// 自由建模工作台的挪 / 转 / 缩（2026-10-27 Claude Opus 5.5；tools/mesh-transform.ts）：网格体盒子里——
// ① 挪：在顶面上按下拖走松手 = 顶面四个点一起动、别的点不动、一步撤销；② 锁 Z 挪：斜着拖也只动 z；③ 转：全选 + 锁 Z 拖一圈 = z 不变、到轴心的距离不变；
// ④ 缩：选顶面往外拖 = 顶面变大、z 不变；按住 Shift = 0.1 一档；⑤ 工作台守门：按画线键不跳进硬表面建模；⑥ 撤到头不崩。
// ⑦ 报压感的笔（笔的设计稿第七节第 6 步：轻 = 选、重 = 抓；统筹 11-13）：轻按滑过东西 = 历史一步不多、几何不变；轻点 = 选中、点空白 = 取消；
//    重按在选区外的东西上 → 滑 → 重按 = 挪的是它、一步撤销；重按 → 滑 → 抬笔 = 过了宽限落定；轻按着从空处拖一段再抬笔 = 选区不变、一步不多、屏幕上没有框
//    （笔在这几把工具里不出框：user 11-13）；
//    把手轻按住拖 = 动、松手落定；一下重按按住不放 = 只算一次；Esc 抓到一半 = 回原样、一步不多。
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
  e.setTool("move"); out.moveLockBack = e.axisLock;   // 白模 W-4：移动在 ② 锁的 Z 一直记着（换去旋转 / 缩放再换回来还是它）
  e.clearToolLock();   // = 键盘 Esc：解这把工具的锁，下面吸附要自由拖
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
// ⑦ 报压感的笔
res.pen = await (async () => {
  const pg = await b.newPage({ viewport: { width: 1000, height: 800 } });
  pg.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
  await pg.goto(process.argv[2] ?? "http://127.0.0.1:8765/", { waitUntil: "load", timeout: 30000 }); await pg.waitForTimeout(1200);
  return pg.evaluate(async () => {
    const e = globalThis.__catsup.editor, P = (x, y, z = 0) => ({ x, y, z }), sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const c = document.getElementById("board"), r = c.getBoundingClientRect(), px = (p) => e.cam.angularPx(p, e.vp());
    const B = [[0, 0], [1, 0], [1, 1], [0, 1]], segs = [];
    for (let i = 0; i < 4; i++) { const a = B[i], d = B[(i + 1) % 4]; segs.push([P(a[0], a[1], 0), P(d[0], d[1], 0)]); segs.push([P(a[0], a[1], 1), P(d[0], d[1], 1)]); segs.push([P(a[0], a[1], 0), P(a[0], a[1], 1)]); }
    e.setGrid({ ...e.grid, on: false });
    e.commitOp({ op: "addEdges", at: e.activePool(), segs }); e.selectAll(); e.runAction("brep.orientOutward", { curvature: 3 }); e.makeComponent("块"); e.runAction("object.toMesh"); await sleep(20);
    const S = e.scene, inst = [...S.def(S.root).instances.values()][0], m = () => S.mesh(inst.def).kernel;
    e.cam.setView("iso"); e.zoomExtents(); e.cam.halfH *= 1.6; e.draw();
    e.selectedPools.clear(); e.selectedPools.set(`i${inst.id}`, { kind: "instance", instance: inst.id }); e.enterSelected(); await sleep(30); e.setTool("move"); await sleep(20);
    let pid = 40;
    const pf = (type, q, p) => c.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, clientX: r.left + q.x, clientY: r.top + q.y, pointerId: pid, pointerType: "pen", isPrimary: true, button: type === "pointermove" ? -1 : 0, buttons: type === "pointerup" ? 0 : 1, pressure: type === "pointerup" ? 0 : p }));
    const lerp = (a, z, u) => ({ x: a.x + (z.x - a.x) * u, y: a.y + (z.y - a.y) * u });
    const pdown = async (q) => { pid++; pf("pointerdown", q, 0.1); await sleep(10); for (let i = 0; i < 12; i++) { pf("pointermove", q, 0.15 + (i % 2 ? 0.01 : -0.01)); await sleep(10); } };
    const glide = async (a, z, p = 0.15) => { for (let i = 1; i <= 10; i++) { pf("pointermove", lerp(a, z, i / 10), p + (i % 2 ? 0.01 : -0.01)); await sleep(10); } };
    const hard = async (q) => { for (const p of [0.3, 0.45, 0.6, 0.6, 0.6, 0.35, 0.2, 0.15, 0.15]) { pf("pointermove", q, p); await sleep(8); } };
    const lift = async (q) => { pf("pointerup", q, 0); await sleep(140); };
    const tap = async (q) => { pid++; pf("pointerdown", q, 0.1); await sleep(8); pf("pointermove", q, 0.14); await sleep(8); await lift(q); };
    const geo = () => JSON.stringify(m().verts().map((v) => { const p = m().pt(v); return [+p.x.toFixed(5), +p.y.toFixed(5), +p.z.toFixed(5)]; }));
    const selN = () => e.selection.verts.size + e.selection.edges.size + e.selection.faces.size;
    const steps = () => e.history.position();
    const topC = px(P(0.5, 0.5, 1)), rightC = px(P(1, 0.5, 0.5)), blank = { x: 60, y: 60 }, up40 = (q) => ({ x: q.x, y: q.y - 40 });
    const out = {};
    // a. 轻按滑过东西：几何不变、一步不多；轻点 = 选中、点空白 = 取消
    { const g0 = geo(), h0 = steps(); await pdown(topC); await glide(topC, rightC); await lift(rightC); out.slide = { same: geo() === g0, steps: steps() - h0, sel: selN() }; }
    await tap(topC); out.tapSel = selN();
    await tap(blank); out.tapBlank = selN();
    // b. 重按在选区外的东西（右侧面）上 → 滑 → 重按 = 挪的是它、一步撤销
    await tap(topC); await sleep(600);
    { const g0 = geo(), h0 = steps(), xs0 = m().verts().filter((v) => m().pt(v).x > 0.49).map((v) => [v, m().pt(v).y]);   // 右侧面的点（定义坐标原点在底面中心：x = 0.5）
      await pdown(topC); await glide(topC, rightC); await hard(rightC); const mid = { busy: e.gestureInProgress() };
      await glide(rightC, up40(rightC)); await hard(up40(rightC)); await lift(up40(rightC));
      out.grabOther = { mid, steps: steps() - h0, changed: geo() !== g0, rightFaceMoved: xs0.some(([v, y]) => Math.abs(m().pt(v).y - y) > 1e-6 || m().pt(v).x <= 0.49) };
      e.undo(); await sleep(30); out.grabOtherUndo = geo() === g0; }
    // b2. 重按 → 滑 → 抬笔 = 过了宽限落定
    { await tap(topC); await sleep(600); const g0 = geo(), h0 = steps();
      await pdown(topC); await hard(topC); await glide(topC, up40(topC)); pf("pointerup", up40(topC), 0); await sleep(20); const during = { steps: steps() - h0, busy: e.gestureInProgress() }; await sleep(140);
      out.liftCommit = { during, steps: steps() - h0, changed: geo() !== g0 }; e.undo(); await sleep(30); }
    // c. 轻按着从空处拖一段（扫过整个盒子）再抬笔 = 选区不变、一步不多、屏幕上没有框（user 11-13：笔在这几把工具里不出框）
    { await tap(blank); await tap(topC); await sleep(600); const g0 = geo(), sel0 = selN(), h0 = steps(), far = { x: r.width - 60, y: r.height - 60 }, mq = document.getElementById("marquee");
      await pdown(blank); await glide(blank, rightC); const midBox = !mq.hidden; await glide(rightC, far); const endBox = !mq.hidden; await lift(far);
      out.noBox = { sel: selN(), sel0, steps: steps() - h0, same: geo() === g0, box: midBox || endBox || !mq.hidden }; }
    // d. 把手：选顶面、隔过连击窗口再点一下 = 出手柄；轻按住中心把手拖 = 动、松手落定
    { await tap(blank); await tap(topC); await sleep(600); await tap(topC); await sleep(600);
      const kind = e.pressKindAt(topC.x, topC.y), g0 = geo(), h0 = steps();
      await pdown(topC); await glide(topC, up40(topC)); await lift(up40(topC));
      out.handle = { kind, steps: steps() - h0, changed: geo() !== g0 }; e.undo(); await sleep(30); }
    // e. 一下重按按住不放 = 只算一次（重按起抓后一直重着滑，不落定；抬笔才落定）
    { await tap(blank); await tap(topC); await sleep(600); const h0 = steps();
      await pdown(topC); for (const p of [0.3, 0.45, 0.6, 0.63, 0.65]) { pf("pointermove", topC, p); await sleep(8); }   // 只猛升一次、之后一直重着（压力不回落）
      await glide(topC, up40(topC), 0.65); const held = { busy: e.gestureInProgress(), steps: steps() - h0 };
      await lift(up40(topC)); out.heldOnce = { held, steps: steps() - h0 }; e.undo(); await sleep(30); }
    // f. Esc 抓到一半 = 回原样、一步不多
    { await tap(blank); await tap(topC); await sleep(600); const g0 = geo(), h0 = steps();
      await pdown(topC); await hard(topC); await glide(topC, up40(topC));
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", code: "Escape", bubbles: true, cancelable: true })); await sleep(30);
      await lift(up40(topC)); out.esc = { same: geo() === g0, steps: steps() - h0 }; }
    return out;
  });
})();
await b.close();
res.errs = errs;
const ok = res.rail === "select,pp,move,rotate,scale,knife,erase,softErase,offset,shrink,create,transform,brushGrab,brushDraw,brushSmooth,brushFlatten"   // v0.16.49 起四把笔刷也在自由建模工作台里；软边橡皮（旧红，2026-10-30 跟上）；v0.17.59 变换
  && res.move.moved === res.move.top && res.move.steps === 1 && res.moveUndo
  && res.moveZ.xyKept && res.moveZ.zUp && res.moveZ.lockAfter === "z" && res.moveLockBack === "z"   // W-4：手势落定不解锁、换工具再换回来还是它
  && res.rotate.zKept && res.rotate.distKept && res.rotate.changed
  && res.scaleSel === 1 && res.scale.zKept && res.scale.bigger && res.scale.bottomKept && res.scaleShift.step
  && res.snapSel === 1 && JSON.stringify(res.snapMove.p) === JSON.stringify([0.5, 0.5, 1])
  && res.lineGuard.mode === "freeform" && res.lineGuard.tool === "move" && /没有这把工具/.test(res.lineGuard.hint)
  && !res.undoRedoAll.threw && errs.length === 0
  && res.pen.slide.same && res.pen.slide.steps === 0 && res.pen.slide.sel === 0 && res.pen.tapSel > 0 && res.pen.tapBlank === 0
  && res.pen.grabOther.mid.busy && res.pen.grabOther.steps === 1 && res.pen.grabOther.changed && res.pen.grabOther.rightFaceMoved && res.pen.grabOtherUndo
  && res.pen.liftCommit.during.steps === 0 && res.pen.liftCommit.during.busy && res.pen.liftCommit.steps === 1 && res.pen.liftCommit.changed
  && res.pen.noBox.sel === res.pen.noBox.sel0 && res.pen.noBox.sel0 > 0 && res.pen.noBox.steps === 0 && res.pen.noBox.same && !res.pen.noBox.box
  && res.pen.handle.kind === "handle" && res.pen.handle.steps === 1 && res.pen.handle.changed
  && res.pen.heldOnce.held.busy && res.pen.heldOnce.held.steps === 0 && res.pen.heldOnce.steps === 1
  && res.pen.esc.same && res.pen.esc.steps === 0;
console.log(JSON.stringify(res, null, 1));
console.log(ok ? "probe-mesh-transform OK" : "probe-mesh-transform FAIL");
process.exit(ok ? 0 : 1);
