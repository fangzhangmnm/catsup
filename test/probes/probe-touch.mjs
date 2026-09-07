// test/probes/probe-touch.mjs —— headless 合成事件探针（借 WeebPaint 的 playwright；先起 python3 -m http.server 8765）。created 2026-09-06 by Claude Fable 5.1
// 用法：node test/probes/probe-touch.mjs（非 npm test 的一部分）
import { createRequire } from "node:module";
const { chromium } = createRequire(new URL("../../../20260524 WeebPaint/package.json", import.meta.url))("playwright");
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 1200, height: 800 }, deviceScaleFactor: 2 });
const errs = []; page.on("pageerror", (e) => errs.push(e.message));
await page.goto("http://127.0.0.1:8765/", { waitUntil: "load" }); await page.waitForTimeout(400);
const res = await page.evaluate(async () => {
  const e = globalThis.__catsup.editor; const c = document.getElementById("board"); const r = c.getBoundingClientRect();
  const fire = (type, x, y, o) => c.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: r.left + x, clientY: r.top + y, pointerId: o.id, pointerType: o.t ?? "touch", isPrimary: o.id === 1, button: o.button ?? 0, buttons: o.buttons ?? 1 }));
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const out = {};
  e.applyPreset("日字"); e.applyPreset("田字");   // 两步历史
  const faces0 = e.kernel.faces().length;
  // 双指 tap（快、没动）→ 撤销一次
  fire("pointerdown", 400, 400, { id: 11 }); fire("pointerdown", 460, 410, { id: 12 }); await wait(60);
  fire("pointerup", 400, 400, { id: 11, buttons: 0 }); fire("pointerup", 460, 410, { id: 12, buttons: 0 }); await wait(30);
  out.afterTwoTap = [faces0, e.kernel.faces().length];
  // 三指 tap → 重做
  fire("pointerdown", 400, 400, { id: 21 }); fire("pointerdown", 460, 410, { id: 22 }); fire("pointerdown", 520, 420, { id: 23 }); await wait(60);
  fire("pointerup", 400, 400, { id: 21, buttons: 0 }); fire("pointerup", 460, 410, { id: 22, buttons: 0 }); fire("pointerup", 520, 420, { id: 23, buttons: 0 }); await wait(30);
  out.afterThreeTap = e.kernel.faces().length;
  // 捏合（动了 >16px）→ 不撤销，但相机 halfH 变
  const h0 = e.cam.halfH;
  fire("pointerdown", 400, 400, { id: 31 }); fire("pointerdown", 500, 400, { id: 32 });
  fire("pointermove", 380, 400, { id: 31 }); fire("pointermove", 540, 400, { id: 32 }); await wait(40);
  fire("pointerup", 380, 400, { id: 31, buttons: 0 }); fire("pointerup", 540, 400, { id: 32, buttons: 0 }); await wait(30);
  out.pinch = { facesUnchanged: e.kernel.faces().length === out.afterThreeTap, halfHChanged: e.cam.halfH !== h0 };
  // 慢 tap（>250ms）→ 不撤销
  fire("pointerdown", 400, 400, { id: 41 }); fire("pointerdown", 460, 410, { id: 42 }); await wait(400);
  fire("pointerup", 400, 400, { id: 41, buttons: 0 }); fire("pointerup", 460, 410, { id: 42, buttons: 0 }); await wait(30);
  out.slowTapNoUndo = e.kernel.faces().length === out.afterThreeTap;
  // 掌触门：pen 抬起后 100ms 内的双指 tap → 吞掉
  fire("pointerdown", 700, 600, { id: 51, t: "pen" }); fire("pointerup", 700, 600, { id: 51, t: "pen", buttons: 0 }); await wait(50);
  fire("pointerdown", 400, 400, { id: 61 }); fire("pointerdown", 460, 410, { id: 62 }); await wait(60);
  fire("pointerup", 400, 400, { id: 61, buttons: 0 }); fire("pointerup", 460, 410, { id: 62, buttons: 0 }); await wait(30);
  out.palmGuardNoUndo = e.kernel.faces().length === out.afterThreeTap;
  return out;
});
console.log(JSON.stringify(res)); console.log("errors:", errs.length ? errs.join("; ") : "none");
await browser.close();
