// L / Shift+L = 选连着的一块 / 拿掉（Blender L；user 11-13 重做小屋子，统筹转；两个建模工作台都有，硬表面画线只剩 K）。created 2026-11-13 by Claude Opus 5.5
// 一个网格体里两个不相连的方块（自由建模），鼠标停着按键：
// ① 停在第一个上按 L = 第一个的面全选中、第二个一张没选 ② 移到第二个上再按 L = 两个都选中 ③ 停在第一个上 Shift+L = 只剩第二个 ④ 停在空处按 L = 不变、历史一步不多
// ⑤ 硬表面里两个方块同样走一遍；⑥ 硬表面按 K 还是画线
// 跑法：python3 -m http.server 8765 后 node test/probes/probe-select-linked.mjs [url]
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 1000, height: 800 } });
page.setDefaultTimeout(4000);
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(process.argv.slice(2).find((a) => a.startsWith("http")) ?? "http://127.0.0.1:8765/", { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1200);
const res = await page.evaluate(async () => {
  const e = globalThis.__catsup.editor, hud = globalThis.__catsup.hud, P = (x, y, z = 0) => ({ x, y, z }), sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const c = document.getElementById("board"), r = c.getBoundingClientRect();
  const hover = async (s) => { c.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, clientX: r.left + s.x, clientY: r.top + s.y, pointerId: 5, pointerType: "mouse", isPrimary: true, buttons: 0 })); await sleep(20); };
  const key = async (k, code, more = {}) => { window.dispatchEvent(new KeyboardEvent("keydown", { key: k, code, bubbles: true, cancelable: true, ...more })); await sleep(40); };
  const px = (p) => e.cam.angularPx(p, e.vp());
  const box = (x0, y0, z0, x1, y1, z1) => { const B = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], segs = []; for (let i = 0; i < 4; i++) { const a = B[i], d = B[(i + 1) % 4]; segs.push([P(a[0], a[1], z0), P(d[0], d[1], z0)]); segs.push([P(a[0], a[1], z1), P(d[0], d[1], z1)]); segs.push([P(a[0], a[1], z0), P(a[0], a[1], z1)]); } e.addSegments(segs, "box"); };
  const S = () => e.scene, out = {};
  e.setGrid({ ...e.grid, on: false });
  // 硬表面：两个方块
  box(0, 0, 0, 1, 1, 1); box(3, 0, 0, 4, 1, 1); e.deselectAll();
  e.cam.setView("iso"); e.zoomExtents(); e.cam.halfH *= 1.3; e.draw(); hud.pick("select"); await sleep(20);
  const A = px(P(0.5, 0.5, 1)), B2 = px(P(3.5, 0.5, 1)), EMPTY = { x: 30, y: 30 };
  const run = async (sideOf) => {
    const o = {}, st = () => { const f = [...e.selection.faces]; return { a: f.filter((x) => sideOf(x) === "a").length, b: f.filter((x) => sideOf(x) === "b").length }; };
    e.deselectAll(); await hover(A); await key("l", "KeyL"); o.l1 = st();
    await hover(B2); await key("l", "KeyL"); o.l2 = st();
    await hover(A); await key("L", "KeyL", { shiftKey: true }); o.sl = st();
    const steps = e.history.steps(), before = JSON.stringify(st()); await hover(EMPTY); await key("l", "KeyL"); o.empty = { same: JSON.stringify(st()) === before, dSteps: e.history.steps() - steps, hint: document.getElementById("hint")?.textContent ?? "" };
    o.undo = (() => { const s0 = JSON.stringify(st()); e.undo(); const s1 = JSON.stringify(st()); return { before: s0, after: s1 }; })();
    return o;
  };
  // 面 id（正在编辑那一层的本地 id）→ 哪个方块：看面上的点的 x，按所有面的 x 的中间分开（两种工作台同一份；本地坐标可能整体平移）
  const sideFn = () => { const v = e.activeView, xs = (f) => { const F = v.face(f); return F ? F.outer.vids.map((x) => v.graph.pt(x).x) : []; }, all = v.faces().map((F) => F.id);
    let lo = Infinity, hi = -Infinity; for (const f of all ?? []) for (const x of xs(f)) { lo = Math.min(lo, x); hi = Math.max(hi, x); } const mid = (lo + hi) / 2;
    return (f) => { const q = xs(f); return q.length && q.every((x) => x < mid) ? "a" : q.length && q.every((x) => x > mid) ? "b" : "?"; }; };
  out.mode0 = e.modeId;
  out.hard = await run(sideFn());
  // 硬表面 K = 画线
  e.deselectAll(); await key("k", "KeyK"); out.hardK = e.tool; hud.pick("select"); await sleep(10);
  // 自由建模：两块转成一个网格体
  e.selectAll(); e.runAction("brep.orientOutward", { curvature: 3 }); e.makeComponent("块"); e.runAction("object.toMesh"); await sleep(20);
  const inst = [...S().def(S().root).instances.values()][0], def = inst.def, m = () => S().mesh(def).kernel;
  e.selectedPools.clear(); e.selectedPools.set(`i${inst.id}`, { kind: "instance", instance: inst.id }); e.enterSelected(); await sleep(30); hud.pick("select"); await sleep(10);
  out.mode1 = e.modeId;
  const X = () => S().xformOfContext(e.ctx), W = (p) => { const x = X(); return x[0] * p.x + x[1] * p.y + x[2] * p.z + x[3]; };
  out.mesh = await run((f) => { const xs = m().faceVerts(f).map((v) => W(m().pt(v))); return xs.every((x) => x < 2) ? "a" : xs.every((x) => x > 2) ? "b" : "?"; });
  void sideFn;
  out.meshFaces = m().faceCount();
  return out;
});
await b.close();
const ok = [], bad = [], chk = (n, c, d) => (c ? ok : bad).push(`${n}${c ? "" : "  ← " + JSON.stringify(d)}`);
for (const [k, label, n] of [["mesh", "自由建模", 6], ["hard", "硬表面", 6]]) {
  const o = res[k];
  chk(`${label} ① 停在第一个上按 L = 第一个的面全选中、第二个一张没选`, o.l1.a === n && o.l1.b === 0, o.l1);
  chk(`${label} ② 移到第二个上再按 L = 两个都选中`, o.l2.a === n && o.l2.b === n, o.l2);
  chk(`${label} ③ 停在第一个上 Shift+L = 只剩第二个`, o.sl.a === 0 && o.sl.b === n, o.sl);
  chk(`${label} ④ 停在空处按 L = 不变、一步不多、说一句`, o.empty.same && o.empty.dSteps === 0 && /L：光标下面没有东西/.test(o.empty.hint), o.empty);
  chk(`${label} 撤销一步 = 退回 Shift+L 之前（L 进撤销，和别的选择一样）`, o.undo.after !== o.undo.before, o.undo);
}
chk("工作台：先硬表面、后自由建模", res.mode0 === "geometry" && res.mode1 === "freeform", { m0: res.mode0, m1: res.mode1 });
chk("硬表面按 K = 画线（L 让出来之后画线只剩 K）", res.hardK === "line", res.hardK);
chk("没有脚本错误", errs.length === 0, errs);
for (const s of ok) console.log("✓", s);
for (const s of bad) console.log("✗", s);
process.exit(bad.length ? 1 : 0);
