// 圆规 / 球规（纪元账本 DT50，v0.14.62）：真鼠标两下画参考圆 → 数值小窗打 1.5 = 精确半径 → 3x = 三个同心圆 → 撤销一次全撤；
// 切「画：球」两下画参考球；画线工具挨着圆周 = 「参考圆上」、两个同心圆之外和参考线的交点 = 交点；橡皮刮圆周 = 删掉那一个圆。created 2026-10-26 by Claude Opus 5.5
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const url = process.argv[2] ?? "http://127.0.0.1:8765/";
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 1000, height: 800 } });
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(url, { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1500);
const box = await page.locator("#board").boundingBox();
await page.evaluate(() => { const e = globalThis.__catsup.editor; e.setGrid({ ...e.grid, on: false }); e.cam.yaw = -Math.PI / 2; e.cam.pitch = 1.5707; e.cam.halfH = 6; e.draw(); });   // 俯视：地面 = 画面
const px = (p) => page.evaluate((p) => { const e = globalThis.__catsup.editor; return e.cam.angularPx(p, e.vp()); }, p);
const click = async (p) => { const s = await px(p); await page.mouse.move(box.x + s.x + 3, box.y + s.y + 2); await page.mouse.move(box.x + s.x, box.y + s.y); await page.waitForTimeout(60); await page.mouse.down(); await page.mouse.up(); await page.waitForTimeout(80); };
const hover = async (p) => { const s = await px(p); await page.mouse.move(box.x + s.x + 3, box.y + s.y + 2); await page.mouse.move(box.x + s.x, box.y + s.y); await page.waitForTimeout(150); return page.evaluate(() => { const i = globalThis.__catsup.editor.snapInfo; return i ? { kind: i.kind, label: i.label ?? null, p: i.p } : null; }); };
const G = () => page.evaluate(() => { const g = globalThis.__catsup.editor.worldGeom().guides(); return { circles: g.circles.map((c) => ({ c: c.c, n: c.n, r: c.r })), spheres: g.spheres.map((s) => ({ c: s.c, r: s.r })), lines: g.lines.length }; });
const r3 = (x) => Math.round(x * 1000) / 1000;
const out = {};

await page.evaluate(() => globalThis.__catsup.hud.pick("compass"));
await click({ x: 1, y: 1, z: 0 }); await click({ x: 3, y: 1, z: 0 });
const g1 = await G();
out.drawn = { n: g1.circles.length, r: r3(g1.circles[0]?.r ?? 0), nz: r3(g1.circles[0]?.n.z ?? 0), c: g1.circles[0]?.c };
out.vcbLen = await page.evaluate(() => globalThis.__catsup.editor.applyVcb("1.5"));
const g2 = await G(); out.afterLen = g2.circles.map((c) => r3(c.r));
out.vcbArr = await page.evaluate(() => globalThis.__catsup.editor.applyVcb("3x"));
const g3 = await G(); out.afterArr = g3.circles.map((c) => r3(c.r));
out.undo = await page.evaluate(() => { const e = globalThis.__catsup.editor; e.undo(); return e.worldGeom().guides().circles.length; });
await page.evaluate(() => globalThis.__catsup.editor.redo());
out.redo = (await G()).circles.length;

// 吸附：画线工具挨着半径 3 的那圈（离 0.04 m ≈ 2.7 px；参考圆和参考线同一档吸附半径 EPS.line 3.5 px，比边窄）；再加一条 y = 1 的参考线，看圆 × 参考线交点
await page.evaluate(() => globalThis.__catsup.hud.pick("line"));
const a30 = Math.PI / 6;
out.onCircle = await hover({ x: 1 + 3.04 * Math.cos(a30), y: 1 + 3.04 * Math.sin(a30), z: 0 });
out.onCircleR = out.onCircle ? r3(Math.hypot(out.onCircle.p.x - 1, out.onCircle.p.y - 1)) : null;
await page.evaluate(() => { const e = globalThis.__catsup.editor; e.addGuideLine({ x: 0, y: 2.5, z: 0 }, { x: 1, y: 0, z: 0 }); });   // y = 2.5 与半径 3 的圈交于 x = 1 ± √(9 − 2.25)
const xr = 1 + Math.sqrt(9 - 2.25);
out.cross = await hover({ x: xr + 0.05, y: 2.55, z: 0 });
out.crossErr = out.cross ? r3(Math.hypot(out.cross.p.x - xr, out.cross.p.y - 2.5)) : null;

// 球：切「画：球」，球心 (−3, −2)、半径点 (−1, −2)
await page.evaluate(() => { const e = globalThis.__catsup.editor; globalThis.__catsup.hud.pick("compass"); e.config.set("compass", "shape", "sphere"); });
await click({ x: -3, y: -2, z: 0 }); await click({ x: -1, y: -2, z: 0 });
const g4 = await G(); out.sphere = g4.spheres.map((s) => ({ r: r3(s.r), c: s.c }));
await page.evaluate(() => { const e = globalThis.__catsup.editor; e.config.set("compass", "shape", "circle"); globalThis.__catsup.hud.pick("line"); });
out.onSphereRing = await hover({ x: -3, y: -2 + 2.04, z: 0 });

// 橡皮刮半径 4.5 那圈的最右点 → 只删它
await page.evaluate(() => globalThis.__catsup.editor.setTool("erase"));
const e0 = await px({ x: 1 + 4.5, y: 1, z: 0 });
await page.mouse.move(box.x + e0.x - 4, box.y + e0.y - 3); await page.mouse.down(); await page.mouse.move(box.x + e0.x + 4, box.y + e0.y + 3, { steps: 6 }); await page.mouse.up(); await page.waitForTimeout(100);
out.afterErase = (await G()).circles.map((c) => r3(c.r));
out.clear = await page.evaluate(() => { const e = globalThis.__catsup.editor; e.commitOp({ op: "clearGuides", at: e.activePool() }); return e.hasGuides(); });

console.log(JSON.stringify(out));
const ok = out.drawn.n === 1 && Math.abs(out.drawn.r - 2) < 0.05 && out.drawn.nz === 1
  && out.vcbLen.ok && out.afterLen.join() === "1.5"
  && out.vcbArr.ok && out.afterArr.join() === "1.5,3,4.5"
  && out.undo === 0 && out.redo === 3
  && out.onCircle?.label === "参考圆上" && out.onCircleR === 3
  && out.cross?.kind === "intersection" && out.crossErr === 0
  && out.sphere.length === 1 && Math.abs(out.sphere[0].r - 2) < 0.05
  && out.onSphereRing?.label === "参考球 × 画面"
  && out.afterErase.join() === "1.5,3"
  && out.clear === false;
console.log(errs.length ? "PAGEERRORS:\n" + errs.join("\n") : "(no page errors)"); console.log(ok ? "PROBE OK" : "PROBE FAIL");
await b.close(); process.exit(ok ? 0 : 1);
