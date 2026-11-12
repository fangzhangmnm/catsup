#!/usr/bin/env node
// probe-paint-open-memory.mjs —— 打开一张画时显卡上固定占多少：面板上说的数（src/paint/open-memory.ts）= 实际开的图（施工单十五第三节）。created 2026-11-11 by Claude Opus 5.5
// 在测试页里给 WebGL 的建图 / 删图记账（只在这个探针的页面里，不改 app）：五档画布各开一张画、进画画工作台、画一笔，
// 记账看得见全部显卡分配（含图组 / 3D：内核的图块池，施工单十九第 1 刀）；清单从 app 的 open-memory.ts 拿（不另抄一份）；对不上时打出多出来的每一张。
// 量 ①开始画之后多开的 ②画过一笔之后一直占着的 ③一笔正在画的时候又多的 ④出画画工作台放掉的（每格的表；施工单十九第 3 刀起还有画板睡下删掉的索引小图），和 open-memory.ts 那张清单逐字节比（只数画布那么大的图；几 KB 的小数据图 / 图块不算）。
// 用法：python3 -m http.server 8765 后 node test/probes/probe-paint-open-memory.mjs [url]
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
const here = path.dirname(fileURLToPath(import.meta.url));
const { chromium } = createRequire(path.join(here, "../../../20260524 WeebPaint/package.json"))("playwright");
const { openMemory } = await import(path.join(here, "../../src/paint/open-memory.ts"));
const url = process.argv.slice(2).find((a) => a.startsWith("http")) ?? process.env.PROBE_URL ?? "http://127.0.0.1:8765/";
let pass = 0, failN = 0;
const check = (ok, what, extra = "") => { if (ok) { pass++; console.log("  ✓", what); } else { failN++; process.exitCode = 1; console.error("  ✗", what, extra ? `  ← ${extra}` : ""); } };
const INSTR = () => {
  const P = WebGL2RenderingContext.prototype, info = new Map(), rbs = new Map();
  const BPP = { 0x8058: 4, 0x1908: 4, 0x881A: 8, 0x8814: 16, 0x822E: 4, 0x823A: 4, 0x8D76: 8, 0x8229: 1, 0x822B: 2, 0x8C43: 4, 0x88F0: 4, 0x81A6: 4, 0x822D: 2, 0x822F: 4, 0x8236: 4, 0x8D7C: 4, 0x8230: 8, 0x8D82: 4, 0x1907: 3, 0x8CAD: 8, 0x8CAC: 4 };
  const bppOf = (fmt, type) => (fmt === 0x1908 && type === 0x1406 ? 16 : fmt === 0x1908 && type === 0x140B ? 8 : BPP[fmt] ?? 4);
  const cur = (gl, t = gl.TEXTURE_2D) => gl.getParameter(t === gl.TEXTURE_2D_ARRAY ? gl.TEXTURE_BINDING_2D_ARRAY : t === gl.TEXTURE_3D ? gl.TEXTURE_BINDING_3D : t === gl.TEXTURE_CUBE_MAP ? gl.TEXTURE_BINDING_CUBE_MAP : gl.TEXTURE_BINDING_2D);
  const rec = (tex, level, w, h, bpp) => { let e = info.get(tex); if (!e) { e = { levels: new Map(), w: 0, h: 0, bpp }; info.set(tex, e); } if (level === 0) { e.w = w; e.h = h; e.bpp = bpp; } e.levels.set(level, w * h * bpp); };
  const ts = P.texStorage2D; P.texStorage2D = function (t, levels, fmt, w, h) { const tex = cur(this, t); if (tex) { for (let l = 0; l < levels; l++) rec(tex, l, Math.max(1, w >> l), Math.max(1, h >> l), bppOf(fmt)); } return ts.apply(this, arguments); };
  const ti = P.texImage2D; P.texImage2D = function (t, level, fmt, a, b, c, d, e) {
    if (t === this.TEXTURE_2D) { const tex = cur(this, t); if (tex) { if (arguments.length >= 8) rec(tex, level, a, b, bppOf(fmt, e)); else { const src = c && typeof c === "object" ? c : arguments[5]; if (src && src.width) rec(tex, level, src.width, src.height, bppOf(fmt, b)); } } }
    return ti.apply(this, arguments);
  };
  // 图组 / 3D（内核的显卡图块池就是一张图组：以前看不见，清单漏了每张画板 16 MB；施工单十九第 1 刀）：每一级 = 宽 × 高 × 层数 × 每像素字节
  const ts3 = P.texStorage3D; P.texStorage3D = function (t, levels, fmt, w, h, d) { const tex = cur(this, t); if (tex) { for (let l = 0; l < levels; l++) rec(tex, l, Math.max(1, w >> l), Math.max(1, h >> l) * (t === this.TEXTURE_3D ? Math.max(1, d >> l) : d), bppOf(fmt)); const e3 = info.get(tex); e3.layers = d; e3.h = h; } return ts3.apply(this, arguments); };
  const ti3 = P.texImage3D; P.texImage3D = function (t, level, fmt, w, h, d, b, f, ty) { const tex = cur(this, t); if (tex) { rec(tex, level, w, h * d, bppOf(fmt, ty)); if (level === 0) { const e3 = info.get(tex); e3.layers = d; e3.h = h; } } return ti3.apply(this, arguments); };
  const gm = P.generateMipmap; P.generateMipmap = function (t) { const tex = cur(this, t); const e = tex && info.get(tex); if (e && e.w) { let w = e.w, h = e.h, l = 0; while (w > 1 || h > 1) { w = Math.max(1, w >> 1); h = Math.max(1, h >> 1); l++; e.levels.set(l, w * h * e.bpp); } } return gm.apply(this, arguments); };
  const dt = P.deleteTexture; P.deleteTexture = function (tex) { info.delete(tex); return dt.apply(this, arguments); };
  const rs = P.renderbufferStorage; P.renderbufferStorage = function (t, fmt, w, h) { const rb = this.getParameter(this.RENDERBUFFER_BINDING); if (rb) rbs.set(rb, { w, h, bytes: w * h * (BPP[fmt] ?? 4) }); return rs.apply(this, arguments); };
  const rsm = P.renderbufferStorageMultisample; P.renderbufferStorageMultisample = function (t, s, fmt, w, h) { const rb = this.getParameter(this.RENDERBUFFER_BINDING); if (rb) rbs.set(rb, { w, h, bytes: w * h * (BPP[fmt] ?? 4) * Math.max(1, s) }); return rsm.apply(this, arguments); };
  const dr = P.deleteRenderbuffer; P.deleteRenderbuffer = function (rb) { rbs.delete(rb); return dr.apply(this, arguments); };
  globalThis.__gpu = () => { const items = []; let total = 0; for (const e of info.values()) { let b = 0; for (const v of e.levels.values()) b += v; total += b; items.push({ w: e.w, h: e.h, bpp: e.bpp, levels: e.levels.size, layers: e.layers ?? 1, bytes: b }); } for (const r of rbs.values()) { total += r.bytes; items.push({ w: r.w, h: r.h, rb: true, bytes: r.bytes }); } return { total, items }; };
};
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
for (const n of [128, 256, 512, 1024, 2048]) {
  const ctx = await browser.newContext({ viewport: { width: 900, height: 700 }, deviceScaleFactor: 1 });
  await ctx.addInitScript(INSTR);
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: "load" }); await page.waitForTimeout(1200);
  const r = await page.evaluate(async (n) => {
    const C = globalThis.__catsup, e = C.editor, P = (x, y, z = 0) => ({ x, y, z }), fr = async (k = 4) => { for (let i = 0; i < k; i++) { e.draw(); await new Promise((q) => requestAnimationFrame(q)); } };
    /** 显卡上的全部分配（2D / 图组 / 3D / 渲染缓冲；施工单十九第 1 刀：清单上没有的 = 红，不再只数画布那么大的）。 */
    const big = (g) => g.total;
    const items = (g) => g.items.map((it) => `${it.w}x${it.h}${it.layers > 1 ? `x${it.layers}` : ""}${it.rb ? "rb" : ""}:${it.bytes}`);
    e.setGrid({ ...e.grid, on: false });
    const B = [[0, 0], [1, 0], [1, 1], [0, 1]], segs = []; for (let i = 0; i < 4; i++) { const a = B[i], d = B[(i + 1) % 4]; segs.push([P(a[0], a[1], 0), P(d[0], d[1], 0)]); segs.push([P(a[0], a[1], 1), P(d[0], d[1], 1)]); segs.push([P(a[0], a[1], 0), P(a[0], a[1], 1)]); }
    e.commitOp({ op: "addEdges", at: e.activePool(), segs }); e.selectAll(); e.runAction("brep.orientOutward", { curvature: 3 }); e.makeComponent("盒"); e.runAction("object.toMesh");
    const S0 = e.sceneRef, inst = [...S0.def(S0.root).instances.values()][0]; e.exitTo(0); e.selectedPools.clear(); e.selectedPools.set(`i${inst.id}`, { kind: "instance", instance: inst.id }); e.enterSelected();
    e.cam.setView("top"); e.zoomExtents(); C.pickWorkbench("paint"); await fr();
    const G0 = globalThis.__gpu(), g0 = big(G0);
    e.runAction("mesh.startPaint", { canvas: n, arrange: "patches" }); await fr(6);
    const g1 = big(globalThis.__gpu());
    const tex = [...e.sceneRef.textures.values()].find((t) => t.content.kind === "layered").guid, V = e.vp(), pts = []; for (let i = 0; i <= 20; i++) pts.push({ x: V.w * (0.3 + 0.4 * i / 20), y: V.h * 0.5 });
    let mid = 0; C.paint.stroke({ guid: tex, points: pts, size: 20, hardness: 0.8, color: [0.9, 0.1, 0.1], accum: "over", beforeUp: () => { mid = big(globalThis.__gpu()); } }); await fr(4);
    const G2 = globalThis.__gpu(), g2 = big(G2);
    const before = new Map(); for (const k of items(G0)) before.set(k, (before.get(k) ?? 0) + 1);
    const added = []; for (const k of items(G2)) { const c = before.get(k) ?? 0; if (c) before.set(k, c - 1); else added.push(k); }
    C.pickWorkbench("freeform"); await fr(4);
    const G3 = globalThis.__gpu(), g3 = big(G3);
    const arenaOf = (G) => items(G).filter((k) => /^256x256x\d+:/.test(k)).reduce((a, k) => a + Number(k.split(":")[1]), 0);   // 内核的图块池（2D 图组，256 见方一片）
    const k = e.sceneRef.mesh(inst.def).kernel, fs = k.faces(); let tris = 0; for (const f of fs) tris += Math.max(1, k.faceVerts(f).length - 2);   // 画哪些面（面表 / 三角形表跟着它）：整个盒子
    return { opened: g1 - g0, painted: g2 - g0, during: mid - g2, left: g2 - g3, added, target: { faces: fs.length, tris }, arenaGrewOnLeave: arenaOf(G3) - arenaOf(G2) };
  }, n);
  const m = openMemory(n, n, r.target);   // app 自己的清单（面板上的数就是它算的），不在探针里另抄一份
  const tiles = Math.ceil(n / 256) ** 2;
  check(r.painted === m.fixed - (m.arenaPeak - m.arenaAfterStroke), `${n} × ${n}：画过一笔之后显卡上一共多占 ${r.painted} 字节 = 面板上说的 ${m.fixed} − 图块池上沿多出来的 ${m.arenaPeak - m.arenaAfterStroke}（存盘 / 睡前那一次才长）（显示图连缩小图 ${m.display} + 内核四张 ${m.kernel} + 图块池 ${m.arenaAfterStroke} + 每格的表 ${m.cells} + 面表三角形表 ${m.tables} + 索引小图 ${m.index}）`, `多出来的分配：${r.added.join(" ")}`);
  check(r.opened === m.opened, `${n} × ${n}：刚开始画（还没落笔）= 少内核池子里那两张、图块池是起步那份（${r.opened} = ${m.opened}）`, JSON.stringify(r));
  check(r.during === m.stroke - tiles * 4 - (m.arenaAfterStroke - m.arena), `${n} × ${n}：一笔正在画的时候比画完多 ${r.during} = 两张薄层 ${m.stroke} − 正在画的那层的索引小图 ${tiles * 4}（落层时重建）− 落层时图块池长的 ${m.arenaAfterStroke - m.arena}`, JSON.stringify(r));
  // 施工单十九第 3 刀起：出了画画工作台画板睡下 → 内核删掉每层的索引小图（新开的画两层，每格 4 字节）；合成目标还给内核的帧缓冲池（不删）、图块池一份文件一个（留着），这两样不算放掉
  //   另外：睡前钉进存盘缓存（PaintSaver.prime）要整张合成读回一次，整张合成的段缓存另占片——2048 见方时池从 128 片长到 256 片（32 → 64 MB）；存盘第一次走的是同一条路。
  //   清单的上沿（open-memory.ts arenaPeak）按这一次算（统筹 11-12：清单要说真话）；放掉的 + 池长的 = 清单上该放的，池长的 = 上沿 − 第一笔之后。
  check(r.arenaGrewOnLeave === m.arenaPeak - m.arenaAfterStroke, `${n} × ${n}：出画画工作台时（睡前钉进缓存那一次整张合成读回）图块池长了 ${r.arenaGrewOnLeave} 字节 = 清单的上沿 − 第一笔之后 ${m.arenaPeak - m.arenaAfterStroke}（存盘第一次走同一条路）`, JSON.stringify(r));
  check(r.left + r.arenaGrewOnLeave === m.cells + m.tables + 2 * tiles * 4, `${n} × ${n}：出画画工作台放掉每格的表 + 面表三角形表 + 画板睡下删掉的两张索引小图（${r.left} + 池长的 ${r.arenaGrewOnLeave} = ${m.cells + m.tables} + ${2 * tiles * 4}）`, JSON.stringify(r));
  await ctx.close();
}
await browser.close();
console.log(`\nprobe-paint-open-memory ${failN ? "FAIL" : "OK"}（${pass} ✓ / ${failN} ✗）`);
