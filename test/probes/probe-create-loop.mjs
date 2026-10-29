// 拉出只有边的平面图形（mesh/ops/primitives.ts 的圆圈 / 方框；created 2026-10-28 by Claude Opus 5.5；user 10-28 夜「新建其实更常用的是2d的edge loop」）。
// 网格体盒子里、拉出工具——① 工具条「形状」默认 = 圆圈（只有边），下拉里线圈排前面 ② 地面上点一下 = 一圈 16 条裸线（没有面）、自检干净、选中的是那 16 条边、一步撤销
// ③ 选着那一圈按 E 往上拖、回车 = 挤出成 16 张侧面（圆管）④ 换方框、拖出来、打「30」回车 = 4 条裸线、转了 30° ⑤ 选着方框、右键「补洞」= 补出一张面
// ⑥ 右键「新建 ›」里也有圆圈 / 方框、排前面
// ⑦ 长宽比（user 10-28 夜「拉出方框能不能拖动选择aspect」）：方框、锁比例关、从落点拖到 (+2, +1) 右键落定 = 宽 4 × 深 2；工具条有「锁比例」（立方体时没有）
// ⑧ 锁比例开 = 正方 ⑨ 锁比例关但按住 Shift = 正方 ⑩ 圆圈不锁 = 椭圆 ⑪ 马后炮有「宽」「深」。跑法：python3 -m http.server 8765 后 node test/probes/probe-create-loop.mjs
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 1000, height: 800 } }); page.setDefaultTimeout(4000);
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto("http://127.0.0.1:8765/", { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1200);
const info = await page.evaluate(async () => {
  const e = globalThis.__catsup.editor, P = (x, y, z = 0) => ({ x, y, z }), sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const B = [[0, 0], [1, 0], [1, 1], [0, 1]], segs = []; for (let i = 0; i < 4; i++) { const a = B[i], d = B[(i + 1) % 4]; segs.push([P(a[0], a[1], 0), P(d[0], d[1], 0)]); segs.push([P(a[0], a[1], 1), P(d[0], d[1], 1)]); segs.push([P(a[0], a[1], 0), P(a[0], a[1], 1)]); }
  e.setGrid({ ...e.grid, on: false });
  e.commitOp({ op: "addEdges", at: e.activePool(), segs }); e.selectAll(); e.makeComponent("块"); e.runAction("object.toMesh"); await sleep(20);
  const S = e.scene, inst = [...S.def(S.root).instances.values()][0];
  e.selectedPools.clear(); e.selectedPools.set(`i${inst.id}`, { kind: "instance", instance: inst.id }); e.enterSelected(); await sleep(20);
  e.cam.setView("top"); e.zoomExtents(); e.cam.halfH *= 4; e.draw();
  globalThis.__catsup.hud.pick("create"); await sleep(40);
  return { def: inst.def };
});
const st = () => page.evaluate((d) => { const e = globalThis.__catsup.editor, m = e.scene.mesh(d).kernel; return { v: m.vertexCount(), f: m.faceCount(), e: m.edges().length, wires: m.edges().filter((x) => !m.eFaces(x).length).length, check: m.check().join(";"), selE: e.selection.edges?.size ?? 0, selF: e.selection.faces.size, steps: e.history.steps() }; }, info.def);
const scr = (p) => page.evaluate((p) => { const e = globalThis.__catsup.editor, c = document.getElementById("board").getBoundingClientRect(), s = e.cam.angularPx(p, e.vp()); return { x: c.left + s.x, y: c.top + s.y }; }, p);
const r = {};
// ①
r.one = await page.evaluate(() => { const e = globalThis.__catsup.editor; return { kind: e.config.get("create", "kind"), strip: document.getElementById("toolStrip")?.textContent ?? "" }; });
// ②
const s0 = await st();
const A = await scr({ x: 4, y: 0, z: 0 });
await page.mouse.move(A.x, A.y); await page.mouse.down(); await page.mouse.up(); await page.waitForTimeout(60);
r.two = await st(); r.two.d = { v: r.two.v - s0.v, f: r.two.f - s0.f, wires: r.two.wires - s0.wires, steps: r.two.steps - s0.steps };
// ③ E 往上（顶视图：屏幕往上 = +y，挤出边 = 屏幕空间自由拖）——改看三维：先换前视图再挤
await page.evaluate(() => { const e = globalThis.__catsup.editor; e.cam.setView("front"); e.draw(); });
const C = await scr({ x: 4, y: 0, z: 0 });
await page.mouse.move(C.x, C.y); await page.mouse.move(C.x + 2, C.y + 1); await page.waitForTimeout(30);
await page.keyboard.press("e"); await page.waitForTimeout(40);
for (let i = 1; i <= 6; i++) { await page.mouse.move(C.x + 2, C.y + 1 - 10 * i); await page.waitForTimeout(16); }
await page.keyboard.press("Enter"); await page.waitForTimeout(60);
r.three = await st(); r.three.d = { f: r.three.f - r.two.f, wires: r.three.wires - s0.wires };
await page.evaluate(() => { const e = globalThis.__catsup.editor; e.undo(); e.undo(); e.cam.setView("top"); e.draw(); globalThis.__catsup.hud.pick("create"); e.config.set("create", "kind", "squareLoop"); e.config.set("create", "lockAspect", true); });
await page.waitForTimeout(60);
// ④ 方框：拖出来、打 30 回车
const s4 = await st();
const D = await scr({ x: 4, y: 0, z: 0 });
await page.mouse.move(D.x, D.y); await page.mouse.down(); for (let i = 1; i <= 6; i++) { await page.mouse.move(D.x + 12 * i, D.y); await page.waitForTimeout(16); } await page.mouse.up(); await page.waitForTimeout(40);
for (const k of ["3", "0", "Enter"]) { await page.keyboard.press(k); await page.waitForTimeout(30); }
await page.waitForTimeout(40);
r.four = await st(); r.four.d = { v: r.four.v - s4.v, f: r.four.f - s4.f, wires: r.four.wires - s4.wires };
r.four.ang = await page.evaluate(([d, n0]) => { const m = globalThis.__catsup.editor.scene.mesh(d).kernel, vs = m.verts().slice(-4).map((v) => m.pt(v)); const a = Math.atan2(vs[1].y - vs[0].y, vs[1].x - vs[0].x) * 180 / Math.PI; return +(((a % 90) + 90) % 90).toFixed(2); }, [info.def, s4.v]);
// ⑤ 补洞（方框还选着）
await page.mouse.click(720, 140, { button: "right" }); await page.waitForTimeout(100);
r.five = { menu: await page.evaluate(() => [...document.querySelectorAll(".popup-menu .menu-label")].map((x) => x.textContent).join(" | ")) };
await page.evaluate(() => [...document.querySelectorAll(".popup-menu [data-menu-id]")].find((x) => /补洞/.test(x.textContent ?? ""))?.dispatchEvent(new MouseEvent("click", { bubbles: true }))); await page.waitForTimeout(80);
const s5 = await st(); r.five.f = s5.f - r.four.f; r.five.check = s5.check;
// ⑥ 右键「新建 ›」
await page.keyboard.press("Escape"); await page.evaluate(() => globalThis.__catsup.editor.deselectAll()); await page.waitForTimeout(40);
await page.mouse.click(720, 140, { button: "right" }); await page.waitForTimeout(100);
await page.evaluate(() => [...document.querySelectorAll(".popup-menu [data-menu-id]")].find((x) => /^新建/.test((x.textContent ?? "").trim()))?.dispatchEvent(new MouseEvent("click", { bubbles: true }))); await page.waitForTimeout(100);
r.six = await page.evaluate(() => [...document.querySelectorAll(".popup-menu .menu-label")].map((x) => x.textContent).join(" | "));
await page.keyboard.press("Escape"); await page.waitForTimeout(40);
// ⑦–⑩ 长宽比：落点 (2.5, −2.5) 的空地（别落在左柱底下），拖到 (4.5, −1.5)，右键 = 不要环直接落定
const ext = () => page.evaluate(([d, n0]) => { const m = globalThis.__catsup.editor.scene.mesh(d).kernel, vs = m.verts().slice(n0).map((v) => m.pt(v)); if (!vs.length) return null; const k = (a) => +(Math.max(...vs.map((p) => p[a])) - Math.min(...vs.map((p) => p[a]))).toFixed(3); return { n: vs.length, x: k("x"), y: k("y") }; }, [info.def, n0]);
let n0 = 0;
const dragRect = async (kind, lock, shift) => {
  await page.evaluate(([k, l]) => { const e = globalThis.__catsup.editor; e.deselectAll(); e.cam.setView("top"); e.draw(); globalThis.__catsup.hud.pick("create"); e.config.set("create", "kind", k); e.config.set("create", "lockAspect", l); }, [kind, lock]);
  await page.waitForTimeout(40);
  n0 = await page.evaluate((d) => globalThis.__catsup.editor.scene.mesh(d).kernel.vertexCount(), info.def);
  const P0 = await scr({ x: 2.5, y: -2.5, z: 0 }), P1 = await scr({ x: 4.5, y: -1.5, z: 0 });
  if (shift) await page.keyboard.down("Shift");
  await page.mouse.move(P0.x, P0.y); await page.mouse.down(); for (let i = 1; i <= 8; i++) { await page.mouse.move(P0.x + (P1.x - P0.x) * i / 8, P0.y + (P1.y - P0.y) * i / 8); await page.waitForTimeout(16); }
  const strip = await page.evaluate(() => document.getElementById("toolStrip")?.textContent ?? "");
  await page.mouse.up(); await page.waitForTimeout(30);
  if (shift) await page.keyboard.up("Shift");
  await page.mouse.click(P1.x, P1.y, { button: "right" }); await page.waitForTimeout(60);
  return { e: await ext(), strip, panel: await page.evaluate(() => document.querySelector(".vcb-params:not([hidden])")?.textContent ?? "") };
};
r.seven = await dragRect("squareLoop", false, false);
r.eight = await dragRect("squareLoop", true, false);
r.nine = await dragRect("squareLoop", false, true);
r.ten = await dragRect("circleLoop", false, false);
r.boxStrip = await page.evaluate(() => { const e = globalThis.__catsup.editor; e.config.set("create", "kind", "box"); return document.getElementById("toolStrip")?.textContent ?? ""; });
await b.close();
r.errs = errs;
console.log(JSON.stringify(r, null, 1));
const ok = r.one.kind === "circleLoop" && /圆圈/.test(r.one.strip)
  && r.two.d.v === 16 && r.two.d.f === 0 && r.two.d.wires === 16 && !r.two.check && r.two.selE === 16 && r.two.selF === 0 && r.two.d.steps === 1
  && r.three.d.f === 16 && r.three.d.wires <= 16 && !r.three.check
  && r.four.d.v === 4 && r.four.d.f === 0 && r.four.d.wires === 4 && Math.abs(r.four.ang - 30) < 0.01
  && /补洞/.test(r.five.menu) && r.five.f === 1 && !r.five.check
  && /圆圈/.test(r.six) && /方框/.test(r.six) && r.six.indexOf("圆圈") < r.six.indexOf("立方体")
  && r.seven.e?.n === 4 && Math.abs(r.seven.e.x - 4) < 0.02 && Math.abs(r.seven.e.y - 2) < 0.02 && /锁比例/.test(r.seven.strip) && /宽/.test(r.seven.panel) && /深/.test(r.seven.panel)
  && r.eight.e?.n === 4 && Math.abs(r.eight.e.x - r.eight.e.y) < 1e-6 && r.nine.e?.n === 4 && Math.abs(r.nine.e.x - r.nine.e.y) < 1e-6
  && r.ten.e?.n === 16 && Math.abs(r.ten.e.x - 4) < 0.05 && Math.abs(r.ten.e.y - 2) < 0.05 && !/锁比例/.test(r.boxStrip) && errs.length === 0;
console.log(ok ? "probe-create-loop OK" : "probe-create-loop FAIL");
process.exit(ok ? 0 : 1);
