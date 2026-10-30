// 建组件马后炮选原点（user 2026-10-25「建立组件的时候能不能马后炮选择一下轴的居中模式」）+ 一步撤完（「*6 /6的时候undo不对」同一处根因）。
// 方块 (1..3, 1..2, 0..1) → 建组件 → 小窗「建组件」→ 原点 = 包围盒中心 → 定义里的几何以原点为中心、世界不动 → 撤销一次 = 回到散几何、小窗关。
// created 2026-10-25 by Claude Opus 5.5
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 1000, height: 800 } });
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(process.argv[2] ?? "http://127.0.0.1:8765/", { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1200);
const res = await page.evaluate(() => {
  const e = globalThis.__catsup.editor, P = (x, y, z = 0) => ({ x, y, z });
  e.setGrid({ ...e.grid, on: false });
  const B = [[1, 1], [3, 1], [3, 2], [1, 2]], segs = [];
  for (let i = 0; i < 4; i++) { const a = B[i], c = B[(i + 1) % 4]; segs.push([P(a[0], a[1], 0), P(c[0], c[1], 0)]); segs.push([P(a[0], a[1], 1), P(c[0], c[1], 1)]); segs.push([P(a[0], a[1], 0), P(a[0], a[1], 1)]); }
  e.commitOp({ op: "addEdges", segs });
  const worldBox = () => { const v = e.worldGeom().slots.flatMap((sl, i) => [...e.worldGeom().parts[i].verts.values()]); const r = (k) => [Math.min(...v.map((p) => p[k])), Math.max(...v.map((p) => p[k]))].map((x) => +x.toFixed(6)); return [r("x"), r("y"), r("z")].join(" "); };
  const before = worldBox(), loose0 = e.kernel.faces().length;
  e.selectAll();
  e.makeComponent("块");
  const pp = e.paramPanel();
  const out = { before, title: pp?.title, phase: pp?.phase, origin0: pp?.values.origin };
  e.setParam("origin", "center");
  const s = e.scene, defId = [...s.defs.keys()].find((id) => id !== s.root);
  const vs = defId ? s.kernelOf({ def: defId, group: null }).vertices() : [];
  const mid = (k) => +((Math.min(...vs.map((p) => p[k])) + Math.max(...vs.map((p) => p[k]))) / 2).toFixed(6);
  out.defCentered = vs.length > 0 && mid("x") === 0 && mid("y") === 0 && mid("z") === 0;
  out.worldSame = worldBox() === before;
  out.looseAfter = e.kernel.faces().length;
  e.setParam("origin", "bottom");
  const vs2 = s.kernelOf({ def: defId, group: null }).vertices ? e.scene.kernelOf({ def: [...e.scene.defs.keys()].find((id) => id !== e.scene.root), group: null }).vertices() : [];
  out.bottomZ0 = vs2.length > 0 && +Math.min(...vs2.map((p) => p.z)).toFixed(6) === 0;
  out.worldSame2 = worldBox() === before;
  e.undo();
  out.undoOnceLoose = e.kernel.faces().length === loose0 && [...e.scene.defs.keys()].length === 1;
  out.panelClosed = e.paramPanel() === null;
  return out;
});
console.log(JSON.stringify(res));
// 根也能「设为组件原点」（user 10-30「根组件为什么没有设置原点到坐标架」「我说了root和其他的尽量一视同仁」「模型在视口上的位置不动，视角平移，对齐组件的行为」「但是undo redo不还原视角」）：
// 最外层坐标架放在 (1, 1, 0) → 坐标架工具条「设为组件原点」→ 模型整个挪 −(1, 1, 0)、坐标架回原点、视角目标点跟着挪（屏幕上不动）；撤销 / 重做只动模型、不动视角；转过 90° 的坐标架 = 视角也转 90°
const st = () => page.evaluate(() => { const e = globalThis.__catsup.editor, v = e.worldGeom().slots.flatMap((sl, i) => [...e.worldGeom().parts[i].verts.values()]), a = e.scene.axes;
  return { minX: +Math.min(...v.map((p) => p.x)).toFixed(6), minY: +Math.min(...v.map((p) => p.y)).toFixed(6), maxX: +Math.max(...v.map((p) => p.x)).toFixed(6), tx: +e.cam.target.x.toFixed(6), ty: +e.cam.target.y.toFixed(6), yaw: e.cam.yaw, ax: [a.origin.x, a.origin.y, a.x.x, a.x.y].map((x) => +x.toFixed(6)) }; });
await page.evaluate(() => { const e = globalThis.__catsup.editor, s = e.scene; e.commitOp({ op: "setDrawFrame", at: { def: s.root, group: null }, frame: { origin: { x: 1, y: 1, z: 0 }, x: { x: 1, y: 0, z: 0 }, y: { x: 0, y: 1, z: 0 }, z: { x: 0, y: 0, z: 1 } } }); e.setTool("axes"); });
await page.waitForTimeout(200);
const r0 = await st();
const btn = page.locator("button", { hasText: "设为组件原点" });
const shown = await btn.count();
if (shown) { await btn.first().click(); await page.waitForTimeout(150); }
const r1 = await st();
await page.evaluate(() => globalThis.__catsup.editor.undo()); await page.waitForTimeout(80);
const r2 = await st();
await page.evaluate(() => globalThis.__catsup.editor.redo()); await page.waitForTimeout(80);
const r3 = await st();
await page.evaluate(() => { const e = globalThis.__catsup.editor, s = e.scene; e.commitOp({ op: "setDrawFrame", at: { def: s.root, group: null }, frame: { origin: { x: 0, y: 0, z: 0 }, x: { x: 0, y: 1, z: 0 }, y: { x: -1, y: 0, z: 0 }, z: { x: 0, y: 0, z: 1 } } }); });
await page.waitForTimeout(150);
const r4 = await st();
if (shown) { await btn.first().click(); await page.waitForTimeout(150); }
const r5 = await st();
const root = { shown, r0, r1, r2, r3, r4, r5 };
console.log(JSON.stringify(root));
const near = (a, b) => Math.abs(a - b) < 1e-6;
const rootOk = shown > 0 && near(r1.minX, r0.minX - 1) && near(r1.minY, r0.minY - 1) && near(r1.tx, r0.tx - 1) && near(r1.ty, r0.ty - 1) && r1.ax.join() === "0,0,1,0"
  && near(r2.minX, r0.minX) && near(r2.tx, r1.tx) && r2.ax.join() === "1,1,1,0" && near(r3.minX, r1.minX) && near(r3.tx, r1.tx) && r3.ax.join() === "0,0,1,0"
  && near(r5.yaw - r4.yaw, -Math.PI / 2) && near(r5.minX, 0) && near(r5.maxX, 1) && near(r5.minY, -2) && near(r5.tx, -1) && near(r5.ty, 1) && r5.ax.join() === "0,0,1,0";   // 盒子 x 0..2 / y 0..1 绕原点转 −90° → x 0..1 / y −2..0；视角目标点 (−1, −1) 一起转 → (−1, 1)
console.log(rootOk ? "  ✓ 根也能设为组件原点：模型挪过去、坐标架回原点、视角平移（屏幕上不动）；撤销 / 重做只动模型不动视角；转 90° 的坐标架视角也转" : "  ✗ 根设为组件原点（见上面 JSON）");
const ok = rootOk && res.title === "建组件" && res.phase === "after" && res.origin0 === "bottom" && res.defCentered && res.worldSame && res.looseAfter === 0 && res.bottomZ0 && res.worldSame2 && res.undoOnceLoose && res.panelClosed && !errs.length;
console.log(errs.length ? "PAGEERRORS:\n" + errs.join("\n") : "(no page errors)"); console.log(ok ? "PROBE OK" : "PROBE FAIL");
await b.close(); process.exit(ok ? 0 : 1);
