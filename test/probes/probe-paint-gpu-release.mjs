// probe-paint-gpu-release.mjs —— 扔画板时显卡上那份全还（贴图主线 0-3a，统筹 11-11；内核 v0.14.77 的 GLBoard.dispose）。created 2026-11-11 by Claude Opus 5.5
// 真的编辑器、真的显卡（无头 swiftshader）。开画之前把渲染器交给画画内核的那个 WebGL2 上下文换成一个会数数的代理：内核建 / 删的纹理、帧缓冲、渲染缓冲都过它
//   （three 自己的、三维显示用的图、薄层不过它——那些是渲染器的）。
// ① 一个物件顶面 / 其余面各开始画（两块画板）、画几笔、撤一下重做一下、跑几帧（每帧合成）→ 换文件（loadScene，画板全扔、扔光清池）：内核建的 = 删的（这一圈里内核第一次建的显卡接口自己的常驻件要是有，单独报出来）。
// ② 同一个文件里再画、再换文件：这一圈建的 = 删的（接口已经热了，一个不许差）。
// 跑法：python3 -m http.server 8765 后 node test/probes/probe-paint-gpu-release.mjs [地址]（或 PROBE_URL）
import { createRequire } from "node:module";
const { chromium } = createRequire(new URL("../../../20260524 WeebPaint/package.json", import.meta.url))("playwright");
const url = process.argv.slice(2).find((a) => a.startsWith("http")) ?? process.env.PROBE_URL ?? "http://127.0.0.1:8765/";
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(url, { waitUntil: "load" }); await page.waitForTimeout(800);
const res = await page.evaluate(async () => {
  const C = globalThis.__catsup, e = C.editor, P = (x, y, z = 0) => ({ x, y, z }), frames = async (n = 4) => { for (let i = 0; i < n; i++) { e.draw(); await new Promise((r) => requestAnimationFrame(r)); } };
  // 数数的代理：只包内核那一份
  const n = { tex: [0, 0], fb: [0, 0], rb: [0, 0] }, real = e.renderer3.paintGl();
  const COUNT = { createTexture: ["tex", 0], deleteTexture: ["tex", 1], createFramebuffer: ["fb", 0], deleteFramebuffer: ["fb", 1], createRenderbuffer: ["rb", 0], deleteRenderbuffer: ["rb", 1] };
  const proxy = new Proxy(real, { get(t, k) { const v = Reflect.get(t, k, t); if (typeof v !== "function") return v; const c = COUNT[k]; return c ? (...a) => { if (!(c[1] === 1 && a[0] == null)) n[c[0]][c[1]]++; return v.apply(t, a); } : v.bind(t); } });
  e.renderer3.paintGl = () => proxy;
  e.setGrid({ ...e.grid, on: false });
  const box = (x0) => { const B = [[x0, 0], [x0 + 1, 0], [x0 + 1, 1], [x0, 1]], segs = []; for (let i = 0; i < 4; i++) { const a = B[i], d = B[(i + 1) % 4]; segs.push([P(a[0], a[1], 0), P(d[0], d[1], 0)]); segs.push([P(a[0], a[1], 1), P(d[0], d[1], 1)]); segs.push([P(a[0], a[1], 0), P(a[0], a[1], 1)]); } e.commitOp({ op: "addEdges", at: e.activePool(), segs }); e.selectAll(); e.runAction("brep.orientOutward", { curvature: 3 }); e.makeComponent(`块${x0}`); e.runAction("object.toMesh"); e.clearSel?.(); };
  box(0);
  const S = () => e.sceneRef, g = () => crypto.randomUUID();
  const def = [...S().def(S().root).instances.values()][0].def, k = S().mesh(def).kernel, faces = k.faces();
  const top = faces.filter((f) => k.facePts(f).every((p) => Math.abs(p.z - 1) < 1e-6)), rest = faces.filter((f) => !top.includes(f));
  const texs = [g(), g()];   // 同一个物件：顶面一张画、其余的面一张画 = 两块画板（俯视画得到的是顶面那张）
  e.commitOp({ op: "startPaint", def, faces: top, uvSet: g(), textureGuid: texs[0], materialGuid: g(), names: { uvSet: "UV1", paint: "画一", material: "画一" }, color: [0.3, 0.5, 0.7], density: 100 });
  e.commitOp({ op: "startPaint", def, faces: rest, uvSet: g(), textureGuid: texs[1], materialGuid: g(), names: { uvSet: "UV2", paint: "画二", material: "画二" }, color: [0.7, 0.5, 0.3], density: 100 });
  e.cam.setView("top"); e.zoomExtents(); e.draw(); await frames(2);
  const vp = e.vp(), scr = (x, y) => e.cam.project(P(x, y, 1), vp);
  const stroke = (y) => { const a = scr(0.1, y), b = scr(0.9, y), pts = []; for (let i = 0; i <= 60; i++) pts.push({ x: a.x + ((b.x - a.x) * i) / 60, y: a.y + ((b.y - a.y) * i) / 60 }); C.paint.stroke({ points: pts, size: 14, hardness: 1, color: [0.9, 0.1, 0.1], accum: "over" }); };
  const round = async () => {
    const before = JSON.parse(JSON.stringify(n));
    for (const t of texs) C.paint.ensure(t);   // 两块都建（俯视只画得到顶面那一张）
    const pos0 = e.history.position();
    for (const y of [0.3, 0.5, 0.7]) { stroke(y); await frames(2); }
    const painted = e.history.position() - pos0;
    e.undo(); await frames(2); e.redo(); await frames(2);
    const boards = C.paint.boards.count;
    e.loadScene(S()); await frames(4);   // 换文件：画板全扔
    const d = (k, j) => n[k][j] - before[k][j];
    return { painted, boards, after: C.paint.boards.count, tex: [d("tex", 0), d("tex", 1)], fb: [d("fb", 0), d("fb", 1)], rb: [d("rb", 0), d("rb", 1)] };
  };
  const one = await round(), two = await round();
  return { one, two };
});
await browser.close();
console.log(JSON.stringify(res));
const eqAll = (r) => r.tex[0] === r.tex[1] && r.fb[0] === r.fb[1] && r.rb[0] === r.rb[1];
const checks = {
  "① 第一圈：三笔都落了、两块画板真建了、换文件之后全扔了；内核建的帧缓冲 = 删的，纹理最多差显卡接口自己第一次用时建的常驻件": res.one.painted === 3 && res.one.boards === 2 && res.one.after === 0 && res.one.tex[0] > 0 && res.one.fb[0] === res.one.fb[1] && res.one.tex[0] - res.one.tex[1] <= 2 && res.one.tex[0] >= res.one.tex[1],
  "② 第二圈（接口已经热了）：建的 = 删的": res.two.painted === 3 && res.two.boards === 2 && res.two.after === 0 && res.two.tex[0] > 0 && eqAll(res.two),
};
for (const [k, v] of Object.entries(checks)) console.log(`${v ? "✓" : "✗"} ${k}`);
if (errs.length) console.log("页面错误：", errs);
const ok = Object.values(checks).every(Boolean) && errs.length === 0;
console.log(ok ? "probe-paint-gpu-release OK" : "probe-paint-gpu-release FAIL");
process.exit(ok ? 0 : 1);
