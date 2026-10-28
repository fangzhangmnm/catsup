// A9 面锁 + 矩形类平面锁（user 2026-10-25「轴锁的剩余部分：Shift + 方向键锁平面、矩形工具的平面锁、触屏常驻三颗轴键。 要！」）。created 2026-10-25 by Claude Opus 5.5
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const url = process.argv[2] ?? "http://127.0.0.1:8765/";
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 1000, height: 800 } });
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(url, { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1500); await page.evaluate(() => globalThis.__catsup?.editor?.setGrid({ on: false }));   // v0.13.64 新文档吸附默认开；本探针测的不是栅格
const box = await page.locator("#board").boundingBox();
const px = (p) => page.evaluate((p) => { const e = globalThis.__catsup.editor; return e.cam.angularPx(p, e.vp()); }, p);
const clickAt = async (p) => { const q = await px(p); await page.mouse.move(box.x + q.x, box.y + q.y); await page.waitForTimeout(40); await page.mouse.down(); await page.mouse.up(); await page.waitForTimeout(80); };
const hoverTo = async (p) => { const q = await px(p); await page.mouse.move(box.x + q.x, box.y + q.y, { steps: 6 }); await page.waitForTimeout(150); };
const st = () => page.evaluate(() => { const e = globalThis.__catsup.editor, s = e.snapInfo, c = e.cursor3; return { axis: e.axisLock, plane: e.planeLock, label: s?.label ?? "", cur: c ? [+c.x.toFixed(4), +c.y.toFixed(4), +c.z.toFixed(4)] : null }; });
const edges = () => page.evaluate(() => { const e = globalThis.__catsup.editor; return e.kernel.edges().map((ed) => { const a = e.kernel.graph.pt(ed.a), c = e.kernel.graph.pt(ed.b); return [a.x, a.y, a.z, c.x, c.y, c.z].map((v) => +v.toFixed(4)); }); });
const res = {};
// ① 矩形：先按 → = 面锁 YZ（法向 X），首点 (0,0,0)，第二点拉到 (0,1.5,1) → 整个矩形落在 x = 0 的立面上
await page.evaluate(() => globalThis.__catsup.hud.pick("rect"));
await hoverTo({ x: 0, y: 0, z: 0 });
await page.keyboard.press("ArrowRight");
res.rectArmed = await st();
await clickAt({ x: 0, y: 0, z: 0 });
await hoverTo({ x: 0, y: 1.5, z: 1 });
res.rectLive = await st();
await clickAt({ x: 0, y: 1.5, z: 1 });
res.rectEdges = await edges();
res.rectAfter = await st();
// ② 画线：首点 (0.5,0.5,0)，Shift+→ = 过锚点的 YZ 面（x = 0.5），光标拉到 (0.5,1.6,1.1) → 终点 x = 0.5、z > 0
await page.evaluate(() => globalThis.__catsup.hud.pick("line"));
await clickAt({ x: 0.5, y: 0.5, z: 0 });
await page.keyboard.press("Shift+ArrowRight");
await hoverTo({ x: 0.5, y: 1.6, z: 1.1 });
res.lineLive = await st();
await page.keyboard.press("Escape"); await page.waitForTimeout(80);
res.lineAfterEsc = await st();
// ③ Shift+↓ = 光标下那张面（①画出的 x = 0 立面）
await hoverTo({ x: 0, y: 0.75, z: 0.5 });
await page.keyboard.press("Shift+ArrowDown");
res.faceLock = await st();
await page.keyboard.press("Escape"); await page.waitForTimeout(80);
// ④ 吸附钮菜单按工具换锁种：矩形只有面锁、画线两种都有
await page.evaluate(() => globalThis.__catsup.hud.pick("rect"));
await page.locator(".gizmo-snap").click({ button: "right" }); await page.waitForTimeout(150);
res.rectMenu = await page.evaluate(() => [...document.querySelectorAll(".popup-menu button")].map((x) => x.textContent ?? "").filter((t) => /锁/.test(t)).join("|"));
await page.keyboard.press("Escape"); await page.waitForTimeout(80);
await page.evaluate(() => globalThis.__catsup.hud.pick("line"));
await page.locator(".gizmo-snap").click({ button: "right" }); await page.waitForTimeout(150);
res.lineMenu = await page.evaluate(() => [...document.querySelectorAll(".popup-menu button")].map((x) => x.textContent ?? "").filter((t) => /锁/.test(t)).join("|"));
console.log(JSON.stringify(res));
const near = (a, b2, e = 1e-6) => Math.abs(a - b2) < e;
const rectOnX0 = res.rectEdges.length >= 4 && res.rectEdges.every((e) => near(e[0], 0) && near(e[3], 0)) && res.rectEdges.some((e) => e[2] > 0.5 || e[5] > 0.5);
const ok = res.rectArmed.plane === "x" && res.rectLive.cur && near(res.rectLive.cur[0], 0) && res.rectLive.cur[2] > 0.5 && rectOnX0 && res.rectAfter.plane === null
  && res.lineLive.plane === "x" && /面锁 YZ/.test(res.lineLive.label) && res.lineLive.cur && near(res.lineLive.cur[0], 0.5) && res.lineLive.cur[2] > 0.3 && res.lineAfterEsc.plane === null
  && res.faceLock.plane === "face"
  && /面锁 YZ/.test(res.rectMenu) && !/方向锁 X/.test(res.rectMenu) && /方向锁 X/.test(res.lineMenu) && /面锁 XY/.test(res.lineMenu);
console.log(errs.length ? "PAGEERRORS:\n" + errs.join("\n") : "(no page errors)"); console.log(ok ? "PROBE OK" : "PROBE FAIL");
await b.close(); process.exit(ok ? 0 : 1);
