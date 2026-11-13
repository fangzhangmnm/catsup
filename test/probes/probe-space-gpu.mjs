// probe-space-gpu.mjs —— 空间里的笔，显卡的那一半（贴图主线 1-4b）：真显卡版画的薄层 vs 软件版（差不超过 1/255）。created 2026-11-11 by Claude Opus 5.5
// 场景：方盒子转网格体、开始画、建画板；一串贴着盒子表面走、跨过好几张面的笔尖（1-4a 找面）。同一串笔尖、同一个薄层程序：
//   真显卡版（渲染器那半边，providers/three/offscreen-gpu-gl.ts）和软件版（src/paint/space-gpu-soft.ts）各画一遍，逐格比；取最大 / 叠加 × 软 / 硬。
// 第二段（施工单十八第 0 刀）：64 张面共用画布上同一块、一颗笔尖全罩住，真显卡版 = 软件版（以前最多 8 张）。
// 叠得很多层的地方如果漂出去：量出「叠了多少层、漂了多少」报出来（统筹 11-11：不自己加大放行线）。另外量一帧画薄层花多少。
// 跑法：python3 -m http.server 8765 后 node test/probes/probe-space-gpu.mjs [地址]（或 PROBE_URL）
import { createRequire } from "node:module";
const { chromium } = createRequire(new URL("../../../20260524 WeebPaint/package.json", import.meta.url))("playwright");
const url = process.argv.slice(2).find((a) => a.startsWith("http")) ?? process.env.PROBE_URL ?? "http://127.0.0.1:8765/";
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(url, { waitUntil: "load" }); await page.waitForTimeout(800);
const res = await page.evaluate(async () => {
  const C = globalThis.__catsup, e = C.editor, L = C.paint.lab, P = (x, y, z = 0) => ({ x, y, z }), sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  e.setGrid({ ...e.grid, on: false });
  const B = [[0, 0], [1, 0], [1, 1], [0, 1]], segs = []; for (let i = 0; i < 4; i++) { const a = B[i], d = B[(i + 1) % 4]; segs.push([P(a[0], a[1], 0), P(d[0], d[1], 0)]); segs.push([P(a[0], a[1], 1), P(d[0], d[1], 1)]); segs.push([P(a[0], a[1], 0), P(a[0], a[1], 1)]); }
  e.commitOp({ op: "addEdges", at: e.activePool(), segs }); e.selectAll(); e.runAction("brep.orientOutward", { curvature: 3 }); e.makeComponent("块"); e.runAction("object.toMesh"); await sleep(20);
  const S = e.sceneRef, inst = [...S.def(S.root).instances.values()][0], def = inst.def, m = S.mesh(def).kernel, g = () => crypto.randomUUID();
  e.commitOp({ op: "startPaint", def, faces: m.faces(), uvSet: g(), textureGuid: g(), materialGuid: g(), names: { uvSet: "UV", paint: "画", material: "画" }, color: [0.3, 0.5, 0.7], density: 40 });
  const info = C.paint.ensure(), targets = L.targets(info.guid);
  if (targets.length !== 1) throw new Error(`targets ${targets.length}`);
  const geo = L.buildTargetGeo(targets[0]);
  // 笔尖：沿顶面一条斜线走到侧面（跨过棱 = 跨面），球心贴在表面上
  const tips = [];
  for (let i = 0; i < 40; i++) {
    const t = i / 39, x = 0.15 + 0.85 * t, y = 0.3 + 0.4 * t, z = x <= 1 ? 1 : 1 - (x - 1);
    const p = { x: Math.min(x, 1), y, z: x <= 1 ? 1 : 1 - (x - 1) * 0 };
    let best = -1, bd = Infinity; for (let k = 0; k < geo.grid.face.length; k++) { const d = L.sphereTriDist(p.x, p.y, p.z, geo.wpos, 9 * k); if (d < bd) { bd = d; best = k; } }
    const tip = { x: p.x, y: p.y, z: p.z, r: 0.06 + 0.04 * Math.sin(i), alpha: 0.5 };
    tips.push({ tip, reach: L.tipReach([geo], tip, [{ ti: 0, tri: best }]) });
  }
  const gl = L.gpu(), soft = new L.SoftSpaceGpu();
  const out = { W: geo.table.width, H: geo.table.height, runs: [] };
  for (const [accum, hardness, alpha] of [["max", 0.3, 0.6], ["max", 1, 0.9], ["over", 0.3, 0.6], ["over", 0.8, 0.25]]) {
    const tt = tips.map((x) => ({ tip: { ...x.tip, alpha }, reach: x.reach }));
    const opts = { hardness, color: [0.85, 0.35, 0.15], accum, origin: tt[0].tip };
    const a = new L.SpaceLayer(gl, geo, 0, opts), b = new L.SpaceLayer(soft, geo, 0, opts);
    const t0 = performance.now(); a.update(tt, tt.length); const glMs = performance.now() - t0;
    b.update(tt, tt.length);
    const pa = gl.read(a.frame), pb = soft.read(b.frame);
    let maxd = 0, inked = 0, worst = null; const hist = new Map();
    for (let c = 0; c < out.W * out.H; c++) {
      if (pb[c * 4 + 3] > 0 || pa[c * 4 + 3] > 0) inked++;
      for (let k = 0; k < 4; k++) { const d = Math.abs(pa[c * 4 + k] - pb[c * 4 + k]); if (d) hist.set(d, (hist.get(d) ?? 0) + 1); if (d > maxd) { maxd = d; worst = { cell: c, k, gl: pa[c * 4 + k], soft: pb[c * 4 + k] }; } }
    }
    // 漂出去的格子叠了多少颗笔尖
    let layers = null; if (worst) { const x = worst.cell % out.W, y = Math.floor(worst.cell / out.W); layers = tt.filter(({ reach }) => [...(reach.get(0)?.keys() ?? [])].length).length; worst.xy = [x, y]; }
    out.runs.push({ accum, hardness, alpha, maxd, inked, hist: Object.fromEntries(hist), worst, glDrawMs: +glMs.toFixed(2), glLastDrawMs: +gl.lastDrawMs.toFixed(2) });
    a.dispose(); b.dispose();
  }
  // 64 张面共用画布上同一块（施工单十八第 0 刀：以前一颗笔尖下同一块最多 8 张，着色器外圈是常数上界；现在按这一块的面数循环）：
  //   64 张叠着的方面、贴图坐标一模一样 → 归属表并成一块；一颗笔尖全罩住；真显卡版 vs 软件版逐格比，量这一帧
  {
    const MK = m.constructor, k64 = new MK(), N = 64, FRESH = { kind: "fresh" }, q = [P(0, 0, 0), P(1, 0, 0), P(1, 1, 0), P(0, 1, 0)];
    for (let k = 0; k < N; k++) k64.addFace(q.map((p) => k64.addVertex(P(p.x, p.y, p.z + k * 1e-4))), -1, FRESH);
    const UV = globalThis.__catsup.paint.uv, sl64 = [];   // 施工单十八第 1½ 刀：贴图坐标只经 scene/uv.ts（调试钩子 paint.uv）
    for (const f of k64.faces()) UV.place(k64, sl64, f, "uv64", [4, 4, 36, 4, 36, 36, 4, 36]);
    const t64 = { id: "t64", mesh: UV.view(k64, sl64), xform: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0], uvSet: "uv64", pxPerM: 32, canvas: { width: 40, height: 40 }, walks: () => true };
    const g64 = L.buildTargetGeo(t64), tip = { x: 0.5, y: 0.5, z: 0.003, r: 0.2, alpha: 0.8 };
    const reach = new Map([[0, new Map([[0, Array.from(g64.grid.face, (_, k) => k)]])]]);   // 叠着的面互不相连：这颗笔尖碰到的三角形直接给全部
    const row = { polys: g64.table.polys.length, faces: g64.table.polyFaces[0]?.length ?? 0, runs: [] };
    for (const [accum, hardness] of [["max", 0.5], ["over", 0.9]]) {
      const opts = { hardness, color: [0.2, 0.7, 0.4], accum, origin: tip };
      const a = new L.SpaceLayer(gl, g64, 0, opts), b = new L.SpaceLayer(soft, g64, 0, opts);
      const t0 = performance.now(); a.update([{ tip, reach }], 1); const glMs = performance.now() - t0;
      b.update([{ tip, reach }], 1);
      const pa = gl.read(a.frame), pb = soft.read(b.frame);
      let maxd = 0, inked = 0;
      for (let c = 0; c < 40 * 40; c++) { if (pb[c * 4 + 3] > 0 || pa[c * 4 + 3] > 0) inked++; for (let k = 0; k < 4; k++) maxd = Math.max(maxd, Math.abs(pa[c * 4 + k] - pb[c * 4 + k])); }
      row.runs.push({ accum, hardness, maxd, inked, glDrawMs: +glMs.toFixed(2), glLastDrawMs: +gl.lastDrawMs.toFixed(2) });
      a.dispose(); b.dispose();
    }
    out.f64 = row;
  }
  return out;
});
await browser.close();
console.log(`画板 ${res.W}×${res.H}`);
for (const r of res.runs) console.log(`${r.accum} 硬度 ${r.hardness} 浓度 ${r.alpha}：最大差 ${r.maxd} / 255（有墨 ${r.inked} 格；差的分布 ${JSON.stringify(r.hist)}）${r.worst ? " 最差 " + JSON.stringify(r.worst) : ""}；真显卡这一帧 ${r.glDrawMs} ms`);
console.log(`64 张面共用一块（归属表 ${res.f64.polys} 块、${res.f64.faces} 张面）：` + res.f64.runs.map((r) => `${r.accum} 硬度 ${r.hardness} 最大差 ${r.maxd} / 255、有墨 ${r.inked} 格、真显卡这一帧 ${r.glDrawMs} ms`).join("；"));
const ok64 = res.f64.polys === 1 && res.f64.faces === 64 && res.f64.runs.every((r) => r.maxd <= 1 && r.inked > 20);
const ok = res.runs.every((r) => r.maxd <= 1 && r.inked > 100) && ok64 && errs.length === 0;
if (errs.length) console.log("页面错误：", errs);
console.log(ok ? "probe-space-gpu OK" : "probe-space-gpu FAIL");
process.exit(ok ? 0 : 1);
