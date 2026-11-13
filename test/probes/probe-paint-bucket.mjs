#!/usr/bin/env node
// probe-paint-bucket.mjs —— 油漆桶（2026-11-13，统筹批的方案；src/paint/space-fill.ts）。created 2026-11-13 by Claude Opus 5.5
// 真的编辑器 + 真的鼠标事件，无头 swiftshader。格子按画布格比（画板落定那张合成图的字节），「该填的」= 归属表里归那块画布多边形的格（调试钩子 paint.prep.take 拿现成的表）。
// ① 绘制工作台左栏四把：笔 / 橡皮 / 吸管 / 油漆桶；悬停在面上那张面亮一下（编辑器现成的悬停高亮）
// ② 点一下 = 填满一张面：变了的格 = 正好归这张面那块多边形的格（格数 = 归属表），颜色 = 当前颜色；邻面的格一格不动（公共边上那一排归谁就只有谁填——
//    两张面在画布上连着排时另一张面边上看着有最多半格邻色，是格子分辨率决定的，这里按格比，不当溢出）；一步撤销（「油漆桶」）
// ③ 撤销一步 = 画回到点之前（逐字节）
// ④ 按住拖过三张面 = 三张都填、只长一步；撤销一步三张全回去
// ⑤ 走这张画但还没排进画布的面：点了不改任何东西（画逐字节、不长步）、提示行说「还没排进画布」
// 用法：python3 -m http.server 8765 后 node test/probes/probe-paint-bucket.mjs [url]（≈ 20 s）
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
const here = path.dirname(fileURLToPath(import.meta.url));
const { chromium } = createRequire(path.join(here, "../../../20260524 WeebPaint/package.json"))("playwright");
const url = process.argv.slice(2).find((a) => a.startsWith("http")) ?? process.env.PROBE_URL ?? "http://127.0.0.1:8765/";
let pass = 0, failN = 0;
const check = (ok, what, extra = "") => { if (ok) { pass++; console.log("  ✓", what); } else { failN++; process.exitCode = 1; console.error("  ✗", what, extra ? `  ← ${extra}` : ""); } };
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 1100, height: 820 }, deviceScaleFactor: 1 });
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
const S = (f, a) => page.evaluate(f, a);
const frames = (n = 3) => S(async (n) => { for (let i = 0; i < n; i++) { globalThis.__catsup.editor.draw(); await new Promise((r) => requestAnimationFrame(r)); } }, n);
const hint = () => S(() => document.querySelector("#hint")?.textContent ?? "");
await page.goto(url, { waitUntil: "load" }); await page.waitForFunction(() => globalThis.__catsup?.editor); await page.waitForTimeout(600);
const board = await page.locator("#board").boundingBox();

// 两个盒子（网格体组件）：A 六张面都开始画；B 只给顶面开始画（按总大小 256 = 这一张占满画布），再把正面加进这张画 = 放不下 = 走画但没排进画布
const setup = await S(async () => {
  const C = globalThis.__catsup, e = C.editor, P = (x, y, z = 0) => ({ x, y, z }), g = () => crypto.randomUUID(), sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  e.setGrid({ ...e.grid, on: false });
  const box = (x0, name) => {
    const B = [[x0, 0], [x0 + 1, 0], [x0 + 1, 1], [x0, 1]], segs = [];
    for (let i = 0; i < 4; i++) { const a = B[i], d = B[(i + 1) % 4]; segs.push([P(a[0], a[1], 0), P(d[0], d[1], 0)]); segs.push([P(a[0], a[1], 1), P(d[0], d[1], 1)]); segs.push([P(a[0], a[1], 0), P(a[0], a[1], 1)]); }
    e.exitTo(0); e.deselectAll(); e.commitOp({ op: "addEdges", at: e.activePool(), segs });
    e.selectAll(); e.runAction("brep.orientOutward", { curvature: 3 }); e.makeComponent(name); e.runAction("object.toMesh");
  };
  box(0, "甲"); await sleep(10);
  const insts = () => [...e.sceneRef.def(e.sceneRef.root).instances.values()];
  const instA = insts()[0];
  box(3, "乙"); await sleep(10);
  const instB = insts().find((i) => i.id !== instA.id);
  const enter = async (inst) => { e.exitTo(0); e.selectedPools.clear(); e.selectedPools.set(`i${inst.id}`, { kind: "instance", instance: inst.id }); e.enterSelected(); await sleep(10); };
  // 乙：只顶面开始画，再加正面
  await enter(instB);
  const kB = e.sceneRef.mesh(instB.def).kernel, nz = (f) => { const vs = kB.faceVerts(f).map((v) => kB.pt(v)); return vs.reduce((s, p) => s + p.z, 0) / vs.length; };
  const fsB = kB.faces(), topB = fsB.reduce((a, b) => (nz(b) > nz(a) ? b : a)), sideB = fsB.find((f) => f !== topB && Math.abs(nz(f) - 0.5) < 1e-6);
  const texB = g();
  e.commitOp({ op: "startPaint", def: instB.def, faces: [topB], uvSet: g(), textureGuid: texB, materialGuid: g(), names: { uvSet: "UV2", paint: "画二", material: "画二" }, color: [0.3, 0.5, 0.7], canvas: 256 });
  const matB = e.sceneRef.materials.length - 1;
  e.commitOp({ op: "meshPaintFaces", def: instB.def, faces: [sideB], material: matB });
  const uvB = [...e.sceneRef.mesh(instB.def).uvSets.keys()][0], sideHasUv = !!e.sceneRef.mesh(instB.def).kernel.cornerValues(sideB, uvB);
  // 甲：六张面都开始画（按片排）
  await enter(instA);
  const kA = e.sceneRef.mesh(instA.def).kernel, texA = g();
  e.commitOp({ op: "startPaint", def: instA.def, faces: kA.faces(), uvSet: g(), textureGuid: texA, materialGuid: g(), names: { uvSet: "UV", paint: "画", material: "画" }, color: [0.3, 0.5, 0.7], canvas: 256, arrange: "patches" });
  C.paint.ensure(texA); C.pickWorkbench("paint"); e.setTool("paintBucket");
  C.paint.color.set([1, 0, 0]);
  e.cam.setView("iso"); e.zoomExtents(); e.draw();
  return { texA, texB, instA: instA.id, instB: instB.id, sideB, sideHasUv };
});
await page.waitForFunction((t) => globalThis.__catsup.paint.state(t) === "hot", setup.texA, { timeout: 15000 });
await frames(4);

/** 屏幕（画板坐标）上每张面露出来的一点：扫一遍格点问落点，取每张面离它那堆点的平均最近的一点（离边远）。 */
const faceSpots = (tex) => S((tex) => {
  const C = globalThis.__catsup, e = C.editor, vp = e.vp(), got = new Map();
  for (let y = 10; y < vp.h; y += 12) for (let x = 10; x < vp.w; x += 12) { const h = C.paint.cellAt(tex, x, y); if (h && h.cell) { if (!got.has(h.face)) got.set(h.face, []); got.get(h.face).push([x, y]); } }
  const out = {};
  for (const [f, ps] of got) { if (ps.length < 20) continue; const mx = ps.reduce((s, p) => s + p[0], 0) / ps.length, my = ps.reduce((s, p) => s + p[1], 0) / ps.length; out[f] = ps.reduce((a, b) => (Math.hypot(b[0] - mx, b[1] - my) < Math.hypot(a[0] - mx, a[1] - my) ? b : a)); }
  return out;
}, tex);
/** 画板落定那张（合成图）的字节。 */
const bytes = (tex) => S((tex) => Array.from(globalThis.__catsup.paint.boards.get(tex).composeBytes()), tex);
/** 归属表：每格归哪块；每张面在哪块。 */
const table = (tex) => S((tex) => { const t = globalThis.__catsup.paint.prep.take(tex).geo.table; return { W: t.width, H: t.height, owner: Array.from(t.owner), polyOf: Object.fromEntries([...t.faces].map(([f, fp]) => [f, fp.poly])) }; }, tex);
/** 两张合成图之间变了的格；变了的格里颜色不是红的有几格。 */
const diff = (a, b) => { const ch = new Set(); let notRed = 0; for (let c = 0; c < a.length / 4; c++) { const i = 4 * c; if (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2] || a[i + 3] !== b[i + 3]) { ch.add(c); if (!(b[i] === 255 && b[i + 1] === 0 && b[i + 2] === 0 && b[i + 3] === 255)) notRed++; } } return { ch, notRed }; };
const sameSet = (a, b) => a.size === b.size && [...a].every((x) => b.has(x));
const pos = () => S(() => globalThis.__catsup.editor.history.position());
const P = (p) => ({ x: board.x + p[0], y: board.y + p[1] });

console.log("\n① 左栏四把；悬停那张面亮一下");
const st = await S(() => ({ mode: globalThis.__catsup.editor.modeId, tools: globalThis.__catsup.editor.modeTools().join(","), tool: globalThis.__catsup.editor.tool, rail: !!document.querySelector('[data-tool="paintBucket"], button[title*="油漆桶"]') }));
check(st.mode === "paint" && st.tools === "paintPen,paintEraser,eyedrop,paintBucket" && st.tool === "paintBucket", "绘制工作台四把：笔 / 橡皮 / 吸管 / 油漆桶；手上 = 油漆桶", JSON.stringify(st));
const spots = await faceSpots(setup.texA), T = await table(setup.texA);
const faces = Object.keys(spots).map(Number);
check(faces.length === 3, `等轴视图看得见三张面（${faces.join(", ")}）`, JSON.stringify(spots));
const [fA, fB, fC] = faces;
await page.mouse.move(P(spots[fA]).x, P(spots[fA]).y); await frames(2);
const hov1 = await S(() => globalThis.__catsup.editor.hoverFace ?? null);
await page.mouse.move(P(spots[fB]).x, P(spots[fB]).y); await frames(2);
const hov2 = await S(() => globalThis.__catsup.editor.hoverFace ?? null);
check(hov1 !== null && hov2 !== null && hov1 !== hov2, "悬停：光标下那张面亮着、换一张面亮的跟着换", JSON.stringify({ hov1, hov2 }));

console.log("\n② 点一下 = 填满一张面");
const polyA = T.polyOf[fA], cellsA = new Set(T.owner.map((o, c) => (o === polyA ? c : -1)).filter((c) => c >= 0));
const b0 = await bytes(setup.texA), p0 = await pos();
await page.mouse.move(P(spots[fA]).x, P(spots[fA]).y); await page.mouse.down(); await page.mouse.up(); await frames(4);
const b1 = await bytes(setup.texA), d1 = diff(b0, b1);
check(cellsA.size > 0 && sameSet(d1.ch, cellsA), `变了的格 = 正好归这张面那块多边形的格（${d1.ch.size} / 归属表 ${cellsA.size}）；邻面的格一格不动`, JSON.stringify({ changed: d1.ch.size, want: cellsA.size, extra: [...d1.ch].filter((c) => !cellsA.has(c)).length, missing: [...cellsA].filter((c) => !d1.ch.has(c)).length }));
check(d1.notRed === 0, "填的是当前颜色（红）、不透明");
check((await pos()) === p0 + 1, "长了一步");
const lab = await S(() => { const h = globalThis.__catsup.editor.history; return h.labelAt?.(h.position() - 1) ?? h.lastLabel?.() ?? null; });
if (lab !== null) check(JSON.stringify(lab).includes("油漆桶"), `这一步叫「油漆桶」（${JSON.stringify(lab)}）`);

console.log("\n③ 撤销一步 = 回到点之前");
await S(() => globalThis.__catsup.editor.undo()); await frames(4);
check(JSON.stringify(await bytes(setup.texA)) === JSON.stringify(b0) && (await pos()) === p0, "撤销一步：画逐字节回到点之前、步数回去");

console.log("\n④ 按住拖过三张面");
const polys3 = new Set([T.polyOf[fA], T.polyOf[fB], T.polyOf[fC]]), cells3 = new Set(T.owner.map((o, c) => (polys3.has(o) ? c : -1)).filter((c) => c >= 0));
await page.mouse.move(P(spots[fA]).x, P(spots[fA]).y); await page.mouse.down();
await page.mouse.move(P(spots[fB]).x, P(spots[fB]).y, { steps: 12 }); await frames(1);
await page.mouse.move(P(spots[fC]).x, P(spots[fC]).y, { steps: 12 }); await frames(1);
await page.mouse.up(); await frames(4);
const b3 = await bytes(setup.texA), d3 = diff(b0, b3);
check(polys3.size === 3 && sameSet(d3.ch, cells3) && d3.notRed === 0, `三张面都填满（变了 ${d3.ch.size} 格 / 三块多边形共 ${cells3.size} 格），别的格不动`, JSON.stringify({ extra: [...d3.ch].filter((c) => !cells3.has(c)).length, missing: [...cells3].filter((c) => !d3.ch.has(c)).length, notRed: d3.notRed }));
check((await pos()) === p0 + 1, "整个一拖只长一步");
await S(() => globalThis.__catsup.editor.undo()); await frames(4);
check(JSON.stringify(await bytes(setup.texA)) === JSON.stringify(b0) && (await pos()) === p0, "撤销一步：三张全回去（逐字节）");

console.log("\n⑤ 走这张画但还没排进画布的面：点了不改");
check(!setup.sideHasUv, "乙的正面走画、但没排进画布（角上没有贴图坐标）");
const spotB = await S(async ({ instB, sideB, texB }) => {
  const C = globalThis.__catsup, e = C.editor, inst = [...e.sceneRef.def(e.sceneRef.root).instances.values()].find((i) => i.id === instB);
  e.exitTo(0); e.selectedPools.clear(); e.selectedPools.set(`i${inst.id}`, { kind: "instance", instance: inst.id }); e.enterSelected();
  C.paint.ensure(texB); C.pickWorkbench("paint"); e.setTool("paintBucket");
  e.cam.setView("front"); e.zoomExtents(); e.draw();
  await new Promise((r) => setTimeout(r, 50));
  // 正视图里正面占满中间：找一个落在正面上的点（cellAt 对没排进画布的面给 { face } 不带格）
  const vp = e.vp();
  for (let y = vp.h / 2 - 40; y < vp.h / 2 + 40; y += 8) for (let x = vp.w / 2 - 40; x < vp.w / 2 + 40; x += 8) { const h = C.paint.cellAt(texB, x, y); if (h && h.face === sideB && !h.cell) return [x, y]; }
  return null;
}, setup);
await page.waitForFunction((t) => globalThis.__catsup.paint.state(t) === "hot", setup.texB, { timeout: 15000 }); await frames(4);
check(!!spotB, "正视图里找得到乙的正面", JSON.stringify(spotB));
if (spotB) {
  const c0 = await bytes(setup.texB), q0 = await pos();
  await page.mouse.move(P(spotB).x, P(spotB).y); await page.mouse.down(); await page.mouse.up(); await frames(4);
  check(JSON.stringify(await bytes(setup.texB)) === JSON.stringify(c0) && (await pos()) === q0, "点了：画逐字节没变、没长步");
  const h = await hint();
  check(/还没排进画布/.test(h), `提示行说为什么（${h}）`);
}

await browser.close();
if (errs.length) { console.log("页面错误：", errs.slice(0, 6)); process.exitCode = 1; }
console.log(`\nprobe-paint-bucket ${failN || errs.length ? "FAIL" : "OK"}（${pass} ✓ / ${failN} ✗）`);
