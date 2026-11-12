#!/usr/bin/env node
// probe-paint-save.mjs —— 画存进文件、读回来（贴图主线 1-8b，施工单 ai-docs/20261111-paint-workorders-13.md）。created 2026-11-11 by Claude Opus 5.5
// 真的编辑器 + 真的会话 + 真的文件夹家（假选夹 = OPFS 子目录，照 probe-folder-home）+ 无头 swiftshader。
// ① 画了存、刷新：读回来的画是冷的（画板 0），屏幕上照存下的合成图；② 冷热之间显示不变（同一块屏幕像素：冷的 = 合成图、热起来 = 内核现合成）；
// ③ 落笔撞上冷的画：这一笔不开始、提示行「这张画还在打开」、同时解开，之后能画；④ 编码正在跑时画一笔、挪一个点：存完仍然算改过，再存才干净；
// ⑤ 编码中途抛：存盘没成、明说、夹里的文件一个字节不动、仍然算改过；⑥ 十张画的文件：全部显示出来之后画板数 0；⑦ 编码正在跑时落笔要等多久（量）；
// ⑧ 读进来时丢过东西：自动保存不写、人按保存先问（先不存 / 存）；⑨ 冷的画解图那几帧的占位 = 底色。
// ③½ 画布上的二维笔（施工单二十一第 1 刀，调试钩子 paint.stroke2d）：画一笔 → 存 → 刷新 → 冷的显示里有它 → 热起来分层逐字节 = 存之前。
// 用法：python3 -m http.server 8765 后 node test/probes/probe-paint-save.mjs [url]
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
const here = path.dirname(fileURLToPath(import.meta.url));
const { chromium } = createRequire(path.join(here, "../../../20260524 WeebPaint/package.json"))("playwright");
const url = process.argv.slice(2).find((a) => a.startsWith("http")) ?? process.env.PROBE_URL ?? "http://127.0.0.1:8765/";
const FOLDER = "paint-save";
const BENIGN = /注入的毛病|Not signed in|CloudNetworkError|Failed to fetch|net::ERR|msal|favicon|GPU stall due to ReadPixels|not persisted yet/i;
let pass = 0, failN = 0;
const check = (ok, what, extra = "") => { if (ok) { pass++; console.log("  ✓", what); } else { failN++; process.exitCode = 1; console.error("  ✗", what, extra ? `  ← ${extra}` : ""); } };
const FAKE_FSA = (folder) => {
  window.showDirectoryPicker = async () => (await navigator.storage.getDirectory()).getDirectoryHandle(folder, { create: true });
  const P = globalThis.FileSystemHandle?.prototype;
  if (P) { P.queryPermission = async () => "granted"; P.requestPermission = async () => "granted"; }
};
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const ctx = await browser.newContext({ viewport: { width: 900, height: 700 }, deviceScaleFactor: 1 });
await ctx.addInitScript(FAKE_FSA, FOLDER);
const page = await ctx.newPage();
const errs = [];
page.on("pageerror", (e) => errs.push("pageerror: " + e.message));
page.on("console", (m) => { if (m.type() === "error" && !BENIGN.test(m.text())) errs.push(`console.error: ${m.text()}`); });
const ready = () => page.waitForFunction(() => globalThis.__catsup?.session && globalThis.__catsup.home);
const reloaded = async (act) => { const nav = page.waitForEvent("load", { timeout: 30000 }); await act(); await nav; await ready(); await page.waitForTimeout(900); };
await page.goto(url, { waitUntil: "load" }); await ready(); await page.waitForTimeout(600);
// 选夹当家 → 图库新建一份
void page.evaluate(() => { void globalThis.__catsup.home.openGallery(); });
await page.waitForFunction(() => !document.getElementById("sheet").hidden, null, { timeout: 8000 });
await reloaded(() => page.click(`#sheetChoices button:has-text("选一个文件夹")`));
await page.evaluate(() => globalThis.__catsup.galleryHost.open());
await page.waitForFunction(() => !document.getElementById("galleryFull").hidden);
await page.click("#galleryNew");
await page.waitForFunction(() => globalThis.__catsup.session.home.kind === "gallery" && document.getElementById("galleryFull").hidden);
await page.evaluate(() => { for (const n of [...document.querySelectorAll("#noticeStack > *")]) n.remove(); });

/** 页面里：n 个盒子（物件），每个顶面一张画、其余的面一张画；俯视；返回顶面那几张的身份。 */
const build = (n) => page.evaluate(async (n) => {
  const C = globalThis.__catsup, e = C.editor, P = (x, y, z = 0) => ({ x, y, z }), g = () => crypto.randomUUID();
  e.setGrid({ ...e.grid, on: false });
  const tops = [];
  for (let b = 0; b < n; b++) {
    e.exitTo(0); e.clearSelection?.();
    const x0 = (b % 5) * 1.5, y0 = Math.floor(b / 5) * 1.5, B = [[x0, y0], [x0 + 1, y0], [x0 + 1, y0 + 1], [x0, y0 + 1]], segs = [];
    for (let i = 0; i < 4; i++) { const a = B[i], d = B[(i + 1) % 4]; segs.push([P(a[0], a[1], 0), P(d[0], d[1], 0)]); segs.push([P(a[0], a[1], 1), P(d[0], d[1], 1)]); segs.push([P(a[0], a[1], 0), P(a[0], a[1], 1)]); }
    const before = new Set([...e.sceneRef.def(e.sceneRef.root).instances.keys()]);
    e.commitOp({ op: "addEdges", at: e.activePool(), segs });
    e.selectAll(); for (const id of before) void id;
    e.runAction("brep.orientOutward", { curvature: 3 }); e.makeComponent(`盒${b}`); e.runAction("object.toMesh"); e.exitTo(0);
    const S = e.sceneRef, inst = [...S.def(S.root).instances.values()].find((i) => !before.has(i.id)), def = inst.def, k = S.mesh(def).kernel, faces = k.faces();
    const top = faces.filter((f) => k.facePts(f).every((p) => Math.abs(p.z - 1) < 1e-6)), rest = faces.filter((f) => !top.includes(f)), t = g();
    e.commitOp({ op: "startPaint", def, faces: top, uvSet: g(), textureGuid: t, materialGuid: g(), names: { uvSet: "顶", paint: `顶${b}`, material: `顶${b}` }, color: [0.3, 0.5, 0.7], density: 100 });
    e.commitOp({ op: "startPaint", def, faces: rest, uvSet: g(), textureGuid: g(), materialGuid: g(), names: { uvSet: "侧", paint: `侧${b}`, material: `侧${b}` }, color: [0.7, 0.5, 0.3], density: 100 });
    tops.push(t);
  }
  e.cam.setView("top"); e.zoomExtents(); e.draw();
  return tops;
}, n);
/** 一笔横着划过第 i 个盒子的顶面（y = 盒子里的比例）。 */
const stroke = (guid, i, yf, extra = {}) => page.evaluate(([guid, i, yf, extra]) => {
  const C = globalThis.__catsup, e = C.editor, vp = e.vp(), x0 = (i % 5) * 1.5, y0 = Math.floor(i / 5) * 1.5, scr = (x, y) => e.cam.project({ x, y, z: 1 }, vp);
  const a = scr(x0 + 0.15, y0 + yf), b = scr(x0 + 0.85, y0 + yf), pts = []; for (let k = 0; k <= 30; k++) pts.push({ x: a.x + ((b.x - a.x) * k) / 30, y: a.y + ((b.y - a.y) * k) / 30 });
  return C.paint.stroke({ guid, points: pts, size: 10, hardness: 1, color: [0.9, 0.2, 0.1], accum: "over", ...extra });
}, [guid, i, yf, extra]);
const frames = (n = 4) => page.evaluate(async (n) => { for (let i = 0; i < n; i++) { globalThis.__catsup.editor.draw(); await new Promise((r) => requestAnimationFrame(r)); } }, n);
/** 屏幕上第 i 个盒子顶面中间那一块的像素（画布的 WebGL 读回）。 */
const region = (i) => page.evaluate((i) => {
  const e = globalThis.__catsup.editor, vp = e.vp(), x0 = (i % 5) * 1.5, y0 = Math.floor(i / 5) * 1.5, a = e.cam.project({ x: x0 + 0.25, y: y0 + 0.25, z: 1 }, vp), b = e.cam.project({ x: x0 + 0.75, y: y0 + 0.75, z: 1 }, vp);
  e.draw();
  const gl = document.getElementById("board").getContext("webgl2"), dpr = gl.drawingBufferWidth / vp.w;
  const x = Math.round(Math.min(a.x, b.x) * dpr), y = Math.round(gl.drawingBufferHeight - Math.max(a.y, b.y) * dpr), w = Math.round(Math.abs(b.x - a.x) * dpr), h = Math.round(Math.abs(b.y - a.y) * dpr);
  const px = new Uint8Array(w * h * 4); gl.readPixels(x, y, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
  let s = 2166136261; for (let k = 0; k < px.length; k++) { s ^= px[k]; s = Math.imul(s, 16777619); }
  let colored = 0; for (let k = 0; k < px.length; k += 4) if (px[k] > 150 && px[k + 1] < 120) colored++;
  return { hash: (s >>> 0).toString(16), w, h, colored };
}, i);
const S = (f, arg) => page.evaluate(f, arg);
const fileBytes = () => page.evaluate(async (folder) => { const s = globalThis.__catsup.session, root = await (await navigator.storage.getDirectory()).getDirectoryHandle(folder); for await (const [n, h] of root.entries()) if (h.kind === "file" && n === s.home.path) return [...new Uint8Array(await (await h.getFile()).arrayBuffer())]; return null; }, FOLDER);

console.log("\n① 画了存、刷新：读回来是冷的，照合成图显示");
const tops = await build(1);
await stroke(tops[0], 0, 0.4); await stroke(tops[0], 0, 0.6); await frames();
check(await S(async () => globalThis.__catsup.session.save()) === true && await S(() => !globalThis.__catsup.session.dirty()), "存上了、不脏");
await reloaded(() => page.reload());
await S(() => { const e = globalThis.__catsup.editor; e.cam.setView("top"); e.zoomExtents(); });
await frames(8); await page.waitForTimeout(300); await frames(4);
check(await S(() => globalThis.__catsup.paint.boards.count) === 0, "读回来：画板 0");
check(await S((g) => globalThis.__catsup.paint.state(g), tops[0]) === "cold", "那张画是冷的");
const cold = await region(0);
check(cold.colored > 50, "冷的显示出画来了（不是底色）", JSON.stringify(cold));

console.log("\n② 冷热之间显示不变");
await S((g) => globalThis.__catsup.paint.warm(g), tops[0]); await frames(6);
const hot = await region(0);
check(hot.hash === cold.hash, "同一块屏幕像素：冷的 = 热的", `${cold.hash} vs ${hot.hash}`);

console.log("\n③ 落笔撞上冷的画");
await reloaded(() => page.reload());
await S(() => { const e = globalThis.__catsup.editor; e.cam.setView("top"); e.zoomExtents(); });
await frames(4);
const r1 = await stroke(tops[0], 0, 0.3);
check(r1?.refused === "warming" && /还在打开/.test(await S(() => document.querySelector("#hint")?.textContent ?? "")), "这一笔不开始、提示行说还在打开", JSON.stringify(r1));
await page.waitForFunction((g) => globalThis.__catsup.paint.state(g) === "hot", tops[0], { timeout: 10000 });
const r2 = await stroke(tops[0], 0, 0.3);
check(!r2?.refused && await S(() => globalThis.__catsup.session.dirty()), "热了之后能画、算改过");

console.log("\n③½ 画布上的二维笔：画了存、刷新、读回来逐字节");
const layersOf = (g) => S((g) => { const b = globalThis.__catsup.paint.boards.get(g); if (!b) return null; const h = (u) => { let x = 2166136261; for (let k = 0; k < u.length; k++) { x ^= u[k]; x = Math.imul(x, 16777619); } return (x >>> 0).toString(16); }; return b.wp.exportData().nodes.map((n) => (n.pixels ? `${n.pixels.rect.x},${n.pixels.rect.y},${n.pixels.rect.w},${n.pixels.rect.h}:${h(new Uint8Array(n.pixels.bytes.buffer, n.pixels.bytes.byteOffset, n.pixels.bytes.byteLength))}` : "空")).join("|"); }, g);
const L0 = await layersOf(tops[0]);
const r2d = await S((g) => { const C = globalThis.__catsup, { width: W, height: H } = C.paint.ensure(g), pts = []; for (let k = 0; k <= 30; k++) pts.push({ x: W * (0.1 + 0.8 * k / 30), y: H * 0.8, p: 0.5 + 0.4 * Math.sin(k * 0.3) }); return C.paint.stroke2d({ guid: g, points: pts, kind: "sketch", size: 9, color: [0.9, 0.2, 0.1] }); }, tops[0]);
const L1 = await layersOf(tops[0]);
check(r2d?.landed === true && L1 !== L0 && await S(() => globalThis.__catsup.session.dirty()), "二维笔画上了、算改过", JSON.stringify(r2d));
await frames();
check(await S(async () => globalThis.__catsup.session.save()) === true && await S(() => !globalThis.__catsup.session.dirty()), "存上了、不脏");
await reloaded(() => page.reload());
await S(() => { const e = globalThis.__catsup.editor; e.cam.setView("top"); e.zoomExtents(); });
await frames(8); await page.waitForTimeout(300); await frames(4);
check(await S((g) => globalThis.__catsup.paint.state(g), tops[0]) === "cold", "读回来是冷的");
const cold2 = await region(0);
check(cold2.colored > 50, "冷的显示里有画（照存下的合成图）", JSON.stringify(cold2));
await S((g) => globalThis.__catsup.paint.warm(g), tops[0]);
await page.waitForFunction((g) => globalThis.__catsup.paint.state(g) === "hot", tops[0], { timeout: 10000 }); await frames(6);
check(await layersOf(tops[0]) === L1, "热起来：分层逐字节 = 存之前");
check((await region(0)).hash === cold2.hash, "冷热之间显示不变");
const fresh = { color: [0.2, 0.8, 0.3] };   // ③ 那一笔已经用同一个红画过 0.3 那条线：同色重画不改像素 = 不算改过，所以换一条线、换个颜色
let r2b = await stroke(tops[0], 0, 0.5, fresh);   // 回到 ③ 结束时的样子（热的、算改过），后面几段照旧
for (let k = 0; k < 20 && r2b?.refused === "pending"; k++) { await frames(2); r2b = await stroke(tops[0], 0, 0.5, fresh); }   // 刚热起来那一下画画的准备可能还没好（钩子如实说 pending）：等几帧再画
check(!r2b?.refused && await S(() => globalThis.__catsup.session.dirty()), "接着在模型上画（回到 ③ 结束时：热的、算改过）", JSON.stringify(r2b));

console.log("\n④ 编码正在跑时画一笔、挪一个点");
await S(() => { const sv = globalThis.__catsup.paint.saver, ok = sv.encodeOra.bind(sv); sv.__ok = ok; sv.encodeOra = async (d, w) => { await new Promise((r) => setTimeout(r, 300)); return ok(d, w); }; });   // 编码慢一点：好在它跑的时候动手
const p4 = page.evaluate(() => globalThis.__catsup.session.save());
await page.waitForTimeout(120);
await stroke(tops[0], 0, 0.7);
const saved4 = await p4;
check(saved4 === true && await S(() => globalThis.__catsup.session.dirty()), "存上了，但编码时画的那一笔让它仍然算改过");
await S(() => { const sv = globalThis.__catsup.paint.saver; sv.encodeOra = sv.__ok; });
check(await S(async () => globalThis.__catsup.session.save()) === true && await S(() => !globalThis.__catsup.session.dirty()), "再存一次才干净");

console.log("\n⑤ 编码中途抛");
const before5 = await fileBytes();
await stroke(tops[0], 0, 0.5);
await S(() => { const sv = globalThis.__catsup.paint.saver; sv.__ok = sv.encodeOra; sv.encodeOra = () => Promise.reject(new Error("注入的毛病")); });
const ok5 = await S(async () => globalThis.__catsup.session.save());
const noticesText = await S(() => document.getElementById("noticeStack")?.textContent ?? "");
check(ok5 === false && await S(() => globalThis.__catsup.session.dirty()), "存盘没成、仍然算改过");
check(/存盘没成：画「顶0」编码出错/.test(noticesText), "明说是哪张画", noticesText.slice(0, 160));
const after5 = await fileBytes();
check(!!before5 && !!after5 && before5.length === after5.length && before5.every((x, i) => x === after5[i]), "夹里的文件一个字节不动");
await S(() => { const sv = globalThis.__catsup.paint.saver; sv.encodeOra = sv.__ok; });
check(await S(async () => globalThis.__catsup.session.save()) === true, "毛病没了照常存");

console.log("\n⑦ 编码正在跑时落笔要等多久（量）");
const waits = await S(async () => {
  const C = globalThis.__catsup, out = [];
  for (let k = 0; k < 3; k++) {
    C.paint.boards.get(C.paint.list()[0].guid).wp;   // 有画板
    const t0 = performance.now(), p = C.session.save();
    let worst = 0, last = performance.now();
    const tick = setInterval(() => { const n = performance.now(); worst = Math.max(worst, n - last); last = n; }, 4);
    await p; clearInterval(tick);
    out.push({ saveMs: Math.round(performance.now() - t0), worstGapMs: Math.round(worst) });
    C.editor.draw();
  }
  return out;
});
console.log("    （存一次、其间主线程最长一次没空的时间；没改过的画用缓存，所以先画一笔再存）", JSON.stringify(waits));
const waits2 = [];
for (let k = 0; k < 3; k++) {
  await stroke(tops[0], 0, 0.2 + 0.2 * k);
  waits2.push(await S(async () => { const C = globalThis.__catsup, t0 = performance.now(), p = C.session.save(); let worst = 0, last = performance.now(); const tick = setInterval(() => { const n = performance.now(); worst = Math.max(worst, n - last); last = n; }, 4); await p; clearInterval(tick); return { saveMs: Math.round(performance.now() - t0), worstGapMs: Math.round(worst) }; }));
}
console.log("    画了一笔再存（要重新编码那张画）：", JSON.stringify(waits2));

console.log("\n⑥ 十张画的文件：全部显示出来之后画板数 0");
await page.evaluate(() => globalThis.__catsup.galleryHost.open());
await page.waitForFunction(() => !document.getElementById("galleryFull").hidden);
await page.click("#galleryNew");
await page.waitForFunction(() => globalThis.__catsup.session.home.kind === "gallery" && document.getElementById("galleryFull").hidden);
const tops10 = await build(5);   // 5 个盒子 × 2 张 = 10 张画
for (const [i, t] of tops10.entries()) await stroke(t, i, 0.5);
check(await S(async () => globalThis.__catsup.session.save()) === true, "十张画（五张有内容）存上了");
await reloaded(() => page.reload());
await S(() => { const e = globalThis.__catsup.editor; e.cam.setView("top"); e.zoomExtents(); });
await frames(10); await page.waitForTimeout(400); await frames(4);
const st = await S(() => ({ boards: globalThis.__catsup.paint.boards.count, paints: [...globalThis.__catsup.editor.sceneRef.textures.values()].filter((t) => t.content.kind === "layered").length, sig: globalThis.__catsup.paint.boards.sig() }));
check(st.paints === 10 && st.boards === 0, "十张画、画板 0", JSON.stringify({ paints: st.paints, boards: st.boards }));
check((st.sig.match(/:cold:/g) ?? []).length === 5, "有内容的五张照合成图显示（另外五张没画过：照底色）", st.sig.slice(0, 80));
let shown = 0; for (let i = 0; i < 5; i++) if ((await region(i)).colored > 20) shown++;
check(shown === 5, `五个顶面上都看得见画（${shown}/5）`);
const mem = await S(() => { const C = globalThis.__catsup, rows = [...C.editor.sceneRef.textures.values()].filter((t) => t.content.kind === "layered"), r3 = C.editor.renderer3;
  return { ora: rows.reduce((n, t) => n + t.content.ora.length, 0), png: rows.reduce((n, t) => n + (t.composite?.png.length ?? 0), 0), withComposite: rows.filter((t) => t.composite).length, texCache: r3.texCache?.size ?? null, boards: C.paint.boards.count };
});
console.log(`    冷的常驻（量）：分层字节合计 ${(mem.ora / 1024).toFixed(1)} KB、合成图合计 ${(mem.png / 1024).toFixed(1)} KB（${mem.withComposite} 张有合成图）——都是文件里本来就有的字节；画板 ${mem.boards}；渲染器解码过的图 ${mem.texCache} 张（显卡上每张一份显示用的图）`);

console.log("\n⑧ 读进来时丢过东西：点头才存（统筹 11-11：会丢的四种）");
await S(() => { globalThis.__catsup.session.noteFormat({ readNotes: { newerMinor: [], newerPatch: [], foreignPaintSlots: 2 } }); });   // 等于读进来一份有这种坏数据的文件（读入记号就是这一份）
check(await S(() => globalThis.__catsup.session.heldForLoss), "拦着");
await stroke(tops10[0], 0, 0.3);
const b8 = await fileBytes();
check(await S(async () => globalThis.__catsup.session.save({ implicit: true })) === false, "自动保存不写");
const a8 = await fileBytes();
check(!!b8 && !!a8 && b8.length === a8.length && b8.every((x, i) => x === a8[i]), "夹里的文件没动");
const sheetUp = () => page.waitForFunction(() => !document.getElementById("sheet").hidden, null, { timeout: 8000 });
let p8 = page.evaluate(() => globalThis.__catsup.session.save());
await sheetUp();
check(/存了会丢掉/.test(await S(() => document.getElementById("sheet").textContent)), "人按保存：先问");
await page.click(`#sheetChoices button:has-text("先不存")`);
check(await p8 === false && await S(() => globalThis.__catsup.session.heldForLoss), "先不存 = 没存、还拦着");
p8 = page.evaluate(() => globalThis.__catsup.session.save());
await sheetUp();
await page.click(`#sheetChoices button:has-text("存（丢掉这几处）")`);
check(await p8 === true && await S(() => !globalThis.__catsup.session.heldForLoss && !globalThis.__catsup.session.dirty()), "点了存 = 存上了、放开了");

console.log("\n⑨ 冷的画解图那几帧：占位 = 材质的底色（不是导入贴图的灰）");
const ph = await S(() => { const r3 = globalThis.__catsup.editor.renderer3, t = r3.textureFor({ mimeType: "image/png", bytes: new Uint8Array([0, 1, 2]), sizeM: [1, 1], paint: { base: [0.3, 0.5, 0.7] } }), g = r3.textureFor({ mimeType: "image/png", bytes: new Uint8Array([3, 4, 5]), sizeM: [1, 1] }); return { paint: [...t.image.data], plain: [...g.image.data] }; });   // 坏字节：解不开，占位一直在
check(ph.paint.join() === "77,128,179,255", "画的占位 = 底色", ph.paint.join());
check(ph.plain.join() === "200,200,200,255", "普通贴图的占位照旧灰", ph.plain.join());

await browser.close();
if (errs.length) { console.log("页面错误：", errs.slice(0, 5)); process.exitCode = 1; }
console.log(`\nprobe-paint-save ${failN || errs.length ? "FAIL" : "OK"}（${pass} ✓ / ${failN} ✗）`);
