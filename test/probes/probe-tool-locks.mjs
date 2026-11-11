// 每个工具各记各的锁 + 锁的入口在右上角（白模第一批 W-4 / W-6；created 2026-11-10 by Claude Opus 5.5；施工单 ai-docs/20261110-whitebox-batch1.md）。网格体方块里——
// W-4 ① 缩放：点右上角「X」锁 X → 拖一下只沿 X 缩；落定后还锁着 X → 再拖一下还是只沿 X ② 换到移动 = 没有锁（三行里没有亮的）；换回缩放 = 又是 X、「X」亮 ③ 点「X」= 解开
// W-6 ④ 移动、没做手势时点「XY」→ 拖一个点只在 XY 面里动（z 不变）；再点一下 = 解开；锁上后换去旋转再换回来 = 还是它 ⑤ 吸附钮长按菜单里没有锁的选项
//     ⑥ 拿选择工具（不吃锁）时锁的三行不出；拿移动时出，三行六颗
// Esc ⑦ 键盘 Esc 只解当前这把工具的锁：移动锁着 XY、缩放锁着 X → 在移动里按 Esc = 移动没锁、缩放还是 X
// 交接 ⑧ 不吃锁的工具（选择）先按 Y 再按 G = 这次移动锁在 Y（键表 lock.arm）；交过去以后选择工具那边不留
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
  const btns = () => [...document.querySelectorAll(".gizmo-lock")].filter((x) => !x.closest("[hidden]") && x.getClientRects().length > 0).map((x) => x.textContent + (x.classList.contains("on") ? "*" : "")).join(" ");
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
// ② 换到移动 = 没有锁；换回缩放 = 又是 X ③ 点「X」= 解开
r.two = await ev(async () => {
  const { tool, tap, lk, sleep } = window.__tl;
  tool("move"); await sleep(30); const move = lk();
  tool("scale"); await sleep(30); const back = lk();
  await tap(".lock-x:not(.lock-plane)"); const off = lk();
  return { move, back, off };
});
// ④ 移动、没做手势时点「XY」→ 拖右前上角那个点只在 XY 面里动
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
// ⑤ 吸附钮长按菜单里没有锁
await page.locator(".gizmo-snap").click({ button: "right" }); await page.waitForTimeout(150);
r.snapMenuLocks = await ev(() => [...document.querySelectorAll(".popup-menu button")].map((x) => x.textContent ?? "").filter((t) => /锁/.test(t)).join("|"));
await page.mouse.click(500, 790); await page.waitForTimeout(100);   // 点外面关菜单（Esc 留给 ⑦）
// ⑥ 选择工具不出锁的三行，移动出
r.six = await ev(async () => { const { tool, btns, sleep } = window.__tl; tool("select"); await sleep(30); const s = { box: !document.querySelector(".gizmo-locks")?.hidden, btns: btns() }; tool("move"); await sleep(30); return { select: s, move: { box: !document.querySelector(".gizmo-locks")?.hidden, btns: btns() } }; });
// ⑦ 移动锁着 XY（④ 留下的）、缩放再锁 X → 回到移动按键盘 Esc = 只解移动的
await ev(async () => { const { tool, tap } = window.__tl; tool("scale"); await tap(".lock-x:not(.lock-plane)"); tool("move"); });
r.sevenBefore = await ev(() => window.__tl.lk());
await page.locator("#board").hover({ position: { x: 300, y: 600 } }); await page.keyboard.press("Escape"); await page.waitForTimeout(80);
r.seven = await ev(async () => { const { tool, lk, sleep } = window.__tl; const move = lk(); tool("scale"); await sleep(30); const scale = lk(); tool("move"); return { move, scale }; });
// ⑧ 选择工具先按 Y 再按 G = 这次移动锁 Y；交过去以后选择那边不留
await ev(async () => { const { e, P, click, tool } = window.__tl; tool("select"); e.deselectAll(); await click(P(0, 0, 1)); });
const v0 = await ev(() => { const { e, P, px } = window.__tl; return px(P(0, 0, 1)); });
const bx = await page.locator("#board").boundingBox();
await page.mouse.move(bx.x + v0.x + 4, bx.y + v0.y - 4); await page.waitForTimeout(40);
await page.keyboard.press("y"); await page.waitForTimeout(40);
r.eightArmed = await ev(() => ({ tool: window.__tl.e.tool, ...window.__tl.lk() }));
await page.keyboard.press("g"); await page.waitForTimeout(60);
r.eightGesture = await ev(() => ({ tool: window.__tl.e.tool, gesture: window.__tl.e.isGestureActive(), ...window.__tl.lk() }));
await page.keyboard.press("Escape"); await page.waitForTimeout(60);
r.eightSelect = await ev(async () => { const { tool, sleep, e } = window.__tl; tool("select"); await sleep(30); return { axis: e.axisLock, plane: e.planeLock }; });
await b.close();
r.errs = errs;
console.log(JSON.stringify(r, null, 1));
const ok = r.one.sel === 1 && r.one.armed.axis === "x" && /(^| )X\*/.test(r.one.armed.btns) && r.one.onlyX1 && r.one.after1.axis === "x" && r.one.onlyX2 && r.one.after2.axis === "x"
  && r.two.move.axis === null && r.two.move.plane === null && !/\*/.test(r.two.move.btns) && r.two.back.axis === "x" && /(^| )X\*/.test(r.two.back.btns) && r.two.off.axis === null && !/\*/.test(r.two.off.btns)
  && r.four.sel === 1 && !r.four.gesture0 && r.four.armed.plane === "z" && /XY\*/.test(r.four.armed.btns) && r.four.zKept && r.four.moved && r.four.after.plane === "z" && r.four.off.plane === null && r.four.back.plane === "z"
  && r.snapMenuLocks === ""
  && !r.six.select.box && r.six.select.btns === "" && r.six.move.box && r.six.move.btns.split(" ").length === 6
  && r.sevenBefore.plane === "z" && r.seven.move.plane === null && r.seven.move.axis === null && r.seven.scale.axis === "x"
  && r.eightArmed.tool === "select" && r.eightArmed.axis === "y" && r.eightGesture.tool === "move" && r.eightGesture.gesture && r.eightGesture.axis === "y" && r.eightSelect.axis === null && r.eightSelect.plane === null
  && errs.length === 0;
console.log(ok ? "probe-tool-locks OK" : "probe-tool-locks FAIL");
process.exit(ok ? 0 : 1);
