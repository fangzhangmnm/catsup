// 缩略图永远正方形，取屏幕正中间最大的那块（2026-10-26，user「thumb应该永远是1:1的而不是依照设备」）。
// iPad mini 竖屏视口：中间一个盒子、屏幕上部（正方形之外）一个盒子 → 缩略图正中是盒子的颜色，顶部那个不在缩略图里；
// 截完相机原样（半高 / 视场角不变）。导出的 .glb 里的缩略图 JPEG 是正方形。created 2026-10-26 by Claude Opus 5.5
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 744, height: 1133 } });
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(process.argv[2] ?? "http://127.0.0.1:8765/", { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1200);
const res = await page.evaluate(async () => {
  const e = globalThis.__catsup.editor, P = (x, y, z = 0) => ({ x, y, z });
  const box = (x0, y0, z0, x1, y1, z1) => { const B = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], segs = []; for (let i = 0; i < 4; i++) { const a = B[i], d = B[(i + 1) % 4]; segs.push([P(a[0], a[1], z0), P(d[0], d[1], z0)]); segs.push([P(a[0], a[1], z1), P(d[0], d[1], z1)]); segs.push([P(a[0], a[1], z0), P(a[0], a[1], z1)]); } e.commitOp({ op: "addEdges", segs }); };
  e.setGrid({ ...e.grid, on: false });
  e.cam.setView("front"); e.cam.target = P(0, 0, 0); e.cam.halfH = 4; e.draw();
  box(-0.5, -0.5, -0.5, 0.5, 0.5, 0.5);   // 正中
  box(-0.3, -0.3, 3.0, 0.3, 0.3, 3.6);    // 屏幕上部：竖屏视野半高 4、正方形裁出来半高 = 4 × 744/1133 ≈ 2.63 → 在外面
  const vp = e.vp(), before = { h: e.cam.halfH, f: e.cam.fovY };
  const N = 128, rgba = e.captureRgba(N, N);
  const px = (x, y) => { const i = (y * N + x) * 4; return [rgba[i], rgba[i + 1], rgba[i + 2]]; };
  // 顶部盒子中心 z = 3.3：不裁（半高 4）时落在第 round((1 − 3.3/4)/2·N) 行；裁成正方形（半高 ≈ 2.63）后那一行是空白
  const bg = px(2, 2), center = px(N / 2, N / 2), topMid = px(N / 2, Math.round((1 - 3.3 / 4) / 2 * N));
  const after = { h: e.cam.halfH, f: e.cam.fovY };
  const diff = (a, b2) => Math.abs(a[0] - b2[0]) + Math.abs(a[1] - b2[1]) + Math.abs(a[2] - b2[2]);
  return { vp: [vp.w, vp.h], len: rgba.length, centerIsBox: diff(center, bg) > 30, topIsBg: diff(topMid, bg) < 12, camSame: before.h === after.h && before.f === after.f };
});
console.log(JSON.stringify(res));
const ok = res.len === 128 * 128 * 4 && res.centerIsBox && res.topIsBg && res.camSame && !errs.length;
console.log(errs.length ? "PAGEERRORS:\n" + errs.join("\n") : "(no page errors)"); console.log(ok ? "PROBE OK" : "PROBE FAIL");
await b.close(); process.exit(ok ? 0 : 1);
