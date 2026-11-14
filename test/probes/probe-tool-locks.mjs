// 按钮锁的寿命 + 两种样子（锁的一轮第四步，统筹 11-13；取代白模 W-4「每个工具各记各的」。created 2026-11-10 by Claude Opus 5.5，2026-11-13 照第四步重写）。网格体方块里——
// ① 缩放：点右上角「X」锁 X → 拖一下只沿 X 缩；落定后还锁着 X → 再拖一下还是只沿 X（按钮锁管到放下这把工具）
// ② 换到移动 = 没有锁；换回缩放 = 也没有（拿起另一把工具就从没锁开始）；点「X」= 锁上；再点一次缩放（手里这把）= 锁还在；再点「X」= 解开
// ③ 移动、没做手势时点「XY」→ 拖一个点只在 XY 面里动（z 不变）；落定后还锁着；再点一下 = 解开；锁上后换去旋转再换回来 = 没锁
// ④ 吸附钮长按菜单里没有锁的选项 ⑤ 拿选择工具（不吃锁）时锁的三行不出；拿移动时出，三行六颗
// ⑥ 借用：缩放锁着 X → 借移动（快捷键那种）= 没锁；借着锁上 Y → 借完回缩放 = 没锁
// ⑦ 手势外按 Esc = 解按钮锁
// ⑧ 拿着选择按 Y = 什么都不发生（三行不出、没有锁）；再按 G = 这次移动不限制
// ⑨ G 里按 Y = 只沿 Y（轴键那份）：「Y」钮空心框、不实心；Esc 之后就没了
// ⑨b G 再按 X、挪一下点落定 = 只沿 X；落定后没锁、三行没有实心也没有空心
// ⑩ 没做手势时锁着按 Esc = 只解锁、还在组件里；再按一下才退出一层
// ⑪ 换文件（新建）= 没有锁
// 硬表面（新建的那份里一个盒子）——
// ⑫ 移动工具点按钮锁 Z → 连着挪三下都只沿 Z、都还锁着 → 换到旋转再换回来 = 没锁
// ⑬ 拖着顶面时按 X、松手 = 只沿 X；松手后没锁、三行没有实心也没有空心（硬表面的 G 是建组件，不是键盘起手）
// ⑭ 按钮锁 Z（实心）+ 手势里按 X = 「X」空心框、「Z」还实心，这一下只沿 X；手势里 Esc = 只取消这一下，Z 还锁着、空心框没了；手势外再按 Esc = 解开
// ⑮ 笔点锁钮（触屏走按钮那一半）= 锁上
// 跑法：python3 -m http.server 8765 后 node test/probes/probe-tool-locks.mjs [url]
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 1000, height: 800 } }); page.setDefaultTimeout(4000);
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(process.argv[2] ?? "http://127.0.0.1:8765/", { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1200);
// 页面里的小工具（挂在 window.__tl 上，各步复用）
await page.evaluate(async () => {
  const e = globalThis.__catsup.editor, P = (x, y, z = 0) => ({ x, y, z }), sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const c = document.getElementById("board"), R = () => c.getBoundingClientRect();
  const px = (p) => e.cam.angularPx(p, e.vp());
  const fire = (type, x, y, buttons) => { const r = R(); c.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: r.left + x, clientY: r.top + y, pointerId: 5, pointerType: "mouse", isPrimary: true, button: 0, buttons })); };
  const drag = async (a, z, steps = 10) => { fire("pointermove", a.x, a.y, 0); await sleep(10); fire("pointerdown", a.x, a.y, 1); for (let i = 1; i <= steps; i++) { fire("pointermove", a.x + (z.x - a.x) * i / steps, a.y + (z.y - a.y) * i / steps, 1); await sleep(8); } fire("pointerup", z.x, z.y, 0); await sleep(40); };
  const click = async (p) => { const s = px(p); fire("pointermove", s.x, s.y, 0); await sleep(10); fire("pointerdown", s.x, s.y, 1); await sleep(10); fire("pointerup", s.x, s.y, 0); await sleep(30); };
  const S = () => e.scene, q = (x) => +x.toFixed(4);
  e.setGrid({ ...e.grid, on: false });
  const B = [[0, 0], [1, 0], [1, 1], [0, 1]], segs = []; for (let i = 0; i < 4; i++) { const a = B[i], d = B[(i + 1) % 4]; segs.push([P(a[0], a[1], 0), P(d[0], d[1], 0)]); segs.push([P(a[0], a[1], 1), P(d[0], d[1], 1)]); segs.push([P(a[0], a[1], 0), P(a[0], a[1], 1)]); }
  e.commitOp({ op: "addEdges", at: e.activePool(), segs }); e.selectAll(); e.makeComponent("块"); e.runAction("object.toMesh"); await sleep(20);
  const inst = [...S().def(S().root).instances.values()][0], m = () => S().mesh(inst.def).kernel;
  e.cam.setView("iso"); e.zoomExtents(); e.cam.halfH *= 1.6; e.draw();
  e.selectedPools.clear(); e.selectedPools.set(`i${inst.id}`, { kind: "instance", instance: inst.id }); e.enterSelected(); await sleep(20);
  const snap = () => m().verts().map((v) => { const p = m().pt(v); return [v, q(p.x), q(p.y), q(p.z)]; });
  const tool = (t) => { globalThis.__catsup.hud.pick(t); globalThis.__catsup.syncUi?.(); };
  const lockBtn = (sel) => document.querySelector(`.gizmo-lock${sel}`);
  const tap = async (sel) => { lockBtn(sel).click(); await sleep(40); };
  const btns = () => [...document.querySelectorAll(".gizmo-lock")].filter((x) => !x.closest("[hidden]") && x.getClientRects().length > 0).map((x) => x.textContent + (x.classList.contains("on") ? "*" : "") + (x.classList.contains("once") ? "°" : "")).join(" ");   // * = 实心（按钮锁）、° = 空心框（这一下的轴键）
  const lk = () => ({ axis: e.axisLock, plane: e.planeLock, btns: btns() });
  window.__tl = { e, P, sleep, px, fire, drag, click, snap, tool, tap, btns, lk, q, m };
});
const ev = (fn) => page.evaluate(fn);
const r = {};
// ① 缩放锁 X：选顶面，点「X」，往外拖两次
r.one = await ev(async () => {
  const { e, P, px, drag, click, snap, tool, tap, lk } = window.__tl;
  tool("select"); e.deselectAll(); await click(P(0.5, 0.5, 1)); const sel = e.selection.faces.size;
  tool("scale"); await tap(".lock-x:not(.lock-plane)"); const armed = lk();
  const s0 = snap(), top = s0.filter((v) => v[3] === 1).map((v) => v[0]);
  const ctr = px(P(0.5, 0.5, 1)); await drag({ x: ctr.x + 40, y: ctr.y + 5 }, { x: ctr.x + 90, y: ctr.y - 30 });
  const s1 = snap(), after1 = lk();
  await drag({ x: ctr.x + 40, y: ctr.y + 5 }, { x: ctr.x + 80, y: ctr.y - 40 });
  const s2 = snap(), after2 = lk();
  const onlyX = (sa, sb) => top.every((v) => { const a = sa.find((w) => w[0] === v), z = sb.find((w) => w[0] === v); return a[2] === z[2] && a[3] === z[3]; }) && top.some((v) => sa.find((w) => w[0] === v)[1] !== sb.find((w) => w[0] === v)[1]);
  return { sel, armed, after1, after2, onlyX1: onlyX(s0, s1), onlyX2: onlyX(s1, s2) };
});
// ② 换到移动 = 没有锁；换回缩放 = 也没有；点「X」= 锁上；再点一次缩放（手里这把）= 锁还在；再点「X」= 解开
r.two = await ev(async () => {
  const { tool, tap, lk, sleep } = window.__tl;
  tool("move"); await sleep(30); const move = lk();
  tool("scale"); await sleep(30); const back = lk();
  await tap(".lock-x:not(.lock-plane)"); const on = lk();
  tool("scale"); await sleep(30); const again = lk();   // 再点手里这把不算放下
  await tap(".lock-x:not(.lock-plane)"); const off = lk();
  return { move, back, on, again, off };
});
// ③ 移动、没做手势时点「XY」→ 拖右前上角那个点只在 XY 面里动
r.four = await ev(async () => {
  const { e, P, px, drag, click, snap, tool, tap, lk, m, q } = window.__tl;
  e.undo(); e.undo(); await window.__tl.sleep(30);   // 撤掉 ① 的两次缩放（锁不进撤销），右前上角回到 (1, 0, 1)
  tool("select"); e.deselectAll(); await click(P(1, 0, 1)); const sel = e.selection.verts.size, v = [...e.selection.verts][0];
  if (v === undefined) return { sel };
  tool("move"); const gesture0 = e.isGestureActive(); await tap(".lock-z.lock-plane"); const armed = lk();
  const p0 = m().pt(v), a = px(P(1, 0, 1)); await drag(a, { x: a.x - 30, y: a.y - 70 });
  const p1 = m().pt(v), after = lk();
  await tap(".lock-z.lock-plane"); const off = lk();
  await tap(".lock-z.lock-plane"); tool("rotate"); tool("move"); const back = lk();
  return { sel, gesture0, armed, after, off, back, zKept: q(p1.z) === q(p0.z), moved: Math.hypot(p1.x - p0.x, p1.y - p0.y) > 0.02 };
});
// ④ 吸附钮长按菜单里没有锁
await page.locator(".gizmo-snap").click({ button: "right" }); await page.waitForTimeout(150);
r.snapMenuLocks = await ev(() => [...document.querySelectorAll(".popup-menu button")].map((x) => x.textContent ?? "").filter((t) => /锁/.test(t)).join("|"));
await page.mouse.click(500, 790); await page.waitForTimeout(100);   // 点外面关菜单（Esc 留给 ⑦）
// ⑤ 选择工具不出锁的三行，移动出
r.six = await ev(async () => { const { tool, btns, sleep } = window.__tl; tool("select"); await sleep(30); const s = { box: !document.querySelector(".gizmo-locks")?.hidden, btns: btns() }; tool("move"); await sleep(30); return { select: s, move: { box: !document.querySelector(".gizmo-locks")?.hidden, btns: btns() } }; });
// ⑥ 借用：缩放锁着 X → 借移动 = 没锁；借着锁 Y → 借完回缩放 = 没锁
r.borrow = await ev(async () => {
  const { e, tool, tap, lk, sleep } = window.__tl;
  tool("scale"); await tap(".lock-x:not(.lock-plane)"); const armed = lk();
  e.setTool("move", "borrow"); globalThis.__catsup.syncUi?.(); await sleep(30); const borrowed = lk();
  await tap(".lock-y:not(.lock-plane)"); const lockedInBorrow = lk();
  e.setTool("scale", "back"); globalThis.__catsup.syncUi?.(); await sleep(30); const back = lk();
  return { armed, borrowed, lockedInBorrow, back, tool: e.tool };
});
// ⑦ 移动锁着 XY、没做手势 → 键盘 Esc = 解开
await ev(async () => { const { tool, tap } = window.__tl; tool("move"); await tap(".lock-z.lock-plane"); });
r.sevenBefore = await ev(() => window.__tl.lk());
await page.locator("#board").hover({ position: { x: 300, y: 600 } }); await page.keyboard.press("Escape"); await page.waitForTimeout(80);
r.seven = await ev(() => window.__tl.lk());
// ⑧ 选择工具按 Y = 什么都不发生；再按 G = 这次移动不限制
await ev(async () => { const { e, P, click, tool } = window.__tl; tool("select"); e.deselectAll(); await click(P(0, 0, 1)); });
const v0 = await ev(() => { const { e, P, px } = window.__tl; return px(P(0, 0, 1)); });
const bx = await page.locator("#board").boundingBox();
await page.mouse.move(bx.x + v0.x + 4, bx.y + v0.y - 4); await page.waitForTimeout(40);
await page.keyboard.press("y"); await page.waitForTimeout(40);
const rowsShown = () => ev(() => { const box = document.querySelector(".gizmo-locks"); return !!box && !box.hidden && box.getClientRects().length > 0; });
const keyed = () => ev(() => window.__tl.e.axisConstraintNow().kind + (window.__tl.e.axisConstraintNow().dir ? ":" + ["x", "y", "z"].find((a) => Math.abs(Math.abs(window.__tl.e.axisConstraintNow().dir[a]) - 1) < 1e-9) : ""));
r.eightArmed = { tool: await ev(() => window.__tl.e.tool), shown: await rowsShown(), ...(await ev(() => window.__tl.lk())), keyed: await keyed() };
await page.keyboard.press("g"); await page.waitForTimeout(60);
r.eightGesture = { tool: await ev(() => window.__tl.e.tool), gesture: await ev(() => window.__tl.e.isGestureActive()), ...(await ev(() => window.__tl.lk())), keyed: await keyed() };
// ⑨ G 里按 Y = 只沿 Y（轴键那份）、右上角不亮；Esc 之后就没了
await page.keyboard.press("y"); await page.waitForTimeout(60);
r.nineArmed = { ...(await ev(() => window.__tl.lk())), keyed: await keyed() };
await page.keyboard.press("Escape"); await page.waitForTimeout(60);
r.nineOff = { gesture: await ev(() => window.__tl.e.isGestureActive()), ...(await ev(() => window.__tl.lk())), keyed: await keyed() };
r.eightSelect = await ev(async () => { const { tool, sleep, e } = window.__tl; tool("select"); await sleep(30); return { axis: e.axisLock, plane: e.planeLock }; });
// ⑨b G 再按 X、挪一下点落定 = 只沿 X；落定后没锁、没有空心框
await ev(async () => { const { e, P, click, tool } = window.__tl; tool("select"); e.deselectAll(); await click(P(0, 0, 1)); });
const pv = () => ev(() => { const { e, m, q } = window.__tl, v = [...e.selection.verts][0]; if (v === undefined) return null; const p = m().pt(v); return [q(p.x), q(p.y), q(p.z)]; });
r.nineB = { p0: await pv() };
await page.mouse.move(bx.x + v0.x + 4, bx.y + v0.y - 4); await page.waitForTimeout(40);
await page.keyboard.press("g"); await page.waitForTimeout(60); await page.keyboard.press("x"); await page.waitForTimeout(60);
r.nineB.during = { gesture: await ev(() => window.__tl.e.isGestureActive()), ...(await ev(() => window.__tl.lk())), held: await ev(() => window.__tl.e.axisKeysHeld().map((k) => (k.shift ? "S" : "") + k.key).join(",")) };
await page.mouse.move(bx.x + v0.x + 60, bx.y + v0.y + 10, { steps: 5 }); await page.waitForTimeout(80);
await page.mouse.down(); await page.mouse.up(); await page.waitForTimeout(120);
r.nineB.after = { gesture: await ev(() => window.__tl.e.isGestureActive()), ...(await ev(() => window.__tl.lk())), held: await ev(() => window.__tl.e.axisKeysHeld().length) };
r.nineB.p1 = await pv();
await ev(async () => { const { tool, sleep } = window.__tl; tool("select"); await sleep(30); });
// ⑩ 移动锁着 X、没做手势、没选区：第一下 Esc 只解锁（还在组件里），第二下才退出
await ev(async () => { const { e, tool, tap } = window.__tl; tool("move"); e.deselectAll(); await tap(".lock-x:not(.lock-plane)"); });
const where = () => ev(() => ({ depth: window.__tl.e.contextDepth(), gesture: window.__tl.e.isGestureActive(), ...window.__tl.lk() }));
r.tenBefore = await where();
await page.keyboard.press("Escape"); await page.waitForTimeout(80); r.tenFirst = await where();
await page.keyboard.press("Escape"); await page.waitForTimeout(80); r.tenSecond = await where();
// ⑪ 移动锁着 Z → 新建 = 没有锁
await ev(async () => { const { e, sleep } = window.__tl; e.setTool("move"); e.setAxisLock("z"); await sleep(20); });
r.elevenBefore = await ev(() => window.__tl.e.axisLock);
await ev(() => { void globalThis.__catsup.session.newDoc(); }); await page.waitForTimeout(300);   // 没有家的模型 → 先问「丢弃」
const discard = page.locator("button", { hasText: "丢弃" }); if (await discard.count()) { await discard.first().click(); } await page.waitForTimeout(400);
r.eleven = await ev(() => { const e = globalThis.__catsup.editor; return { depth: e.contextDepth(), axis: e.axisLock, plane: e.planeLock }; });
// 硬表面：新建的那份里画一个 1 m 盒子，选顶面
await ev(async () => {
  const e = globalThis.__catsup.editor, P = (x, y, z = 0) => ({ x, y, z }), sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const B = [[0, 0], [1, 0], [1, 1], [0, 1]], segs = []; for (let i = 0; i < 4; i++) { const a = B[i], d = B[(i + 1) % 4]; segs.push([P(a[0], a[1], 0), P(d[0], d[1], 0)], [P(a[0], a[1], 1), P(d[0], d[1], 1)], [P(a[0], a[1], 0), P(a[0], a[1], 1)]); }
  e.setGrid({ ...e.grid, on: false }); e.commitOp({ op: "addEdges", at: e.activePool(), segs }); e.cam.setView("iso"); e.zoomExtents(); e.cam.halfH *= 1.6; e.draw(); await sleep(20);
  window.__tl.e = e;
  window.__tl.topSel = () => { e.deselectAll(); const k = e.kernel; for (const f of k.faces()) { const pl = k.planeOf(f.id).plane; if (Math.abs(pl.n.z) > 0.99 && Math.abs(Math.abs(pl.d) - window.__tl.topZ()) < 1e-6) e.selection.faces.add(f.id); } e.draw(); return e.selection.faces.size; };
  window.__tl.box = () => { let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity, z1 = -Infinity; for (const v of e.worldView().vertices()) { x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x); y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y); z1 = Math.max(z1, v.z); } const q = window.__tl.q; return { x0: q(x0), x1: q(x1), y0: q(y0), y1: q(y1), z1: q(z1) }; };
  window.__tl.topZ = () => window.__tl.box().z1;
});
const bxH = await page.locator("#board").boundingBox();
const topPx = () => ev(() => { const { e, P, px, box } = window.__tl, b0 = box(); return px(P((b0.x0 + b0.x1) / 2, (b0.y0 + b0.y1) / 2, b0.z1)); });
const mouseDrag = async (a, dx, dy) => { await page.mouse.move(bxH.x + a.x, bxH.y + a.y); await page.waitForTimeout(40); await page.mouse.down(); for (let i = 1; i <= 8; i++) { await page.mouse.move(bxH.x + a.x + dx * i / 8, bxH.y + a.y + dy * i / 8); await page.waitForTimeout(20); } await page.waitForTimeout(60); await page.mouse.up(); await page.waitForTimeout(80); };
// ⑫ 移动工具点按钮锁 Z → 连着挪三下都只沿 Z、都还锁着 → 换到旋转再换回来 = 没锁
r.twelve = { sel: await ev(() => window.__tl.topSel()) };
await ev(async () => { const { tool, tap } = window.__tl; tool("move"); await tap(".lock-z:not(.lock-plane)"); });
r.twelve.armed = await ev(() => window.__tl.lk());
r.twelve.steps = [];
for (const [dx, dy] of [[25, -40], [-30, -25], [40, -30]]) {
  const b0 = await ev(() => window.__tl.box()); await mouseDrag(await topPx(), dx, dy); const b1 = await ev(() => window.__tl.box());
  r.twelve.steps.push({ zMoved: b1.z1 !== b0.z1, xyKept: b1.x0 === b0.x0 && b1.x1 === b0.x1 && b1.y0 === b0.y0 && b1.y1 === b0.y1, lk: await ev(() => window.__tl.lk()) });
}
r.twelve.back = await ev(async () => { const { tool, lk, sleep } = window.__tl; tool("rotate"); await sleep(30); tool("move"); await sleep(30); return lk(); });
// ⑬ 拖着顶面时按 X、松手 = 只沿 X；松手后没锁、三行没有实心也没有空心（硬表面的 G 是建组件，不是键盘起手）
await ev(() => { window.__tl.topSel(); });
let tp = await topPx(); await page.mouse.move(bxH.x + tp.x, bxH.y + tp.y); await page.waitForTimeout(60);
r.thirteen = { b0: await ev(() => window.__tl.box()) };
await page.mouse.down(); for (let i = 1; i <= 8; i++) { await page.mouse.move(bxH.x + tp.x + 5 * i, bxH.y + tp.y - 4 * i); await page.waitForTimeout(20); }
r.thirteen.active = await ev(() => window.__tl.e.isGestureActive());
await page.keyboard.press("x"); await page.waitForTimeout(80);
r.thirteen.during = { ...(await ev(() => window.__tl.lk())), held: await ev(() => window.__tl.e.axisKeysHeld().map((k) => (k.shift ? "S" : "") + k.key).join(",")) };
await page.mouse.move(bxH.x + tp.x + 70, bxH.y + tp.y - 20, { steps: 4 }); await page.waitForTimeout(80); await page.mouse.up(); await page.waitForTimeout(120);
r.thirteen.after = { gesture: await ev(() => window.__tl.e.isGestureActive()), ...(await ev(() => window.__tl.lk())), held: await ev(() => window.__tl.e.axisKeysHeld().length) };
r.thirteen.b1 = await ev(() => window.__tl.box());
// ⑭ 按钮锁 Z（实心）+ 手势里按 X：「X」空心、「Z」实心、这一下只沿 X；手势里 Esc = 只取消这一下，Z 还锁着；手势外 Esc = 解开
await ev(async () => { const { tap, topSel } = window.__tl; topSel(); await tap(".lock-z:not(.lock-plane)"); });
tp = await topPx(); await page.mouse.move(bxH.x + tp.x, bxH.y + tp.y); await page.waitForTimeout(40); await page.mouse.down();
for (let i = 1; i <= 8; i++) { await page.mouse.move(bxH.x + tp.x + 5 * i, bxH.y + tp.y - 6 * i); await page.waitForTimeout(20); }
const active14 = await ev(() => window.__tl.e.isGestureActive());
await page.keyboard.press("x"); await page.waitForTimeout(80);
r.fourteen = { active: active14, during: { ...(await ev(() => window.__tl.lk())), c: await ev(() => { const c = window.__tl.e.axisConstraintNow(); return c.kind + (c.dir ? ":" + ["x", "y", "z"].find((a) => Math.abs(Math.abs(c.dir[a]) - 1) < 1e-9) : ""); }) } };
await page.keyboard.press("Escape"); await page.waitForTimeout(80); await page.mouse.up(); await page.waitForTimeout(80);
r.fourteen.afterEscIn = { gesture: await ev(() => window.__tl.e.isGestureActive()), ...(await ev(() => window.__tl.lk())) };
await page.keyboard.press("Escape"); await page.waitForTimeout(80);
r.fourteen.afterEscOut = await ev(() => window.__tl.lk());
// ⑮ 笔点锁钮 = 锁上（触屏走按钮那一半：笔的按下 / 抬起 / click 都到锁钮上）
r.fifteen = await ev(async () => {
  const { lk, sleep } = window.__tl, btn = document.querySelector(".gizmo-lock.lock-y:not(.lock-plane)"), r0 = btn.getBoundingClientRect(), x = r0.left + r0.width / 2, y = r0.top + r0.height / 2;
  const pe = (type, buttons) => btn.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: x, clientY: y, pointerId: 9, pointerType: "pen", isPrimary: true, button: 0, buttons, pressure: buttons ? 0.5 : 0 }));
  pe("pointerdown", 1); await sleep(20); pe("pointerup", 0); btn.dispatchEvent(new MouseEvent("click", { bubbles: true, clientX: x, clientY: y })); await sleep(40);
  return lk();
});
await b.close();
r.errs = errs;
console.log(JSON.stringify(r, null, 1));
const noMark = (x) => !/[*°]/.test(x.btns);
const ok = r.one.sel === 1 && r.one.armed.axis === "x" && /(^| )X\*/.test(r.one.armed.btns) && r.one.onlyX1 && r.one.after1.axis === "x" && r.one.onlyX2 && r.one.after2.axis === "x"
  && r.two.move.axis === null && r.two.move.plane === null && noMark(r.two.move) && r.two.back.axis === null && noMark(r.two.back) && r.two.on.axis === "x" && /(^| )X\*/.test(r.two.on.btns) && r.two.again.axis === "x" && r.two.off.axis === null && noMark(r.two.off)
  && r.four.sel === 1 && !r.four.gesture0 && r.four.armed.plane === "z" && /XY\*/.test(r.four.armed.btns) && r.four.zKept && r.four.moved && r.four.after.plane === "z" && r.four.off.plane === null && r.four.back.plane === null && r.four.back.axis === null
  && r.snapMenuLocks === ""
  && !r.six.select.box && r.six.select.btns === "" && r.six.move.box && r.six.move.btns.split(" ").length === 6
  && r.borrow.armed.axis === "x" && r.borrow.borrowed.axis === null && r.borrow.lockedInBorrow.axis === "y" && r.borrow.back.axis === null && r.borrow.back.plane === null && r.borrow.tool === "scale"
  && r.sevenBefore.plane === "z" && r.seven.plane === null && r.seven.axis === null
  && r.eightArmed.tool === "select" && !r.eightArmed.shown && r.eightArmed.axis === null && r.eightArmed.keyed === "free" && r.eightGesture.tool === "move" && r.eightGesture.gesture && r.eightGesture.axis === null && r.eightGesture.keyed === "free" && r.eightSelect.axis === null && r.eightSelect.plane === null
  && r.nineArmed.keyed === "line:y" && r.nineArmed.axis === null && !/\*/.test(r.nineArmed.btns) && /(^| )Y°/.test(r.nineArmed.btns) && !r.nineOff.gesture && r.nineOff.keyed === "free" && r.nineOff.axis === null
  && r.tenBefore.depth === 1 && r.tenBefore.axis === "x" && !r.tenBefore.gesture && r.tenFirst.axis === null && r.tenFirst.depth === 1 && r.tenSecond.depth === 0
  && r.elevenBefore === "z" && r.eleven.axis === null && r.eleven.plane === null
  && r.twelve.sel === 1 && r.twelve.armed.axis === "z" && /(^| )Z\*/.test(r.twelve.armed.btns) && r.twelve.steps.length === 3 && r.twelve.steps.every((x) => x.zMoved && x.xyKept && x.lk.axis === "z" && /(^| )Z\*/.test(x.lk.btns)) && r.twelve.back.axis === null && noMark(r.twelve.back)
  && r.nineB.p0 && r.nineB.during.gesture && r.nineB.during.axis === null && r.nineB.during.held === "x" && /(^| )X°/.test(r.nineB.during.btns) && !/\*/.test(r.nineB.during.btns)
  && !r.nineB.after.gesture && r.nineB.after.axis === null && r.nineB.after.plane === null && r.nineB.after.held === 0 && noMark(r.nineB.after)
  && r.nineB.p1 && r.nineB.p1[0] !== r.nineB.p0[0] && r.nineB.p1[1] === r.nineB.p0[1] && r.nineB.p1[2] === r.nineB.p0[2]
  && r.thirteen.active && r.fourteen.active && r.thirteen.during.axis === null && r.thirteen.during.held === "x" && /(^| )X°/.test(r.thirteen.during.btns) && !/\*/.test(r.thirteen.during.btns)
  && !r.thirteen.after.gesture && r.thirteen.after.axis === null && r.thirteen.after.plane === null && r.thirteen.after.held === 0 && noMark(r.thirteen.after)
  && r.thirteen.b1.x1 !== r.thirteen.b0.x1 && r.thirteen.b1.y0 === r.thirteen.b0.y0 && r.thirteen.b1.y1 === r.thirteen.b0.y1 && r.thirteen.b1.z1 === r.thirteen.b0.z1
  && r.fourteen.during.axis === "z" && /(^| )Z\*/.test(r.fourteen.during.btns) && /(^| )X°/.test(r.fourteen.during.btns) && r.fourteen.during.c === "line:x"
  && !r.fourteen.afterEscIn.gesture && r.fourteen.afterEscIn.axis === "z" && /(^| )Z\*/.test(r.fourteen.afterEscIn.btns) && !/°/.test(r.fourteen.afterEscIn.btns) && r.fourteen.afterEscOut.axis === null && noMark(r.fourteen.afterEscOut)
  && r.fifteen.axis === "y" && /(^| )Y\*/.test(r.fifteen.btns)
  && errs.length === 0;
console.log(ok ? "probe-tool-locks OK" : "probe-tool-locks FAIL");
process.exit(ok ? 0 : 1);
