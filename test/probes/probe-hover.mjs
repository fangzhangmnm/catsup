// test/probes/probe-hover.mjs —— headless 合成事件探针（借 WeebPaint 的 playwright；先起 python3 -m http.server 8765）。created 2026-09-06 by Claude Fable 5.1
// 用法：node test/probes/probe-hover.mjs（非 npm test 的一部分）
import { createRequire } from "node:module";
const { chromium } = createRequire(new URL("../../../20260524 WeebPaint/package.json", import.meta.url))("playwright");
const out = process.env.PROBE_OUT ?? "/tmp";
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 1200, height: 800 }, deviceScaleFactor: 1 });
const errs = []; page.on("pageerror", (e) => errs.push(e.message)); page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
await page.goto("http://127.0.0.1:8765/", { waitUntil: "load" }); await page.waitForTimeout(500);
// 用预置摆一个日字（走 addEdges 正门），再推拉一面
await page.evaluate(() => { globalThis.__catsup.editor.applyPreset("日字"); });
await page.evaluate(() => { const e = globalThis.__catsup.editor; const f = e.kernel.faces()[0].id; e.kernel; });
const box = await page.locator("#board").boundingBox();
const pts = await page.evaluate(() => {
  const e = globalThis.__catsup.editor; const vp = e.vp();
  return e.kernel.vertices().map((v) => ({ id: v.id, w: { x: v.x, y: v.y, z: v.z }, s: e.cam.angularPx(v, vp) }));
});
console.log("projection:", pts.map((p) => `#${p.id}(${p.w.x},${p.w.y})->(${p.s.x.toFixed(1)},${p.s.y.toFixed(1)})`).join(" "));
await page.keyboard.press("l");
const results = [];
for (const p of pts.slice(0, 4)) {
  await page.mouse.move(box.x + p.s.x, box.y + p.s.y); await page.waitForTimeout(60);
  const tip = await page.evaluate(() => { const t = document.getElementById("tip"); return t.hidden ? null : t.textContent; });
  await page.mouse.move(box.x + p.s.x + 25, box.y + p.s.y + 25); await page.waitForTimeout(60);
  const tipOff = await page.evaluate(() => { const t = document.getElementById("tip"); return t.hidden ? null : t.textContent; });
  results.push(`#${p.id}: on=${tip} off25px=${tipOff}`);
}
console.log(results.join(" | "));
// 光标停在第一个顶点上 + DOM 十字 + 截图（对比 three 画的角与数学投影是否重合）
const p0 = pts[0];
await page.mouse.move(box.x + p0.s.x, box.y + p0.s.y); await page.waitForTimeout(80);
await page.evaluate(([x, y]) => { const d = document.createElement("div"); d.style.cssText = `position:fixed;left:${x - 12}px;top:${y - 12}px;width:24px;height:24px;border:2px solid red;border-radius:50%;pointer-events:none;z-index:999;box-sizing:border-box`; document.body.appendChild(d); }, [box.x + p0.s.x, box.y + p0.s.y]);
await page.screenshot({ path: out + "/probe-hover.png", clip: { x: box.x + p0.s.x - 150, y: box.y + p0.s.y - 150, width: 300, height: 300 } });
console.log("errors:", errs.length ? errs.join("; ") : "none");
await browser.close();
