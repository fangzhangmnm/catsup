// probe-space-measure.mjs —— 空间里的一笔，量（贴图主线 1-4b，施工单 ai-docs/20261111-paint-workorders-11.md「要量的」+ 统筹 11-11「轻量」第 3、5 条）。created 2026-11-11 by Claude Opus 5.5
// 不设及格线，只量、只报（页面错误 / 笔画没落下 = 红）：
// ① 一千颗笔尖上下的长笔画（方盒子顶面上来回走）：每一帧各段——射线 + 走步（move）、取新笔尖 + 算碰到哪些三角形、画薄层（含上传、拷定型层）、交给档口、内核合成（含缩小图）、拷到显示图、整帧；
//    开头几帧 / 第 500 颗附近 / 第 1000 颗附近各取平均，看是不是差不多（每帧的活只随这一帧新给的笔尖涨）。落笔那一下建表、抬笔那一下（整笔重画一次 + 落层）各花多少。
// ② 内存一张账：两种画板（1024×768 和 1024×4096；后者格数 = 2048 见方），三维这边每一项占多少（显存按图的大小算；内存按类型化数组的字节数算），从大到小列；
//    按格数折到 1024 见方 / 2048 见方。画板的图块池、内核的离屏图池读内核自己的统计（探针里读私有字段，只为量）。
// 跑法：python3 -m http.server 8765 后 node test/probes/probe-space-measure.mjs [地址]（或 PROBE_URL）
import { createRequire } from "node:module";
const { chromium } = createRequire(new URL("../../../20260524 WeebPaint/package.json", import.meta.url))("playwright");
const url = process.argv.slice(2).find((a) => a.startsWith("http")) ?? process.env.PROBE_URL ?? "http://127.0.0.1:8765/";
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const errs = [];
const runs = [];
for (const density of [330, 640]) {
  const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
  page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
  await page.goto(url, { waitUntil: "load" }); await page.waitForTimeout(800);
  runs.push(await page.evaluate(async ({ density, long }) => {
    const C = globalThis.__catsup, e = C.editor, L = C.paint.lab, P = (x, y, z = 0) => ({ x, y, z }), sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    e.setGrid({ ...e.grid, on: false });
    const B = [[0, 0], [1, 0], [1, 1], [0, 1]], segs = []; for (let i = 0; i < 4; i++) { const a = B[i], d = B[(i + 1) % 4]; segs.push([P(a[0], a[1], 0), P(d[0], d[1], 0)]); segs.push([P(a[0], a[1], 1), P(d[0], d[1], 1)]); segs.push([P(a[0], a[1], 0), P(a[0], a[1], 1)]); }
    e.commitOp({ op: "addEdges", at: e.activePool(), segs }); e.selectAll(); e.runAction("brep.orientOutward", { curvature: 3 }); e.makeComponent("块"); e.runAction("object.toMesh"); await sleep(20);
    const S = e.sceneRef, inst = [...S.def(S.root).instances.values()][0], def = inst.def, m = S.mesh(def).kernel, g = () => crypto.randomUUID();
    e.commitOp({ op: "startPaint", def, faces: m.faces(), uvSet: g(), textureGuid: g(), materialGuid: g(), names: { uvSet: "UV", paint: "画", material: "画" }, color: [0.3, 0.5, 0.7], density });
    e.cam.setView("top"); e.zoomExtents(); e.draw(); await sleep(30);
    const info = C.paint.ensure(), W = info.width, H = info.height, out = { density, W, H };
    e.draw(); await sleep(30);
    // ── ① 长笔画：顶面上来回走（世界 z = 1，盒子摆在原点）
    const wp = (x, y) => ({ x, y, z: 1 });   // 盒子画在世界 0..1（组件的局部原点在盒子中心，所以直接用世界坐标）
    const vp = e.vp(), scr = (x, y) => e.cam.project(wp(x, y), vp), pts = [];
    if (long) {
      const rows = 7;
      for (let r = 0; r < rows; r++) {
        const y = 0.12 + (0.76 * r) / (rows - 1), [x0, x1] = r % 2 ? [0.88, 0.12] : [0.12, 0.88], a = scr(x0, y), b = scr(x1, y), n = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 3);
        for (let i = 0; i <= n; i++) pts.push({ x: a.x + ((b.x - a.x) * i) / n, y: a.y + ((b.y - a.y) * i) / n });
      }
      const t0 = performance.now(), res = C.paint.stroke({ points: pts, size: 6, hardness: 0.5, accum: "over", measure: true }), wall = performance.now() - t0;
      const fr = res.frames, avg = (sel) => { const f = fr.filter(sel); const o = { frames: f.length }; if (!f.length) return o; for (const k of ["moveMs", "tipsMs", "layerMs", "gpuLayerMs", "hostMs", "composeMs", "copyMs", "drawMs", "fresh"]) o[k] = +(f.reduce((s, q) => s + q[k], 0) / f.length).toFixed(2); return o; };
      out.stroke = { points: pts.length, tips: res.tips, range: res.range, buildMs: +res.buildMs.toFixed(1), upMs: +res.upMs.toFixed(1), up: Object.fromEntries(Object.entries(res.up).map(([k, v]) => [k, +v.toFixed(1)])), wallMs: Math.round(wall), trace: fr.filter((q, i) => i % 40 === 0).map((q) => q.tips).join(" "), stall: fr.findIndex((q, i) => i > 5 && fr.slice(i, i + 20).every((z) => z.fresh === 0)),
        first: avg((q) => q.tips > 0 && q.tips <= 60), mid: avg((q) => Math.abs(q.tips - 500) <= 60), late: avg((q) => Math.abs(q.tips - 1000) <= 60), end: avg((q) => q.tips >= res.tips - 60) };
      e.draw(); await sleep(30);
    }
    // ── ② 内存账
    const board = C.paint.boards.get(info.guid), kg = board.gl, mem = kg._room.memory, fbo = kg.fboPoolStats;
    const targets = L.targets(info.guid), tg = performance.now(), geo = L.buildTargetGeo(targets[0]), geoMs = performance.now() - tg;
    const bytesOf = (root) => { const seen = new Set(); let n = 0; const walk = (v, d) => { if (!v || typeof v !== "object" || seen.has(v) || d > 6) return; seen.add(v); if (ArrayBuffer.isView(v)) { n += v.byteLength; return; } if (v instanceof Map) { for (const [k, x] of v) { walk(k, d + 1); walk(x, d + 1); } return; } for (const k of Object.keys(v)) walk(v[k], d + 1); }; walk(root, 0); return n; };
    const gpu = L.gpu(), tl = performance.now();
    const layer = new L.SpaceLayer(gpu, geo, 0, { hardness: 0.5, color: [1, 1, 1], accum: "over", origin: wp(0.5, 0.5) });
    const layerMs = performance.now() - tl, fx = layer.fixed, texel = (d) => d.w * d.h * 4;
    const items = [
      ["定型层（这一笔，显存 RGBA8）", texel(layer.frozen), "画板格数"],
      ["当帧那张 = 交给内核的薄层（这一笔，显存 RGBA8；内核包一层不拷）", texel(layer.frame), "画板格数"],
      ["每格紧凑表 u_cell（这一笔，显存 RG16UI）", texel(fx.u_cell), "画板格数"],
      ["块边取样点表 u_samp（这一笔，显存 R32F）", texel(fx.u_samp), "块边格数"],
      ["三角形公式 u_tris（这一笔，显存 R32F）", texel(fx.u_tris), "三角形数"],
      ["面表 u_faces（这一笔，显存 R32F）", texel(fx.u_faces), "面数"],
      ["名单的几何（找面、格子表；内存，类型化数组；画的时候在）", bytesOf(geo), "画板格数 + 三角形数"],
      ["内核图块池（显存，已占）", mem.committedBytes, "开局 64 片起"],
      ["内核离屏图池（显存：合成图、笔尖累积图等）", fbo.bytes, "画板格数"],
      ["显示图 + 缩小图（显存 RGBA8 × 4/3）", Math.round(W * H * 4 * 4 / 3), "画板格数"],
    ];
    out.memory = { items: items.map(([name, bytes, grows]) => ({ name, MB: +(bytes / 1048576).toFixed(2), grows })), tilePool: mem, fboPool: fbo, geoBuildMs: +geoMs.toFixed(1), layerBuildMs: +layerMs.toFixed(1), sampCells: fx.u_samp.w * fx.u_samp.h / 2 };
    layer.dispose();
    return out;
  }, { density, long: density === 330 }));
  await page.close();
}
await browser.close();
const fmt = (o) => o.frames ? `${o.frames} 帧：射线 + 走步 ${o.moveMs} · 取笔尖 + 找面 ${o.tipsMs} · 画薄层（交命令 ${o.layerMs} / 等显卡做完 ${o.gpuLayerMs}）· 交档口 ${o.hostMs} · 内核合成 ${o.composeMs} · 拷显示图（交命令）${o.copyMs} · 整帧（等显卡做完）${o.drawMs} ms（每帧新给 ${o.fresh} 颗）` : "（没有这一段）";
for (const r of runs) {
  console.log(`\n画板 ${r.W}×${r.H}（${(r.W * r.H / 1048576).toFixed(2)} M 格；密度 ${r.density}）`);
  if (r.stroke) {
    const s = r.stroke;
    console.log(`长笔画：${s.points} 个屏幕点 → ${s.tips} 颗笔尖，范围 ${JSON.stringify(s.range)}；落笔建表 ${s.buildMs} ms；抬笔（整笔重画 + 落层）${s.upMs} ms ${JSON.stringify(s.up)}；全程 ${s.wallMs} ms；从第 ${s.stall} 帧起连着 20 帧没有新笔尖；每 40 帧的笔尖数 ${s.trace}`);
    console.log(`  开头（≤ 60 颗）  ${fmt(s.first)}`);
    console.log(`  第 500 颗附近    ${fmt(s.mid)}`);
    console.log(`  第 1000 颗附近   ${fmt(s.late)}`);
    console.log(`  最后 60 颗       ${fmt(s.end)}`);
  }
  const m = r.memory, scale = (k) => r.W * r.H;
  console.log(`内存账（建名单几何 ${m.geoBuildMs} ms、建薄层 ${m.layerBuildMs} ms；块边格 ${m.sampCells}）：`);
  let total = 0;
  for (const it of [...m.items].sort((a, b) => b.MB - a.MB)) { total += it.MB; console.log(`  ${it.MB.toFixed(2).padStart(7)} MB  ${it.name}（随 ${it.grows} 涨）`); }
  console.log(`  合计 ${total.toFixed(1)} MB；图块池 ${JSON.stringify(m.tilePool)}；离屏图池 ${JSON.stringify(m.fboPool)}`);
}
const ok = errs.length === 0 && runs[0].stroke && runs[0].stroke.tips > 500;
if (errs.length) console.log("页面错误：", errs);
console.log(ok ? "\nprobe-space-measure OK" : "\nprobe-space-measure FAIL");
process.exit(ok ? 0 : 1);
