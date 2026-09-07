// test/probes/probe-pen.mjs —— headless 合成事件探针（借 WeebPaint 的 playwright；先起 python3 -m http.server 8765）。created 2026-09-06 by Claude Fable 5.1
// 用法：node test/probes/probe-pen.mjs（非 npm test 的一部分）
import { createRequire } from "node:module";
const { chromium } = createRequire(new URL("../../../20260524 WeebPaint/package.json", import.meta.url))("playwright");
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 1200, height: 800 }, deviceScaleFactor: 2 });
const errs = []; page.on("pageerror", (e) => errs.push(e.message));
await page.goto("http://127.0.0.1:8765/", { waitUntil: "load" }); await page.waitForTimeout(400);
await page.evaluate(() => globalThis.__catsup.editor.applyPreset("日字"));
await page.keyboard.press("l");
const res = await page.evaluate(async () => {
  const e = globalThis.__catsup.editor; const vp = e.vp(); const c = document.getElementById("board"); const r = c.getBoundingClientRect();
  const pts = e.kernel.vertices().map((v) => e.cam.worldToScreen(v, vp));
  const fire = (type, x, y, extra) => c.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: r.left + x, clientY: r.top + y, pointerId: extra.pointerId ?? 7, pointerType: extra.pointerType, isPrimary: true, button: extra.button ?? -1, buttons: extra.buttons ?? 0, pressure: extra.pressure ?? 0 }));
  const tip = () => { const t = document.getElementById("tip"); return t.hidden ? "-" : t.textContent; };
  const out = {};
  // 1. pen hover（无按键）
  fire("pointermove", pts[0].x, pts[0].y, { pointerType: "pen" }); await new Promise((r) => setTimeout(r, 30));
  out.penHover = tip();
  // 2. pen 落笔在顶点0，拖到顶点1，抬起 → 应画一条线并吸端点
  const before = e.kernel.edges().length;
  fire("pointerdown", pts[0].x, pts[0].y, { pointerType: "pen", button: 0, buttons: 1, pressure: 0.5 });
  fire("pointermove", (pts[0].x + pts[2].x) / 2, (pts[0].y + pts[2].y) / 2, { pointerType: "pen", buttons: 1, pressure: 0.5 });
  fire("pointermove", pts[2].x, pts[2].y, { pointerType: "pen", buttons: 1, pressure: 0.5 }); await new Promise((r) => setTimeout(r, 30));
  out.penDragTip = tip();
  fire("pointerup", pts[2].x, pts[2].y, { pointerType: "pen", button: 0, buttons: 0 });
  out.penEdgesAdded = e.kernel.edges().length - before;
  // 3. 手指（默认=相机）：单指拖不应画线
  const b2 = e.kernel.edges().length;
  fire("pointerdown", 300, 300, { pointerType: "touch", pointerId: 11, button: 0, buttons: 1 });
  fire("pointermove", 380, 340, { pointerType: "touch", pointerId: 11, buttons: 1 });
  fire("pointerup", 380, 340, { pointerType: "touch", pointerId: 11, button: 0 });
  out.fingerEdgesAdded = e.kernel.edges().length - b2;
  // 4. mouse hover 仍正常
  fire("pointermove", pts[2].x, pts[2].y, { pointerType: "mouse" }); await new Promise((r) => setTimeout(r, 30));
  out.mouseHover = tip();
  return out;
});
console.log(JSON.stringify(res));
console.log("errors:", errs.length ? errs.join("; ") : "none");
await browser.close();
