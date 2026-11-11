// probe-paint-display.mjs —— 画显示到模型上（贴图主线 1-3c，施工单 ai-docs/20261111-paint-workorders-10.md）。created 2026-11-11 by Claude Opus 5.5
// 场景：方盒子转成网格体（组件），两侧的面拉成四个点不共面的四边形（左右对称 = 镜像的两半），开始画（1-3b 的指令）、建画板（调试钩子）。
// ① 没画板时渲染器连活的图那一套都没建（每帧不多做事）。
// ② 专用显示图：内核那张拷进来（解成线性 → 写进 sRGB 的图 → 显卡再编码）之后，256 个值逐字节回来（读回整张显示图比）。
// ③ 点到哪格就是哪格：每格涂一个编码色（R = x 低 8 位、G = y 低 8 位、B = 高位），白模不打光、不画线；屏幕上随机取点，读颜色解出格子，
//    和 1-3a 的落点（__catsup.paint.cellAt = pickSurface）求的同一点的格子比：两者相同。正面和斜着各一遍；每张面（含拉歪的两侧 = 镜像的两半）都要查到。
//    解码要求逐字节，所以这一条也就是「白模不打光时屏幕上读到的颜色就是那一格的字节」。跳过、数出来的三种：离格子边界太近（贴图坐标的小数离整数 < 0.05）；
//    缩小的地方（一个像素走 ≥ 0.7 格，取的是缩小图）；挨着面的边（上下左右 2 像素内落到别的面或模型外：那里画着轮廓线 / 面和面之间的边）。对不上 = 0、读到的不是画的颜色 = 0。
// ④ 显卡画面丢了又恢复：画还在（再取一批点照样对上）、没有页面错误。
// ⑤ 量：1024 见方附近的画板合成一次、拷贝 + 生成缩小图一次各花多少（软件显卡，只作参考）。
// ⑥ 每种画风：旁边放一张导入的单色图（硬表面面），画板灌同一个颜色，两边读出来比（导入的图在哪种画风里能显示，画也要能）。
// 跑法：python3 -m http.server 8765 后 node test/probes/probe-paint-display.mjs [地址]（或 PROBE_URL）
import { createRequire } from "node:module";
import { encodePng } from "./lib/png.mjs";
const { chromium } = createRequire(new URL("../../../20260524 WeebPaint/package.json", import.meta.url))("playwright");
const url = process.argv.slice(2).find((a) => a.startsWith("http")) ?? process.env.PROBE_URL ?? "http://127.0.0.1:8765/";
const SOLID = (() => { const px = new Uint8Array(4 * 4 * 4); for (let i = 0; i < px.length; i += 4) { px[i] = 230; px[i + 1] = 120; px[i + 2] = 30; px[i + 3] = 255; } return encodePng(px, 4, 4).toString("base64"); })();

const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 1000, height: 800 } });
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(url, { waitUntil: "load" }); await page.waitForTimeout(800);
const res = await page.evaluate(async ({ SOLID }) => {
  const C = globalThis.__catsup, e = C.editor, r3 = e.renderer3, P = (x, y, z = 0) => ({ x, y, z }), sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const out = {};
  e.setGrid({ ...e.grid, on: false });
  // 方盒子 → 网格体组件；两侧的面拉歪（左右对称）
  const B = [[0, 0], [1, 0], [1, 1], [0, 1]], segs = []; for (let i = 0; i < 4; i++) { const a = B[i], d = B[(i + 1) % 4]; segs.push([P(a[0], a[1], 0.5), P(d[0], d[1], 0.5)]); segs.push([P(a[0], a[1], 1.5), P(d[0], d[1], 1.5)]); segs.push([P(a[0], a[1], 0.5), P(a[0], a[1], 1.5)]); }   // 离地 0.5：不和地面网格线叠在一个平面上
  e.commitOp({ op: "addEdges", at: e.activePool(), segs }); e.selectAll();
  e.runAction("brep.orientOutward", { curvature: 3 }); e.makeComponent("块"); e.runAction("object.toMesh"); await sleep(20);
  const S = e.sceneRef, inst = [...S.def(S.root).instances.values()].find((i) => S.def(i.def).body.kind === "mesh"), def = inst.def, m = () => S.mesh(def).kernel;
  { const mv = []; const X = inst.xform; for (const v of m().verts()) { const p = m().pt(v), w = { x: X[0] * p.x + X[1] * p.y + X[2] * p.z + X[3], y: X[4] * p.x + X[5] * p.y + X[6] * p.z + X[7], z: X[8] * p.x + X[9] * p.y + X[10] * p.z + X[11] };
      if (Math.abs(w.y) < 1e-6 && Math.abs(w.z - 0.5) < 1e-6) mv.push({ v, to: { x: p.x + (w.x > 0.5 ? 0.3 : -0.3), y: p.y - 0.2, z: p.z - 0.25 } }); }   // 底下靠前的两个点往外、往下拉：两侧的面四点不共面、左右对称；顶面保持水平（⑥ 和地上那张图同一个朝向）
    e.commitOp({ op: "meshMove", def, moves: mv }); }
  // 旁边一张导入的单色图（硬表面，最外层；组件做完之后再画，不然全选会把它也收进组件、转成网格体）
  e.commitOp({ op: "addEdges", at: e.activePool(), segs: [[P(2, 0), P(3, 0)], [P(3, 0), P(3, 1)], [P(3, 1), P(2, 1)], [P(2, 1), P(2, 0)]] });
  { const t = atob(SOLID), u = new Uint8Array(t.length); for (let i = 0; i < u.length; i++) u[i] = t.charCodeAt(i);
    const tg = crypto.randomUUID(); e.commitOp({ op: "addTexture", guid: tg, name: "单色", mimeType: "image/png", bytes: u, sizeM: [1, 1] }); e.commitOp({ op: "addMaterial", name: "单色", color: [1, 1, 1], channels: { color: [tg] } });
    const mi = e.sceneRef.materials.length - 1, k = e.kernel, f = k.faces().find((q) => k.faceRings3(q.id).outer.some((pp) => Math.abs(pp.x - 2) < 1e-6)); for (const side of [0, 1]) e.commitOp({ op: "paintFaces", at: e.activePool(), faces: [k.faceRings3(f.id).outer], material: mi, sides: [side] }); }
  const g = () => crypto.randomUUID();
  e.commitOp({ op: "startPaint", def, faces: m().faces(), uvSet: g(), textureGuid: g(), materialGuid: g(), names: { uvSet: "UV", paint: "画", material: "画" }, color: [0.3, 0.5, 0.7], density: 40 });
  e.cam.setView("iso"); e.zoomExtents(); e.draw(); await sleep(30); e.draw();
  // ① 没画板：活的图那一套没建
  out.noBoard = { live: r3.live === null, images: C.paint.stats().images };
  const info = C.paint.ensure(), W = info.width, H = info.height;
  out.board = { W, H };
  const code = new Uint8Array(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const o = (y * W + x) * 4; code[o] = x & 255; code[o + 1] = y & 255; code[o + 2] = ((x >> 8) & 15) | (((y >> 8) & 15) << 4); code[o + 3] = 255; }
  const tF = performance.now(); C.paint.fill(info.guid, code); out.fillMs = +(performance.now() - tF).toFixed(1);
  e.draw(); await sleep(30); e.draw();
  const gl = document.getElementById("board").getContext("webgl2"), canvas = document.getElementById("board"), dpr = canvas.width / canvas.clientWidth;
  // ② 显示图读回：逐字节
  { const ent = [...r3.live.entries.values()][0], fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fb); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, ent.disp, 0);
    const px = new Uint8Array(W * H * 4); gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, px); gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.deleteFramebuffer(fb); r3.resetPaintState();
    let bad = 0; const seen = new Set(); for (let i = 0; i < px.length; i++) { if (px[i] !== code[i]) bad++; if (i % 4 === 0) seen.add(code[i]); }
    out.roundTrip = { bad, valuesCovered: seen.size, size: `${W}x${H}` }; }
  // ③ 点到哪格
  const white = r3.preset, mat0 = { ...white.material };
  white.material.shade = "none"; white.material.edges = "none";   // 探针：白模不打光、不画线（就地改这一页里的预设对象）
  const rnd = (() => { let s = 12345; return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296; })();
  const check = async (label, n) => {
    e.draw(); await sleep(30); e.draw();
    const w = canvas.width, h = canvas.height, px = new Uint8Array(w * h * 4); gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
    let ok = 0, badN = 0, edge = 0, miss = 0, minified = 0, covered = 0, nearFaceEdge = 0; const faces = new Map(), bads = [];
    for (let i = 0; i < n * 6 && ok + badN < n; i++) {
      const X = Math.floor(rnd() * w), Y = Math.floor(rnd() * h), hit = C.paint.cellAt(info.guid, (X + 0.5) / dpr, (Y + 0.5) / dpr);
      if (!hit || !hit.cell) { miss++; continue; }
      const fx = hit.uv[0] - Math.floor(hit.uv[0]), fy = hit.uv[1] - Math.floor(hit.uv[1]);
      if (Math.min(fx, 1 - fx, fy, 1 - fy) < 0.05) { edge++; continue; }
      // 面的边上画着线（剪影的轮廓线、两张面之间的边——画风「不画线」也照样画）：上下左右 2 个像素内落到别的面 / 没打中模型 = 挨着面的边，跳过、另数（查清的那两点就是这种：线和面的颜色混在一起）
      if ([[2, 0], [-2, 0], [0, 2], [0, -2]].some(([dx, dy]) => C.paint.cellAt(info.guid, (X + 0.5 + dx) / dpr, (Y + 0.5 + dy) / dpr)?.face !== hit.face)) { nearFaceEdge++; continue; }
      const hx = C.paint.cellAt(info.guid, (X + 1.5) / dpr, (Y + 0.5) / dpr), hy = C.paint.cellAt(info.guid, (X + 0.5) / dpr, (Y + 1.5) / dpr);   // 一个像素走了多少格：≥ 0.7 格 = 缩小的地方（取的是缩小图，「点到哪格」不管）
      if (!hx?.uv || !hy?.uv || hx.face !== hit.face || hy.face !== hit.face || Math.max(Math.abs(hx.uv[0] - hit.uv[0]), Math.abs(hx.uv[1] - hit.uv[1]), Math.abs(hy.uv[0] - hit.uv[0]), Math.abs(hy.uv[1] - hit.uv[1])) >= 0.7) { minified++; continue; }
      const o = ((h - 1 - Y) * w + X) * 4, cx = px[o] | ((px[o + 2] & 15) << 8), cy = px[o + 1] | ((px[o + 2] >> 4) << 8);
      if (cx >= W || cy >= H) { covered++; continue; }   // 读到的颜色不是任何一格的编码 = 那一点上盖着别的东西（不是画的颜色），另数
      faces.set(hit.face, (faces.get(hit.face) ?? 0) + 1);
      if (cx === hit.cell[0] && cy === hit.cell[1]) ok++; else { badN++; if (bads.length < 5) bads.push({ X, Y, face: hit.face, screen: [cx, cy], landing: hit.cell, uv: hit.uv.map((v) => +v.toFixed(3)), du: [+(hx.uv[0] - hit.uv[0]).toFixed(2), +(hy.uv[0] - hit.uv[0]).toFixed(2)] }); }
    }
    return { label, ok, bad: badN, skippedNearCellEdge: edge, skippedMinified: minified, skippedNearFaceEdge: nearFaceEdge, notPaintColor: covered, offModel: miss, faces: Object.fromEntries(faces), bads };
  };
  e.cam.setView("iso"); e.zoomExtents(); e.cam.halfH *= 0.55; out.oblique = await check("斜着（iso，放大）", 300);
  e.cam.setView("front"); e.zoomExtents(); e.cam.halfH *= 0.6; out.front = await check("正面", 200);
  e.cam.setView("right"); e.zoomExtents(); e.cam.halfH *= 0.6; out.right = await check("右侧（拉歪的面）", 150);
  e.cam.setView("left"); e.zoomExtents(); e.cam.halfH *= 0.6; out.left = await check("左侧（镜像的另一半）", 150);
  // ④ 显卡画面丢了又恢复
  { const ext = gl.getExtension("WEBGL_lose_context"); ext.loseContext(); await sleep(200); ext.restoreContext(); await sleep(400); e.draw(); await sleep(100);
    e.cam.setView("iso"); e.zoomExtents(); e.cam.halfH *= 0.55; out.restored = await check("恢复之后", 120); }
  // ⑤ 量：重新灌一次（内容变了）→ 合成一次；画一帧（拷贝 + 生成缩小图）
  { const b = C.paint.boards.get(info.guid); b.load({ width: W, height: H, nodes: [{ name: "L", visible: true, opacity: 1, mode: "source-over", clippingMask: false, lockAlpha: false, pixels: { rect: { x: 0, y: 0, w: W, h: H }, bytes: new Uint8ClampedArray(code) } }] });
    const t0 = performance.now(); b.compose(); const composeMs = performance.now() - t0; gl.finish(); const composeFinishMs = performance.now() - t0;
    b.load({ width: W, height: H, nodes: [{ name: "L", visible: true, opacity: 1, mode: "source-over", clippingMask: false, lockAlpha: false, pixels: { rect: { x: 0, y: 0, w: W, h: H }, bytes: new Uint8ClampedArray(code) } }] });
    const t1 = performance.now(); e.draw(); gl.finish(); const frameMs = performance.now() - t1;
    const t2 = performance.now(); e.draw(); gl.finish(); const idleMs = performance.now() - t2;
    out.timing = { size: `${W}x${H}`, composeMs: +composeMs.toFixed(2), composeFinishMs: +composeFinishMs.toFixed(2), copyMs: +C.paint.stats().copyMs.toFixed(2), frameWithRecomposeMs: +frameMs.toFixed(1), frameNoChangeMs: +idleMs.toFixed(1) }; }
  // ⑥ 每种画风：导入的单色图 vs 画（同一个颜色）
  Object.assign(white.material, mat0);
  { const solid = new Uint8Array(W * H * 4); for (let i = 0; i < solid.length; i += 4) { solid[i] = 230; solid[i + 1] = 120; solid[i + 2] = 30; solid[i + 3] = 255; } C.paint.fill(info.guid, solid); }
  e.cam.setView("top"); e.zoomExtents();
  const at = (p) => { const w = canvas.width, h = canvas.height, s = e.cam.angularPx(p, e.vp()), buf = new Uint8Array(4); gl.readPixels(Math.round(s.x * dpr), h - 1 - Math.round(s.y * dpr), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, buf); return [buf[0], buf[1], buf[2]]; };
  out.styles = [];
  for (const id of ["white", "pixelOutline", "onebit", "papercut", "tron", "realistic", "bronze"]) {
    r3.setPreset(id); e.draw(); await sleep(60); e.draw(); await sleep(30); e.draw();
    out.styles.push({ id, imported: at(P(2.6, 0.4, 0)), paint: at(P(0.6, 0.6, 1.5)) });
  }
  r3.setPreset("white"); e.draw();
  out.liveAfter = C.paint.stats();
  return out;
}, { SOLID });
await browser.close();
const pr = (o) => `${o.label}：对上 ${o.ok}、对不上 ${o.bad}、离格子边太近跳过 ${o.skippedNearCellEdge}、缩小的地方跳过 ${o.skippedMinified}、挨着面的边跳过 ${o.skippedNearFaceEdge}、读到的不是画的颜色 ${o.notPaintColor}、没打中模型 ${o.offModel}；查到的面 ${JSON.stringify(o.faces)}${o.bads.length ? "；例 " + JSON.stringify(o.bads) : ""}`;
console.log("① 没画板：", JSON.stringify(res.noBoard));
console.log("画板：", JSON.stringify(res.board), "灌一次", res.fillMs, "ms");
console.log("② 显示图读回：", JSON.stringify(res.roundTrip));
for (const k of ["oblique", "front", "right", "left", "restored"]) console.log("③④ " + pr(res[k]));
console.log("⑤ 量：", JSON.stringify(res.timing));
for (const s of res.styles) console.log(`⑥ ${s.id}：导入的图 ${s.imported.join(",")} / 画 ${s.paint.join(",")}`);
const all = ["oblique", "front", "right", "left", "restored"].map((k) => res[k]);
const ok = res.noBoard.live && res.noBoard.images === 0 && res.roundTrip.bad === 0 && res.roundTrip.valuesCovered === 256
  && all.every((c) => c.bad === 0 && c.ok >= 100 && c.notPaintColor === 0) && Object.keys(res.right.faces).length >= 1 && Object.keys(res.left.faces).length >= 1 && errs.length === 0;
if (errs.length) console.log("页面错误：", errs);
console.log(ok ? "probe-paint-display OK" : "probe-paint-display FAIL");
process.exit(ok ? 0 : 1);
