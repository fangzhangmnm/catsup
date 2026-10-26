// 池网格（纪元账本 DT96 渲染那半，2026-10-26 Claude Opus 5.5）：增量同步 + 局部上传画出来的 = 全量重建画出来的。
// 一串操作（推拉 / 挪点 / 擦边 / 软化 / 上色 / 拖动预演 / 撤销 / 重做）每步之后读整张画布，再把线稿风格切走再切回（= 池网格全量重建、缓冲全换）读一次，两张逐像素比。
// 模型里没有悬空线（悬空线和面边颜色不同，交点上谁后画谁赢；增量和全量的画序不同）。
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 800, height: 700 } });
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(process.argv[2] ?? "http://127.0.0.1:8765/", { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1200);
const setup = await page.evaluate(async () => {
  const e = globalThis.__catsup.editor, at = e.activePool(), N = 16, frame = () => new Promise((r) => requestAnimationFrame(() => r(0)));
  e.setGrid({ on: false });
  const box = (x, y, w, h) => [[{ x, y, z: 0 }, { x: x + w, y, z: 0 }], [{ x: x + w, y, z: 0 }, { x: x + w, y: y + h, z: 0 }], [{ x: x + w, y: y + h, z: 0 }, { x, y: y + h, z: 0 }], [{ x, y: y + h, z: 0 }, { x, y, z: 0 }]];
  e.commitOp({ op: "addEdges", at, segs: box(-3, -1, 2, 2) });
  e.commitOp({ op: "pushpull", at, face: [{ x: -3, y: -1, z: 0 }, { x: -1, y: -1, z: 0 }, { x: -1, y: 1, z: 0 }, { x: -3, y: 1, z: 0 }], dist: 1.5 });
  const pts = Array.from({ length: N }, (_, i) => ({ x: 1.5 + Math.cos((i / N) * 2 * Math.PI), y: Math.sin((i / N) * 2 * Math.PI), z: 0 }));
  e.commitOp({ op: "addEdges", at, segs: pts.map((p, i) => [p, pts[(i + 1) % N]]), curve: true });
  e.commitOp({ op: "pushpull", at, face: pts, dist: 2 });
  e.commitOp({ op: "addMaterial", name: "红", color: [0.8, 0.15, 0.1] });
  e.cam.setView("iso"); e.zoomExtents?.(); e.draw(); await frame();
  return { faces: e.kernel.faces().length };
});
/** 读整张画布存进页面里的一个槽（像素留在页面里，只回统计）。 */
const grab = (slot) => page.evaluate(async (slot) => {
  await new Promise((r) => requestAnimationFrame(() => r(0)));
  globalThis.__catsup.editor.draw();   // 同步画一帧、同一个任务里读（等到下一帧合成之后缓冲就清空了）
  const c = document.getElementById("board"), gl = c.getContext("webgl2") ?? c.getContext("webgl");
  const px = new Uint8Array(c.width * c.height * 4); gl.readPixels(0, 0, c.width, c.height, gl.RGBA, gl.UNSIGNED_BYTE, px);
  (globalThis.__pm ??= {})[slot] = px;
}, slot);
/** 线稿风格切走再切回 = 池网格全量重建（缓冲全换），读进 slot。 */
const fullRebuild = async (slot) => {
  await page.evaluate(async () => { const e = globalThis.__catsup.editor, s = e.lineStyle; e.setLineStyle(s === "thick" ? "pixel" : "thick"); e.draw(); await new Promise((r) => requestAnimationFrame(() => r(0))); e.setLineStyle(s); e.draw(); });
  await grab(slot);
};
/** 两个槽逐像素比：某通道差 > 8 的像素数 + 最大差。 */
const diff = (x, y) => page.evaluate(([x, y]) => { const a = globalThis.__pm[x], b = globalThis.__pm[y]; let n = 0, maxd = 0; for (let i = 0; i < a.length; i += 4) { const d = Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2])); if (d > 8) n++; maxd = Math.max(maxd, d); } return { n, maxd }; }, [x, y]);
const stepNames = ["推拉盒子顶", "挪圆柱顶一点", "擦盒子一条竖棱", "硬化圆柱两条侧棱", "盒子侧面上色"];
const out = { setup, steps: {} };
let ok = setup.faces > 10;
const fulls = () => page.evaluate(() => globalThis.__catsup.perf.count["poolMesh.full"] ?? 0);
for (const name of stepNames) {
  const f0 = await fulls();
  await page.evaluate(async (name) => {
    const e = globalThis.__catsup.editor, at = e.activePool(), k = e.kernel;
    const steps = {
      "推拉盒子顶": () => { const f = k.faces().find((x) => k.faceRings3(x.id).outer.every((p) => Math.abs(p.z - 1.5) < 1e-6 && p.x < 0)); e.commitOp({ op: "pushpull", at, face: k.faceRings3(f.id).outer, dist: 0.5 }); },
      "挪圆柱顶一点": () => { const v = k.vertices().find((x) => Math.abs(x.z - 2) < 1e-6 && x.x > 2.4); e.commitOp({ op: "move", at, moves: [{ from: { x: v.x, y: v.y, z: v.z }, to: { x: v.x + 0.2, y: v.y, z: v.z + 0.3 } }] }); },
      "擦盒子一条竖棱": () => { const ed = k.edges().find((x) => { const a = k.graph.pt(x.a), b = k.graph.pt(x.b); return a.x === -3 && b.x === -3 && a.y === -1 && b.y === -1; }); e.commitOp({ op: "eraseEdges", at, edges: [[k.graph.pt(ed.a), k.graph.pt(ed.b)]] }); },
      "硬化圆柱两条侧棱": () => { const es = k.edges().filter((x) => { const a = k.graph.pt(x.a), b = k.graph.pt(x.b); return a.x > 1.5 && a.y > 0 && Math.abs(a.x - b.x) < 1e-9 && Math.abs(a.y - b.y) < 1e-9 && a.z !== b.z; }).slice(0, 2); e.commitOp({ op: "setEdgeLayers", at, edges: es.map((x) => [k.graph.pt(x.a), k.graph.pt(x.b)]), layers: ["soft", "smooth"], on: false }); },
      "盒子侧面上色": () => { const f = k.faces().find((x) => k.faceRings3(x.id).outer.every((p) => Math.abs(p.x + 1) < 1e-6)); e.commitOp({ op: "paintFaces", at, faces: [k.faceRings3(f.id).outer], material: 0 }); },
    };
    steps[name](); e.draw();
  }, name);
  await grab("inc");
  const inc = (await fulls()) === f0;   // 这一步走的是增量（没有全量重建）
  await fullRebuild("full"); const d = { ...(await diff("inc", "full")), inc };
  out.steps[name] = d; if (d.n > 40 || !inc) ok = false;
}
// 拖动预演（副本族谱）：选一个盒子角点、移动工具拖几帧；中途读一张（预演副本），松手后读一张（提交）
const r0 = await page.evaluate(async () => {
  const e = globalThis.__catsup.editor, k = e.kernel;
  const v = k.vertices().find((x) => x.x === -1 && x.y === 1 && Math.abs(x.z - 2) < 1e-6) ?? k.vertices()[0];
  e.deselectAll(); e.selection.verts.add(v.id); e.setTool("move"); e.draw(); await new Promise((r) => requestAnimationFrame(() => r(0)));
  const rect = document.getElementById("board").getBoundingClientRect(), P = e.cam.project(k.graph.pt(v.id), e.vp());
  return { sx: rect.left + P.x, sy: rect.top + P.y };
});
await page.mouse.move(r0.sx, r0.sy); await page.waitForTimeout(50); await grab("before"); const fd = await fulls(); await page.mouse.down();
for (let i = 1; i <= 5; i++) { await page.mouse.move(r0.sx + i * 4, r0.sy - i * 3); await page.waitForTimeout(30); }
await grab("mid");
const midInc = await page.evaluate(() => globalThis.__catsup.perf.last["poolMesh.sync"] ?? -1);
await page.mouse.up(); await page.waitForTimeout(50);
await page.evaluate(() => { globalThis.__catsup.editor.deselectAll(); globalThis.__catsup.editor.draw(); });
await grab("inc");
const dragInc = (await fulls()) === fd;   // 拖动的每一帧预演副本 + 松手提交都走增量
await fullRebuild("full");
out.steps["拖动预演后提交"] = { ...(await diff("inc", "full")), inc: dragInc }; if (out.steps["拖动预演后提交"].n > 40 || !dragInc) ok = false;
out.dragMoved = (await diff("mid", "before")).n > 0;   // 拖的时候画面真的变了（不是一张没更新的图）
out.midSyncMs = midInc;
for (const [name, fn] of [["撤销两步", "undo"], ["重做一步", "redo"]]) {
  const f0 = await fulls();
  await page.evaluate((fn) => { const e = globalThis.__catsup.editor; e[fn](); if (fn === "undo") e.undo(); e.draw(); }, fn);
  await grab("inc");
  const inc = (await fulls()) === f0;
  await fullRebuild("full"); const d = { ...(await diff("inc", "full")), inc };
  out.steps[name] = d; if (d.n > 40 || !inc) ok = false;
}
console.log(JSON.stringify(out));
ok = ok && out.dragMoved && !errs.length;
console.log(errs.length ? "PAGEERRORS:\n" + errs.join("\n") : "(no page errors)"); console.log(ok ? "PROBE OK" : "PROBE FAIL");
await b.close(); process.exit(ok ? 0 : 1);
