// DT15：圆心吸附 + 选中组件的轴原点吸附（user 2026-10-25「选不到轮子的圆心。这个最要命……如果component在轴被埋在几何里面，如何拾取」）。
// 圆柱做成组件后：悬停顶帽圆心 = 「圆心」；没选中时组件原点不是目标，选中后 = 「轴原点」。created 2026-10-25 by Claude Opus 5.5
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const url = process.argv[2] ?? "http://127.0.0.1:8765/";
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 1000, height: 800 } });
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(url, { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1500);
const box = await page.locator("#board").boundingBox();
const px = async (p) => page.evaluate((p) => { const e = globalThis.__catsup.editor; return e.cam.angularPx(p, e.vp()); }, p);
const hoverKind = async (p) => { const s = await px(p); await page.mouse.move(box.x + s.x + 3, box.y + s.y + 2); await page.mouse.move(box.x + s.x, box.y + s.y); await page.waitForTimeout(150); return page.evaluate(() => globalThis.__catsup.editor.snapInfo?.kind ?? null); };

const setup = await page.evaluate(() => {
  const e = globalThis.__catsup.editor, P = (x, y, z = 0) => ({ x, y, z });
  e.setGrid({ ...e.grid, on: false });
  const N = 24, C = P(5, 5, 0), pts = [];
  for (let i = 0; i < N; i++) { const a = (2 * Math.PI * i) / N; pts.push(P(5 + Math.cos(a), 5 + Math.sin(a), 0)); }
  const segs = pts.map((p, i) => [p, pts[(i + 1) % N]]);
  e.commitOp({ op: "addEdges", segs, curve: { kind: "circle", closed: true, params: { center: C, radius: 1, normal: P(0, 0, 1), xaxis: P(1, 0, 0), segments: N } } });
  const fid = e.kernel.faces()[0].id;
  e.commitOp({ op: "pushpull", at: e.activePool(), face: e.kernel.faceRings3(fid).outer, dist: 0.5 });
  e.selectAll();
  const made = e.makeComponent("轮子");
  e.setParam("origin", "corner");   // 轴放到包围盒角 (4,4,0)：和圆心错开，验的是「选中了组件，它的轴原点才能吸」（默认底面中心会和底圆圆心重合）
  e.cancel();
  e.zoomExtents(); e.cam.halfH *= 2.5;
  globalThis.__catsup.hud.pick("line");
  return { made, defs: e.sceneRef.defs.size, sel: e.hasSelection(), scr: [e.cam.angularPx(P(5, 5, 0.5), e.vp()), e.cam.angularPx(P(4, 4, 0), e.vp())] };
});
const center = await hoverKind({ x: 5, y: 5, z: 0.5 });
const originBefore = await hoverKind({ x: 4, y: 4, z: 0 });
// 选中组件：选择工具点顶帽
await page.evaluate(() => globalThis.__catsup.hud.pick("select"));
const cap = await px({ x: 5.3, y: 5.2, z: 0.5 });
await page.mouse.move(box.x + cap.x, box.y + cap.y); await page.mouse.down(); await page.mouse.up(); await page.waitForTimeout(150);
const picked = await page.evaluate(() => globalThis.__catsup.editor.hasPoolSelection());
await page.evaluate(() => globalThis.__catsup.hud.pick("move"));
const originAfter = await hoverKind({ x: 4, y: 4, z: 0 });
const res = { setup, center, originBefore, picked, originAfter };
console.log(JSON.stringify(res));
const ok = setup.made && setup.defs === 2 && center === "center" && originBefore !== "pool-origin" && picked && originAfter === "pool-origin" && !errs.length;
console.log(errs.length ? "PAGEERRORS:\n" + errs.join("\n") : "(no page errors)"); console.log(ok ? "PROBE OK" : "PROBE FAIL");
await b.close(); process.exit(ok ? 0 : 1);
