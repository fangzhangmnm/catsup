// gizmo 角上的三个钮（user 2026-10-25 手绘：☰ 右上、手左下、放大镜右下）+ 放大镜合租「缩放到」（user「zoom to selected和zoom to fit可以合租用放大镜……点击是zoom to，拖动是放大」「怎么区分双击和pan？怎么防抖？」）。created 2026-10-25 by Claude Opus 5.5
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const url = process.argv[2] ?? "http://127.0.0.1:8765/";
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 1000, height: 800 } });
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(url, { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1500);
const cam = () => page.evaluate(() => { const c = globalThis.__catsup.editor.cam; return { halfH: +c.halfH.toFixed(4), tx: +c.target.x.toFixed(3), ty: +c.target.y.toFixed(3) }; });
const res = {};
// 角上：☰ 在右上、手在左下、放大镜在右下（相对 gizmo 圆）
res.layout = await page.evaluate(() => { const r = (sel) => document.querySelector(sel).getBoundingClientRect(), g = r(".gizmo-svg"), m = r(".gizmo-menu"), p = r(".gizmo-pan"), z = r(".gizmo-zoom"), cx = g.left + g.width / 2, cy = g.top + g.height / 2; return { menuTR: m.left > cx && m.bottom < cy + 10, panBL: p.right < cx && p.top > cy - 10, zoomBR: z.left > cx && z.top > cy - 10 }; });
// 先画个盒子离原点远一点，再把相机挪开
await page.evaluate(() => { const e = globalThis.__catsup.editor; e.commitOp({ op: "addEdges", segs: [[{ x: 6, y: 6, z: 0 }, { x: 8, y: 6, z: 0 }], [{ x: 8, y: 6, z: 0 }, { x: 8, y: 8, z: 0 }], [{ x: 8, y: 8, z: 0 }, { x: 6, y: 8, z: 0 }], [{ x: 6, y: 8, z: 0 }, { x: 6, y: 6, z: 0 }]] }); e.cam.halfH = 40; e.cam.target = { x: -20, y: -20, z: 0 }; e.draw(); });
const z = await page.locator(".gizmo-zoom").boundingBox(), zc = [z.x + z.width / 2, z.y + z.height / 2];
res.before = await cam();
// 点一下（抖 3 px）= 缩放到全部：相机跑到盒子那儿、变近
await page.mouse.move(zc[0], zc[1]); await page.mouse.down(); await page.mouse.move(zc[0] + 2, zc[1] + 2); await page.mouse.up(); await page.waitForTimeout(120);
res.tap = await cam();
// 拖 40 px = 缩放（halfH 变），不改 target
await page.mouse.move(zc[0], zc[1]); await page.mouse.down(); await page.mouse.move(zc[0], zc[1] + 40, { steps: 8 }); await page.mouse.up(); await page.waitForTimeout(120);
res.drag = await cam();
// gizmo 空处双击 = 透视 / 平行切换（user「gizmos双击可以切换透视和平行」）：左上角没有钮、轴球也不在那
const g = await page.locator(".gizmo-svg").boundingBox(), ex = g.x + 8, ey = g.y + 8;
res.proj0 = await page.evaluate(() => globalThis.__catsup.editor.cam.projection);
await page.mouse.click(ex, ey); await page.waitForTimeout(90); await page.mouse.click(ex, ey); await page.waitForTimeout(120);
res.proj1 = await page.evaluate(() => globalThis.__catsup.editor.cam.projection);
await page.mouse.click(ex, ey); await page.waitForTimeout(600); await page.mouse.click(ex, ey); await page.waitForTimeout(120);   // 隔太久 = 不算双击
res.proj2 = await page.evaluate(() => globalThis.__catsup.editor.cam.projection);
res.hint = await page.evaluate(() => document.getElementById("hint").textContent);
console.log(JSON.stringify({ ...res, errs }));
const ok = res.layout.menuTR && res.layout.panBL && res.layout.zoomBR
  && Math.abs(res.tap.tx - 7) < 1.5 && Math.abs(res.tap.ty - 7) < 1.5 && res.tap.halfH < res.before.halfH
  && Math.abs(res.drag.halfH - res.tap.halfH) > 1e-3 && res.drag.tx === res.tap.tx
  && res.proj0 !== res.proj1 && res.proj2 === res.proj1 && res.hint === "";
console.log(ok ? "PROBE OK" : "PROBE FAIL");
await b.close(); process.exit(ok ? 0 : 1);
