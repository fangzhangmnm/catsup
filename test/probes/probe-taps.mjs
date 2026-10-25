// test/probes/probe-taps.mjs —— 点而不是拖（#23，2026-10-21，Claude Fable 5.1）：笔的 移动 = 点两下（拿起 → 放下）、旋转 = 点三下（圆心 → 参考 → 角度）。
// 用法：先 python3 -m http.server 8765；node test/probes/probe-taps.mjs（借 WeebPaint 的 playwright）。
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
  const fire = (type, x, y, extra = {}) => c.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: r.left + x, clientY: r.top + y, pointerId: 21, pointerType: "pen", isPrimary: true, button: extra.button ?? 0, buttons: extra.buttons ?? 0, pressure: 0.5 }));
  const tap = async (p) => { fire("pointerdown", p.x, p.y, { button: 0, buttons: 1 }); await sleep(40); fire("pointerup", p.x, p.y, { button: 0, buttons: 0 }); await sleep(40); };
  const Pt = (x, y, z = 0) => ({ x, y, z });
  const out = {};
  // 地上一张 2×2 方（独立面，好量）
  e.addSegments([[Pt(0, 0), Pt(2, 0)], [Pt(2, 0), Pt(2, 2)], [Pt(2, 2), Pt(0, 2)], [Pt(0, 2), Pt(0, 0)]], "probe");
  e.cam.setView("top"); e.zoomExtents();
  // ① 移动（笔，点两下）：三击选连通体 → 移动工具：点面心拿起 → 点 (1,5) 放下 → 整面搬了 (0,4,0)
  e.setTool("select");
  const hit = e.pickAt(px(Pt(1, 1, 0)).x, px(Pt(1, 1, 0)).y); e.selectExpand(hit, 2);
  out.selected = e.hasGeometrySelection();
  e.setTool("move");
  await tap(px(Pt(1, 1, 0)));
  out.movedArmed = e.isGestureActive();
  await tap(px(Pt(1, 5, 0)));
  const ys = e.kernel.vertices().map((v) => v.y);
  out.movedBy4 = Math.abs(Math.min(...ys) - 4) < 1e-6 && Math.abs(Math.max(...ys) - 6) < 1e-6;
  out.moveGestureDone = !e.isGestureActive();
  // ② 旋转（笔，点三下）：选中 → 旋转工具：点圆心 (0,4) → 点参考 (2,4)（+x）→ 点角度 (0,6)（+y）= 90°
  e.cancel(); e.setTool("select");
  const hit2 = e.pickAt(px(Pt(1, 5, 0)).x, px(Pt(1, 5, 0)).y); e.selectExpand(hit2, 2);
  e.setTool("rotate");
  await tap(px(Pt(0, 4, 0)));
  out.rotStageAfterCenter = e.isGestureActive() ? "active" : "idle";
  await tap(px(Pt(2, 4, 0)));
  out.rotArmed = e.isGestureActive();
  await tap(px(Pt(0, 6, 0)));
  const xs = e.kernel.vertices().map((v) => v.x), ys2 = e.kernel.vertices().map((v) => v.y);
  // 绕 (0,4) 转 +90°：(x,y) → (4−y, x+4)：方 x∈[0,2],y∈[4,6] → x∈[-2,0], y∈[4,6]
  out.rotated90 = Math.abs(Math.min(...xs) + 2) < 1e-6 && Math.abs(Math.max(...xs)) < 1e-6 && Math.abs(Math.min(...ys2) - 4) < 1e-6 && Math.abs(Math.max(...ys2) - 6) < 1e-6;
  out.rotGestureDone = !e.isGestureActive();
  return out;
});
console.log(JSON.stringify(res));
console.log("errors:", errs.length ? errs.join("; ") : "none");
const ok = res.selected && res.movedArmed && res.movedBy4 && res.moveGestureDone && res.rotArmed && res.rotated90 && res.rotGestureDone && errs.length === 0;
console.log(ok ? "PROBE OK" : "PROBE FAIL");
await browser.close();
process.exit(ok ? 0 : 1);
