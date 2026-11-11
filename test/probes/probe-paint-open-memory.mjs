#!/usr/bin/env node
// probe-paint-open-memory.mjs —— 打开一张画时显卡上固定占多少：面板上说的数（src/paint/open-memory.ts）= 实际开的图（施工单十五第三节）。created 2026-11-11 by Claude Opus 5.5
// 在测试页里给 WebGL 的建图 / 删图记账（只在这个探针的页面里，不改 app）：五档画布各开一张画、进画画工作台、画一笔，
// 量 ①开始画之后多开的 ②画过一笔之后一直占着的 ③一笔正在画的时候又多的 ④出画画工作台放掉的（每格的表），和 open-memory.ts 那张清单逐字节比（只数画布那么大的图；几 KB 的小数据图 / 图块不算）。
// 用法：python3 -m http.server 8765 后 node test/probes/probe-paint-open-memory.mjs [url]
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
const here = path.dirname(fileURLToPath(import.meta.url));
const { chromium } = createRequire(path.join(here, "../../../20260524 WeebPaint/package.json"))("playwright");
const url = process.argv.slice(2).find((a) => a.startsWith("http")) ?? process.env.PROBE_URL ?? "http://127.0.0.1:8765/";
let pass = 0, failN = 0;
const check = (ok, what, extra = "") => { if (ok) { pass++; console.log("  ✓", what); } else { failN++; process.exitCode = 1; console.error("  ✗", what, extra ? `  ← ${extra}` : ""); } };
const INSTR = () => {
  const P = WebGL2RenderingContext.prototype, info = new Map(), rbs = new Map();
  const BPP = { 0x8058: 4, 0x1908: 4, 0x881A: 8, 0x8814: 16, 0x822E: 4, 0x823A: 4, 0x8D76: 8, 0x8229: 1, 0x822B: 2, 0x8C43: 4, 0x88F0: 4, 0x81A6: 4, 0x822D: 2, 0x822F: 4, 0x8236: 4, 0x8D7C: 4, 0x8230: 8, 0x8D82: 4, 0x1907: 3, 0x8CAD: 8, 0x8CAC: 4 };
  const bppOf = (fmt, type) => (fmt === 0x1908 && type === 0x1406 ? 16 : fmt === 0x1908 && type === 0x140B ? 8 : BPP[fmt] ?? 4);
  const cur = (gl) => gl.getParameter(gl.TEXTURE_BINDING_2D);
  const rec = (tex, level, w, h, bpp) => { let e = info.get(tex); if (!e) { e = { levels: new Map(), w: 0, h: 0, bpp }; info.set(tex, e); } if (level === 0) { e.w = w; e.h = h; e.bpp = bpp; } e.levels.set(level, w * h * bpp); };
  const ts = P.texStorage2D; P.texStorage2D = function (t, levels, fmt, w, h) { const tex = cur(this); if (tex) { for (let l = 0; l < levels; l++) rec(tex, l, Math.max(1, w >> l), Math.max(1, h >> l), bppOf(fmt)); } return ts.apply(this, arguments); };
  const ti = P.texImage2D; P.texImage2D = function (t, level, fmt, a, b, c, d, e) {
    if (t === this.TEXTURE_2D) { const tex = cur(this); if (tex) { if (arguments.length >= 8) rec(tex, level, a, b, bppOf(fmt, e)); else { const src = c && typeof c === "object" ? c : arguments[5]; if (src && src.width) rec(tex, level, src.width, src.height, bppOf(fmt, b)); } } }
    return ti.apply(this, arguments);
  };
  const gm = P.generateMipmap; P.generateMipmap = function (t) { const tex = cur(this); const e = tex && info.get(tex); if (e && e.w) { let w = e.w, h = e.h, l = 0; while (w > 1 || h > 1) { w = Math.max(1, w >> 1); h = Math.max(1, h >> 1); l++; e.levels.set(l, w * h * e.bpp); } } return gm.apply(this, arguments); };
  const dt = P.deleteTexture; P.deleteTexture = function (tex) { info.delete(tex); return dt.apply(this, arguments); };
  const rs = P.renderbufferStorage; P.renderbufferStorage = function (t, fmt, w, h) { const rb = this.getParameter(this.RENDERBUFFER_BINDING); if (rb) rbs.set(rb, { w, h, bytes: w * h * (BPP[fmt] ?? 4) }); return rs.apply(this, arguments); };
  const rsm = P.renderbufferStorageMultisample; P.renderbufferStorageMultisample = function (t, s, fmt, w, h) { const rb = this.getParameter(this.RENDERBUFFER_BINDING); if (rb) rbs.set(rb, { w, h, bytes: w * h * (BPP[fmt] ?? 4) * Math.max(1, s) }); return rsm.apply(this, arguments); };
  const dr = P.deleteRenderbuffer; P.deleteRenderbuffer = function (rb) { rbs.delete(rb); return dr.apply(this, arguments); };
  globalThis.__gpu = () => { const items = []; let total = 0; for (const e of info.values()) { let b = 0; for (const v of e.levels.values()) b += v; total += b; items.push({ w: e.w, h: e.h, bpp: e.bpp, levels: e.levels.size, bytes: b }); } for (const r of rbs.values()) { total += r.bytes; items.push({ w: r.w, h: r.h, rb: true, bytes: r.bytes }); } return { total, items }; };
};
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
for (const n of [128, 256, 512, 1024, 2048]) {
  const ctx = await browser.newContext({ viewport: { width: 900, height: 700 }, deviceScaleFactor: 1 });
  await ctx.addInitScript(INSTR);
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: "load" }); await page.waitForTimeout(1200);
  const r = await page.evaluate(async (n) => {
    const C = globalThis.__catsup, e = C.editor, P = (x, y, z = 0) => ({ x, y, z }), fr = async (k = 4) => { for (let i = 0; i < k; i++) { e.draw(); await new Promise((q) => requestAnimationFrame(q)); } };
    /** 只数画布那么大的（n × n）：小数据图、图块、three 自己的不算。 */
    const big = (g) => g.items.filter((it) => it.w === n && it.h === n).reduce((s, it) => s + it.bytes, 0);
    e.setGrid({ ...e.grid, on: false });
    const B = [[0, 0], [1, 0], [1, 1], [0, 1]], segs = []; for (let i = 0; i < 4; i++) { const a = B[i], d = B[(i + 1) % 4]; segs.push([P(a[0], a[1], 0), P(d[0], d[1], 0)]); segs.push([P(a[0], a[1], 1), P(d[0], d[1], 1)]); segs.push([P(a[0], a[1], 0), P(a[0], a[1], 1)]); }
    e.commitOp({ op: "addEdges", at: e.activePool(), segs }); e.selectAll(); e.runAction("brep.orientOutward", { curvature: 3 }); e.makeComponent("盒"); e.runAction("object.toMesh");
    const S0 = e.sceneRef, inst = [...S0.def(S0.root).instances.values()][0]; e.exitTo(0); e.selectedPools.clear(); e.selectedPools.set(`i${inst.id}`, { kind: "instance", instance: inst.id }); e.enterSelected();
    e.cam.setView("top"); e.zoomExtents(); C.pickWorkbench("paint"); await fr();
    const g0 = big(globalThis.__gpu());
    e.runAction("mesh.startPaint", { canvas: n, arrange: "patches" }); await fr(6);
    const g1 = big(globalThis.__gpu());
    const tex = [...e.sceneRef.textures.values()].find((t) => t.content.kind === "layered").guid, V = e.vp(), pts = []; for (let i = 0; i <= 20; i++) pts.push({ x: V.w * (0.3 + 0.4 * i / 20), y: V.h * 0.5 });
    let mid = 0; C.paint.stroke({ guid: tex, points: pts, size: 20, hardness: 0.8, color: [0.9, 0.1, 0.1], accum: "over", beforeUp: () => { mid = big(globalThis.__gpu()); } }); await fr(4);
    const g2 = big(globalThis.__gpu());
    C.pickWorkbench("freeform"); await fr(4);
    const g3 = big(globalThis.__gpu());
    return { opened: g1 - g0, painted: g2 - g0, during: mid - g2, left: g2 - g3 };
  }, n);
  const m = (() => { let display = 0; for (let w = n, h = n; ; w = Math.max(1, w >> 1), h = Math.max(1, h >> 1)) { display += w * h * 4; if (w === 1 && h === 1) break; } const one = n * n * 4; return { display, kernel: 4 * one, cells: n * n * 8, fixed: display + 4 * one + n * n * 8, opened: display + 2 * one + n * n * 8, stroke: 2 * one }; })();   // 和 src/paint/open-memory.ts 同一张清单
  check(r.painted === m.fixed, `${n} × ${n}：画过一笔之后一直占着 ${r.painted} 字节 = 面板上说的 ${m.fixed}（显示图连缩小图 ${m.display} + 内核四张 ${m.kernel} + 每格的表 ${m.cells}）`, JSON.stringify({ r, m }));
  check(r.opened === m.opened, `${n} × ${n}：刚开始画（还没落笔）= 少内核池子里那两张（${r.opened}）`, JSON.stringify(r));
  check(r.during === m.stroke, `${n} × ${n}：一笔正在画的时候又多 ${r.during} = 两张薄层 ${m.stroke}`, JSON.stringify(r));
  check(r.left === m.cells, `${n} × ${n}：出画画工作台放掉每格的表 ${r.left}`, JSON.stringify(r));
  await ctx.close();
}
await browser.close();
console.log(`\nprobe-paint-open-memory ${failN ? "FAIL" : "OK"}（${pass} ✓ / ${failN} ✗）`);
