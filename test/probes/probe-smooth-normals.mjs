// 平滑边法向（纪元账本 DT11，user 10-25「平滑的边我们渲染的时候法线忘了平滑化」截图：圆柱侧面一条条）：正对 24 边圆柱拍一行像素，
// 侧面亮度应连续变化——相邻像素亮度差都小（一条条 = 棱处跳十几级）。created 2026-10-26 by Claude Opus 5.5
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 800, height: 700 } });
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(process.argv[2] ?? "http://127.0.0.1:8765/", { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1200);
const res = await page.evaluate(async () => {
  const e = globalThis.__catsup.editor, at = e.activePool(), N = 24;
  e.setGrid({ on: false });
  const pts = Array.from({ length: N }, (_, i) => ({ x: Math.cos((i / N) * 2 * Math.PI), y: Math.sin((i / N) * 2 * Math.PI), z: 0 }));
  e.commitOp({ op: "addEdges", at, segs: pts.map((p, i) => [p, pts[(i + 1) % N]]), curve: true });
  const f = e.kernel.faces()[0];
  e.commitOp({ op: "pushpull", at, face: e.kernel.faceRings3(f.id).outer, dist: 2 });
  e.cam.setView("front"); e.cam.target = { x: 0, y: 0, z: 1 }; e.cam.halfH = 1.6; e.draw();
  await new Promise((r) => requestAnimationFrame(() => r(0)));
  const c = document.getElementById("board"), gl = c.getContext("webgl2") ?? c.getContext("webgl");
  // 圆柱中线（z = 1）那一行：从左到右读
  const sp = e.cam.angularPx({ x: 0, y: 0, z: 1 }, e.vp()), L = e.cam.angularPx({ x: -1, y: 0, z: 1 }, e.vp()), R = e.cam.angularPx({ x: 1, y: 0, z: 1 }, e.vp());
  const dpr = c.width / c.clientWidth, row = Math.round(c.height - sp.y * dpr);
  const x0 = Math.round(L.x * dpr), x1 = Math.round(R.x * dpr);
  const px = new Uint8Array((x1 - x0) * 4); gl.readPixels(x0, row, x1 - x0, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
  const lum = []; for (let i = 0; i < x1 - x0; i++) lum.push((px[i * 4] + px[i * 4 + 1] + px[i * 4 + 2]) / 3);
  const inner = lum.slice(Math.floor(lum.length * 0.15), Math.ceil(lum.length * 0.85));   // 两侧轮廓线 / 掠射角不算
  let maxJump = 0; for (let i = 1; i < inner.length; i++) maxJump = Math.max(maxJump, Math.abs(inner[i] - inner[i - 1]));
  return { width: lum.length, maxJump: Math.round(maxJump * 10) / 10, range: [Math.round(Math.min(...inner)), Math.round(Math.max(...inner))] };
});
console.log(JSON.stringify(res));
const ok = res.width > 100 && res.maxJump <= 4 && !errs.length;
console.log(errs.length ? "PAGEERRORS:\n" + errs.join("\n") : "(no page errors)"); console.log(ok ? "PROBE OK" : "PROBE FAIL");
await b.close(); process.exit(ok ? 0 : 1);
