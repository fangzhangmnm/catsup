#!/usr/bin/env node
// probe-ten-objects.mjs —— 一个文件里 10 个物件各画一张（流畅第 14 条，只量）+ 渲染器的解码贴图缓存涨不涨（统筹 11-11：用真的带图的路量）。created 2026-11-11 by Claude Opus 5.5
// M 一个文件里 10 个网格体物件，各自开始画（512）、画一笔：每画完一个记一次——画板几块、活的图（显示图）、准备的条目和显卡字节、CPU 那边的图块池、
//   显卡上的图（张数 + 字节：给 WebGL 的建图 / 删图 / 上传记账，按每张图各级的宽 × 高 × 每像素字节）、帧缓冲、JS 堆。看总数是不是跟着物件个数涨。
// T1 同一份文件里换图：导入图片 → 油漆桶涂同一张面，连换 6 张不同的图（每次 = 一张新贴图 + 一个新材质，和材质面板「导入图片」一样）；每一轮记解码缓存条数和显卡上的图；之后全撤回去再记。
// T2 同一份带图的文件（一张导入的图 + 一张画过的画）开了关、关了开 6 次（图库里打开）：每一轮记解码缓存条数和显卡上的图。
// 只量、不判（不涨 / 涨多少写进流畅页第 14 条）。用法：python3 -m http.server 8765 后 node test/probes/probe-ten-objects.mjs [url]
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
const here = path.dirname(fileURLToPath(import.meta.url));
const { chromium } = createRequire(path.join(here, "../../../20260524 WeebPaint/package.json"))("playwright");
const url = process.argv.slice(2).find((a) => a.startsWith("http")) ?? process.env.PROBE_URL ?? "http://127.0.0.1:8765/";
const only = process.argv.find((a) => a.startsWith("--only="))?.slice(7) ?? null;
const want = (k) => !only || only.includes(k);
const FOLDER = "ten-objects";
const BENIGN = /Not signed in|CloudNetworkError|Failed to fetch|net::ERR|msal|favicon|GPU stall due to ReadPixels|not persisted yet/i;
let pass = 0, failN = 0;
const check = (ok, what, extra = "") => { if (ok) { pass++; console.log("  ✓", what); } else { failN++; process.exitCode = 1; console.error("  ✗", what, extra ? `  ← ${extra}` : ""); } };
const say = (s) => console.log(`    ${s}`);
const FAKE_FSA = (folder) => {
  window.showDirectoryPicker = async () => (await navigator.storage.getDirectory()).getDirectoryHandle(folder, { create: true });
  const P = globalThis.FileSystemHandle?.prototype;
  if (P) { P.queryPermission = async () => "granted"; P.requestPermission = async () => "granted"; }
};
/** 给 WebGL 记账：图（张数 + 各级字节）、帧缓冲。 */
const GLB = () => {
  const P = WebGL2RenderingContext.prototype, tex = new Map(), fb = new Set(), bound = new Map(); let unit = 0;
  const BPP = { 0x8058: 4, 0x8c43: 4, 0x8d7c: 4, 0x8d76: 8, 0x8d70: 16, 0x8814: 16, 0x881a: 8, 0x822e: 4, 0x8230: 8, 0x8229: 1, 0x822b: 2, 0x8236: 4, 0x8234: 2, 0x823a: 4, 0x8232: 1, 0x8238: 2, 0x1908: 4, 0x1907: 3, 0x8051: 3, 0x81a5: 2, 0x81a6: 3, 0x8cac: 4, 0x88f0: 4, 0x1902: 4, 0x1903: 1, 0x8227: 2 };
  const bpp = (f) => BPP[f] ?? 4, cube = (t) => t >= 0x8515 && t <= 0x851a, tgt = (t) => (cube(t) ? 0x8513 : t);
  const cur = (target) => tex.get(bound.get(`${unit}:${tgt(target)}`));
  const w = (name, f) => { const m = P[name]; P[name] = function () { const r = m.apply(this, arguments); f.call(this, arguments, r); return r; }; };
  w("createTexture", (a, o) => { if (o) tex.set(o, new Map()); });
  w("deleteTexture", (a) => { tex.delete(a[0]); });
  w("createFramebuffer", (a, o) => { if (o) fb.add(o); });
  w("deleteFramebuffer", (a) => { fb.delete(a[0]); });
  w("activeTexture", (a) => { unit = a[0] - 0x84c0; });
  w("bindTexture", (a) => { bound.set(`${unit}:${a[0]}`, a[1]); });
  w("texImage2D", (a) => { const m = cur(a[0]); if (!m) return; let ww, hh; if (a.length >= 8) { ww = a[3]; hh = a[4]; } else { const s = a[5]; ww = s?.width ?? s?.videoWidth ?? 0; hh = s?.height ?? s?.videoHeight ?? 0; } m.set(`${a[0]}:${a[1]}`, ww * hh * bpp(a[2])); });
  w("texStorage2D", (a) => { const m = cur(a[0]); if (!m) return; const faces = a[0] === 0x8513 ? 6 : 1; for (let l = 0; l < a[1]; l++) m.set(`${a[0]}:${l}`, Math.max(1, a[3] >> l) * Math.max(1, a[4] >> l) * bpp(a[2]) * faces); });
  w("texStorage3D", (a) => { const m = cur(a[0]); if (!m) return; for (let l = 0; l < a[1]; l++) m.set(`${a[0]}:${l}`, Math.max(1, a[3] >> l) * Math.max(1, a[4] >> l) * a[5] * bpp(a[2])); });
  w("texImage3D", (a) => { const m = cur(a[0]); if (!m) return; m.set(`${a[0]}:${a[1]}`, a[3] * a[4] * a[5] * bpp(a[2])); });
  w("generateMipmap", (a) => { const m = cur(a[0]); if (!m) return; const base = m.get(`${a[0]}:0`) ?? 0; let s = base, l = 1; while (s > 4) { s = Math.floor(s / 4); m.set(`${a[0]}:${l++}`, s); } });
  globalThis.__glMem = () => { let n = 0, b = 0; for (const m of tex.values()) { n++; for (const v of m.values()) b += v; } return { tex: n, texMB: +(b / 1048576).toFixed(1), fb: fb.size }; };
};
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--enable-precise-memory-info", "--js-flags=--expose-gc"] });
const ctx = await browser.newContext({ viewport: { width: 900, height: 700 }, deviceScaleFactor: 1 });
await ctx.addInitScript(FAKE_FSA, FOLDER); await ctx.addInitScript(GLB);
const page = await ctx.newPage();
const errs = [];
page.on("pageerror", (e) => errs.push("pageerror: " + e.message));
page.on("console", (m) => { if (m.type() === "error" && !BENIGN.test(m.text())) errs.push(`console.error: ${m.text()}`); });
const S = (f, a) => page.evaluate(f, a);
const ready = () => page.waitForFunction(() => globalThis.__catsup?.session && globalThis.__catsup.home);
await page.goto(url, { waitUntil: "load" }); await ready(); await page.waitForTimeout(600);
void page.evaluate(() => { void globalThis.__catsup.home.openGallery(); });
await page.waitForFunction(() => !document.getElementById("sheet").hidden, null, { timeout: 8000 });
{ const nav = page.waitForEvent("load"); await page.click(`#sheetChoices button:has-text("选一个文件夹")`); await nav; await ready(); await page.waitForTimeout(900); }
const clearNotes = () => S(() => { for (const n of [...document.querySelectorAll("#noticeStack > *")]) n.remove(); });
const newFile = async () => {
  await S(() => globalThis.__catsup.galleryHost.open());
  await page.waitForFunction(() => !document.getElementById("galleryFull").hidden, null, { timeout: 60000 });
  await page.click("#galleryNew");
  await page.waitForFunction(() => globalThis.__catsup.session.home.kind === "gallery" && document.getElementById("galleryFull").hidden, null, { timeout: 60000 });
  await clearNotes();
};
/** 页面里的小工具。 */
await S(() => {
  const C = () => globalThis.__catsup, H = (globalThis.__TO = {}), P = (x, y, z = 0) => ({ x, y, z }), sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  H.boxSegs = (ox, oy) => { const B = [[0, 0], [1, 0], [1, 1], [0, 1]], s = []; for (let i = 0; i < 4; i++) { const a = B[i], d = B[(i + 1) % 4]; s.push([P(ox + a[0], oy + a[1], 0), P(ox + d[0], oy + d[1], 0)]); s.push([P(ox + a[0], oy + a[1], 1), P(ox + d[0], oy + d[1], 1)]); s.push([P(ox + a[0], oy + a[1], 0), P(ox + a[0], oy + a[1], 1)]); } return s; };
  /** 根上加一个盒子 → 组件 → 网格体；返回新实例和它的定义。 */
  H.meshBox = async (ox, oy, name) => {
    const e = C().editor, Sc = () => e.sceneRef; e.setGrid({ ...e.grid, on: false }); e.exitTo(0); e.setMode("geometry"); e.setTool("select");
    const before = new Set(Sc().def(Sc().root).instances.keys());
    e.commitOp({ op: "addEdges", at: e.activePool(), segs: H.boxSegs(ox, oy) }); e.selectAll(); for (const k of [...e.selectedPools.keys()]) e.selectedPools.delete(k);   /* 全选会把已经做好的组件实例也选上：去掉，只包这一个盒子的散几何 */
    e.runAction("brep.orientOutward", { curvature: 3 }); e.makeComponent(name); e.runAction("object.toMesh"); await sleep(10);
    const inst = [...Sc().def(Sc().root).instances.values()].find((i) => !before.has(i.id));
    return inst ? { inst: inst.id, def: inst.def } : null;
  };
  H.enter = async (inst) => { const e = C().editor; e.exitTo(0); e.selectedPools.clear(); e.selectedPools.set(`i${inst}`, { kind: "instance", instance: inst }); e.enterSelected(); await sleep(10); e.cam.setView("top"); e.zoomExtents(); e.draw(); };
  H.paintHere = async (canvas, cx = null, cy = null) => {
    const c = C(), e = c.editor; c.pickWorkbench("paint"); e.runAction("mesh.startPaint", { canvas, arrange: "patches" }); e.cam.setView("top"); e.zoomExtents(); e.draw(); await sleep(30);
    const S0 = e.sceneRef, g = [...S0.textures.values()].filter((t) => t.content.kind === "layered").map((t) => t.guid).find((t) => c.paint.boards.get(t) && !H.painted?.has(t)) ?? [...S0.textures.values()].filter((t) => t.content.kind === "layered").map((t) => t.guid).pop();
    const V = e.vp(), pts = [];
    if (cx === null) for (let i = 0; i <= 20; i++) pts.push({ x: V.w * (0.3 + 0.4 * i / 20), y: V.h * 0.5 });
    else for (let i = 0; i <= 20; i++) { const q = e.cam.project({ x: cx - 0.3 + 0.6 * i / 20, y: cy, z: 1 }, V); pts.push({ x: q.x, y: q.y }); }   // 这个物件顶面的中线（场景里有好几个物件时画面中间不一定是它）
    const r = c.paint.stroke({ guid: g, points: pts, size: 24, color: [0.8, 0.1, 0.1] });
    (H.painted ??= new Set()).add(g);
    for (let i = 0; i < 3; i++) { e.draw(); await new Promise((q) => requestAnimationFrame(q)); }
    return { guid: g, tips: r?.tips ?? 0, refused: r?.refused ?? null };
  };
  H.stat = async () => {
    for (let i = 0; i < 3; i++) { globalThis.gc?.(); await sleep(60); }
    const c = C(), t = c.paint.tiles(), p = c.paint.prep.stats(), live = c.paint.stats(), r3 = c.editor.renderer3;
    return { boards: c.paint.boards.guids().length, live: live.images, prep: p.entries, prepMB: +(p.gpuBytes / 1048576).toFixed(1), tiles: t.count, tilesRawMB: +(t.rawBytes / 1048576).toFixed(1), tilesZipKB: Math.round(t.compressedBytes / 1024), texCache: r3.texCache.size, ...globalThis.__glMem(), heapMB: +((performance.memory?.usedJSHeapSize ?? 0) / 1048576).toFixed(0) };
  };
  /** 一张 16 × 16 的纯色 PNG（只给探针造图用）。 */
  H.png = async (rgb) => { const oc = new OffscreenCanvas(16, 16), x = oc.getContext("2d"); x.fillStyle = `rgb(${rgb.join(",")})`; x.fillRect(0, 0, 16, 16); return new Uint8Array(await (await oc.convertToBlob({ type: "image/png" })).arrayBuffer()); };
});
const stat = () => S(() => globalThis.__TO.stat());

// ---------- M 一个文件里 10 个物件各画一张 ----------
if (want("M")) {
  console.log("\nM 一个文件里 10 个网格体物件，各自开始画（512）、画一笔：每画完一个记一次");
  await newFile();
  const base = await stat();
  say(`空文件：${JSON.stringify(base)}`);
  const rows = [], objs = [];
  for (let k = 0; k < 10; k++) {
    const o = await S(([k]) => globalThis.__TO.meshBox((k % 5) * 2, Math.floor(k / 5) * 2, `物${k}`), [k]);
    if (!o) { check(false, `第 ${k + 1} 个物件没造出来`); break; }
    objs.push(o);
    await S(([i]) => globalThis.__TO.enter(i), [o.inst]);
    const p = await S(([cx, cy]) => globalThis.__TO.paintHere(512, cx, cy), [(k % 5) * 2 + 0.5, Math.floor(k / 5) * 2 + 0.5]);
    const s = await stat();
    rows.push(s);
    say(`第 ${k + 1} 个（${p.refused ? "没画上：" + p.refused : p.tips + " 颗笔尖"}）：${JSON.stringify(s)}`);
  }
  const shape = await S(() => { const S0 = globalThis.__catsup.editor.sceneRef, insts = [...S0.def(S0.root).instances.values()]; return { rootInstances: insts.length, defs: new Set(insts.map((i) => i.def)).size, layered: [...S0.textures.values()].filter((t) => t.content.kind === "layered").length }; });
  check(shape.rootInstances === 10 && shape.defs === 10 && shape.layered === 10, `造出来的：根上 ${shape.rootInstances} 个实例、${shape.defs} 个定义、${shape.layered} 张画`, JSON.stringify(shape));
  if (rows.length === 10) {
    const d = (k) => +(rows[9][k] - rows[0][k]).toFixed(1), per = (k) => +((rows[9][k] - rows[0][k]) / 9).toFixed(2);
    say(`第 1 个 → 第 10 个：画板 ${rows[0].boards} → ${rows[9].boards}、活的图 ${rows[0].live} → ${rows[9].live}、准备 ${rows[0].prep} 条 ${rows[0].prepMB} MB → ${rows[9].prep} 条 ${rows[9].prepMB} MB、CPU 图块 ${rows[0].tiles} → ${rows[9].tiles}（${rows[0].tilesRawMB} → ${rows[9].tilesRawMB} MB 没压缩）、显卡上的图 ${rows[0].tex} 张 ${rows[0].texMB} MB → ${rows[9].tex} 张 ${rows[9].texMB} MB、帧缓冲 ${rows[0].fb} → ${rows[9].fb}、JS 堆 ${rows[0].heapMB} → ${rows[9].heapMB} MB`);
    say(`每多一个画过的物件平均多：画板 ${per("boards")}、活的图 ${per("live")}、显卡上的图 ${per("tex")} 张 ${per("texMB")} MB、帧缓冲 ${per("fb")}、CPU 图块 ${per("tiles")}、JS 堆 ${per("heapMB")} MB（合计多 ${d("texMB")} MB 显卡）`);
  }
  // 回去再画第 1 个：只醒着正在编辑的那个吗？
  await S(([i]) => globalThis.__TO.enter(i), [objs[0].inst]);
  await S(() => globalThis.__catsup.pickWorkbench("paint"));
  const back = await stat();
  say(`回到第 1 个物件的画画工作台：${JSON.stringify(back)}`);
}

// ---------- T1 同一份文件里换图 ----------
let texFilePath = null;
if (want("T")) {
  console.log("\nT1 同一份文件里，导入图片 → 油漆桶涂同一张面，连换 6 张不同的图：每轮记解码缓存条数和显卡上的图");
  await newFile();
  // 一个画过的网格体（T2 重开时 = 冷画，走合成图那条路）+ 一个硬表面盒子（顶面涂导入的图）
  const mb = await S(() => globalThis.__TO.meshBox(3, 0, "画"));
  await S(([i]) => globalThis.__TO.enter(i), [mb.inst]);
  await S(() => globalThis.__TO.paintHere(256));
  await S(() => { const e = globalThis.__catsup.editor; e.exitTo(0); e.setMode("geometry"); e.commitOp({ op: "addEdges", at: e.activePool(), segs: globalThis.__TO.boxSegs(0, 0) }); e.selectAll?.(); e.runAction("brep.orientOutward", { curvature: 3 }); e.clearSelection?.(); e.deselectAll?.(); e.cam.setView("top"); e.zoomExtents(); e.draw(); });
  const t0 = await stat();
  say(`换图之前：${JSON.stringify(t0)}`);
  const colors = [[220, 40, 40], [40, 200, 60], [40, 80, 220], [230, 200, 40], [160, 40, 200], [40, 200, 200]];
  const tRows = [];
  for (let i = 0; i < 6; i++) {
    const r = await S(async ([rgb, i]) => {
      const C = globalThis.__catsup, e = C.editor, bytes = await globalThis.__TO.png(rgb);
      e.setPaint({ kind: "texture", name: `图${i}`, mimeType: "image/png", bytes, sizeM: [1, 1] });
      e.setMode("surface"); e.setTool("paint");
      const p = e.cam.project({ x: 0.5, y: 0.5, z: 1 }, e.vp()), c = document.getElementById("board"), b = c.getBoundingClientRect();
      for (const type of ["pointerdown", "pointerup"]) c.dispatchEvent(new PointerEvent(type, { pointerId: 21, pointerType: "mouse", button: 0, buttons: type === "pointerdown" ? 1 : 0, clientX: b.left + p.x, clientY: b.top + p.y, bubbles: true, cancelable: true, isPrimary: true }));
      for (let k = 0; k < 20 && C.editor.renderer3.texCache.size === 0; k++) await new Promise((q) => setTimeout(q, 50));
      await new Promise((q) => setTimeout(q, 300)); e.draw();
      return { materials: e.sceneRef.materials.length, textures: e.sceneRef.textures.size };
    }, [colors[i], i]);
    const s = await stat(); tRows.push(s);
    say(`第 ${i + 1} 张图：文档里材质 ${r.materials} 个、贴图 ${r.textures} 行；解码缓存 ${s.texCache} 条、显卡上的图 ${s.tex} 张 ${s.texMB} MB`);
  }
  check(tRows[5].texCache > tRows[0].texCache || tRows[5].texCache >= 1, `换图那条路真的走进了解码缓存（${tRows.map((r) => r.texCache).join(" → ")} 条）`);
  // 全撤回去：图离开文档（面回到原来的样子；材质 / 贴图行跟着撤掉）之后，缓存落不落
  const undone = await S(async () => { const e = globalThis.__catsup.editor; for (let i = 0; i < 12; i++) { e.undo(); } e.draw(); await new Promise((q) => setTimeout(q, 300)); return { materials: e.sceneRef.materials.length, textures: e.sceneRef.textures.size }; });
  const su = await stat();
  say(`撤回 12 步之后：文档里材质 ${undone.materials} 个、贴图 ${undone.textures} 行；解码缓存 ${su.texCache} 条、显卡上的图 ${su.tex} 张 ${su.texMB} MB`);
  // 重做回来，存成 T2 要开的那一份
  await S(async () => { const e = globalThis.__catsup.editor; for (let i = 0; i < 12; i++) e.redo(); e.draw(); });
  check(await S(async () => globalThis.__catsup.session.save()) === true, "存上（T2 要开的那一份：一张画过的画 + 6 张导入的图）");
  texFilePath = await S(() => globalThis.__catsup.session.home.path);

  console.log("\nT2 同一份带图的文件开了关、关了开 6 次（新建一份空的 → 图库里打开它）：每轮记解码缓存条数和显卡上的图");
  const oRows = [];
  for (let i = 0; i < 6; i++) {
    await newFile();
    const opened = await S(async (p) => globalThis.__catsup.session.openFromGallery(p), texFilePath);
    await page.waitForTimeout(800);
    await S(async () => { const e = globalThis.__catsup.editor; e.exitTo(0); e.cam.setView("top"); e.zoomExtents(); e.draw(); for (let k = 0; k < 20; k++) { await new Promise((q) => setTimeout(q, 50)); e.draw(); } });
    const s = await stat(); oRows.push(s);
    say(`第 ${i + 1} 次打开（${opened ? "开了" : "没开成"}）：解码缓存 ${s.texCache} 条、显卡上的图 ${s.tex} 张 ${s.texMB} MB、画板 ${s.boards}、活的图 ${s.live}、JS 堆 ${s.heapMB} MB`);
  }
  await newFile();
  const sEnd = await stat();
  say(`最后再新建一份空的：解码缓存 ${sEnd.texCache} 条、显卡上的图 ${sEnd.tex} 张 ${sEnd.texMB} MB`);
}

console.log(`\n${pass} 过 · ${failN} 红`);
if (errs.length) { console.log("页面错误：", errs.slice(0, 8)); process.exitCode = 1; }
await browser.close();
