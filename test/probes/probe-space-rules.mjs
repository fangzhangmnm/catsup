// probe-space-rules.mjs —— 空间里的一笔，看得见的规矩（贴图主线 1-4b，施工单 ai-docs/20261111-paint-workorders-11.md「不能破的规矩」+ 统筹 11-11 留的两件）。created 2026-11-11 by Claude Opus 5.5
// 场景都是方盒子（世界 0..1）转网格体、开始画、建画板；白模不打光、不画线（读屏幕颜色用）。笔画走调试钩子 __catsup.paint.stroke（屏幕点 → 1-4a 控制器 → 真显卡薄层 → 档口）。
// 「画上了没有」读的是显示图（画板合成之后拷进来的那张）：屏幕点 → 1-3a 的落点（cellAt）→ 那一格的字节。
// ① 过缝不断：从顶面走过棱、下到侧面（两张面在画布上不挨着）；沿屏幕上的路逐像素查，挨着棱的那几个像素也要有墨。
// ② 预览 = 结果：抬笔前最后一帧的显示图 = 落层之后的显示图（逐字节；收笔渐细为 0）。
// ⑩ 分批画（1-4d 第 4 条）：一帧的数据表压小逼出很多批，真显卡上 = 一批画完（逐字节，取最大 / 叠色）。
// ③ 橡皮：先画一道，再用橡皮横着擦过：擦过的格子回到画之前的样子（差 ≤ 2），没擦到的那一段还在。
// ④ 取消：显示图逐字节不变、撤销栈没多一步。
// ⑤ 换手归位：三维的显卡接口画一笔之后，显卡状态回到 WebGL 的初始值（混合、裁剪、深度、剔除、模板、帧缓冲、程序、VAO、贴图单元和绑定、顶点缓冲、上传开关）
//    且 three 的状态缓存作废过；内核合成一次之后，核心状态归位（同上，除了贴图 / 顶点缓冲的绑定：three 的 resetState 不解绑这两样、只作废它自己的缓存）且 three 的缓存作废过；
//    之后 three 再画一帧，屏幕逐字节和之前一样（薄层是另一张图、合成的内容没变）。
// ⑤′ 进门的人自己把状态全设好（统筹 11-11 的换手规矩）：把显卡状态弄脏（各贴图槽绑上别的图和采样器、当前槽不是 0、开着混合 / 裁剪 / 深度 / 剔除 / 模板 / 丢弃光栅、
//    颜色写关一半、绑着别的帧缓冲 / 程序 / VAO / 顶点缓冲 / 上传和读回缓冲、上传和读回开关改过），每一步之前（建表、画、读回）都弄一次，画出来 = 干净时画的（逐字节）。
// ⑥ 选中 / 淡出各截一张图（存盘，只看一眼，不判）。
// ⑦ 斜面上线宽不变：同一支笔，正对着顶面画一条、斜 60 度看着顶面画一条；回到正对着量模型上的线宽（世界里扫、按格数），两条只差一格；也报理论值（直径）。
// ⑧ 镜像：强行对称的网格体上开始画（两半共用画布多边形）；笔尖压在中缝上时真显卡薄层 = 8 位标准答案（≤ 1/255，取最大 / 叠加）；
//    画在右半边、左半边同一处也有；再灌编码色，两半各随机取点查「点到哪格」（1-3c 那一套）。
// ⑨ 铺法换掉结果不变（1-4a 测试 11 的显卡版，一例）：两种密度铺出来的两张画（100 / 260），同一串世界里的笔尖（互不重叠）各用真显卡画；
//    每张都 = 8 位标准答案（≤ 1/255）；随机取顶面上的世界点，两张画上那一格的浓度之差 ≤ 曲线最陡的斜率 1.5 ÷ 过渡带宽 × 两格到这一点的距离之和 + 2/255。
// 跑法：python3 -m http.server 8765 后 node test/probes/probe-space-rules.mjs [地址]（或 PROBE_URL）；截图存到 PROBE_SHOTS（不给 = 系统临时目录下 catsup-probe-space）。
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const { chromium } = createRequire(new URL("../../../20260524 WeebPaint/package.json", import.meta.url))("playwright");
const url = process.argv.slice(2).find((a) => a.startsWith("http")) ?? process.env.PROBE_URL ?? "http://127.0.0.1:8765/";
const shots = process.env.PROBE_SHOTS ?? join(tmpdir(), "catsup-probe-space");
mkdirSync(shots, { recursive: true });
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const errs = [];

// 页面里的小工具（每页注入一次）
const HELPERS = `globalThis.T = (() => {
  const C = globalThis.__catsup, e = C.editor, r3 = e.renderer3, P = (x, y, z = 0) => ({ x, y, z }), sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const box = () => { const B = [[0, 0], [1, 0], [1, 1], [0, 1]], segs = []; for (let i = 0; i < 4; i++) { const a = B[i], d = B[(i + 1) % 4]; segs.push([P(a[0], a[1], 0), P(d[0], d[1], 0)]); segs.push([P(a[0], a[1], 1), P(d[0], d[1], 1)]); segs.push([P(a[0], a[1], 0), P(a[0], a[1], 1)]); } return segs; };
  const T = { C, e, r3, P, sleep };
  T.setup = async ({ density = 100, mirror = false, view = "iso" } = {}) => {
    e.setGrid({ ...e.grid, on: false });
    e.commitOp({ op: "addEdges", at: e.activePool(), segs: box() }); e.selectAll(); e.runAction("brep.orientOutward", { curvature: 3 }); e.makeComponent("块"); e.runAction("object.toMesh"); await sleep(20);
    const S = e.sceneRef, inst = [...S.def(S.root).instances.values()][0], def = inst.def, g = () => crypto.randomUUID();
    if (mirror) { e.setMirror("force", 0, def); await sleep(20); }
    const m = S.mesh(def).kernel;
    e.commitOp({ op: "startPaint", def, faces: m.faces(), uvSet: g(), textureGuid: g(), materialGuid: g(), names: { uvSet: "UV", paint: "画", material: "画" }, color: [0.3, 0.5, 0.7], density });
    e.cancel?.();
    e.cam.setView(view); e.zoomExtents(); e.draw(); await sleep(30);
    const info = C.paint.ensure(); T.guid = info.guid; T.W = info.width; T.H = info.height; T.inst = inst; T.def = def;
    const pm = r3.preset.material; pm.shade = "none"; pm.edges = "none";   // 白模不打光、不画线（就地改这一页里的预设对象）
    e.draw(); await sleep(30); e.draw();
    T.pxPerM = C.paint.lab.targets(info.guid)[0].pxPerM;
    return { W: T.W, H: T.H, pxPerM: T.pxPerM, mirror: mirror ? S.meshMirrors.get(def) ?? null : undefined };
  };
  T.gl = () => document.getElementById("board").getContext("webgl2");
  T.readDisp = () => { const gl = T.gl(), ent = [...r3.live.entries.values()][0], fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fb); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, ent.disp, 0);
    const px = new Uint8Array(T.W * T.H * 4); gl.readPixels(0, 0, T.W, T.H, gl.RGBA, gl.UNSIGNED_BYTE, px); gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.deleteFramebuffer(fb); r3.resetPaintState(); return px; };
  T.readScreen = () => { const gl = T.gl(), c = document.getElementById("board"), px = new Uint8Array(c.width * c.height * 4); gl.readPixels(0, 0, c.width, c.height, gl.RGBA, gl.UNSIGNED_BYTE, px); return px; };
  T.scr = (p) => e.cam.project(p, e.vp());
  /** 世界里的折线 → 屏幕上每 step 像素一个点。 */
  T.path = (pts, step = 2) => { const out = []; for (let i = 0; i + 1 < pts.length; i++) { const a = T.scr(pts[i]), b = T.scr(pts[i + 1]), n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / step)); for (let k = i ? 1 : 0; k <= n; k++) out.push({ x: a.x + ((b.x - a.x) * k) / n, y: a.y + ((b.y - a.y) * k) / n }); } return out; };
  T.stroke = (pts, o = {}) => { const r = C.paint.stroke({ points: pts, size: 12, hardness: 1, color: [0, 0, 0], accum: "over", ...o }); e.draw(); return r; };
  /** 屏幕一点（CSS 像素）落在哪一格、那一格在显示图里的字节。 */
  T.at = (disp, sx, sy) => { const h = C.paint.cellAt(T.guid, sx, sy); if (!h || !h.cell) return null; const o = (h.cell[1] * T.W + h.cell[0]) * 4; return { cell: h.cell, face: h.face, uv: h.uv, px: [disp[o], disp[o + 1], disp[o + 2], disp[o + 3]] }; };
  T.dark = (px) => Math.max(px[0], px[1], px[2]) < 60;
  T.undoCursor = () => C.paint.boards.get(T.guid).wp.undoStack._cursor;
  return T;
})();`;

async function newPage() {
  const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
  page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
  await page.goto(url, { waitUntil: "load" }); await page.waitForTimeout(800);
  await page.evaluate(HELPERS);
  return page;
}
const out = {};

// ── 第一页：①–⑥（等距视角，密度 100）
{
  const page = await newPage();
  Object.assign(out, await page.evaluate(async () => {
    const { e, C, P, sleep } = T, o = {};
    o.board = await T.setup({ density: 100, view: "iso" });
    // ① 过缝不断：顶面 → 棱（x = 1）→ 侧面
    const pre = T.readDisp();
    const wl = [P(0.35, 0.5, 1), P(1, 0.5, 1), P(1, 0.5, 0.35)], pts = T.path(wl, 2), edgeS = T.scr(P(1, 0.5, 1));
    const r1 = T.stroke(pts);
    let disp = T.readDisp(), total = 0, bad = 0, nearSeam = 0, faces = new Set(), bads = [];
    const dense = T.path(wl, 1);
    for (let i = 8; i < dense.length - 8; i++) {
      const q = dense[i], h = T.at(disp, q.x, q.y);
      if (!h) continue;
      total++; faces.add(h.face);
      if (Math.hypot(q.x - edgeS.x, q.y - edgeS.y) < 4) nearSeam++;
      if (!T.dark(h.px)) { bad++; if (bads.length < 5) bads.push({ q: [+q.x.toFixed(1), +q.y.toFixed(1)], cell: h.cell, face: h.face, px: h.px }); }
    }
    o.seam = { tips: r1.tips, range: r1.range, samples: total, nearSeam, faces: faces.size, bad, bads };
    // ② 预览 = 结果
    let before = null;
    T.stroke(T.path([P(0.15, 0.15, 1), P(0.15, 0.6, 1)]), { beforeUp: () => { e.draw(); before = T.readDisp(); } });
    const after = T.readDisp(); let diff = 0; for (let i = 0; i < after.length; i++) if (after[i] !== before[i]) diff++;
    o.preview = { diffBytes: diff };
    // ③ 橡皮：顶面上 y = 0.8 画一道，x = 0.5 横着擦过
    const d0 = T.readDisp();
    T.stroke(T.path([P(0.2, 0.8, 1), P(0.8, 0.8, 1)]));
    const d1 = T.readDisp();
    T.stroke(T.path([P(0.5, 0.65, 1), P(0.5, 0.95, 1)]), { erase: true });
    const d2 = T.readDisp();
    let erased = 0, notBack = 0, kept = 0, lost = 0;
    for (const x of [0.49, 0.5, 0.51]) { const q = T.scr(P(x, 0.8, 1)), a = T.at(d2, q.x, q.y), b = T.at(d0, q.x, q.y), c = T.at(d1, q.x, q.y); if (!a || !b || !c) continue; if (T.dark(c.px)) erased++; if (a.px.some((v, k) => Math.abs(v - b.px[k]) > 2)) notBack++; }
    for (const x of [0.25, 0.3, 0.7, 0.75]) { const q = T.scr(P(x, 0.8, 1)), a = T.at(d2, q.x, q.y); if (!a) continue; if (T.dark(a.px)) kept++; else lost++; }
    o.eraser = { checked: erased, notBack, kept, lost };
    // ④ 取消
    const c0 = T.readDisp(), u0 = T.undoCursor();
    T.stroke(T.path([P(0.2, 0.3, 1), P(0.8, 0.35, 1)]), { cancel: true });
    const c1 = T.readDisp(); let cd = 0; for (let i = 0; i < c1.length; i++) if (c1[i] !== c0[i]) cd++;
    o.cancel = { diffBytes: cd, undoBefore: u0, undoAfter: T.undoCursor() };
    // ⑤ 换手归位
    const gl = T.gl(), snap = () => ({
      blend: gl.isEnabled(gl.BLEND), scissor: gl.isEnabled(gl.SCISSOR_TEST), depth: gl.isEnabled(gl.DEPTH_TEST), cull: gl.isEnabled(gl.CULL_FACE), stencil: gl.isEnabled(gl.STENCIL_TEST),
      fb: gl.getParameter(gl.FRAMEBUFFER_BINDING), prog: gl.getParameter(gl.CURRENT_PROGRAM), vao: gl.getParameter(gl.VERTEX_ARRAY_BINDING), unit: gl.getParameter(gl.ACTIVE_TEXTURE) - gl.TEXTURE0,
      tex0: gl.getParameter(gl.TEXTURE_BINDING_2D), abuf: gl.getParameter(gl.ARRAY_BUFFER_BINDING), flipY: gl.getParameter(gl.UNPACK_FLIP_Y_WEBGL), align: gl.getParameter(gl.UNPACK_ALIGNMENT),
      pbo: gl.getParameter(gl.PIXEL_UNPACK_BUFFER_BINDING), mask: gl.getParameter(gl.COLOR_WRITEMASK).every(Boolean) });
    // 核心状态 = three 的 resetState 管的那一套 + 上传开关；贴图 / 顶点缓冲的绑定 three 的 resetState 不解绑（只作废它自己的缓存，下次自己重绑），所以内核那条另外要求「three 的缓存作废过」
    const isCore = (s) => !s.blend && !s.scissor && !s.depth && !s.cull && !s.stencil && s.fb === null && s.prog === null && s.vao === null && s.unit === 0 && s.flipY === false && s.align === 4 && s.pbo === null && s.mask;
    const isDefault = (s) => isCore(s) && s.tex0 === null && s.abuf === null;
    const R = T.r3.renderer, rs = R.resetState.bind(R); let resets = 0; R.resetState = () => { resets++; rs(); };
    const show = (s) => Object.fromEntries(Object.entries(s).map(([k, v]) => [k, v === null ? null : typeof v === "object" ? "对象" : v]));
    e.draw(); await sleep(20); e.draw();
    const sA = T.readScreen(), dA = T.readDisp();
    const L = C.paint.lab, geo = L.buildTargetGeo(L.targets(T.guid)[0]), og = L.gpu(), lay = new L.SpaceLayer(og, geo, 0, { hardness: 0.5, color: [1, 0, 0], accum: "over", origin: P(0.5, 0.5, 1) });
    const tip = { x: 0.5, y: 0.5, z: 1, r: 0.05, alpha: 1 };
    let best = -1, bd = Infinity; for (let k = 0; k < geo.grid.face.length; k++) { const d = L.sphereTriDist(0.5, 0.5, 1, geo.wpos, 9 * k); if (d < bd) { bd = d; best = k; } }
    lay.update([{ tip, reach: L.tipReach([geo], tip, [{ ti: 0, tri: best }]) }], 1);
    const s1 = snap(), resets1 = resets; lay.dispose();
    e.draw(); const sB = T.readScreen();
    const board = C.paint.boards.get(T.guid); board.last = null;   // 逼内核再合成一次（内容没变）
    C.paint.boards.setEditing([T.guid]);   // 施工单十九第 3 刀起：不在编辑的画板睡着、准备里不合成——先说它在编辑，才逼得出内核合成（下一帧画画工作台的 tick 又说空，它再睡回去）
    C.paint.boards.prepare(e.sceneRef);
    const s2 = snap(), resets2 = resets - resets1;
    e.draw(); const sC = T.readScreen(), dC = T.readDisp();
    const ne = (a, b) => { let n = 0; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) n++; return n; };
    // ⑤′ 弄脏之后再画（统筹 11-11 补 A）：干净状态下画一遍读回；把显卡状态弄脏（每一步之前都弄一次：建表、画、读回）再画一遍读回；逐字节相同
    {
      const junkTex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, junkTex); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 2, 2, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(16).fill(200));
      const junkSampler = gl.createSampler(); gl.samplerParameteri(junkSampler, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.samplerParameteri(junkSampler, gl.TEXTURE_MAG_FILTER, gl.LINEAR); gl.samplerParameteri(junkSampler, gl.TEXTURE_WRAP_S, gl.REPEAT);
      const junkFb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, junkFb); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, junkTex, 0); gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      const junkBuf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, junkBuf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(64), gl.STATIC_DRAW);
      const junkPbo = gl.createBuffer(); gl.bindBuffer(gl.PIXEL_UNPACK_BUFFER, junkPbo); gl.bufferData(gl.PIXEL_UNPACK_BUFFER, 4096, gl.STATIC_DRAW); gl.bindBuffer(gl.PIXEL_UNPACK_BUFFER, null);
      const junkPack = gl.createBuffer(); gl.bindBuffer(gl.PIXEL_PACK_BUFFER, junkPack); gl.bufferData(gl.PIXEL_PACK_BUFFER, 4096, gl.STREAM_READ); gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
      const junkVao = gl.createVertexArray(); gl.bindVertexArray(junkVao); gl.bindBuffer(gl.ARRAY_BUFFER, junkBuf); for (let k = 0; k < 4; k++) { gl.enableVertexAttribArray(k); gl.vertexAttribPointer(k, 4, gl.FLOAT, false, 0, 0); } gl.bindVertexArray(null);
      const sh = (t, src) => { const x = gl.createShader(t); gl.shaderSource(x, src); gl.compileShader(x); return x; };
      const junkProg = gl.createProgram(); gl.attachShader(junkProg, sh(gl.VERTEX_SHADER, "#version 300 es\nvoid main(){gl_Position=vec4(0);}")); gl.attachShader(junkProg, sh(gl.FRAGMENT_SHADER, "#version 300 es\nprecision mediump float;out vec4 o;void main(){o=vec4(1);}")); gl.linkProgram(junkProg);
      const dirty = () => {
        for (let u = 0; u < 8; u++) { gl.activeTexture(gl.TEXTURE0 + u); gl.bindTexture(gl.TEXTURE_2D, junkTex); gl.bindSampler(u, junkSampler); }
        gl.activeTexture(gl.TEXTURE5);
        gl.enable(gl.BLEND); gl.blendEquation(gl.FUNC_REVERSE_SUBTRACT); gl.blendFunc(gl.ZERO, gl.ONE_MINUS_DST_COLOR);
        gl.enable(gl.SCISSOR_TEST); gl.scissor(0, 0, 3, 3);
        gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.NEVER); gl.depthMask(false);
        gl.enable(gl.CULL_FACE); gl.cullFace(gl.FRONT_AND_BACK);
        gl.enable(gl.STENCIL_TEST); gl.stencilFunc(gl.NEVER, 0, 0xff);
        gl.enable(gl.RASTERIZER_DISCARD); gl.enable(gl.POLYGON_OFFSET_FILL); gl.polygonOffset(5, 5); gl.enable(gl.SAMPLE_COVERAGE); gl.sampleCoverage(0.25, true);
        gl.colorMask(false, true, false, true); gl.viewport(0, 0, 5, 5);
        gl.bindFramebuffer(gl.FRAMEBUFFER, junkFb); gl.useProgram(junkProg); gl.bindVertexArray(junkVao); gl.bindBuffer(gl.ARRAY_BUFFER, junkBuf);
        gl.bindBuffer(gl.PIXEL_UNPACK_BUFFER, junkPbo); gl.bindBuffer(gl.PIXEL_PACK_BUFFER, junkPack);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true); gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1); gl.pixelStorei(gl.UNPACK_ROW_LENGTH, 3); gl.pixelStorei(gl.UNPACK_SKIP_ROWS, 1); gl.pixelStorei(gl.UNPACK_SKIP_PIXELS, 1);
        gl.pixelStorei(gl.PACK_ALIGNMENT, 1); gl.pixelStorei(gl.PACK_ROW_LENGTH, 2); gl.pixelStorei(gl.PACK_SKIP_ROWS, 1); gl.pixelStorei(gl.PACK_SKIP_PIXELS, 1);
      };
      const mk = (x, y, z, r) => { const tip = { x, y, z, r, alpha: 0.7 }; let best = -1, bd = Infinity; for (let k = 0; k < geo.grid.face.length; k++) { const d = L.sphereTriDist(x, y, z, geo.wpos, 9 * k); if (d < bd) { bd = d; best = k; } } return { tip, reach: L.tipReach([geo], tip, [{ ti: 0, tri: best }]) }; };
      const dt = [mk(0.4, 0.4, 1, 0.06), mk(0.7, 0.5, 1, 0.05), mk(1, 0.5, 0.9, 0.05), mk(1, 0.3, 0.7, 0.07), mk(0.5, 0, 0.6, 0.05)];
      const run = (soil) => { const go = soil ? dirty : () => {}; go(); const Ly = new L.SpaceLayer(og, geo, 0, { hardness: 0.4, color: [0.9, 0.3, 0.1], accum: "over", origin: dt[0].tip }); go(); Ly.update(dt.slice(0, 3), 2); go(); Ly.update(dt.slice(2), 3); go(); const px = og.read(Ly.frame); go(); Ly.dispose(); return px; };
      T.r3.resetPaintState();
      const clean = run(false), soiled = run(true);
      let inked = 0; for (let i = 3; i < clean.length; i += 4) if (clean[i]) inked++;
      o.dirty = { inked, diffBytes: ne(clean, soiled) };
      for (let u = 0; u < 8; u++) gl.bindSampler(u, null);
      for (const cap of [gl.BLEND, gl.SCISSOR_TEST, gl.DEPTH_TEST, gl.CULL_FACE, gl.STENCIL_TEST, gl.RASTERIZER_DISCARD, gl.POLYGON_OFFSET_FILL, gl.SAMPLE_COVERAGE]) gl.disable(cap);
      gl.depthMask(true); gl.depthFunc(gl.LESS); gl.stencilFunc(gl.ALWAYS, 0, 0xff); gl.cullFace(gl.BACK); gl.colorMask(true, true, true, true); gl.polygonOffset(0, 0); gl.sampleCoverage(1, false);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.useProgram(null); gl.bindVertexArray(null); gl.bindBuffer(gl.ARRAY_BUFFER, null); gl.bindBuffer(gl.PIXEL_UNPACK_BUFFER, null); gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false); gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4); gl.pixelStorei(gl.UNPACK_ROW_LENGTH, 0); gl.pixelStorei(gl.UNPACK_SKIP_ROWS, 0); gl.pixelStorei(gl.UNPACK_SKIP_PIXELS, 0);
      gl.pixelStorei(gl.PACK_ALIGNMENT, 4); gl.pixelStorei(gl.PACK_ROW_LENGTH, 0); gl.pixelStorei(gl.PACK_SKIP_ROWS, 0); gl.pixelStorei(gl.PACK_SKIP_PIXELS, 0);
      gl.activeTexture(gl.TEXTURE0); for (let u = 0; u < 8; u++) { gl.activeTexture(gl.TEXTURE0 + u); gl.bindTexture(gl.TEXTURE_2D, null); } gl.activeTexture(gl.TEXTURE0);
      gl.deleteTexture(junkTex); gl.deleteSampler(junkSampler); gl.deleteFramebuffer(junkFb); gl.deleteBuffer(junkBuf); gl.deleteBuffer(junkPbo); gl.deleteBuffer(junkPack); gl.deleteVertexArray(junkVao); gl.deleteProgram(junkProg);
      T.r3.resetPaintState(); e.draw();
    }
    R.resetState = rs;
    o.handoff = { afterSpaceGpu: isDefault(s1) && resets1 > 0, afterKernel: isCore(s2) && resets2 > 0, kernelLeftBound: { tex0: s2.tex0 !== null, arrayBuffer: s2.abuf !== null }, resetsBySpaceGpu: resets1, resetsByKernel: resets2, screenAfterSpaceGpu: ne(sA, sB), screenAfterKernel: ne(sA, sC), dispAfterKernel: ne(dA, dC) };
    return o;
  }));
  // ⑥ 选中 / 淡出 截图
  await page.evaluate(async () => { const { e, C, sleep } = T; e.selectedPools.clear(); e.selectedPools.set("i" + T.inst.id, { kind: "instance", instance: T.inst.id }); e.draw(); await sleep(30); e.draw(); });
  await page.screenshot({ path: join(shots, "space-selected.png") });
  out.shots = [join(shots, "space-selected.png")];
  await page.evaluate(async () => { const { e, P, sleep } = T;
    e.selectedPools.clear(); e.draw();
    const B = [[1.5, 0], [2.2, 0], [2.2, 0.7], [1.5, 0.7]], segs = []; for (let i = 0; i < 4; i++) { const a = B[i], d = B[(i + 1) % 4]; segs.push([P(a[0], a[1], 0), P(d[0], d[1], 0)]); segs.push([P(a[0], a[1], 0.7), P(d[0], d[1], 0.7)]); segs.push([P(a[0], a[1], 0), P(a[0], a[1], 0.7)]); }
    e.commitOp({ op: "addEdges", at: e.activePool(), segs }); e.selectAll(); e.selectedPools.delete("i" + T.inst.id); e.runAction("brep.orientOutward", { curvature: 3 }); e.makeComponent("别的");
    const S = e.sceneRef, other = [...S.def(S.root).instances.values()].find((i) => i.id !== T.inst.id);
    e.enterPool({ kind: "instance", instance: other.id }); e.zoomExtents(); e.draw(); await sleep(30); e.draw(); });
  await page.screenshot({ path: join(shots, "space-dimmed.png") });
  out.shots.push(join(shots, "space-dimmed.png"));
  await page.close();
}

// ── 第二页：⑦ 斜面上线宽（正交，密度 160）
{
  const page = await newPage();
  out.slope = await page.evaluate(async () => {
    const { e, P, sleep } = T, o = {};
    o.board = await T.setup({ density: 160, view: "top" });
    const halfH = e.cam.halfH, vpH = e.vp().h, size = 12;
    T.stroke(T.path([P(0.15, 0.3, 1), P(0.85, 0.3, 1)]), { size });
    e.cam.pitch = Math.PI / 6; e.draw(); await sleep(20);   // 斜 60 度：视线和顶面法线夹 60 度
    o.tiltedScreenLen = +Math.hypot(T.scr(P(0.5, 0.7, 1)).y - T.scr(P(0.5, 0.71, 1)).y, 0).toFixed(3);
    T.stroke(T.path([P(0.15, 0.7, 1), P(0.85, 0.7, 1)]), { size });
    e.cam.setView("top"); e.draw(); await sleep(20); e.draw();
    const disp = T.readDisp(), width = (y0) => { let lo = Infinity, hi = -Infinity; for (let y = y0 - 0.12; y <= y0 + 0.12; y += 0.0005) { const q = T.scr(P(0.5, y, 1)), h = T.at(disp, q.x, q.y); if (h && T.dark(h.px)) { lo = Math.min(lo, y); hi = Math.max(hi, y); } } return hi - lo; };
    const wA = width(0.3), wB = width(0.7), cell = 1 / T.pxPerM;
    o.expectM = +(size * 2 * halfH / vpH).toFixed(4); o.cellM = +cell.toFixed(5);
    o.facingCells = +(wA / cell).toFixed(2); o.tiltedCells = +(wB / cell).toFixed(2); o.diffCells = +(Math.abs(wA - wB) / cell).toFixed(2);
    return o;
  });
  await page.close();
}

// ── 第三页：⑧ 镜像（强行对称，俯视，密度 120）
{
  const page = await newPage();
  out.mirror = await page.evaluate(async () => {
    const { e, C, P, sleep } = T, o = {};
    o.board = await T.setup({ density: 120, mirror: true, view: "top" });
    const geo = C.paint.lab.buildTargetGeo(C.paint.lab.targets(T.guid)[0]);
    o.sharedPolys = geo.table.polyFaces.filter((fs) => fs.length >= 2).length;
    // 笔尖压在中缝上（世界 x = 0.5，两半的面挂在同一块画布多边形下）：真显卡薄层 vs 8 位标准答案（取最大 / 叠加各一遍）
    { const L = C.paint.lab, gl = L.gpu(), seamTips = [0.2, 0.32, 0.44, 0.56, 0.68, 0.8].map((y, i) => { const tip = { x: 0.5 + (i % 2 ? 0.01 : -0.008), y, z: 1, r: 0.05 + 0.01 * (i % 3), alpha: 0.7 };
        let best = -1, bd = Infinity; for (let k = 0; k < geo.grid.face.length; k++) { const d = L.sphereTriDist(tip.x, tip.y, tip.z, geo.wpos, 9 * k); if (d < bd) { bd = d; best = k; } }
        return { tip, reach: L.tipReach([geo], tip, [{ ti: 0, tri: best }]) }; });
      o.seamTruth = {};
      for (const accum of ["max", "over"]) {
        const lay = new L.SpaceLayer(gl, geo, 0, { hardness: 0.4, color: [0.2, 0.6, 0.9], accum, origin: seamTips[0].tip });
        lay.update(seamTips, seamTips.length);
        const px = gl.read(lay.frame), truth = L.strokeTruth8([geo], seamTips, 0.4, accum, [0.2, 0.6, 0.9]).get(0) ?? new Map();
        let maxd = 0; for (let c = 0; c < T.W * T.H; c++) { const w8 = truth.get(c); for (let k = 0; k < 4; k++) maxd = Math.max(maxd, Math.abs(px[c * 4 + k] - (w8 ? w8[k] : 0))); }
        const twoFaces = seamTips.filter((t) => [...(t.reach.get(0)?.values() ?? [])].some((tris) => new Set(tris.map((k) => geo.grid.face[k])).size >= 2)).length;
        o.seamTruth[accum] = { maxd, inked: truth.size, tipsWithBothHalves: twoFaces };
        lay.dispose();
      } }
    // 局部 x = 0 是镜像面（组件的原点在盒子中心，世界 x = 0.5）：画在右半边（世界 x > 0.5）
    const wl = [P(0.62, 0.25, 1), P(0.78, 0.45, 1), P(0.66, 0.6, 1), P(0.85, 0.78, 1)];
    T.stroke(T.path(wl, 2));
    const disp = T.readDisp(), dense = T.path(wl, 1), mirrorPts = T.path(wl.map((p) => P(1 - p.x, p.y, p.z)), 1);
    let right = 0, rightDark = 0, left = 0, leftDark = 0;
    for (let i = 8; i < dense.length - 8; i++) { const a = T.at(disp, dense[i].x, dense[i].y); if (a) { right++; if (T.dark(a.px)) rightDark++; } }
    for (let i = 8; i < mirrorPts.length - 8; i++) { const a = T.at(disp, mirrorPts[i].x, mirrorPts[i].y); if (a) { left++; if (T.dark(a.px)) leftDark++; } }
    o.ink = { right, rightDark, left, leftDark };
    // 点到哪格：灌编码色，顶面上两半各随机取点（跳过离格子边界太近 / 缩小 / 挨着面的边的，和 1-3c 一样）
    const W = T.W, H = T.H, code = new Uint8Array(W * H * 4);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const k = (y * W + x) * 4; code[k] = x & 255; code[k + 1] = y & 255; code[k + 2] = ((x >> 8) & 15) | (((y >> 8) & 15) << 4); code[k + 3] = 255; }
    C.paint.fill(T.guid, code); e.draw(); await sleep(30); e.draw();
    const c = document.getElementById("board"), dpr = c.width / c.clientWidth, px = T.readScreen(), w = c.width, h = c.height;
    const rnd = (() => { let s = 4242; return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296; })();
    const halves = { left: { ok: 0, bad: 0 }, right: { ok: 0, bad: 0 } }, bads = [];
    for (let i = 0; i < 4000 && (halves.left.ok + halves.left.bad < 150 || halves.right.ok + halves.right.bad < 150); i++) {
      const wx = 0.05 + 0.9 * rnd(), wy = 0.05 + 0.9 * rnd(), s = T.scr(P(wx, wy, 1)), X = Math.floor(s.x * dpr), Y = Math.floor(s.y * dpr);
      const hit = C.paint.cellAt(T.guid, (X + 0.5) / dpr, (Y + 0.5) / dpr);
      if (!hit || !hit.cell) continue;
      const fx = hit.uv[0] - Math.floor(hit.uv[0]), fy = hit.uv[1] - Math.floor(hit.uv[1]);
      if (Math.min(fx, 1 - fx, fy, 1 - fy) < 0.05) continue;
      if ([[2, 0], [-2, 0], [0, 2], [0, -2]].some(([dx, dy]) => C.paint.cellAt(T.guid, (X + 0.5 + dx) / dpr, (Y + 0.5 + dy) / dpr)?.face !== hit.face)) continue;
      const k = ((h - 1 - Y) * w + X) * 4, cx = px[k] | ((px[k + 2] & 15) << 8), cy = px[k + 1] | ((px[k + 2] >> 4) << 8);
      const half = wx < 0.5 ? halves.left : halves.right;
      if (cx === hit.cell[0] && cy === hit.cell[1]) half.ok++; else { half.bad++; if (bads.length < 4) bads.push({ wx: +wx.toFixed(3), screen: [cx, cy], landing: hit.cell }); }
    }
    o.landing = { ...halves, bads };
    return o;
  });
  await page.close();
}

// ── 第四、五页：⑨ 换铺法（密度 100 / 260，同一串世界里的笔尖、同一批世界点）
const TIPS = [0.2, 0.38, 0.56, 0.74].map((x, i) => ({ x, y: 0.3 + 0.12 * i, z: 1, r: 0.06, alpha: 0.8 }));
const PTS = (() => { let s = 777; const rnd = () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296, o = []; for (let i = 0; i < 600; i++) { const t = TIPS[i % TIPS.length], a = rnd() * 2 * Math.PI, d = 0.075 * Math.sqrt(rnd()); o.push({ x: t.x + d * Math.cos(a), y: t.y + d * Math.sin(a) }); } return o; })();
const layouts = [];
for (const density of [100, 260]) {
  const page = await newPage();
  layouts.push(await page.evaluate(async ({ density, TIPS, PTS }) => {
    const { e, C, P } = T, o = {};
    o.board = await T.setup({ density, view: "top" });
    const L = C.paint.lab, geo = L.buildTargetGeo(L.targets(T.guid)[0]), gl = L.gpu(), hardness = 0.3;
    const tips = TIPS.map((tip) => { let best = -1, bd = Infinity; for (let k = 0; k < geo.grid.face.length; k++) { const d = L.sphereTriDist(tip.x, tip.y, tip.z, geo.wpos, 9 * k); if (d < bd) { bd = d; best = k; } } return { tip, reach: L.tipReach([geo], tip, [{ ti: 0, tri: best }]) }; });
    const lay = new L.SpaceLayer(gl, geo, 0, { hardness, color: [1, 1, 1], accum: "max", origin: tips[0].tip });
    lay.update(tips, tips.length);
    const px = gl.read(lay.frame), truth = L.strokeTruth8([geo], tips, hardness, "max", [1, 1, 1]).get(0) ?? new Map();
    let maxd = 0; for (let c = 0; c < T.W * T.H; c++) { const w8 = truth.get(c); for (let k = 0; k < 4; k++) maxd = Math.max(maxd, Math.abs(px[c * 4 + k] - (w8 ? w8[k] : 0))); }
    o.maxdTruth = maxd; o.inked = truth.size;
    o.alpha = PTS.map((p) => { const s = T.scr(P(p.x, p.y, 1)), h = C.paint.cellAt(T.guid, s.x, s.y); if (!h || !h.cell) return null; return px[(h.cell[1] * T.W + h.cell[0]) * 4 + 3] / 255; });
    o.cellM = 1 / T.pxPerM;
    lay.dispose();
    // ⑩ 分批画（1-4d 第 4 条）：同一串笔尖两帧（第一帧全当尾巴画、第二帧全定型），数据表上限压到 8 个数（差不多一颗 item 一批）vs 一批画完，真显卡上逐字节一样（取最大、叠色各一次）
    o.batches = [];
    for (const accum of ["max", "over"]) {
      const runB = (maxValues) => { const l2 = new L.SpaceLayer(gl, geo, 0, { hardness, color: [0.9, 0.3, 0.1], accum, origin: tips[0].tip, ...(maxValues ? { maxValues } : {}) }); l2.update(tips, 0); l2.update(tips, tips.length); const p = gl.read(l2.frame), b = l2.peak.batches; l2.dispose(); return { p, b }; };
      const one = runB(), many = runB(8);
      let diff = 0, ink = 0; for (let i = 0; i < one.p.length; i++) { if (one.p[i] !== many.p[i]) diff++; if (i % 4 === 3 && one.p[i]) ink++; }
      o.batches.push({ accum, one: one.b, many: many.b, diff, ink });
    }
    return o;
  }, { density, TIPS, PTS }));
  await page.close();
}
await browser.close();
{
  const [A, B] = layouts, r = TIPS[0].r, slope = 1.5 / (r * (1 - 0.3)), bound = slope * 0.8 * (A.cellM + B.cellM) * Math.SQRT1_2 + 2 / 255;
  let n = 0, worst = 0, over = 0;
  for (let i = 0; i < PTS.length; i++) { const a = A.alpha[i], b = B.alpha[i]; if (a === null || b === null) continue; n++; const d = Math.abs(a - b); worst = Math.max(worst, d); if (d > bound) over++; }
  out.layouts = { boards: layouts.map((l) => l.board), maxdTruth: layouts.map((l) => l.maxdTruth), inked: layouts.map((l) => l.inked), points: n, worst: +worst.toFixed(4), bound: +bound.toFixed(4), over };
  out.batches = layouts.flatMap((l) => l.batches);
}

console.log(JSON.stringify(out, null, 1));
const s = out;
const checks = {
  "① 过缝不断": s.seam.bad === 0 && s.seam.samples > 50 && s.seam.nearSeam > 0 && s.seam.faces >= 2,
  "② 预览 = 结果": s.preview.diffBytes === 0,
  "③ 橡皮": s.eraser.checked > 0 && s.eraser.notBack === 0 && s.eraser.kept > 0 && s.eraser.lost === 0,
  "④ 取消": s.cancel.diffBytes === 0 && s.cancel.undoBefore === s.cancel.undoAfter,
  "⑤ 换手归位": s.handoff.afterSpaceGpu && s.handoff.afterKernel && s.handoff.screenAfterSpaceGpu === 0 && s.handoff.screenAfterKernel === 0 && s.handoff.dispAfterKernel === 0,
  "⑤′ 弄脏之后再画 = 干净时画的": s.dirty.diffBytes === 0 && s.dirty.inked > 100,
  "⑦ 斜面线宽": s.slope.diffCells <= 1,
  "⑧ 镜像": s.mirror.sharedPolys > 0 && Object.values(s.mirror.seamTruth).every((q) => q.maxd <= 1 && q.inked > 50 && q.tipsWithBothHalves > 0) && s.mirror.ink.rightDark === s.mirror.ink.right && s.mirror.ink.leftDark === s.mirror.ink.left && s.mirror.ink.left > 50 && s.mirror.landing.left.bad === 0 && s.mirror.landing.right.bad === 0 && s.mirror.landing.left.ok > 100 && s.mirror.landing.right.ok > 100,
  "⑨ 换铺法": s.layouts.maxdTruth.every((d) => d <= 1) && s.layouts.over === 0 && s.layouts.points > 400,
  "⑩ 分批画 = 一批画完（真显卡，逐字节）": s.batches.length === 4 && s.batches.every((b) => b.one === 1 && b.many >= 4 && b.diff === 0 && b.ink > 50),
};
for (const [k, v] of Object.entries(checks)) console.log(`${v ? "✓" : "✗"} ${k}`);
console.log(`截图（⑥，只看一眼）：${out.shots.join("  ")}`);
if (errs.length) console.log("页面错误：", errs);
const ok = Object.values(checks).every(Boolean) && errs.length === 0;
console.log(ok ? "probe-space-rules OK" : "probe-space-rules FAIL");
process.exit(ok ? 0 : 1);
