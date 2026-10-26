// test/probes/bench-pools.mjs —— 池级局部性基准（#22，2026-10-21，Claude Fable 5.1）：user「还得想一下很多实例和很多组的情况。以及如果transform最大的uber组会发生什么」。
// 三种场景：inst = 一个盒子组件 × N 实例；groups = N 个各自成组的盒子；uber = N 个散盒子合成一个大组。
// 量：悬停吸附、进池里推拉一帧预演、拖一个池一帧预演、（uber）拖大组一帧预演、绘制稳态。每帧 = 一次 pointermove 的同步耗时。
// 用法：先 python3 -m http.server 8765；node test/probes/bench-pools.mjs [inst|groups|uber] [N=200]
import { createRequire } from "node:module";
const { chromium } = createRequire(new URL("../../../20260524 WeebPaint/package.json", import.meta.url))("playwright");
const MODE = process.argv[2] ?? "inst";
const N = Number(process.argv[3] ?? 200);
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 744, height: 1133 }, deviceScaleFactor: 2 });
const errs = []; page.on("pageerror", (e) => errs.push(e.message));
page.on("console", (m) => { if (m.type() === "error") errs.push("console: " + m.text()); });
await page.goto("http://127.0.0.1:8765/", { waitUntil: "load" }); await page.waitForTimeout(400); await page.evaluate(() => globalThis.__catsup?.editor?.setGrid({ on: false }));   // v0.13.64 新文档吸附默认开；本探针测的不是栅格
const res = await page.evaluate(async ({ MODE, N }) => {
  const e = globalThis.__catsup.editor; const vp = () => e.vp(); const c = document.getElementById("board"); const r = c.getBoundingClientRect();
  const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
  const px = (p) => e.cam.angularPx(p, vp());
  const fire = (type, x, y, extra = {}) => c.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: r.left + x, clientY: r.top + y, pointerId: 9, pointerType: "mouse", isPrimary: true, button: extra.button ?? 0, buttons: extra.buttons ?? 0 }));
  const Pt = (x, y, z = 0) => ({ x, y, z });
  const side = Math.ceil(Math.sqrt(N));
  const at = (i) => [(i % side) * 2, Math.floor(i / side) * 2];
  const boxSegs = (x0, y0) => { const B = [[x0, y0], [x0 + 1, y0], [x0 + 1, y0 + 1], [x0, y0 + 1]]; const segs = []; for (let k = 0; k < 4; k++) { const a = B[k], b = B[(k + 1) % 4]; segs.push([Pt(a[0], a[1], 0), Pt(b[0], b[1], 0)]); segs.push([Pt(a[0], a[1], 1), Pt(b[0], b[1], 1)]); segs.push([Pt(a[0], a[1], 0), Pt(a[0], a[1], 1)]); } return segs; };
  const stats = (arr) => { const s = [...arr].sort((a, b) => a - b); return { med: +s[Math.floor(s.length / 2)].toFixed(1), max: +s[s.length - 1].toFixed(1) }; };
  const frames = (fn, n) => { const out = []; for (let i = 0; i < n; i++) { const t = performance.now(); fn(i); out.push(performance.now() - t); } return stats(out); };
  const out = { MODE, N };
  e.cam.setView("top");
  const t0 = performance.now();
  if (MODE === "inst") {
    e.addSegments(boxSegs(0, 0), "bench");
    e.zoomExtents();
    const h = e.pickAt(px(Pt(0.5, 0.5, 1)).x, px(Pt(0.5, 0.5, 1)).y); e.selectExpand(h, 2);
    e.makeComponent("box");                       // 选中 = 新实例
    for (let i = 1; i < N; i++) { const [x, y] = at(i); e.copyInstance(Pt(x, y, 0)); }
  } else {
    for (let i = 0; i < N; i++) {
      const [x, y] = at(i);
      e.addSegments(boxSegs(x, y), "bench");
      if (MODE === "groups") { e.zoomExtents(); const h = e.pickAt(px(Pt(x + 0.5, y + 0.5, 1)).x, px(Pt(x + 0.5, y + 0.5, 1)).y); e.selectExpand(h, 2); e.makeGroup(); }
    }
    if (MODE === "uber") { e.zoomExtents(); for (let i = 0; i < N; i++) { const [x, y] = at(i); const h = e.pickAt(px(Pt(x + 0.5, y + 0.5, 1)).x, px(Pt(x + 0.5, y + 0.5, 1)).y); e.selectExpand(h, 2, "add"); } e.makeGroup(); }
  }
  out.buildMs = +(performance.now() - t0).toFixed(0);
  e.cam.setView("iso"); e.zoomExtents();
  out.slots = e.liveWorld().slots.length; out.faces = e.liveWorld().faces().length;
  out.drawSteadyMs = frames(() => e.draw(), 10).med;
  // 悬停：画线工具
  const mid = px(Pt(side, side, 1));
  e.setTool("line");
  out.hoverLine = frames((i) => fire("pointermove", mid.x + (i % 5), mid.y + (i % 3)), 20);
  out.hoverPerf = globalThis.__catsup.perf.line();
  const idxN = () => globalThis.__catsup.perf.last["snap.indexN"] ?? 0;
  out.idxBuildsHover = idxN();
  e.setTool("select"); e.cancel();
  // 拖一个池（第一个盒子）：选中 → 移动工具 → 按下拖 8 帧 → 松手；每帧 = 整体变换预演（override）
  const b0 = px(Pt(0.5, 0.5, 1));
  const h0 = e.pickAt(b0.x, b0.y); e.selectExpand(h0, 2);
  out.poolSelected = e.hasSelection() && !e.hasGeometrySelection();
  e.setTool("move");
  fire("pointerdown", b0.x, b0.y, { button: 0, buttons: 1 });
  out.dragPool = frames((i) => fire("pointermove", b0.x + 6 * (i + 1), b0.y, { buttons: 1 }), 8);
  out.dragPoolPerf = globalThis.__catsup.perf.line();
  out.idxBuildsDrag = idxN();
  await sleep(80); fire("pointerup", b0.x + 48, b0.y, { button: 0 });
  e.undo();
  // 进第一个池里推拉：双击进 → 推拉工具 → 顶面拖 8 帧；每帧 = 活动池影子副本 + 合成 + 重建
  e.setTool("select"); e.cancel();
  const h1 = e.pickAt(b0.x, b0.y); e.selectExpand(h1, 2); e.enterSelected();
  out.entered = e.contextCrumbs().length > 1;
  e.setTool("pp");
  const top = px(Pt(0.5, 0.5, 1));
  fire("pointerdown", top.x, top.y, { button: 0, buttons: 1 });
  out.ppInPool = frames((i) => fire("pointermove", top.x, top.y - 8 * (i + 1), { buttons: 1 }), 8);
  out.ppInPoolPerf = globalThis.__catsup.perf.line();
  out.idxBuildsPp = idxN();
  await sleep(80); fire("pointerup", top.x, top.y - 64, { button: 0 });
  out.ppCommitPerf = globalThis.__catsup.perf.line();
  e.undo(); e.exitContext();
  out.drawAfterMs = frames(() => e.draw(), 5).med;
  out.memMB = performance.memory ? +(performance.memory.usedJSHeapSize / 1048576).toFixed(0) : null;
  return out;
}, { MODE, N });
console.log(JSON.stringify(res));
console.log("errors:", errs.length ? errs.join("; ") : "none");
await browser.close();
