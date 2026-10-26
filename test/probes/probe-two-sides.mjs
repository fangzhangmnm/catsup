// 两个表面（纪元账本 DT8）界面：一张水平面正面红、背面蓝 → 从上看红、从下看蓝（渲染按 gl_FrontFacing 分两侧）；
// 表面模式油漆桶从上面点 = 只涂朝上的那一侧（绿），翻到底下看还是蓝；吸色从底下吸到蓝。created 2026-10-26 by Claude Opus 5.5
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 800, height: 700 } });
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(process.argv[2] ?? "http://127.0.0.1:8765/", { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1200);
await page.evaluate(() => globalThis.__catsup.editor.setGrid({ on: false }));
const box = await page.locator("#board").boundingBox();
/** 画布中心像素（读 WebGL 画面）。 */
const center = () => page.evaluate(async () => {
  const e = globalThis.__catsup.editor; e.draw(); await new Promise((r) => requestAnimationFrame(() => r(0)));
  const c = document.getElementById("board"), gl = c.getContext("webgl2") ?? c.getContext("webgl");
  const px = new Uint8Array(4); gl.readPixels(Math.floor(c.width / 2), Math.floor(c.height / 2), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
  return [...px.slice(0, 3)];
});
const out = {};
await page.evaluate(() => {
  const e = globalThis.__catsup.editor, at = e.activePool(), P = (x, y) => ({ x, y, z: 0 });
  e.commitOp({ op: "addEdges", at, segs: [[P(-1, -1), P(1, -1)], [P(1, -1), P(1, 1)], [P(1, 1), P(-1, 1)], [P(-1, 1), P(-1, -1)]] });
  e.commitOp({ op: "addMaterial", name: "红", color: [0.9, 0.1, 0.1] });
  e.commitOp({ op: "addMaterial", name: "蓝", color: [0.1, 0.2, 0.9] });
  const k = e.kernel, f = k.faces()[0], up = k.planeOf(f.id).plane.n.z > 0 ? 0 : 1;
  globalThis.__probeFace = f.id; globalThis.__probeUp = up;
  e.commitOp({ op: "paintFaces", at, faces: [k.faceRings3(f.id).outer], material: 0, sides: [up] });
  e.commitOp({ op: "paintFaces", at, faces: [k.faceRings3(f.id).outer], material: 1, sides: [1 - up] });
  e.cam.target = { x: 0, y: 0, z: 0 }; e.cam.halfH = 2;
});
await page.evaluate(() => globalThis.__catsup.editor.cam.setView("top"));
out.top = await center();
await page.evaluate(() => globalThis.__catsup.editor.cam.setView("bottom"));
out.bottom = await center();
// 表面模式油漆桶：从上面点 → 只涂朝上的那一侧
await page.evaluate(() => { const e = globalThis.__catsup.editor; e.setMode("surface"); e.setPaint({ kind: "color", name: "绿", color: [0.1, 0.8, 0.2] }); e.setTool("paint"); e.deselectAll(); e.cam.setView("top"); e.draw(); });
await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.waitForTimeout(40);
await page.mouse.down(); await page.mouse.up(); await page.waitForTimeout(400);
out.hint = await page.evaluate(() => document.getElementById("hint")?.textContent ?? "");
out.topAfter = await center();
await page.evaluate(() => globalThis.__catsup.editor.cam.setView("bottom"));
out.bottomAfter = await center();
out.slots = await page.evaluate(() => { const e = globalThis.__catsup.editor, k = e.kernel, f = k.faces()[0], s = e.scene, d = s.defOfContext(e.ctx); return [0, 1].map((side) => s.materialOfSlot(d, k.faceMaterialOf(f.id, side))?.name ?? null); });
console.log(JSON.stringify(out));
const red = (c) => c[0] > c[1] + 40 && c[0] > c[2] + 40, blue = (c) => c[2] > c[0] + 30 && c[2] > c[1] + 30, green = (c) => c[1] > c[0] + 30 && c[1] > c[2] + 30;   // 打光系数 0.66–1：按主色判
const ok = red(out.top) && blue(out.bottom) && green(out.topAfter) && blue(out.bottomAfter) && /涂了 1 张面/.test(out.hint) && !errs.length;
console.log(errs.length ? "PAGEERRORS:\n" + errs.join("\n") : "(no page errors)"); console.log(ok ? "PROBE OK" : "PROBE FAIL");
await b.close(); process.exit(ok ? 0 : 1);
