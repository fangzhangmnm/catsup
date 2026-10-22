// test/probes/bench-scene.mjs —— 性能基线探针（#14，2026-10-21，Claude Fable 5.1）：实体数增长时，结算 / 拾取吸附 / 渲染重建 / 撤销各花多少。
// 先量后优（家规）。headless swiftshader 不代表 GPU，但 CPU 侧（结算机、求解器、几何重建）的量是真的。
// 用法：先 python3 -m http.server 8765；node test/probes/bench-scene.mjs [N=300]
import { createRequire } from "node:module";
const { chromium } = createRequire(new URL("../../../20260524 WeebPaint/package.json", import.meta.url))("playwright");
const N = Number(process.argv[2] ?? 300);
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 744, height: 1133 }, deviceScaleFactor: 2 });
const errs = []; page.on("pageerror", (e) => errs.push(e.message));
await page.goto("http://127.0.0.1:8765/", { waitUntil: "load" }); await page.waitForTimeout(400);
const res = await page.evaluate(async (N) => {
  const e = globalThis.__catsup.editor; const vp = () => e.vp(); const c = document.getElementById("board"); const r = c.getBoundingClientRect();
  const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
  const px = (p) => e.cam.angularPx(p, vp());
  const fire = (type, x, y, extra = {}) => c.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: r.left + x, clientY: r.top + y, pointerId: 9, pointerType: "mouse", isPrimary: true, button: extra.button ?? 0, buttons: extra.buttons ?? 0 }));
  const Pt = (x, y, z = 0) => ({ x, y, z });
  const out = { N, addMs: [], faces: 0, edges: 0 };
  // ① N 个 1×1×1 盒子摆成网格（间距 2），每个 12 条棱一次 addSegments（= 一次结算）；记每 N/6 个的耗时
  const side = Math.ceil(Math.sqrt(N));
  const t0 = performance.now();
  let tk = t0;
  for (let i = 0; i < N; i++) {
    const x0 = (i % side) * 2, y0 = Math.floor(i / side) * 2;
    const B = [[x0, y0], [x0 + 1, y0], [x0 + 1, y0 + 1], [x0, y0 + 1]];
    const segs = [];
    for (let k = 0; k < 4; k++) { const a = B[k], b = B[(k + 1) % 4]; segs.push([Pt(a[0], a[1], 0), Pt(b[0], b[1], 0)]); segs.push([Pt(a[0], a[1], 1), Pt(b[0], b[1], 1)]); segs.push([Pt(a[0], a[1], 0), Pt(a[0], a[1], 1)]); }
    e.addSegments(segs, "bench");
    if ((i + 1) % Math.max(1, Math.floor(N / 6)) === 0) { const t = performance.now(); out.addMs.push([i + 1, +((t - tk) / Math.max(1, Math.floor(N / 6))).toFixed(2)]); tk = t; }
  }
  out.buildTotalMs = +(performance.now() - t0).toFixed(0);
  out.perfAfterAdd = globalThis.__catsup.perf.line();
  out.faces = e.kernel.faces().length; out.edges = e.kernel.edges().length; out.vertices = e.kernel.vertices().length;
  e.cam.setView("iso"); e.zoomExtents();
  // ② 渲染：revision 不变时每帧（retained）vs 强制重建（bump 后）
  const timeIt = (fn, n) => { const t = performance.now(); for (let i = 0; i < n; i++) fn(); return +((performance.now() - t) / n).toFixed(2); };
  out.drawSteadyMs = timeIt(() => e.draw(), 10);
  // ③ 拾取 + 吸附：画线工具悬停（snapPoint 全场景候选）与推拉悬停（pickFace）
  const mid = px(Pt(side, side, 1));
  e.setTool("line");
  out.hoverLineMs = timeIt(() => fire("pointermove", mid.x + Math.random() * 4, mid.y + Math.random() * 4), 20);
  e.setTool("pp");
  out.hoverPPMs = timeIt(() => fire("pointermove", mid.x + Math.random() * 4, mid.y + Math.random() * 4), 20);
  e.setTool("select");
  out.hoverSelectMs = timeIt(() => fire("pointermove", mid.x + Math.random() * 4, mid.y + Math.random() * 4), 20);
  // ④ 一次推拉（中间那个盒子的顶面拖高）：结算 + 重建
  e.setTool("pp");
  const ci = Math.floor(N / 2), cx = (ci % side) * 2 + 0.5, cy = Math.floor(ci / side) * 2 + 0.5;
  const top = px(Pt(cx, cy, 1));
  const tpp = performance.now();
  fire("pointerdown", top.x, top.y, { button: 0, buttons: 1 });
  for (let i = 1; i <= 5; i++) fire("pointermove", top.x, top.y - 10 * i, { buttons: 1 });
  await sleep(100);
  fire("pointerup", top.x, top.y - 50, { button: 0 });
  out.ppGestureMs = +(performance.now() - tpp - 100).toFixed(0);
  out.perfAfterPP = globalThis.__catsup.perf.line();
  out.drawAfterOpMs = timeIt(() => e.draw(), 3);
  // ⑤ 撤销 / 重做
  out.undoMs = timeIt(() => e.undo(), 1);
  out.redoMs = timeIt(() => e.redo(), 1);
  // ⑥ 三击选连通体 + 建组件（WorldView 合成成本）
  const hit = e.pickAt(top.x, top.y);
  const tsel = performance.now(); e.selectExpand(hit, 2); out.selectConnectedMs = +(performance.now() - tsel).toFixed(1);
  const tmc = performance.now(); e.makeComponent("bench"); out.makeComponentMs = +(performance.now() - tmc).toFixed(1);
  out.drawWithComponentMs = timeIt(() => e.draw(), 5);
  out.memMB = performance.memory ? +(performance.memory.usedJSHeapSize / 1048576).toFixed(0) : null;
  return out;
}, N);
console.log(JSON.stringify(res));
console.log("errors:", errs.length ? errs.join("; ") : "none");
await browser.close();
