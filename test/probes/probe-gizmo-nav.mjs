// gizmo 角上的三个钮（user 2026-10-25 手绘：☰ 右上、手左下、放大镜右下）+ 放大镜合租「缩放到」（user「zoom to selected和zoom to fit可以合租用放大镜……点击是zoom to，拖动是放大」「怎么区分双击和pan？怎么防抖？」）。created 2026-10-25 by Claude Opus 5.5
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const url = process.argv[2] ?? "http://127.0.0.1:8765/";
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 1000, height: 800 } });
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(url, { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1500);
// 手 + 放大镜键鼠时藏、碰过触摸 / 笔才露（账本 UX37，2026-10-28 Opus）：这个探针测的是平板上拖柄那套——先用一下触摸把它们叫出来，画布上的点选改用笔（鼠标一按画布它们又会藏）
const res0 = {};
res0.hiddenOnMouseBoot = await page.evaluate(() => document.querySelector(".gizmo-nav").hidden);
await page.evaluate(() => { const c = document.getElementById("board"), q = c.getBoundingClientRect(); for (const t of ["pointerdown", "pointerup"]) c.dispatchEvent(new PointerEvent(t, { bubbles: true, clientX: q.left + 40, clientY: q.top + 40, pointerType: "touch", pointerId: 9, isPrimary: true, buttons: t === "pointerdown" ? 1 : 0 })); });
await page.waitForTimeout(80);
res0.shownAfterTouch = await page.evaluate(() => !document.querySelector(".gizmo-nav").hidden);
const cam = () => page.evaluate(() => { const c = globalThis.__catsup.editor.cam; return { halfH: +c.halfH.toFixed(4), tx: +c.target.x.toFixed(3), ty: +c.target.y.toFixed(3) }; });
const res = {};
// 一列（user 2026-10-25「汉堡，手和放大镜，上下挪一下。给gizmos留出空间」「手和放大镜可以大一些，占满gizmos的行宽」）：☰ 在 gizmo 上方靠右；手 / 放大镜在下方左右各半、合起来占满 gizmo 宽；都不压 gizmo
res.layout = await page.evaluate(() => { const r = (sel) => document.querySelector(sel).getBoundingClientRect(), g = r(".gizmo-svg"), m = r(".gizmo-menu"), p = r(".gizmo-pan"), z = r(".gizmo-zoom"), cx = g.left + g.width / 2; return { menuTR: m.bottom <= g.top + 0.5 && Math.abs(m.right - g.right) < 1.5, panBL: p.top >= g.bottom - 0.5 && p.right <= cx + 0.5 && Math.abs(p.left - g.left) < 1.5, zoomBR: z.top >= g.bottom - 0.5 && z.left >= cx - 0.5 && Math.abs(z.right - g.right) < 1.5, big: p.width > 40 && p.height > 34 && z.width > 40 }; });
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
// 放大镜按多下 = 选区 → 当前物件 → 全部轮换，只有合法的档才入档（user「按多下是选区 当前物件 全局 切换……只有合法的切换才入档」）
res.stagesNoSel = await page.evaluate(() => globalThis.__catsup.editor.zoomStages().map((x) => x.key).join(","));
await page.evaluate(() => { const e = globalThis.__catsup.editor; e.setTool("select"); });
const em = await page.evaluate(() => { const e = globalThis.__catsup.editor; e.zoomExtents(); return e.cam.angularPx({ x: 7, y: 6, z: 0 }, e.vp()); });
const bb = await page.locator("#board").boundingBox();
await page.evaluate((p) => { const c = document.getElementById("board"), q = c.getBoundingClientRect(); for (const t of ["pointermove", "pointerdown", "pointerup"]) c.dispatchEvent(new PointerEvent(t, { bubbles: true, clientX: q.left + p.x, clientY: q.top + p.y, pointerType: "pen", pointerId: 4, isPrimary: true, buttons: t === "pointerdown" ? 1 : 0 })); }, em); await page.waitForTimeout(500);   // 笔点（鼠标点画布会把拖柄藏起来）
res.stagesSel = await page.evaluate(() => globalThis.__catsup.editor.zoomStages().map((x) => x.key).join(","));
const tapZoom = async () => { await page.mouse.click(zc[0], zc[1]); await page.waitForTimeout(150); return page.evaluate(() => +globalThis.__catsup.editor.cam.halfH.toFixed(4)); };
res.cycle = [await tapZoom(), await tapZoom(), await tapZoom()];
// gizmo 空处双击 = 透视 / 平行切换（user「gizmos双击可以切换透视和平行」）：左上角没有钮、轴球也不在那
const g = await page.locator(".gizmo-svg").boundingBox(), ex = g.x + 8, ey = g.y + 8;
res.proj0 = await page.evaluate(() => globalThis.__catsup.editor.cam.projection);
await page.mouse.click(ex, ey); await page.waitForTimeout(90); await page.mouse.click(ex, ey); await page.waitForTimeout(120);
res.proj1 = await page.evaluate(() => globalThis.__catsup.editor.cam.projection);
await page.mouse.click(ex, ey); await page.waitForTimeout(600); await page.mouse.click(ex, ey); await page.waitForTimeout(120);   // 隔太久 = 不算双击
res.proj2 = await page.evaluate(() => globalThis.__catsup.editor.cam.projection);
res.hint = await page.evaluate(() => document.getElementById("hint").textContent);
// 点 +X 球 = 右视图（方框裁过之后点击坐标照样对得上：view-gizmo.ts toSvg 从 C − boxR 起算）
{ const xb = await page.locator('.gizmo-axis[data-id="+x"] circle').boundingBox(); await page.mouse.click(xb.x + xb.width / 2, xb.y + xb.height / 2); await page.waitForTimeout(150);
  res.ballX = await page.evaluate(() => { const c = globalThis.__catsup.editor.cam, f = c.forward(); return [f.x, f.y, f.z].map((v) => Math.round(v * 100) / 100); });
  res.boxW = await page.evaluate(() => Math.round(document.querySelector(".gizmo-svg").getBoundingClientRect().width * 10) / 10); }
console.log(JSON.stringify({ ...res, errs }));
const ok = res0.hiddenOnMouseBoot && res0.shownAfterTouch && res.layout.menuTR && res.layout.panBL && res.layout.zoomBR && res.layout.big
  && Math.abs(res.tap.tx - 7) < 1.5 && Math.abs(res.tap.ty - 7) < 1.5 && res.tap.halfH < res.before.halfH
  && Math.abs(res.drag.halfH - res.tap.halfH) > 1e-3 && res.drag.tx === res.tap.tx
  && res.proj0 !== res.proj1 && res.proj2 === res.proj1 && /^(|缩放到.*)$/.test(res.hint)
  && res.ballX[0] === -1 && res.boxW < 96 && res.boxW > 90
  && res.stagesNoSel === "all" && res.stagesSel === "sel,all" && res.cycle[0] < res.cycle[1] && Math.abs(res.cycle[2] - res.cycle[0]) < 1e-3;
console.log(ok ? "PROBE OK" : "PROBE FAIL");
await b.close(); process.exit(ok ? 0 : 1);
