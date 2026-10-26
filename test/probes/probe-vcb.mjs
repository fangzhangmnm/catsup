// test/probes/probe-vcb.mjs —— 数值小窗 headless 探针（0.9 #11，2026-10-21，Claude Fable 5.1）：
// 推拉后打「2」↵ = 顶面正好 2 m、再打「150cm」= 1.5 m；矩形「2,1」；圆「0.5」+「12s」；移动复制后「3x」阵列 / 「/2」内分；小窗 DOM 出现 / 隐藏。
// 用法：先 python3 -m http.server 8765；node test/probes/probe-vcb.mjs（借 WeebPaint 的 playwright）。
import { createRequire } from "node:module";
const { chromium } = createRequire(new URL("../../../20260524 WeebPaint/package.json", import.meta.url))("playwright");
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 744, height: 1133 }, deviceScaleFactor: 2 /* iPad mini 6 竖屏 */ });
const errs = []; page.on("pageerror", (e) => errs.push(e.message));
page.on("console", (m) => { if (m.type() === "error") errs.push("console: " + m.text()); });
await page.goto("http://127.0.0.1:8765/", { waitUntil: "load" }); await page.waitForTimeout(400); await page.evaluate(() => globalThis.__catsup?.editor?.setGrid({ on: false }));   // v0.13.64 新文档吸附默认开；本探针测的不是栅格
const res = await page.evaluate(async () => {
  const e = globalThis.__catsup.editor; const vp = () => e.vp(); const c = document.getElementById("board"); const r = c.getBoundingClientRect();
  const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
  const px = (p) => e.cam.angularPx(p, vp());
  const fire = (type, x, y, extra = {}) => c.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: r.left + x, clientY: r.top + y, pointerId: 9, pointerType: "mouse", isPrimary: true, button: extra.button ?? 0, buttons: extra.buttons ?? 0, ctrlKey: !!extra.ctrl }));
  const drag = async (a, b, steps = 6, extra = {}) => { fire("pointerdown", a.x, a.y, { button: 0, buttons: 1, ...extra }); for (let i = 1; i <= steps; i++) fire("pointermove", a.x + (b.x - a.x) * i / steps, a.y + (b.y - a.y) * i / steps, { buttons: 1, ...extra }); await sleep(120); fire("pointerup", b.x, b.y, { button: 0, ...extra }); await sleep(30); };
  const key = (k) => window.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true }));
  const type = async (text) => { for (const ch of text) key(ch); key("Enter"); await sleep(30); };
  const Pt = (x, y, z = 0) => ({ x, y, z });
  const zs = () => e.kernel.vertices().map((v) => v.z);
  const out = {};
  const vcbEl = document.getElementById("vcb");
  // ① 2×2 方 → 推拉往上拖一点 → 小窗亮 → 「2」↵ 顶面正好 2 → 「150cm」↵ 1.5
  e.addSegments([[Pt(0, 0), Pt(2, 0)], [Pt(2, 0), Pt(2, 2)], [Pt(2, 2), Pt(0, 2)], [Pt(0, 2), Pt(0, 0)]], "probe");
  e.cam.setView("iso"); e.zoomExtents();
  out.vcbHiddenBefore = vcbEl.hidden;
  e.setTool("pp");
  const c0 = px(Pt(1, 1, 0));
  await drag(c0, { x: c0.x, y: c0.y - 70 });
  out.vcbShownAfterPP = !vcbEl.hidden && e.vcbState().kind === "pp";
  await type("2");
  out.ppExact2 = Math.abs(Math.max(...zs()) - 2) < 1e-9 && e.kernel.faces().length === 6;
  await type("150cm");
  out.ppExact15 = Math.abs(Math.max(...zs()) - 1.5) < 1e-9 && e.kernel.faces().length === 6;
  // ② 矩形：地上随手拖一个 → 「2,1」→ 新面 2×1
  e.cancel(); e.setTool("rect");
  const a = px(Pt(4, 0, 0)), b = px(Pt(5.3, 0.7, 0));
  const facesBeforeRect = e.kernel.faces().length;
  await drag(a, b);
  out.rectFacesAfterDrag = e.kernel.faces().length - facesBeforeRect;
  out.rectStateAfterDrag = e.vcbState().kind;
  await type("2,1");
  out.rectDebug = { echo: e.vcbState().echo, kind: e.vcbState().kind, faces: e.kernel.faces().length - facesBeforeRect, xs: e.kernel.vertices().filter((v) => v.x > 3.5).map((v) => [+v.x.toFixed(3), +v.y.toFixed(3)]) };
  const rectFace = e.kernel.faces().find((f) => e.kernel.faceRings3(f.id).outer.every((p) => p.x > 3.5));
  const rb = rectFace ? (() => { const ps = e.kernel.faceRings3(rectFace.id).outer; return [Math.max(...ps.map((p) => p.x)) - Math.min(...ps.map((p) => p.x)), Math.max(...ps.map((p) => p.y)) - Math.min(...ps.map((p) => p.y))]; })() : null;
  out.rectExact = !!rb && Math.abs(rb[0] - 2) < 1e-9 && Math.abs(rb[1] - 1) < 1e-9 && e.kernel.faces().length === facesBeforeRect + 1;
  // ③ 圆：「0.5」半径，再「12s」段数
  e.cancel(); e.setTool("circle");
  const cc = px(Pt(-3, 0, 0)), cr = px(Pt(-2.3, 0, 0));
  await drag(cc, cr);
  await type("0.5");
  const circleVerts = () => e.kernel.vertices().filter((v) => v.x < -1.5);
  const cen = () => { const vs = circleVerts(); return { x: vs.reduce((a, v) => a + v.x, 0) / vs.length, y: vs.reduce((a, v) => a + v.y, 0) / vs.length }; };
  out.circleCount = circleVerts().length; out.circleR = circleVerts().map((v) => +Math.hypot(v.x - cen().x, v.y - cen().y).toFixed(4)).slice(0, 3);
  out.circleRadius = circleVerts().every((v) => Math.abs(Math.hypot(v.x - cen().x, v.y - cen().y) - 0.5) < 1e-6) && circleVerts().length === 24;
  await type("12s");
  out.circleSegments = circleVerts().length === 12 && e.config.get("circle", "segments") === 12;
  // ④ 移动复制 + 阵列：三击选盒子 → 移动工具 Ctrl 拖 → 「3x」= 原件 + 3 份 → 「/2」= 原件 + 2 份内分
  e.cancel(); e.setTool("select");
  const topHit = e.pickAt(px(Pt(1, 1, 1.5)).x, px(Pt(1, 1, 1.5)).y);
  e.selectExpand(topHit, 2);
  out.boxSelected = e.hasGeometrySelection();
  const facesBeforeCopy = e.kernel.faces().length;
  e.setTool("move");
  const m0 = px(Pt(1, 1, 1.5)), m1 = px(Pt(1, 7, 1.5));   // 搬 6 m：阵列 / 内分的份都不和原件叠（叠了会 sticky 切面，面数就不是 +6 一份）
  await drag(m0, m1, 6, { ctrl: true });
  out.copyMade = e.kernel.faces().length === facesBeforeCopy + 6;
  await type("3x");
  out.arrayX3 = e.kernel.faces().length === facesBeforeCopy + 18;
  await type("/2");
  out.arrayDiv2 = e.kernel.faces().length === facesBeforeCopy + 12;
  // ④½ 不按 Ctrl 的普通移动也认阵列（user 2026-10-25「/5 *5应该是没有ctrl的时候也可以用，这么说的话其实用笔的话也可以复制了」）：
  //    撤销到复制前 → 普通拖动 6 m → 「2x」= 原件留在原地 + 2 份
  for (let i = 0; i < 10 && e.kernel.faces().length !== facesBeforeCopy; i++) e.undo();
  e.setTool("select"); e.selectExpand(e.pickAt(px(Pt(1, 1, 1.5)).x, px(Pt(1, 1, 1.5)).y), 2); e.setTool("move");
  await drag(m0, m1, 6, {});
  const movedOnly = e.kernel.faces().length === facesBeforeCopy;
  await type("2x");
  out.plainMoveArray = movedOnly && e.kernel.faces().length === facesBeforeCopy + 12 && e.kernel.vertices().some((v) => Math.abs(v.y - 0) < 1e-6);
  // ④¾ 阵列一次撤完、一次重做（user 2026-10-25「*6 /6的时候undo不对，变成需要一个一个删了」）
  e.undo(); out.arrayUndoOnce = e.kernel.faces().length === facesBeforeCopy;
  e.redo(); out.arrayRedoOnce = e.kernel.faces().length === facesBeforeCopy + 12;
  // ⑤ 换工具后小窗熄灭
  e.setTool("line");
  out.vcbHiddenAfterTool = vcbEl.hidden;
  return out;
});
console.log(JSON.stringify(res));
console.log("errors:", errs.length ? errs.join("; ") : "none");
const ok = res.vcbHiddenBefore && res.vcbShownAfterPP && res.ppExact2 && res.ppExact15 && res.rectExact && res.circleRadius && res.circleSegments && res.boxSelected && res.copyMade && res.arrayX3 && res.arrayDiv2 && res.plainMoveArray && res.arrayUndoOnce && res.arrayRedoOnce && res.vcbHiddenAfterTool && errs.length === 0;
console.log(ok ? "PROBE OK" : "PROBE FAIL");
await browser.close();
process.exit(ok ? 0 : 1);
