// 橡皮的反向操作（user 2026-10-26「软边橡皮快捷键和马前炮可以变成相反操作（就是标记硬边），焊边也一样」）：
// 软边橡皮 按住 Shift = 硬化；选项「硬化」= 硬化、再按 Shift = 软化。焊边橡皮 按住 Shift = 拆开曲线。created 2026-10-26 by Claude Opus 5.5
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 1000, height: 800 } });
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(process.argv[2] ?? "http://127.0.0.1:8765/", { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1200);
await page.evaluate(() => globalThis.__catsup.editor.setGrid({ on: false }));
const bb = await page.locator("#board").boundingBox();
const scrub = async (p, shift) => { if (shift) await page.keyboard.down("Shift"); await page.mouse.move(bb.x + p.x - 6, bb.y + p.y); await page.mouse.down(); await page.mouse.move(bb.x + p.x + 6, bb.y + p.y, { steps: 6 }); await page.mouse.up(); if (shift) await page.keyboard.up("Shift"); await page.waitForTimeout(120); };
const out = {};
// 软边橡皮：盒子竖棱先软化（选项放 90°），再按住 Shift 刮 = 硬化；选项「硬化」不按 Shift = 硬化、按 Shift = 软化
const rib = await page.evaluate(() => {
  const e = globalThis.__catsup.editor, P = (x, y, z = 0) => ({ x, y, z }), B = [[0, 0], [1, 0], [1, 1], [0, 1]], segs = [];
  for (let i = 0; i < 4; i++) { const a = B[i], c = B[(i + 1) % 4]; segs.push([P(a[0], a[1], 0), P(c[0], c[1], 0)], [P(a[0], a[1], 1), P(c[0], c[1], 1)], [P(a[0], a[1], 0), P(a[0], a[1], 1)]); }
  e.commitOp({ op: "addEdges", segs });
  globalThis.__catsup.hud.pick("softErase"); e.config.set("softErase", "maxDeg", 90);
  return e.cam.angularPx({ x: 1, y: 0, z: 0.5 }, e.vp());
});
const ribState = () => page.evaluate(() => { const e = globalThis.__catsup.editor, k = e.kernel; const r = k.edges().find((x) => { const a = k.graph.pt(x.a), c = k.graph.pt(x.b); return a.x === 1 && a.y === 0 && c.x === 1 && c.y === 0; }); return r ? (k.isSoft(r.id) ? "soft" : "hard") : "gone"; });
await scrub(rib, false); out.soften = await ribState();
await scrub(rib, true); out.shiftHarden = await ribState();
await page.evaluate(() => globalThis.__catsup.editor.config.set("softErase", "action", "harden"));
await scrub(rib, true); out.optHardenShift = await ribState();
await scrub(rib, false); out.optHarden = await ribState();
// 普通橡皮按住 Shift = 硬化（SU）：以前软边点不中，这条路对软边一直没用（2026-10-26 查出）
await page.evaluate(() => { const e = globalThis.__catsup.editor; e.config.set("softErase", "action", "soften"); });
await scrub(rib, false); out.resoft = await ribState();
await page.evaluate(() => globalThis.__catsup.hud.pick("erase"));
await scrub(rib, true); out.eraserShift = await ribState();
// 焊边橡皮：三段折线焊成一条曲线，再按住 Shift 刮 = 拆开
const seg = await page.evaluate(() => {
  const e = globalThis.__catsup.editor, P = (x, y) => ({ x, y, z: 0 });
  e.commitOp({ op: "clear" });
  e.commitOp({ op: "addEdges", segs: [[P(0, 0), P(1, 0.2)], [P(1, 0.2), P(2, 0.2)], [P(2, 0.2), P(3, 0)]] });
  const k = e.kernel;
  e.commitOp({ op: "weldEdges", at: e.activePool(), edges: k.edges().map((x) => [k.graph.pt(x.a), k.graph.pt(x.b)]) });
  globalThis.__catsup.hud.pick("weldErase");
  return { p: e.cam.angularPx({ x: 1.5, y: 0.2, z: 0 }, e.vp()), welded: k.edges().every((x) => k.curveOf(x.id) !== undefined) };
});
out.welded = seg.welded;
await scrub(seg.p, true);
out.split = await page.evaluate(() => { const k = globalThis.__catsup.editor.kernel; return k.edges().every((x) => k.curveOf(x.id) === undefined); });
out.hint = await page.evaluate(() => document.getElementById("hint")?.textContent ?? "");
console.log(JSON.stringify(out));
const ok = out.soften === "soft" && out.shiftHarden === "hard" && out.optHardenShift === "soft" && out.optHarden === "hard" && out.resoft === "soft" && out.eraserShift === "hard" && out.welded && out.split && /拆开了 1 条曲线/.test(out.hint) && !errs.length;
console.log(errs.length ? "PAGEERRORS:\n" + errs.join("\n") : "(no page errors)"); console.log(ok ? "PROBE OK" : "PROBE FAIL");
await b.close(); process.exit(ok ? 0 : 1);
