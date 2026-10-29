// 新建的第二步：转朝向的环（tools/mesh-create.ts；created 2026-10-28 by Claude Opus 5.5；user 10-28 夜「新建能不能做成两步手势，拉好了之后会有一个环，设置朝向」）。
// 顶视图、网格体盒子里、新建立方体——① 地面上拖出来、松手 = 还没建、出环（量角器圆环）、一步都没记 ② 鼠标绕着落点转 ≈ 30° = 预演跟着转，点一下 = 落定：
// 新方块的底边和 X 轴夹角 ≈ 30°（模 90°）、一步撤销、马后炮有「朝向」③ 撤销一步 = 没了 ④ 拖出来、打「22.5」回车 = 正好 22.5° ⑤ 拖出来、按 Esc = 不建
// ⑥ 转到离 X 轴 2° 的地方 = 吸到轴上（0°）⑦ 按住 Shift 转到 37° = 落在 30° 或 45° 档 ⑧ 笔：拖出来、再按下拖着转、松手 = 落定（转了）
// ⑨ 笔：拖出来、点一下（手抖 3 px）= 不转（0°）⑩ 鼠标：绕到 30° 再右键 = 不要环、按起始朝向（0°）⑪ 起始朝向看边：留一个转了 22.5° 的方块，点一下它的顶面 = 新方块顺着那条边（22.5°）。
// 每一条做完撤销，下一条还落在空地上。
// 跑法：python3 -m http.server 8765 后 node test/probes/probe-create-orient.mjs
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 1000, height: 800 } }); page.setDefaultTimeout(4000);
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto("http://127.0.0.1:8765/", { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1200);
const res = await page.evaluate(async () => {
  const e = globalThis.__catsup.editor, P = (x, y, z = 0) => ({ x, y, z }), sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const c = document.getElementById("board"), r = c.getBoundingClientRect(), px = (p) => e.cam.angularPx(p, e.vp());
  const fire = (type, x, y, buttons, o = {}) => c.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: r.left + x, clientY: r.top + y, pointerId: o.pen ? 7 : 5, pointerType: o.pen ? "pen" : "mouse", isPrimary: true, button: 0, buttons, shiftKey: !!o.shift }));
  const key = (k, o = {}) => window.dispatchEvent(new KeyboardEvent("keydown", { key: k, code: o.code ?? (/^\d$/.test(k) ? "Digit" + k : k === "." ? "Period" : k), bubbles: true, cancelable: true, ...o }));
  const B = [[0, 0], [1, 0], [1, 1], [0, 1]], segs = []; for (let i = 0; i < 4; i++) { const a = B[i], d = B[(i + 1) % 4]; segs.push([P(a[0], a[1], 0), P(d[0], d[1], 0)]); segs.push([P(a[0], a[1], 1), P(d[0], d[1], 1)]); segs.push([P(a[0], a[1], 0), P(a[0], a[1], 1)]); }
  e.setGrid({ ...e.grid, on: false });
  e.commitOp({ op: "addEdges", at: e.activePool(), segs }); e.selectAll(); e.makeComponent("块"); e.runAction("object.toMesh"); await sleep(20);
  const S = () => e.scene, inst = [...S().def(S().root).instances.values()][0], m = () => S().mesh(inst.def).kernel;
  e.selectedPools.clear(); e.selectedPools.set(`i${inst.id}`, { kind: "instance", instance: inst.id }); e.enterSelected(); await sleep(20);
  e.cam.setView("top"); e.zoomExtents(); e.cam.halfH *= 4; e.draw();
  e.setTool("create"); e.config.set("create", "kind", "box"); await sleep(40);
  const desc = () => e.handlers.create.describe().meshCreate;
  const prot = () => !!e.handlers.create.viewExtras?.().protractor;
  // 新方块（最后长出来的 8 个点）的底边和 X 轴夹角（度，模 90）
  const angleOfNew = (before) => { const nv = m().verts().filter((v) => !before.has(v)); if (nv.length !== 8) return null; const ps = nv.map((v) => m().pt(v)), z0 = Math.min(...ps.map((p) => p.z)), bot = ps.filter((p) => Math.abs(p.z - z0) < 1e-9);
    const p0 = bot[0], others = bot.slice(1).map((p) => ({ dx: p.x - p0.x, dy: p.y - p0.y })).sort((a, b2) => Math.hypot(a.dx, a.dy) - Math.hypot(b2.dx, b2.dy)), d = others[0];
    let a = Math.atan2(d.dy, d.dx) * 180 / Math.PI; a = ((a % 90) + 90) % 90; return +a.toFixed(2); };
  const A = P(4, 0, 0), a = px(A), R = 80;
  const at = (deg) => { const wR = 2, w = P(A.x + wR * Math.cos(deg * Math.PI / 180), A.y + wR * Math.sin(deg * Math.PI / 180), 0); return px(w); };   // 地面上绕落点 deg 度的那一点（顶视图：屏上方向 = 世界方向）
  const dragOut = async (o = {}) => { const z = at(0); fire("pointermove", a.x, a.y, 0, o); await sleep(10); fire("pointerdown", a.x, a.y, 1, o); for (let i = 1; i <= 8; i++) { fire("pointermove", a.x + (z.x - a.x) * i / 8 * (R / Math.hypot(z.x - a.x, z.y - a.y)), a.y + (z.y - a.y) * i / 8 * (R / Math.hypot(z.x - a.x, z.y - a.y)), 1, o); await sleep(16); } const u = { x: a.x + (z.x - a.x) * (R / Math.hypot(z.x - a.x, z.y - a.y)), y: a.y + (z.y - a.y) * (R / Math.hypot(z.x - a.x, z.y - a.y)) }; fire("pointerup", u.x, u.y, 0, o); await sleep(40); return u; };
  const sweep = async (deg, o = {}) => { for (let i = 1; i <= 6; i++) { const s = at(deg * i / 6); fire("pointermove", s.x, s.y, o.pen ? 1 : 0, o); await sleep(16); } };
  const click = async (s, o = {}) => { fire("pointerdown", s.x, s.y, 1, o); await sleep(10); fire("pointerup", s.x, s.y, 0, o); await sleep(40); };
  const out = {}, undo = async () => { window.dispatchEvent(new KeyboardEvent("keydown", { key: "z", code: "KeyZ", ctrlKey: true, bubbles: true, cancelable: true })); await sleep(40); };
  // ①
  { const f0 = m().faceCount(), pos0 = e.history.position();
    await dragOut();
    out.one = { phase: desc().phase, ring: prot(), facesSame: m().faceCount() === f0, steps: e.history.position() - pos0 };
  // ②
    const before = new Set(m().verts());
    await sweep(30); await sleep(30);
    out.two = { spin: +(desc().spin * 180 / Math.PI).toFixed(1), status: globalThis.__catsup.hud.status() };
    await click(at(30));
    const panel = document.querySelector(".vcb-params:not([hidden])");
    out.two.ang = angleOfNew(before); out.two.steps = e.history.position() - pos0; out.two.phase = desc().phase; out.two.ring = prot(); out.two.panel = panel?.textContent ?? "";
  // ③
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "z", code: "KeyZ", ctrlKey: true, bubbles: true, cancelable: true })); await sleep(40);
    out.three = { back: m().faceCount() === f0 }; }
  // ④ 打数
  { const before = new Set(m().verts());
    await dragOut(); for (const k of ["2", "2", ".", "5"]) { key(k); await sleep(10); } key("Enter"); await sleep(60);
    out.four = { ang: angleOfNew(before), phase: desc().phase }; await undo(); }
  // ⑤ Esc
  { const f0 = m().faceCount(); await dragOut(); key("Escape"); await sleep(40); out.five = { same: m().faceCount() === f0, phase: desc().phase, ring: prot() }; }
  // ⑥ 吸轴
  { const before = new Set(m().verts()); await dragOut(); await sweep(2); await click(at(2)); out.six = { ang: angleOfNew(before) }; await undo(); }
  // ⑦ Shift 档
  { const before = new Set(m().verts()); await dragOut(); await sweep(37, { shift: true }); fire("pointerdown", at(37).x, at(37).y, 1, { shift: true }); await sleep(10); fire("pointerup", at(37).x, at(37).y, 0, { shift: true }); await sleep(40); out.seven = { ang: angleOfNew(before) }; await undo(); }
  // ⑧ 笔
  { const before = new Set(m().verts()), pos0 = e.history.position();
    const u = await dragOut({ pen: true });
    out.eight = { phase: desc().phase };
    fire("pointerdown", u.x, u.y, 1, { pen: true }); await sleep(10);
    await sweep(40, { pen: true });
    out.eight.mid = +(desc().spin * 180 / Math.PI).toFixed(1);
    const s = at(40); fire("pointerup", s.x, s.y, 0, { pen: true }); await sleep(60);
    out.eight.ang = angleOfNew(before); out.eight.steps = e.history.position() - pos0; out.eight.after = desc().phase; await undo(); }
  // ⑨ 笔点一下（手抖）= 不转
  { const before = new Set(m().verts());
    const u = await dragOut({ pen: true });
    fire("pointerdown", u.x, u.y, 1, { pen: true }); await sleep(10); fire("pointermove", u.x + 2, u.y - 2, 1, { pen: true }); await sleep(16); fire("pointerup", u.x + 2, u.y - 2, 0, { pen: true }); await sleep(60);
    out.nine = { ang: angleOfNew(before), after: desc().phase }; await undo(); }
  // ⑩ 鼠标右键 = 按起始朝向
  { const before = new Set(m().verts());
    await dragOut(); await sweep(30);
    const s = at(30); c.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientX: r.left + s.x, clientY: r.top + s.y, pointerId: 5, pointerType: "mouse", isPrimary: true, button: 2, buttons: 2 }));
    c.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: r.left + s.x, clientY: r.top + s.y, button: 2 }));
    c.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, clientX: r.left + s.x, clientY: r.top + s.y, pointerId: 5, pointerType: "mouse", isPrimary: true, button: 2, buttons: 0 })); await sleep(60);
    out.ten = { ang: angleOfNew(before), after: desc().phase }; await undo(); }
  // ⑪ 看边：先留一个 22.5° 的，再点一下它的顶面
  { await dragOut(); for (const k of ["2", "2", ".", "5"]) { key(k); await sleep(10); } key("Enter"); await sleep(60);
    const before = new Set(m().verts());
    e.config.set("create", "size", 0.3); await click(a); await sleep(30);
    const nv = m().verts().filter((v) => !before.has(v)), z0 = nv.length ? Math.min(...nv.map((v) => m().pt(v).z)) : null;
    out.eleven = { ang: angleOfNew(before), onTop: z0 !== null && z0 > 0.5 }; }
  return out;
});
await b.close();
res.errs = errs;
console.log(JSON.stringify(res, null, 1));
const near = (x, y, tol) => x !== null && Math.abs(x - y) <= tol;
const ok = res.one.phase === "orient" && res.one.ring && res.one.facesSame && res.one.steps === 0
  && near(res.two.spin, 30, 2) && /朝向/.test(res.two.status) && near(res.two.ang, 30, 2) && res.two.steps === 1 && res.two.phase === "idle" && !res.two.ring && /朝向/.test(res.two.panel)
  && res.three.back && near(res.four.ang, 22.5, 0.01) && res.four.phase === "idle"
  && res.five.same && res.five.phase === "idle" && !res.five.ring
  && (near(res.six.ang, 0, 0.01) || near(res.six.ang, 90, 0.01)) && (near(res.seven.ang, 30, 0.01) || near(res.seven.ang, 45, 0.01))
  && res.eight.phase === "orient" && near(res.eight.mid, 40, 3) && near(res.eight.ang, 40, 3) && res.eight.steps === 1 && res.eight.after === "idle"
  && (near(res.nine.ang, 0, 0.01) || near(res.nine.ang, 90, 0.01)) && res.nine.after === "idle" && (near(res.ten.ang, 0, 0.01) || near(res.ten.ang, 90, 0.01)) && res.ten.after === "idle"
  && near(res.eleven.ang, 22.5, 0.01) && res.eleven.onTop && errs.length === 0;
console.log(ok ? "probe-create-orient OK" : "probe-create-orient FAIL");
process.exit(ok ? 0 : 1);
