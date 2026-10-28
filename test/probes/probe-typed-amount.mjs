// 手势中打数（Blender「S Z 0」；created 2026-10-28 by Claude Opus 5.5；设计稿 ai-docs/20261028-typed-amount.md）：真按键，自由建模网格体盒子（1 × 1 × 1）、全选——
// ① S Z 0 回车 = 沿 Z 压平（所有点 z 一样）、一步、撤销回来 ② G X 1.5cm 回车 = 沿 X 挪 1.5 cm（单位在最后打）③ R Z 90 回车 = 绕 Z 转 90°
// ④ S Z 5 退格 0 回车 = 退格改数（还是压平）⑤ S Z 0 Esc = 什么都没动、选区还在（不多一步「取消选择」） ⑥ 打到一半状态行有「打数：0▏」。跑法：python3 -m http.server 8765 后 node test/probes/probe-typed-amount.mjs
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 1000, height: 800 } });
page.setDefaultTimeout(4000);
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto("http://127.0.0.1:8765/", { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1200);
const def = await page.evaluate(async () => {
  const e = globalThis.__catsup.editor, P = (x, y, z = 0) => ({ x, y, z }), sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const B = [[0, 0], [1, 0], [1, 1], [0, 1]], segs = []; for (let i = 0; i < 4; i++) { const a = B[i], d = B[(i + 1) % 4]; segs.push([P(a[0], a[1], 0), P(d[0], d[1], 0)]); segs.push([P(a[0], a[1], 1), P(d[0], d[1], 1)]); segs.push([P(a[0], a[1], 0), P(a[0], a[1], 1)]); }
  e.setGrid({ ...e.grid, on: false });
  e.commitOp({ op: "addEdges", at: e.activePool(), segs }); e.selectAll(); e.makeComponent("块"); e.runAction("object.toMesh"); await sleep(20);
  const s = e.scene, inst = [...s.def(s.root).instances.values()][0];
  e.selectedPools.clear(); e.selectedPools.set(`i${inst.id}`, { kind: "instance", instance: inst.id }); e.enterSelected(); await sleep(30);
  e.cam.setView("iso"); e.zoomExtents(); e.draw(); globalThis.__catsup.hud.pick("select");
  return inst.def;
});
const hover = async () => { await page.mouse.move(520, 380); await page.mouse.move(530, 390); await page.waitForTimeout(40); };
const state = () => page.evaluate((d) => { const e = globalThis.__catsup.editor, m = e.scene.mesh(d).kernel, ps = m.verts().map((v) => m.pt(v)), v0 = m.pt(m.verts()[0]); const r = (k) => [Math.min(...ps.map((p) => p[k])), Math.max(...ps.map((p) => p[k]))].map((x) => +x.toFixed(6)); return { v0: [v0.x, v0.y, v0.z].map((x) => +x.toFixed(6)), sel: e.hasSelection(), x: r("x"), y: r("y"), z: r("z"), steps: e.history.steps(), gesture: e.isGestureActive(), hint: globalThis.__catsup.hud.status(), typed: e.typedText() }; }, def);
const selAll = () => page.evaluate(() => { globalThis.__catsup.editor.selectAll(); });
const keys = async (...ks) => { for (const k of ks) { await page.keyboard.press(k); await page.waitForTimeout(40); } };
const undo = () => page.evaluate(() => globalThis.__catsup.editor.undo());
const r = {};
await selAll(); await hover();
const s0 = await state();
// ① S Z 0 回车
await keys("s", "z", "0");
r.midTyping = await state();
await keys("Enter");
r.one = await state(); r.one.dSteps = r.one.steps - s0.steps;
await undo(); await page.waitForTimeout(40); r.oneUndo = await state();
// ② G X 1.5cm 回车
await selAll(); await hover();
await keys("g", "x", "1", ".", "5", "c", "m", "Enter");
r.two = await state();
await undo(); await page.waitForTimeout(40);
// ③ R Z 90 回车
await selAll(); await hover();
await keys("r", "z", "9", "0", "Enter");
r.three = await state();
await undo(); await page.waitForTimeout(40);
// ④ S Z 5 退格 0 回车
await selAll(); await hover();
await keys("s", "z", "5", "Backspace", "0", "Enter");
r.four = await state();
await undo(); await page.waitForTimeout(40);
// ⑤ S Z 0 Esc
await selAll(); await hover();
const s5 = await state();
await keys("s", "z", "0", "Escape");
r.five = await state(); r.five.same = JSON.stringify([r.five.x, r.five.y, r.five.z]) === JSON.stringify([s5.x, s5.y, s5.z]) && r.five.steps === s5.steps;
await b.close();
r.s0 = s0; r.errs = errs;
console.log(JSON.stringify(r, null, 1));
const w = (a) => +(a[1] - a[0]).toFixed(6);
const ok = r.midTyping.gesture && r.midTyping.typed === "0" && /打数：0▏/.test(r.midTyping.hint)
  && w(r.one.z) === 0 && w(r.one.x) === 1 && w(r.one.y) === 1 && !r.one.gesture && r.one.dSteps === 1 && w(r.oneUndo.z) === 1
  && Math.abs(r.two.x[0] - (s0.x[0] + 0.015)) < 1e-9 && Math.abs(r.two.x[1] - (s0.x[1] + 0.015)) < 1e-9 && JSON.stringify(r.two.y) === JSON.stringify(s0.y) && JSON.stringify(r.two.z) === JSON.stringify(s0.z)
  && JSON.stringify(r.three.z) === JSON.stringify(s0.z) && Math.abs(r.three.v0[0] + s0.v0[1]) < 1e-6 && Math.abs(r.three.v0[1] - s0.v0[0]) < 1e-6   // 绕 Z 转 90°（逆时针）：(x, y) → (−y, x)
  && w(r.four.z) === 0 && r.five.same && !r.five.gesture && r.five.sel && errs.length === 0;   // Esc 只取消这次操作，选区留着
console.log(ok ? "probe-typed-amount OK" : "probe-typed-amount FAIL");
process.exit(ok ? 0 : 1);
