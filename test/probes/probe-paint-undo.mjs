// probe-paint-undo.mjs —— 画的每一步进三维的撤销栈，真的编辑器接线（贴图主线 1-8a，施工单 ai-docs/20261111-paint-workorders-12.md）。created 2026-11-11 by Claude Opus 5.5
// 调试钩子 __catsup.paint.stroke 画（屏幕点 → 1-4a 控制器 → 真显卡薄层 → 档口 → 落层 → 编辑器 commitRecordsStep）；编辑器的 undo / redo（整步事务 + 开着的一笔先取消）。
// ① 画两笔 → 撤两下 → 重做两下：每张画的像素（内核 exportData）逐字节回到当时；提示行「撤销：画一笔」；文档算改过（编辑器的版本号加了）。
// ② 画 / 挪点 / 画 交错：撤三下回到最开始，再重做回来。
// ③ 一笔画到一半（抬笔之前）就按撤销：这一笔取消、不留痕迹，撤掉的是上一笔。
// ④ 删掉画着的物件（清理掉定义）再撤销回来：画板歇着没扔，画和它之前的每一步都还能撤。
// ⑤ 画布上的二维笔（施工单二十一第 1 刀，调试钩子 paint.stroke2d）：和模型上的笔交错画、撤两下重做两下逐字节；二维笔画到一半按撤销 = 这一笔取消、撤的是上一步。
// 跑法：python3 -m http.server 8765 后 node test/probes/probe-paint-undo.mjs [地址]（或 PROBE_URL）
import { createRequire } from "node:module";
const { chromium } = createRequire(new URL("../../../20260524 WeebPaint/package.json", import.meta.url))("playwright");
const url = process.argv.slice(2).find((a) => a.startsWith("http")) ?? process.env.PROBE_URL ?? "http://127.0.0.1:8765/";
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(url, { waitUntil: "load" }); await page.waitForTimeout(800);
const res = await page.evaluate(async () => {
  const C = globalThis.__catsup, e = C.editor, P = (x, y, z = 0) => ({ x, y, z }), sleep = (ms) => new Promise((r) => setTimeout(r, ms)), out = {};
  e.setGrid({ ...e.grid, on: false });
  const B = [[0, 0], [1, 0], [1, 1], [0, 1]], segs = []; for (let i = 0; i < 4; i++) { const a = B[i], d = B[(i + 1) % 4]; segs.push([P(a[0], a[1], 0), P(d[0], d[1], 0)]); segs.push([P(a[0], a[1], 1), P(d[0], d[1], 1)]); segs.push([P(a[0], a[1], 0), P(a[0], a[1], 1)]); }
  e.commitOp({ op: "addEdges", at: e.activePool(), segs }); e.selectAll(); e.runAction("brep.orientOutward", { curvature: 3 }); e.makeComponent("块"); e.runAction("object.toMesh"); await sleep(20);
  const S = () => e.sceneRef, inst = [...S().def(S().root).instances.values()][0], def = inst.def, g = () => crypto.randomUUID();
  e.commitOp({ op: "startPaint", def, faces: S().mesh(def).kernel.faces(), uvSet: g(), textureGuid: g(), materialGuid: g(), names: { uvSet: "UV", paint: "画", material: "画" }, color: [0.3, 0.5, 0.7], density: 100 });   // 密度太小时细笔一格都碰不到（内核什么都没改就不封步，这一笔就不进栈）
  e.cam.setView("top"); e.zoomExtents(); e.draw(); await sleep(30);
  const info = C.paint.ensure(), guid = info.guid, hintEl = () => document.querySelector("#hint")?.textContent ?? "";
  const hash = (u) => { let h = 2166136261; for (let i = 0; i < u.length; i++) { h ^= u[i]; h = Math.imul(h, 16777619); } return (h >>> 0).toString(16); };
  const px = () => { const b = C.paint.boards.get(guid); if (!b) return "没有画板"; const d = b.wp.exportData(); return d.nodes.map((n) => (n.pixels ? `${n.pixels.rect.x},${n.pixels.rect.y},${n.pixels.rect.w},${n.pixels.rect.h}:${hash(new Uint8Array(n.pixels.bytes.buffer, n.pixels.bytes.byteOffset, n.pixels.bytes.byteLength))}` : "空")).join("|") + ` ${b.width}x${b.height}`; };
  const vp = e.vp(), scr = (x, y) => e.cam.project(P(x, y, 1), vp);
  const line = (y, x0 = 0.2, x1 = 0.8) => { const a = scr(x0, y), b = scr(x1, y), pts = []; for (let i = 0; i <= 30; i++) pts.push({ x: a.x + ((b.x - a.x) * i) / 30, y: a.y + ((b.y - a.y) * i) / 30 }); return pts; };
  const stroke = (y, o = {}) => C.paint.stroke({ points: line(y), size: 14, hardness: 1, color: [0.9, 0.1, 0.1], accum: "over", ...o });
  // ①
  const p0 = px(), rev0 = e.revision;
  stroke(0.3); const p1 = px();
  stroke(0.6); const p2 = px();
  out.one = { changed: p1 !== p0 && p2 !== p1, dirty: e.revision > rev0 };
  e.undo(); out.one.hint = hintEl(); out.one.undo1 = px() === p1;
  e.undo(); out.one.undo2 = px() === p0;
  e.redo(); out.one.redo1 = px() === p1;
  e.redo(); out.one.redo2 = px() === p2;
  // ②
  const q0 = px(), fp0 = JSON.stringify(S().mesh(def).kernel.toSnapshot());
  stroke(0.45);
  const k = S().mesh(def).kernel, v = k.verts()[0], p = k.pt(v);
  e.commitOp({ op: "meshMove", def, moves: [{ v, to: { x: p.x, y: p.y, z: p.z + 0.05 } }] });
  stroke(0.75); const q3 = px();
  e.undo(); e.undo(); e.undo();
  out.two = { back: px() === q0 && JSON.stringify(S().mesh(def).kernel.toSnapshot()) === fp0 };
  e.redo(); e.redo(); e.redo();
  out.two.forward = px() === q3;
  // ③ 一笔画到一半就按撤销
  const r0 = px(), pos0 = e.history.position();
  stroke(0.15, { beforeUp: () => { e.undo(); } });
  out.three = { undidPrevious: px() !== r0, noTrace: e.history.position() === pos0 - 1 || e.history.position() < pos0 };
  e.redo(); out.three.redoBack = px() === r0;
  // ④ 删掉画着的物件再撤销回来
  const before = px(), root = S().root, i0 = [...S().def(root).instances.values()].find((i) => i.def === def);
  e.commitOp({ op: "eraseInstance", def: root, instance: i0.id }); e.commitOp({ op: "purgeDefs", defs: [def] });
  out.four = { gone: !S().defs.has(def), boardKept: !!C.paint.boards.get(guid) };
  e.undo(); e.undo();
  out.four.back = S().defs.has(def) && px() === before;
  e.undo(); out.four.undoStroke = px() !== before;
  e.redo(); out.four.redo = px() === before;
  // ⑤ 二维笔（画布像素）和模型上的笔交错
  const W = info.width, H = info.height, cline = (fy) => { const pts = []; for (let i = 0; i <= 24; i++) pts.push({ x: W * (0.15 + 0.7 * i / 24), y: H * fy, p: 0.4 + 0.5 * Math.abs(Math.sin(i * 0.3)) }); return pts; };
  const s2 = (fy, o = {}) => C.paint.stroke2d({ guid, points: cline(fy), kind: "ink", size: 10, color: [0.1, 0.3, 0.9], ...o });
  const f0 = px(), pos5 = e.history.position();
  const r1 = s2(0.35); const f1 = px();
  stroke(0.5); const f2 = px();
  out.five = { landed: r1.landed === true, changed: f1 !== f0 && f2 !== f1, steps: e.history.position() - pos5 };
  e.undo(); out.five.undo1 = px() === f1; e.undo(); out.five.undo2 = px() === f0;
  e.redo(); out.five.redo1 = px() === f1; e.redo(); out.five.redo2 = px() === f2;
  const pos6 = e.history.position();
  const r6 = s2(0.65, { beforeUp: () => { e.undo(); } });
  out.five.midUndo = { r: r6, undidPrevious: px() === f1, pos: e.history.position() === pos6 - 1, open: C.paint.boards.anyStrokeOpen() };
  e.redo(); out.five.redoBack = px() === f2;
  return out;
});
await browser.close();
console.log(JSON.stringify(res, null, 1));
const checks = {
  "① 画两笔撤两下重做两下逐字节、提示行、算改过": res.one.changed && res.one.dirty && res.one.undo1 && res.one.undo2 && res.one.redo1 && res.one.redo2 && /撤销：画一笔/.test(res.one.hint),
  "② 画 / 挪点 / 画 交错来回": res.two.back && res.two.forward,
  "③ 一笔画到一半按撤销：这一笔取消、撤的是上一笔": res.three.undidPrevious && res.three.noTrace && res.three.redoBack,
  "④ 删掉画着的物件再撤销回来：画还在、还能撤": res.four.gone && res.four.boardKept && res.four.back && res.four.undoStroke && res.four.redo,
  "⑤ 画布上的二维笔和模型上的笔交错：一笔一步、撤两下重做两下逐字节；二维笔画到一半按撤销 = 这一笔取消、撤的是上一步": res.five.landed && res.five.changed && res.five.steps === 2 && res.five.undo1 && res.five.undo2 && res.five.redo1 && res.five.redo2 && res.five.midUndo.undidPrevious && res.five.midUndo.pos && !res.five.midUndo.open && res.five.redoBack,
};
for (const [k, v] of Object.entries(checks)) console.log(`${v ? "✓" : "✗"} ${k}`);
if (errs.length) console.log("页面错误：", errs);
const ok = Object.values(checks).every(Boolean) && errs.length === 0;
console.log(ok ? "probe-paint-undo OK" : "probe-paint-undo FAIL");
process.exit(ok ? 0 : 1);
