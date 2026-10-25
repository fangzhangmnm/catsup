// 同一处点两下不该画出竖线（user 2026-10-25「bug，画一条直线抬笔发现在垂直的方向多了一段……为什么会在同一个地方点两下会在垂直的方向画线？」）。
// 复现：画线第一下点在空地上，第二下比第一下高 6 px → 第二点被吸到「过锚点的竖直线」上 = 7 cm 竖线（屏上只有 6 px，世界长度却过了 1 cm 的门槛）。
// 护栏（位移防抖）：等下一点时按下的地方离锚点在点按容差内 = 「同一处又点了一下」：画线 = 收笔，别的工具 = 吞掉。created 2026-10-25 by Claude Opus 5.5
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const url = process.argv[2] ?? "http://127.0.0.1:8765/";
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const rows = [];
for (const view of ["default", "top"]) for (const [name, d] of [["same", [0, 0]], ["up3", [0, -3]], ["up6", [0, -6]], ["right3", [3, 0]], ["down4", [0, 4]]]) for (const mode of ["tap2", "drag-tap-end"]) {
  const page = await b.newPage({ viewport: { width: 1000, height: 800 } });
  await page.goto(url, { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1000);
  await page.evaluate((v) => { const e = globalThis.__catsup.editor; if (v === "top") e.setView("top"); e.draw(); globalThis.__catsup.hud.pick("line"); }, view);
  const box = await page.locator("#board").boundingBox();
  const px = async (p) => { const q = await page.evaluate((p) => { const e = globalThis.__catsup.editor; return e.cam.angularPx(p, e.vp()); }, p); return [box.x + q.x, box.y + q.y]; };
  const ev = (type, [x, y], buttons) => page.evaluate(({ type, x, y, buttons }) => { const c = document.elementFromPoint(x, y); c.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 7, pointerType: "pen", clientX: x, clientY: y, isPrimary: true, button: type === "pointermove" ? -1 : 0, buttons, pressure: buttons ? 0.4 : 0 })); }, { type, x, y, buttons });
  const w = (ms) => page.waitForTimeout(ms);
  const tap = async (P) => { await ev("pointermove", P, 0); await w(20); await ev("pointerdown", P, 1); await w(50); await ev("pointerup", P, 0); await w(80); };
  const A = await px({ x: 1.37, y: 0.73, z: 0 }), B = await px({ x: 3.11, y: 1.29, z: 0 });   // 空地（不挨原点 / 轴）
  if (mode === "tap2") { await tap(A); await w(150); await tap([A[0] + d[0], A[1] + d[1]]); }
  else { await ev("pointerdown", A, 1); for (let k = 1; k <= 10; k++) { await ev("pointermove", [A[0] + (B[0] - A[0]) * k / 10, A[1] + (B[1] - A[1]) * k / 10], 1); await w(14); } await w(120); await ev("pointerup", B, 0); await w(100); await tap([B[0] + d[0], B[1] + d[1]]); }
  const r = await page.evaluate(() => { const e = globalThis.__catsup.editor, k = e.kernel; return { edges: k.edges().map((ed) => { const a = k.graph.pt(ed.a), c = k.graph.pt(ed.b); return [a.x, a.y, a.z, c.x, c.y, c.z]; }), active: e.isGestureActive() }; });
  const vert = r.edges.filter((e) => Math.abs(e[2] - e[5]) > 1e-4);
  const want = mode === "tap2" ? 0 : 1;   // 点两下 = 什么都不画；拖完再在终点点一下 = 只有那一条
  rows.push({ view, mode, name, edges: r.edges.length, vertical: vert.length, active: r.active, ok: vert.length === 0 && r.edges.length === want && !r.active });
  await page.close();
}
for (const r of rows) console.log(`${r.ok ? "ok  " : "FAIL"} ${r.view.padEnd(7)} ${r.mode.padEnd(13)} ${r.name.padEnd(6)} edges=${r.edges} vertical=${r.vertical} active=${r.active}`);
const ok = rows.every((r) => r.ok);
console.log(ok ? "PROBE OK" : "PROBE FAIL");
await b.close(); process.exit(ok ? 0 : 1);
